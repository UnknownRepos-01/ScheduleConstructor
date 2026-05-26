import { and, eq, notInArray } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db/index";
import {
  classSubjectTeachers,
  lessonTeachers,
  roles,
  schedules,
  teacherDefaultClassrooms,
  teacherSubjects,
  users,
} from "@/db/schema";
import { apiErrorResponse, invalidIdResponse, parseRouteId, requireAdmin, requireAdminSession } from "@/lib/api/route-helpers";
import { ROLE_MANAGER, ROLE_TEACHER } from "@/lib/access";
import { AdminOnlyCheck, hashPassword, validateNewPassword } from "@/lib/auth";

const NOT_FOUND_MESSAGE = "Пользователь не найден";
const MANAGER_ROLE_FORBIDDEN_MESSAGE = "Только администратор может назначать роль менеджера";
const ROLE_NOT_FOUND_MESSAGE = "Роль не найдена в системе";
const TEACHER_IN_SCHEDULE_MESSAGE = "Нельзя удалить преподавателя: он используется в расписании";

const normalizeIds = (value: unknown): number[] => {
  if (!Array.isArray(value)) return [];
  return Array.from(
    new Set(
      value
        .map((item) => Number.parseInt(String(item), 10))
        .filter((item) => Number.isFinite(item) && item > 0),
    ),
  );
};

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const { error: adminError, session } = await requireAdminSession();
    if (adminError) return adminError;
    if (!session) return apiErrorResponse(null);

    const id = parseRouteId(params.id);
    if (!id) return invalidIdResponse();

    const body = await request.json();
    const { name, surname, patronymic, login, password } = body;
    const roleNameRaw = typeof body.roleName === "string" ? body.roleName : undefined;
    const defaultClassroomIdRaw = body.defaultClassroomId;
    const hasDefaultClassroomField = body.defaultClassroomId !== undefined;
    const hasSubjectIdsField = body.subjectIds !== undefined;
    const subjectIds = normalizeIds(body.subjectIds);
    const defaultClassroomId =
      defaultClassroomIdRaw === null || defaultClassroomIdRaw === undefined
        ? null
        : Number.parseInt(String(defaultClassroomIdRaw), 10);

    const updateData: Partial<typeof users.$inferInsert> = {};
    if (name) updateData.name = name;
    if (surname) updateData.surname = surname;
    if (patronymic !== undefined) updateData.patronymic = patronymic || null;
    if (login) updateData.login = login;

    if (password) {
      const passwordValidationError = validateNewPassword(password);
      if (passwordValidationError) {
        return NextResponse.json({ error: passwordValidationError }, { status: 400 });
      }
      updateData.password = await hashPassword(password);
    }

    if (roleNameRaw) {
      const roleName = roleNameRaw === ROLE_MANAGER ? ROLE_MANAGER : ROLE_TEACHER;
      if (roleName === ROLE_MANAGER && !(await AdminOnlyCheck(session))) {
        return NextResponse.json({ error: MANAGER_ROLE_FORBIDDEN_MESSAGE }, { status: 403 });
      }

      const selectedRole = await db.select().from(roles).where(eq(roles.name, roleName));
      const roleId = selectedRole[0]?.id;
      if (!roleId) {
        return NextResponse.json({ error: ROLE_NOT_FOUND_MESSAGE }, { status: 500 });
      }

      updateData.roleId = roleId;
    }

    const [result] = await db.update(users).set(updateData).where(eq(users.id, id));
    if (result.affectedRows === 0) {
      return NextResponse.json({ error: NOT_FOUND_MESSAGE }, { status: 404 });
    }

    if (hasDefaultClassroomField) {
      await db.delete(teacherDefaultClassrooms).where(eq(teacherDefaultClassrooms.teacherId, id));

      if (defaultClassroomId !== null && !Number.isNaN(defaultClassroomId)) {
        await db.insert(teacherDefaultClassrooms).values({
          teacherId: id,
          classroomId: defaultClassroomId,
        });
      }
    }

    if (hasSubjectIdsField) {
      await db.delete(teacherSubjects).where(eq(teacherSubjects.teacherId, id));

      if (subjectIds.length > 0) {
        for (const subjectId of subjectIds) {
          await db.insert(teacherSubjects).values({ teacherId: id, subjectId });
        }

        await db
          .delete(classSubjectTeachers)
          .where(and(eq(classSubjectTeachers.teacherId, id), notInArray(classSubjectTeachers.subjectId, subjectIds)));
      } else {
        await db.delete(classSubjectTeachers).where(eq(classSubjectTeachers.teacherId, id));
      }
    }

    return NextResponse.json({ message: "Пользователь обновлён" });
  } catch (err: unknown) {
    return apiErrorResponse(err);
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const adminError = await requireAdmin();
    if (adminError) return adminError;

    const id = parseRouteId(params.id);
    if (!id) return invalidIdResponse();

    const [currentUser] = await db.select({ id: users.id }).from(users).where(eq(users.id, id));
    if (!currentUser) return NextResponse.json({ error: NOT_FOUND_MESSAGE }, { status: 404 });

    const [scheduleEntry] = await db.select({ id: schedules.id }).from(schedules).where(eq(schedules.teacherId, id));
    const [lessonTeacherEntry] = await db
      .select({ id: lessonTeachers.id })
      .from(lessonTeachers)
      .where(eq(lessonTeachers.teacherId, id));
    if (scheduleEntry || lessonTeacherEntry) {
      return NextResponse.json({ error: TEACHER_IN_SCHEDULE_MESSAGE }, { status: 409 });
    }

    await db.delete(teacherDefaultClassrooms).where(eq(teacherDefaultClassrooms.teacherId, id));
    await db.delete(teacherSubjects).where(eq(teacherSubjects.teacherId, id));
    await db.delete(classSubjectTeachers).where(eq(classSubjectTeachers.teacherId, id));

    const [result] = await db.delete(users).where(eq(users.id, id));
    if (result.affectedRows === 0) {
      return NextResponse.json({ error: NOT_FOUND_MESSAGE }, { status: 404 });
    }

    return NextResponse.json({ message: "Пользователь удалён" });
  } catch (err: unknown) {
    return apiErrorResponse(err);
  }
}
