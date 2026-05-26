import { createCrudService } from "@/lib/api/crud-service";
import { apiClient } from "@/lib/api/http-client";

export interface TeachingAssignment {
  id: number;
  classId: number;
  className: string;
  subjectId: number;
  subjectName: string;
  teacherId: number;
  teacherName: string;
}

export interface CreateTeachingAssignmentPayload {
  classId: number;
  subjectId: number;
  teacherId: number;
}

export type UpdateTeachingAssignmentPayload = Partial<CreateTeachingAssignmentPayload>;

export interface AutoAssignReportItem {
  classId: number;
  className: string;
  subjectId: number;
  subjectName: string;
  teacherId?: number;
  teacherName?: string;
}

export interface AutoAssignTeachingAssignmentsResponse {
  message: string;
  createdCount: number;
  existingCount: number;
  failedCount: number;
  created: AutoAssignReportItem[];
  existing: AutoAssignReportItem[];
  failed: AutoAssignReportItem[];
}

const crudService = createCrudService<
  TeachingAssignment,
  CreateTeachingAssignmentPayload,
  UpdateTeachingAssignmentPayload
>("/teaching-assignments");

export const teachingAssignmentService = {
  ...crudService,
  autoAssign: (): Promise<AutoAssignTeachingAssignmentsResponse> =>
    apiClient.post<AutoAssignTeachingAssignmentsResponse>("/teaching-assignments/auto-assign"),
};
