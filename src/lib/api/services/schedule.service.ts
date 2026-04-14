import { apiClient } from "@/lib/api/http-client";
import { MutationResponse } from "@/lib/api/crud-service";

export interface ScheduleItem {
  id: number;
  day: number;
  lessonNumber: number;
  classId: number;
  className: string;
  subjectName: string;
  teacherName: string;
  teacherFullName: string;
  teacherNames: string[];
  teacherFullNames: string[];
  classrooms: string[];
  hasChanges: boolean;
}

export interface PublicClassItem {
  id: number;
  displayName: string;
  gradeNumber: number;
  letter: string;
}

export interface PublicScheduleResponse {
  listName: string;
  classList: PublicClassItem[];
  schedule: ScheduleItem[];
  data?: null;
  message?: string;
}

export interface ConstructorScheduleEntry {
  id: number;
  listId: number;
  classId: number;
  subjectId: number | null;
  teacherId: number | null;
  teacherIds: number[];
  day: number;
  lessonNumber: number;
  classroomIds: number[];
}

export interface UpsertScheduleCellPayload {
  listId: number;
  classId: number;
  day: number;
  lessonNumber: number;
  subjectId: number | null;
  teacherId?: number | null;
  teacherIds: number[];
  classroomIds: number[];
}

export interface UpsertScheduleCellResponse extends MutationResponse {
  scheduleId: number;
}

export interface DeleteScheduleCellPayload {
  scheduleId?: number;
  listId?: number;
  classId?: number;
  day?: number;
  lessonNumber?: number;
}

export interface ScheduleAutocompleteQuery {
  classId: number;
  subjectId?: number | null;
  teacherId?: number | null;
}

export interface CountedTeacherSuggestion {
  teacherId: number;
  count: number;
}

export interface CountedClassroomSuggestion {
  classroomId: number;
  count: number;
}

export interface CountedSubjectSuggestion {
  subjectId: number;
  count: number;
}

export interface ScheduleAutocompleteResponse {
  teachersBySubject: CountedTeacherSuggestion[];
  subjectsByTeacher: CountedSubjectSuggestion[];
  classroomsByTeacher: CountedClassroomSuggestion[];
  teachersByClass: CountedTeacherSuggestion[];
}

export const scheduleService = {
  getPublicSchedule: (): Promise<PublicScheduleResponse> => apiClient.get<PublicScheduleResponse>("/schedule"),

  getByListId: (listId: number): Promise<ConstructorScheduleEntry[]> =>
    apiClient.get<ConstructorScheduleEntry[]>(`/schedules?listId=${listId}`),

  getAutocomplete: (params: ScheduleAutocompleteQuery): Promise<ScheduleAutocompleteResponse> => {
    const search = new URLSearchParams();
    search.set("classId", String(params.classId));
    if (params.subjectId) search.set("subjectId", String(params.subjectId));
    if (params.teacherId) search.set("teacherId", String(params.teacherId));
    return apiClient.get<ScheduleAutocompleteResponse>(`/schedules/suggestions?${search.toString()}`);
  },

  upsertCell: (payload: UpsertScheduleCellPayload): Promise<UpsertScheduleCellResponse> =>
    apiClient.post<UpsertScheduleCellResponse, UpsertScheduleCellPayload>("/schedules", payload),

  deleteCell: (payload: DeleteScheduleCellPayload): Promise<MutationResponse> => {
    const params = new URLSearchParams();
    if (payload.scheduleId !== undefined) params.set("scheduleId", String(payload.scheduleId));
    if (payload.listId !== undefined) params.set("listId", String(payload.listId));
    if (payload.classId !== undefined) params.set("classId", String(payload.classId));
    if (payload.day !== undefined) params.set("day", String(payload.day));
    if (payload.lessonNumber !== undefined) params.set("lessonNumber", String(payload.lessonNumber));

    return apiClient.delete<MutationResponse>(`/schedules?${params.toString()}`);
  },
};
