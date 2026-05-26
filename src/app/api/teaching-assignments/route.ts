import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db/index";
import { classes, classSubjectTeachers, grades, subjects, teacherSubjects, users } from "@/db/schema";
import { apiErrorResponse, requireAdmin } from "@/lib/api/route-helpers";

const REQUIRED_FIELDS_MESSAGE = "Класс, предмет и преподаватель обязательны";
const TEACHER_SUBJECT_MISMATCH_MESSAGE = "Выбранный преподаватель не ведёт этот предмет";
const DUPLICATE_ASSIGNMENT_MESSAGE = "Для этого класса и предмета преподаватель уже назначен";

const formatTeacherName = (teacher: { surname: string; name: string; patronymic: string | null }) =>
  `${teacher.surname} ${teacher.name}${teacher.patronymic ? ` ${teacher.patronymic}` : ""}`;

export async function GET() {
  try {
    const adminError = await requireAdmin();
    if (adminError) return adminError;

    const [assignments, classRows, gradeRows, subjectRows, teacherRows] = await Promise.all([
      db.select().from(classSubjectTeachers),
      db.select().from(classes),
      db.select().from(grades),
      db.select().from(subjects),
      db.select().from(users),
    ]);

    const gradeById = new Map(gradeRows.map((grade) => [grade.id, grade]));
    const classById = new Map(
      classRows.map((classItem) => {
        const grade = gradeById.get(classItem.gradeId);
        return [classItem.id, { ...classItem, displayName: grade ? `${grade.number}${classItem.letter}` : classItem.letter }];
      }),
    );
    const subjectById = new Map(subjectRows.map((subject) => [subject.id, subject]));
    const teacherById = new Map(teacherRows.map((teacher) => [teacher.id, teacher]));

    return NextResponse.json(
      assignments
        .map((assignment) => {
          const teacher = teacherById.get(assignment.teacherId);

          return {
            id: assignment.id,
            classId: assignment.classId,
            className: classById.get(assignment.classId)?.displayName ?? "",
            subjectId: assignment.subjectId,
            subjectName: subjectById.get(assignment.subjectId)?.name ?? "",
            teacherId: assignment.teacherId,
            teacherName: teacher ? formatTeacherName(teacher) : "",
          };
        })
        .sort((a, b) => a.className.localeCompare(b.className, "ru") || a.subjectName.localeCompare(b.subjectName, "ru")),
    );
  } catch (err) {
    return apiErrorResponse(err);
  }
}

export async function POST(request: Request) {
  try {
    const adminError = await requireAdmin();
    if (adminError) return adminError;

    const body = await request.json();
    const classId = Number.parseInt(String(body.classId), 10);
    const subjectId = Number.parseInt(String(body.subjectId), 10);
    const teacherId = Number.parseInt(String(body.teacherId), 10);

    if (!classId || !subjectId || !teacherId) {
      return NextResponse.json({ error: REQUIRED_FIELDS_MESSAGE }, { status: 400 });
    }

    const [teacherSubject] = await db
      .select()
      .from(teacherSubjects)
      .where(and(eq(teacherSubjects.teacherId, teacherId), eq(teacherSubjects.subjectId, subjectId)));
    if (!teacherSubject) {
      return NextResponse.json({ error: TEACHER_SUBJECT_MISMATCH_MESSAGE }, { status: 400 });
    }

    const [duplicate] = await db
      .select()
      .from(classSubjectTeachers)
      .where(and(eq(classSubjectTeachers.classId, classId), eq(classSubjectTeachers.subjectId, subjectId)));
    if (duplicate) {
      return NextResponse.json({ error: DUPLICATE_ASSIGNMENT_MESSAGE }, { status: 409 });
    }

    const [result] = await db.insert(classSubjectTeachers).values({ classId, subjectId, teacherId });
    return NextResponse.json({ message: "Назначение создано", insertId: result.insertId }, { status: 201 });
  } catch (err) {
    return apiErrorResponse(err);
  }
}
