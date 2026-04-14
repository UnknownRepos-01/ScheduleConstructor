import { createCrudService } from "@/lib/api/crud-service";
import { ROLE_MANAGER, ROLE_TEACHER } from "@/lib/access";

export interface Teacher {
  id: number;
  name: string;
  surname: string;
  patronymic: string | null;
  login: string;
  defaultClassroomId: number | null;
  defaultClassroomNumber?: string | null;
}

export interface CreateTeacherPayload {
  name: string;
  surname: string;
  patronymic?: string;
  login: string;
  password: string;
  roleName?: typeof ROLE_TEACHER | typeof ROLE_MANAGER;
  defaultClassroomId?: number | null;
}

export interface UpdateTeacherPayload {
  name?: string;
  surname?: string;
  patronymic?: string | null;
  login?: string;
  password?: string;
  roleName?: typeof ROLE_TEACHER | typeof ROLE_MANAGER;
  defaultClassroomId?: number | null;
}

export const teacherService = createCrudService<Teacher, CreateTeacherPayload, UpdateTeacherPayload>("/teachers");
