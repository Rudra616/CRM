import { apiRequest } from '../../../shared/api/apiWrapper';
import type { ApiResponse } from '../../../shared/types/common.types';

export type LatestBroadcast = {
  id: number;
  message: string;
  is_delete: number;
  created_at: string;
} | null;

export const getLatestBroadcastApi = (): Promise<ApiResponse<LatestBroadcast>> =>
  apiRequest<LatestBroadcast>('GET', '/broadcast/latest');

export type MemberBroadcastRow = {
  id: number;
  message: string;
  is_delete: number;
  created_at: string;
};

export const listMemberBroadcastsApi = (
  limit = 100
): Promise<ApiResponse<{ items: MemberBroadcastRow[] }>> =>
  apiRequest<{ items: MemberBroadcastRow[] }>('GET', `/broadcast/list?limit=${limit}`);
