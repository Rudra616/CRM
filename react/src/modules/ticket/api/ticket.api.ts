import axiosClient from '../../../shared/api/axiosClient';
import { apiRequest } from '../../../shared/api/apiWrapper';
import type { ApiResponse } from '../../../shared/types/common.types';
import type {
  OwnerTicketUnreadSummary,
  StaffTicketUnreadSummary,
  TicketListResponse,
  TicketStatus,
  TicketThreadResponse,
} from '../types/ticket.types';

const buildListQuery = (params?: { page?: number; limit?: number; search?: string }): string => {
  const query = new URLSearchParams({
    page: String(params?.page ?? 1),
    limit: String(params?.limit ?? 10),
  });
  const search = params?.search?.trim();
  if (search) query.set('search', search);
  return query.toString();
};

export const createTicketApi = async (
  payload: { subject: string; description: string },
  imageFile?: File | null
): Promise<ApiResponse<{ ticketId: number }>> => {
  const formData = new FormData();
  formData.append('subject', payload.subject);
  formData.append('description', payload.description);
  if (imageFile) formData.append('image', imageFile);
  const res = await axiosClient.post<ApiResponse<{ ticketId: number }>>('/ticket/create', formData);
  return res.data;
};

/** Owner-only: PUT /ticket/:id — same validation as create; optional image replaces attachment */
export const updateMyTicketApi = async (
  ticketId: number,
  payload: { subject: string; description: string },
  imageFile?: File | null
): Promise<ApiResponse<null>> => {
  const formData = new FormData();
  formData.append('subject', payload.subject);
  formData.append('description', payload.description);
  if (imageFile) formData.append('image', imageFile);
  const res = await axiosClient.put<ApiResponse<null>>(`/ticket/${ticketId}`, formData);
  return res.data;
};

export const getMyTicketsApi = (params?: {
  page?: number;
  limit?: number;
  search?: string;
}): Promise<ApiResponse<TicketListResponse>> =>
  apiRequest<TicketListResponse>('GET', `/ticket/my-tickets?${buildListQuery(params)}`);

export const getMyTicketUnreadSummaryApi = (): Promise<ApiResponse<OwnerTicketUnreadSummary>> =>
  apiRequest<OwnerTicketUnreadSummary>('GET', '/ticket/my-unread-summary');

export const getStaffTicketUnreadSummaryApi = (): Promise<ApiResponse<StaffTicketUnreadSummary>> =>
  apiRequest<StaffTicketUnreadSummary>('GET', '/ticket/staff-unread-summary');

export const getAllTicketsApi = (params?: {
  page?: number;
  limit?: number;
  search?: string;
}): Promise<ApiResponse<TicketListResponse>> =>
  apiRequest<TicketListResponse>('GET', `/ticket?${buildListQuery(params)}`);

export const updateTicketStatusApi = (
  ticketId: number,
  status: TicketStatus
): Promise<ApiResponse<null>> =>
  apiRequest<null>('PUT', `/ticket/${ticketId}/status`, { status });

export const getTicketMessagesApi = (
  ticketId: number
): Promise<ApiResponse<TicketThreadResponse>> =>
  apiRequest<TicketThreadResponse>('GET', `/ticket/${ticketId}/messages`);

export const addTicketMessageApi = async (
  ticketId: number,
  message: string,
  imageFile?: File | null
): Promise<ApiResponse<null>> => {
  const formData = new FormData();
  formData.append('ticket_id', String(ticketId));
  formData.append('message', message);
  if (imageFile) formData.append('image', imageFile);
  const res = await axiosClient.post<ApiResponse<null>>('/ticket/message', formData);
  return res.data;
};

