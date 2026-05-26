import { NextResponse } from "next/server";

import { db } from "@/db/index";
import { classes, classSubjectTeachers, curriculumPlans, grades, subjects, teacherSubjects, users } from "@/db/schema";
import { apiErrorResponse, requireAdmin } from "@/lib/api/route-helpers";

type ReportAssignment = {
  classId: number;
  className: string;
  subjectId: number;
  subjectName: string;
  teacherId?: number;
  teacherName?: string;
};

const formatTeacherName = (teacher: { surname: string; name: string; patronymic: string | null }) =>
  `${teacher.surname} ${teacher.name}${teacher.patronymic ? ` ${teacher.patronymic}` : ""}`;

const getClassName = (
  classItem: typeof classes.$inferSelect,
  gradeById: Map<number, typeof grades.$inferSelect>,
) => {
  const grade = gradeById.get(classItem.gradeId);
  return grade ? `${grade.number}${classItem.letter}` : classItem.letter;
};

const getPlanHours = (
  classItem: typeof classes.$inferSelect,
  subjectId: number,
  plansByGradeSubject: Map<string, typeof curriculumPlans.$inferSelect>,
) => plansByGradeSubject.get(`${classItem.gradeId}:${subjectId}`)?.hoursPerWeek ?? 0;

const increment = (map: Map<string, number>, key: string) => {
  map.set(key, (map.get(key) ?? 0) + 1);
};

const chooseLeastLoadedTeacher = ({
  teacherIds,
  subjectId,
  teacherLoadById,
  subjectClassCountByTeacher,
}: {
  teacherIds: number[];
  subjectId: number;
  teacherLoadById: Map<number, number>;
  subjectClassCountByTeacher: Map<string, number>;
}) =>
  [...teacherIds].sort((leftId, rightId) => {
    const loadDiff = (teacherLoadById.get(leftId) ?? 0) - (teacherLoadById.get(rightId) ?? 0);
    if (loadDiff !== 0) return loadDiff;

    const leftSubjectClasses = subjectClassCountByTeacher.get(`${subjectId}:${leftId}`) ?? 0;
    const rightSubjectClasses = subjectClassCountByTeacher.get(`${subjectId}:${rightId}`) ?? 0;
    return leftSubjectClasses - rightSubjectClasses;
  })[0];

export async function POST() {
  try {
    const adminError = await requireAdmin();
    if (adminError) return adminError;

    const [classRows, gradeRows, planRows, assignmentRows, teacherSubjectRows, subjectRows, userRows] =
      await Promise.all([
        db.select().from(classes),
        db.select().from(grades),
        db.select().from(curriculumPlans),
        db.select().from(classSubjectTeachers),
        db.select().from(teacherSubjects),
        db.select().from(subjects),
        db.select().from(users),
      ]);

    if (classRows.length === 0) {
      return NextResponse.json({ error: "Нет классов для автоматического назначения" }, { status: 400 });
    }

    if (planRows.length === 0) {
      return NextResponse.json({ error: "Учебный план не заполнен" }, { status: 400 });
    }

    const gradeById = new Map(gradeRows.map((grade) => [grade.id, grade]));
    const classById = new Map(classRows.map((classItem) => [classItem.id, classItem]));
    const subjectById = new Map(subjectRows.map((subject) => [subject.id, subject]));
    const teacherById = new Map(userRows.map((user) => [user.id, user]));
    const teacherIdsBySubjectId = new Map<number, number[]>();
    const plansByGradeId = new Map<number, typeof planRows>();
    const plansByGradeSubject = new Map<string, typeof planRows[number]>();

    for (const plan of planRows) {
      const current = plansByGradeId.get(plan.gradeId) ?? [];
      current.push(plan);
      plansByGradeId.set(plan.gradeId, current);
      plansByGradeSubject.set(`${plan.gradeId}:${plan.subjectId}`, plan);
    }

    for (const teacherSubject of teacherSubjectRows) {
      const current = teacherIdsBySubjectId.get(teacherSubject.subjectId) ?? [];
      current.push(teacherSubject.teacherId);
      teacherIdsBySubjectId.set(teacherSubject.subjectId, current);
    }

    const assignmentKeys = new Set(assignmentRows.map((row) => `${row.classId}:${row.subjectId}`));
    const teacherLoadById = new Map<number, number>();
    const subjectClassCountByTeacher = new Map<string, number>();

    for (const assignment of assignmentRows) {
      const classItem = classById.get(assignment.classId);
      if (!classItem) continue;

      const hours = getPlanHours(classItem, assignment.subjectId, plansByGradeSubject);
      teacherLoadById.set(assignment.teacherId, (teacherLoadById.get(assignment.teacherId) ?? 0) + hours);
      increment(subjectClassCountByTeacher, `${assignment.subjectId}:${assignment.teacherId}`);
    }

    const created: ReportAssignment[] = [];
    const existing: ReportAssignment[] = [];
    const failed: ReportAssignment[] = [];

    for (const classItem of classRows) {
      const className = getClassName(classItem, gradeById);
      const plans = plansByGradeId.get(classItem.gradeId) ?? [];

      if (plans.length === 0) {
        failed.push({
          classId: classItem.id,
          className,
          subjectId: 0,
          subjectName: "Учебный план не заполнен",
        });
        continue;
      }

      for (const plan of plans) {
        const subjectName = subjectById.get(plan.subjectId)?.name ?? `Предмет #${plan.subjectId}`;
        const key = `${classItem.id}:${plan.subjectId}`;

        if (assignmentKeys.has(key)) {
          existing.push({
            classId: classItem.id,
            className,
            subjectId: plan.subjectId,
            subjectName,
          });
          continue;
        }

        const candidateTeacherIds = teacherIdsBySubjectId.get(plan.subjectId) ?? [];
        if (candidateTeacherIds.length === 0) {
          failed.push({
            classId: classItem.id,
            className,
            subjectId: plan.subjectId,
            subjectName,
          });
          continue;
        }

        const teacherId = chooseLeastLoadedTeacher({
          teacherIds: candidateTeacherIds,
          subjectId: plan.subjectId,
          teacherLoadById,
          subjectClassCountByTeacher,
        });

        const [result] = await db.insert(classSubjectTeachers).values({
          classId: classItem.id,
          subjectId: plan.subjectId,
          teacherId,
        });

        assignmentKeys.add(key);
        teacherLoadById.set(teacherId, (teacherLoadById.get(teacherId) ?? 0) + plan.hoursPerWeek);
        increment(subjectClassCountByTeacher, `${plan.subjectId}:${teacherId}`);

        const teacher = teacherById.get(teacherId);
        created.push({
          classId: classItem.id,
          className,
          subjectId: plan.subjectId,
          subjectName,
          teacherId,
          teacherName: teacher ? formatTeacherName(teacher) : `Преподаватель #${teacherId}`,
        });
      }
    }

    return NextResponse.json({
      message: failed.length > 0 ? "Автоназначение выполнено частично" : "Автоназначение выполнено",
      createdCount: created.length,
      existingCount: existing.length,
      failedCount: failed.length,
      created,
      existing,
      failed,
    });
  } catch (err) {
    return apiErrorResponse(err);
  }
}
