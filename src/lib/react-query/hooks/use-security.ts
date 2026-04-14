"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { ConfirmSelfIpAuthPayload, ipAuthService, UpdateIpAuthPayload } from "@/lib/api/services/ip-auth.service";
import { CreateManagerPayload, managerService } from "@/lib/api/services/manager.service";
import { queryKeys } from "@/lib/react-query/query-keys";

export const useIpAuthsQuery = () =>
  useQuery({
    queryKey: queryKeys.security.ipAuths,
    queryFn: ipAuthService.list,
    staleTime: 30_000,
    gcTime: 10 * 60_000,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

export const useUpdateIpAuthMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateIpAuthPayload) => ipAuthService.update(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.security.ipAuths });
    },
  });
};

export const useSelfPendingIpAuthsQuery = (enabled = true) =>
  useQuery({
    queryKey: queryKeys.security.selfPendingIpAuths,
    queryFn: ipAuthService.listSelfPending,
    enabled,
    staleTime: 30_000,
    gcTime: 10 * 60_000,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

export const useConfirmSelfIpAuthMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: ConfirmSelfIpAuthPayload) => ipAuthService.confirmSelf(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.security.selfPendingIpAuths });
    },
  });
};

export const useManagersQuery = (enabled = true) =>
  useQuery({
    queryKey: queryKeys.managers.all,
    queryFn: managerService.list,
    enabled,
    staleTime: 60_000,
    gcTime: 10 * 60_000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

export const useCreateManagerMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateManagerPayload) => managerService.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.managers.all });
    },
  });
};
