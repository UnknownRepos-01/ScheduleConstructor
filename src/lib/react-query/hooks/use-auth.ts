"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { authService, ChangePasswordPayload, LoginPayload } from "@/lib/api/services/auth.service";
import { queryKeys } from "@/lib/react-query/query-keys";

const useInvalidateCurrentUser = () => {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: queryKeys.auth.currentUser });
};

export const useCurrentUserQuery = () =>
  useQuery({
    queryKey: queryKeys.auth.currentUser,
    queryFn: authService.getCurrentUser,
    staleTime: 60_000,
    gcTime: 10 * 60_000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

export const useLoginMutation = () => {
  const invalidateCurrentUser = useInvalidateCurrentUser();

  return useMutation({
    mutationFn: (payload: LoginPayload) => authService.login(payload),
    onSuccess: invalidateCurrentUser,
  });
};

export const useLogoutMutation = () => {
  const invalidateCurrentUser = useInvalidateCurrentUser();

  return useMutation({
    mutationFn: authService.logout,
    onSuccess: invalidateCurrentUser,
  });
};

export const useChangePasswordMutation = () =>
  useMutation({
    mutationFn: (payload: ChangePasswordPayload) => authService.changePassword(payload),
  });
