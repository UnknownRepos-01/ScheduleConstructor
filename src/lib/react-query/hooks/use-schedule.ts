"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  ScheduleAutocompleteQuery,
  scheduleService,
  UpsertScheduleCellPayload,
  DeleteScheduleCellPayload,
} from "@/lib/api/services/schedule.service";
import { queryKeys } from "@/lib/react-query/query-keys";

export const usePublicScheduleQuery = () =>
  useQuery({
    queryKey: queryKeys.schedule.public,
    queryFn: scheduleService.getPublicSchedule,
    staleTime: 60_000,
    gcTime: 10 * 60_000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

export const useScheduleByListQuery = (listId: number | null) =>
  useQuery({
    queryKey: listId ? queryKeys.schedule.byList(listId) : ["schedule", "list", "none"],
    queryFn: () => scheduleService.getByListId(listId as number),
    enabled: Number.isInteger(listId) && listId !== null,
    staleTime: 30_000,
    gcTime: 10 * 60_000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

export const useScheduleAutocompleteQuery = (
  params: ScheduleAutocompleteQuery | null,
  enabled = true,
) =>
  useQuery({
    queryKey:
      params && params.classId
        ? queryKeys.schedule.autocomplete(params.classId, params.subjectId ?? null, params.teacherId ?? null)
        : ["schedule", "autocomplete", "none"],
    queryFn: () => scheduleService.getAutocomplete(params as ScheduleAutocompleteQuery),
    enabled: enabled && !!params?.classId,
    staleTime: 20_000,
    gcTime: 5 * 60_000,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });

export const useUpsertScheduleCellMutation = (listId: number | null) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpsertScheduleCellPayload) => scheduleService.upsertCell(payload),
    onSuccess: () => {
      if (listId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.schedule.byList(listId) });
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.schedule.public });
    },
  });
};

export const useDeleteScheduleCellMutation = (listId: number | null) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: DeleteScheduleCellPayload) => scheduleService.deleteCell(payload),
    onSuccess: () => {
      if (listId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.schedule.byList(listId) });
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.schedule.public });
    },
  });
};
