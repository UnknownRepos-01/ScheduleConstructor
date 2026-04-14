import { authService, SessionUser } from "@/lib/api/services/auth.service";

export const userService = {
  getCurrentUser: async (): Promise<SessionUser | null> => {
    const response = await authService.getCurrentUser();
    return response.user;
  },
};
