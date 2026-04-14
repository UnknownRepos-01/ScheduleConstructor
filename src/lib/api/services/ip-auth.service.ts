import { apiClient } from "@/lib/api/http-client";

export interface IpAuthUser {
  id: number;
  name: string;
  surname: string;
  patronymic: string | null;
  login: string;
  roleId: number;
}

export interface IpAuthRecord {
  id: number;
  userId: number;
  ip: string;
  statusId: number;
  statusName: string | null;
  deviceName: string | null;
  browser: string | null;
  createdAt: string;
  user: IpAuthUser | null;
}

export interface UpdateIpAuthPayload {
  id?: number;
  approved: boolean;
}

export interface UpdateIpAuthResponse {
  message: string;
}

export interface SelfPendingIpAuthRecord {
  id: number;
  ip: string;
  createdAt: string;
}

export interface SelfPendingIpAuthsResponse {
  canConfirmFromCurrentIp: boolean;
  records: SelfPendingIpAuthRecord[];
}

export interface ConfirmSelfIpAuthPayload {
  id: number;
}

export const ipAuthService = {
  list: (): Promise<IpAuthRecord[]> => apiClient.get<IpAuthRecord[]>("/ip-auths"),
  update: (payload: UpdateIpAuthPayload): Promise<UpdateIpAuthResponse> =>
    apiClient.patch<UpdateIpAuthResponse, UpdateIpAuthPayload>("/ip-auths", payload),
  listSelfPending: (): Promise<SelfPendingIpAuthsResponse> => apiClient.get<SelfPendingIpAuthsResponse>("/ip-auths/self"),
  confirmSelf: (payload: ConfirmSelfIpAuthPayload): Promise<UpdateIpAuthResponse> =>
    apiClient.post<UpdateIpAuthResponse, ConfirmSelfIpAuthPayload>("/ip-auths/self", payload),
};
