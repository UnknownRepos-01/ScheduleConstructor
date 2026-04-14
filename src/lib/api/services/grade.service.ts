import { createCrudService } from "@/lib/api/crud-service";

export interface Grade {
  id: number;
  number: number;
  hours: number;
}

export interface CreateGradePayload {
  number: number;
  hours: number;
}

export type UpdateGradePayload = Partial<CreateGradePayload>;

export const gradeService = createCrudService<Grade, CreateGradePayload, UpdateGradePayload>("/grades");
