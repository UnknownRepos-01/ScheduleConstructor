"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { CreateClassPayload, UpdateClassPayload, classService } from "@/lib/api/services/class.service";
import {
  classroomService,
  CreateClassroomPayload,
  UpdateClassroomPayload,
} from "@/lib/api/services/classroom.service";
import { CreateGradePayload, gradeService, UpdateGradePayload } from "@/lib/api/services/grade.service";
import { CreateListPayload, listService } from "@/lib/api/services/list.service";
import {
  CreateSubjectPayload,
  subjectService,
  UpdateSubjectPayload,
} from "@/lib/api/services/subject.service";
import { queryKeys } from "@/lib/react-query/query-keys";

const referenceQueryOptions = {
  staleTime: 5 * 60_000,
  gcTime: 30 * 60_000,
  refetchOnMount: false as const,
  refetchOnWindowFocus: false as const,
};

export const useGradesQuery = () =>
  useQuery({
    queryKey: queryKeys.grades.all,
    queryFn: gradeService.list,
    ...referenceQueryOptions,
  });

export const useClassesQuery = () =>
  useQuery({
    queryKey: queryKeys.classes.all,
    queryFn: classService.list,
    ...referenceQueryOptions,
  });

export const useSubjectsQuery = () =>
  useQuery({
    queryKey: queryKeys.subjects.all,
    queryFn: subjectService.list,
    ...referenceQueryOptions,
  });

export const useClassroomsQuery = () =>
  useQuery({
    queryKey: queryKeys.classrooms.all,
    queryFn: classroomService.list,
    ...referenceQueryOptions,
  });

export const useListsQuery = () =>
  useQuery({
    queryKey: queryKeys.lists.all,
    queryFn: listService.list,
    staleTime: 30_000,
    gcTime: 10 * 60_000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

export const useCreateGradeMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateGradePayload) => gradeService.create(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.grades.all }),
  });
};

export const useUpdateGradeMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateGradePayload }) => gradeService.update(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.grades.all }),
  });
};

export const useDeleteGradeMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => gradeService.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.grades.all }),
  });
};

export const useCreateClassMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateClassPayload) => classService.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.classes.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.schedule.public });
    },
  });
};

export const useUpdateClassMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateClassPayload }) => classService.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.classes.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.schedule.public });
    },
  });
};

export const useDeleteClassMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => classService.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.classes.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.schedule.public });
    },
  });
};

export const useCreateSubjectMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateSubjectPayload) => subjectService.create(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.subjects.all }),
  });
};

export const useUpdateSubjectMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateSubjectPayload }) => subjectService.update(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.subjects.all }),
  });
};

export const useDeleteSubjectMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => subjectService.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.subjects.all }),
  });
};

export const useCreateClassroomMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateClassroomPayload) => classroomService.create(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.classrooms.all }),
  });
};

export const useUpdateClassroomMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateClassroomPayload }) =>
      classroomService.update(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.classrooms.all }),
  });
};

export const useDeleteClassroomMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => classroomService.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.classrooms.all }),
  });
};

export const useCreateListMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateListPayload) => listService.create(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.lists.all }),
  });
};

export const useActivateListMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => listService.activate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.lists.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.schedule.public });
    },
  });
};

export const useUpdateListMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: { name?: string; isActive?: boolean } }) =>
      listService.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.lists.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.schedule.public });
    },
  });
};

export const useDuplicateListMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name }: { id: number; name?: string }) => listService.duplicate(id, { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.lists.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.schedule.public });
    },
  });
};

export const useDeleteListMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => listService.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.lists.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.schedule.public });
    },
  });
};
