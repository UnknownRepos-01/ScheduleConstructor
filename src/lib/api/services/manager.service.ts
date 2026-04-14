import { apiClient } from "@/lib/api/http-client";

export interface CreateManagerPayload {
  name: string;
  surname: string;
  patronymic?: string;
  login: string;
  password: string;
}

export interface CreateManagerResponse {
  message: string;
  insertId?: number;
}

export interface Manager {
  id: number;
  name: string;
  surname: string;
  patronymic: string | null;
  login: string;
}

export const managerService = {
  list: (): Promise<Manager[]> => apiClient.get<Manager[]>("/users/managers"),
  create: (payload: CreateManagerPayload): Promise<CreateManagerResponse> =>
    apiClient.post<CreateManagerResponse, CreateManagerPayload>("/users/managers", payload),
};
