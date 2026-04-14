import { createCrudService } from "@/lib/api/crud-service";

export interface ClassItem {
  id: number;
  gradeId: number;
  letter: string;
  displayName: string;
  gradeNumber?: number;
  gradeHours?: number;
}

export interface CreateClassPayload {
  gradeId: number;
  letter: string;
}

export type UpdateClassPayload = Partial<CreateClassPayload>;

export const classService = createCrudService<ClassItem, CreateClassPayload, UpdateClassPayload>("/classes");
