import { apiClient } from "@/lib/api/http-client";

export interface SessionUser {
  id: number;
  name: string;
  surname: string;
  patronymic: string | null;
  login: string;
  roleId: number;
  roleName: string;
}

export interface LoginPayload {
  login: string;
  password: string;
}

export interface LoginResponse {
  message: string;
  user: SessionUser;
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface ChangePasswordResponse {
  message: string;
}

export interface LogoutResponse {
  message: string;
}

export interface CurrentUserResponse {
  user: SessionUser | null;
}

export const authService = {
  login: (payload: LoginPayload): Promise<LoginResponse> =>
    apiClient.post<LoginResponse, LoginPayload>("/auth/login", payload),

  logout: (): Promise<LogoutResponse> => apiClient.post<LogoutResponse>("/auth/logout"),

  getCurrentUser: (): Promise<CurrentUserResponse> => apiClient.get<CurrentUserResponse>("/auth/me"),

  changePassword: (payload: ChangePasswordPayload): Promise<ChangePasswordResponse> =>
    apiClient.post<ChangePasswordResponse, ChangePasswordPayload>("/auth/change-password", payload),
};
