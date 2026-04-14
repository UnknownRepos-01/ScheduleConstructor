import { apiClient } from "@/lib/api/http-client";
import { createCrudService, MutationResponse } from "@/lib/api/crud-service";

export interface ListItem {
  id: number;
  name: string;
  isActive: boolean;
}

export interface CreateListPayload {
  name: string;
}

export interface UpdateListPayload {
  name?: string;
  isActive?: boolean;
}

export interface DuplicateListPayload {
  name?: string;
}

const listCrudService = createCrudService<ListItem, CreateListPayload, UpdateListPayload>("/lists");

export const listService = {
  ...listCrudService,
  activate: (id: number): Promise<MutationResponse> => apiClient.patch<MutationResponse>(`/lists/${id}`),
  duplicate: (id: number, payload?: DuplicateListPayload): Promise<MutationResponse> =>
    apiClient.post<MutationResponse, DuplicateListPayload>(`/lists/${id}`, payload),
};
