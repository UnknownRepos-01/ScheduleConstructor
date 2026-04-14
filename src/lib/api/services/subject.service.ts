import { createCrudService } from "@/lib/api/crud-service";

export interface Subject {
  id: number;
  name: string;
}

export interface CreateSubjectPayload {
  name: string;
}

export type UpdateSubjectPayload = CreateSubjectPayload;

export const subjectService = createCrudService<Subject, CreateSubjectPayload, UpdateSubjectPayload>("/subjects");
