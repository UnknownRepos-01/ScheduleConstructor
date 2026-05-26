"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { QueryKey } from "@tanstack/react-query";

import { ConfirmSelfIpAuthPayload, ipAuthService, UpdateIpAuthPayload } from "@/lib/api/services/ip-auth.service";
import { CreateManagerPayload, managerService } from "@/lib/api/services/manager.service";
import { queryKeys } from "@/lib/react-query/query-keys";

const liveSecurityQueryOptions = {
  staleTime: 30_000,
  gcTime: 10 * 60_000,
  refetchOnMount: true,
  refetchOnWindowFocus: true,
} as const;

const useInvalidatingMutation = <TPayload, TResult>(
  mutationFn: (payload: TPayload) => Promise<TResult>,
  queryKey: QueryKey,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });
};

export const useIpAuthsQuery = () =>
  useQuery({
    queryKey: queryKeys.security.ipAuths,
    queryFn: ipAuthService.list,
    ...liveSecurityQueryOptions,
  });

export const useUpdateIpAuthMutation = () =>
  useInvalidatingMutation((payload: UpdateIpAuthPayload) => ipAuthService.update(payload), queryKeys.security.ipAuths);

export const useSelfPendingIpAuthsQuery = (enabled = true) =>
  useQuery({
    queryKey: queryKeys.security.selfPendingIpAuths,
    queryFn: ipAuthService.listSelfPending,
    enabled,
    ...liveSecurityQueryOptions,
  });

export const useConfirmSelfIpAuthMutation = () =>
  useInvalidatingMutation(
    (payload: ConfirmSelfIpAuthPayload) => ipAuthService.confirmSelf(payload),
    queryKeys.security.selfPendingIpAuths,
  );

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

export const useCreateManagerMutation = () =>
  useInvalidatingMutation((payload: CreateManagerPayload) => managerService.create(payload), queryKeys.managers.all);
