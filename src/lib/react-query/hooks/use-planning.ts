"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  CreateCurriculumPlanPayload,
  curriculumPlanService,
  UpdateCurriculumPlanPayload,
} from "@/lib/api/services/curriculum-plan.service";
import {
  CreateTeachingAssignmentPayload,
  teachingAssignmentService,
  UpdateTeachingAssignmentPayload,
} from "@/lib/api/services/teaching-assignment.service";
import { queryKeys } from "@/lib/react-query/query-keys";

const planningQueryOptions = {
  staleTime: 60_000,
  gcTime: 10 * 60_000,
  refetchOnMount: false,
  refetchOnWindowFocus: false,
} as const;

const useInvalidateOnSuccess = (queryKey: readonly unknown[]) => {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey });
};

const createPlanningQueryHook =
  <TResult,>(queryKey: readonly unknown[], queryFn: () => Promise<TResult>) =>
  () =>
    useQuery({
      queryKey,
      queryFn,
      ...planningQueryOptions,
    });

export const useCurriculumPlansQuery = createPlanningQueryHook(
  queryKeys.curriculumPlans.all,
  curriculumPlanService.list,
);

export const useCreateCurriculumPlanMutation = () => {
  const invalidate = useInvalidateOnSuccess(queryKeys.curriculumPlans.all);
  return useMutation({
    mutationFn: (payload: CreateCurriculumPlanPayload) => curriculumPlanService.create(payload),
    onSuccess: invalidate,
  });
};

export const useUpdateCurriculumPlanMutation = () => {
  const invalidate = useInvalidateOnSuccess(queryKeys.curriculumPlans.all);
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateCurriculumPlanPayload }) =>
      curriculumPlanService.update(id, payload),
    onSuccess: invalidate,
  });
};

export const useDeleteCurriculumPlanMutation = () => {
  const invalidate = useInvalidateOnSuccess(queryKeys.curriculumPlans.all);
  return useMutation({
    mutationFn: (id: number) => curriculumPlanService.remove(id),
    onSuccess: invalidate,
  });
};

export const useTeachingAssignmentsQuery = createPlanningQueryHook(
  queryKeys.teachingAssignments.all,
  teachingAssignmentService.list,
);

export const useCreateTeachingAssignmentMutation = () => {
  const invalidate = useInvalidateOnSuccess(queryKeys.teachingAssignments.all);
  return useMutation({
    mutationFn: (payload: CreateTeachingAssignmentPayload) => teachingAssignmentService.create(payload),
    onSuccess: invalidate,
  });
};

export const useUpdateTeachingAssignmentMutation = () => {
  const invalidate = useInvalidateOnSuccess(queryKeys.teachingAssignments.all);
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateTeachingAssignmentPayload }) =>
      teachingAssignmentService.update(id, payload),
    onSuccess: invalidate,
  });
};

export const useDeleteTeachingAssignmentMutation = () => {
  const invalidate = useInvalidateOnSuccess(queryKeys.teachingAssignments.all);
  return useMutation({
    mutationFn: (id: number) => teachingAssignmentService.remove(id),
    onSuccess: invalidate,
  });
};

export const useAutoAssignTeachingAssignmentsMutation = () => {
  const invalidate = useInvalidateOnSuccess(queryKeys.teachingAssignments.all);
  return useMutation({
    mutationFn: teachingAssignmentService.autoAssign,
    onSuccess: invalidate,
  });
};
