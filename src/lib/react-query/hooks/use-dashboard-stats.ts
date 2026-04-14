"use client";

import { useQuery } from "@tanstack/react-query";

import { statsService } from "@/lib/api/services/stats.service";
import { queryKeys } from "@/lib/react-query/query-keys";

export const useDashboardStatsQuery = () =>
  useQuery({
    queryKey: queryKeys.dashboard.stats,
    queryFn: statsService.getDashboardStats,
    staleTime: 30_000,
    gcTime: 10 * 60_000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
