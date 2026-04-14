import { createCrudService } from "@/lib/api/crud-service";

export interface Classroom {
  id: number;
  number: string;
}

export interface CreateClassroomPayload {
  number: string;
}

export type UpdateClassroomPayload = CreateClassroomPayload;

export const classroomService = createCrudService<Classroom, CreateClassroomPayload, UpdateClassroomPayload>("/classrooms");
