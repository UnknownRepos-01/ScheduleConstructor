import { apiClient } from "@/lib/api/http-client";

export interface MutationResponse {
  message: string;
  insertId?: number;
}

export interface CrudService<TEntity, TCreate, TUpdate> {
  list: () => Promise<TEntity[]>;
  create: (payload: TCreate) => Promise<MutationResponse>;
  update: (id: number, payload: TUpdate) => Promise<MutationResponse>;
  remove: (id: number) => Promise<MutationResponse>;
}

export const createCrudService = <TEntity, TCreate, TUpdate>(
  resourcePath: string,
): CrudService<TEntity, TCreate, TUpdate> => ({
  list: () => apiClient.get<TEntity[]>(resourcePath),
  create: (payload) => apiClient.post<MutationResponse, TCreate>(resourcePath, payload),
  update: (id, payload) => apiClient.put<MutationResponse, TUpdate>(`${resourcePath}/${id}`, payload),
  remove: (id) => apiClient.delete<MutationResponse>(`${resourcePath}/${id}`),
});
