import { createCrudService } from "@/lib/api/crud-service";

export interface CurriculumPlan {
  id: number;
  gradeId: number;
  gradeNumber: number;
  subjectId: number;
  subjectName: string;
  hoursPerWeek: number;
}

export interface CreateCurriculumPlanPayload {
  gradeId: number;
  subjectId: number;
  hoursPerWeek: number;
}

export type UpdateCurriculumPlanPayload = Partial<CreateCurriculumPlanPayload>;

export const curriculumPlanService = createCrudService<
  CurriculumPlan,
  CreateCurriculumPlanPayload,
  UpdateCurriculumPlanPayload
>("/curriculum-plans");
