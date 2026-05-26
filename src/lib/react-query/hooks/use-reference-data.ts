"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { QueryClient, QueryKey } from "@tanstack/react-query";

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

type UpdateVariables<TPayload> = {
  id: number;
  payload: TPayload;
};

type InvalidatingMutationOptions<TVariables, TResult> = {
  mutationFn: (variables: TVariables) => Promise<TResult>;
  keysToInvalidate: readonly QueryKey[];
};

const createReferenceQueryHook =
  <TResult,>(queryKey: QueryKey, queryFn: () => Promise<TResult>) =>
  () =>
    useQuery({
      queryKey,
      queryFn,
      ...referenceQueryOptions,
    });

const invalidateKeys = (queryClient: QueryClient, keys: readonly QueryKey[]) => {
  keys.forEach((queryKey) => {
    queryClient.invalidateQueries({ queryKey });
  });
};

const useInvalidatingMutation = <TVariables, TResult>({
  mutationFn,
  keysToInvalidate,
}: InvalidatingMutationOptions<TVariables, TResult>) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => invalidateKeys(queryClient, keysToInvalidate),
  });
};

const listChangeInvalidationKeys = [queryKeys.lists.all, queryKeys.schedule.public] as const;

export const useGradesQuery = createReferenceQueryHook(queryKeys.grades.all, gradeService.list);

export const useClassesQuery = createReferenceQueryHook(queryKeys.classes.all, classService.list);

export const useSubjectsQuery = createReferenceQueryHook(queryKeys.subjects.all, subjectService.list);

export const useClassroomsQuery = createReferenceQueryHook(queryKeys.classrooms.all, classroomService.list);

export const useListsQuery = () =>
  useQuery({
    queryKey: queryKeys.lists.all,
    queryFn: listService.list,
    staleTime: 30_000,
    gcTime: 10 * 60_000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

export const useCreateGradeMutation = () =>
  useInvalidatingMutation({
    mutationFn: (payload: CreateGradePayload) => gradeService.create(payload),
    keysToInvalidate: [queryKeys.grades.all],
  });

export const useUpdateGradeMutation = () =>
  useInvalidatingMutation({
    mutationFn: ({ id, payload }: UpdateVariables<UpdateGradePayload>) => gradeService.update(id, payload),
    keysToInvalidate: [queryKeys.grades.all],
  });

export const useDeleteGradeMutation = () =>
  useInvalidatingMutation({
    mutationFn: gradeService.remove,
    keysToInvalidate: [queryKeys.grades.all],
  });

export const useCreateClassMutation = () =>
  useInvalidatingMutation({
    mutationFn: (payload: CreateClassPayload) => classService.create(payload),
    keysToInvalidate: [queryKeys.classes.all, queryKeys.schedule.public],
  });

export const useUpdateClassMutation = () =>
  useInvalidatingMutation({
    mutationFn: ({ id, payload }: UpdateVariables<UpdateClassPayload>) => classService.update(id, payload),
    keysToInvalidate: [queryKeys.classes.all, queryKeys.schedule.public],
  });

export const useDeleteClassMutation = () =>
  useInvalidatingMutation({
    mutationFn: classService.remove,
    keysToInvalidate: [queryKeys.classes.all, queryKeys.schedule.public],
  });

export const useCreateSubjectMutation = () =>
  useInvalidatingMutation({
    mutationFn: (payload: CreateSubjectPayload) => subjectService.create(payload),
    keysToInvalidate: [queryKeys.subjects.all],
  });

export const useUpdateSubjectMutation = () =>
  useInvalidatingMutation({
    mutationFn: ({ id, payload }: UpdateVariables<UpdateSubjectPayload>) => subjectService.update(id, payload),
    keysToInvalidate: [queryKeys.subjects.all],
  });

export const useDeleteSubjectMutation = () =>
  useInvalidatingMutation({
    mutationFn: subjectService.remove,
    keysToInvalidate: [queryKeys.subjects.all],
  });

export const useCreateClassroomMutation = () =>
  useInvalidatingMutation({
    mutationFn: (payload: CreateClassroomPayload) => classroomService.create(payload),
    keysToInvalidate: [queryKeys.classrooms.all],
  });

export const useUpdateClassroomMutation = () =>
  useInvalidatingMutation({
    mutationFn: ({ id, payload }: UpdateVariables<UpdateClassroomPayload>) => classroomService.update(id, payload),
    keysToInvalidate: [queryKeys.classrooms.all],
  });

export const useDeleteClassroomMutation = () =>
  useInvalidatingMutation({
    mutationFn: classroomService.remove,
    keysToInvalidate: [queryKeys.classrooms.all],
  });

export const useCreateListMutation = () =>
  useInvalidatingMutation({
    mutationFn: (payload: CreateListPayload) => listService.create(payload),
    keysToInvalidate: [queryKeys.lists.all],
  });

export const useActivateListMutation = () =>
  useInvalidatingMutation({
    mutationFn: (id: number) => listService.activate(id),
    keysToInvalidate: listChangeInvalidationKeys,
  });

export const useUpdateListMutation = () =>
  useInvalidatingMutation({
    mutationFn: ({ id, payload }: { id: number; payload: { name?: string; isActive?: boolean } }) =>
      listService.update(id, payload),
    keysToInvalidate: listChangeInvalidationKeys,
  });

export const useDuplicateListMutation = () =>
  useInvalidatingMutation({
    mutationFn: ({ id, name }: { id: number; name?: string }) => listService.duplicate(id, { name }),
    keysToInvalidate: listChangeInvalidationKeys,
  });

export const useDeleteListMutation = () =>
  useInvalidatingMutation({
    mutationFn: (id: number) => listService.remove(id),
    keysToInvalidate: listChangeInvalidationKeys,
  });
