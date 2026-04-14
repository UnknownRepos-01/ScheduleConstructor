import { apiClient } from "@/lib/api/http-client";

export interface DashboardStats {
  teachers: number;
  classes: number;
  classrooms: number;
  subjects: number;
  grades: number;
  lists: number;
}

export const statsService = {
  getDashboardStats: () => apiClient.get<DashboardStats>("/admin/stats"),
};

