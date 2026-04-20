import axiosClient from '../../../shared/api/axiosClient';
import { apiRequest } from '../../../shared/api/apiWrapper';
import type { ApiResponse } from '../../../shared/types/common.types';
import type {
  TicketItem,
  TicketStatus,
  TicketThreadResponse,
} from '../types/ticket.types';

export const createTicketApi = async (
  payload: { subject: string; description: string },
  imageFile?: File | null
): Promise<ApiResponse<{ ticketId: number }>> => {
  const formData = new FormData();
  formData.append('subject', payload.subject);
  formData.append('description', payload.description);
  if (imageFile) formData.append('image', imageFile);
  const res = await axiosClient.post<ApiResponse<{ ticketId: number }>>('/tickit/create', formData);
  return res.data;
};

/** Owner-only: PUT /tickit/:id — same validation as create; optional image replaces attachment */
export const updateMyTicketApi = async (
  ticketId: number,
  payload: { subject: string; description: string },
  imageFile?: File | null
): Promise<ApiResponse<null>> => {
  const formData = new FormData();
  formData.append('subject', payload.subject);
  formData.append('description', payload.description);
  if (imageFile) formData.append('image', imageFile);
  const res = await axiosClient.put<ApiResponse<null>>(`/tickit/${ticketId}`, formData);
  return res.data;
};

export const getMyTicketsApi = (): Promise<ApiResponse<{ tickets: TicketItem[] }>> =>
  apiRequest<{ tickets: TicketItem[] }>('GET', '/tickit/my-tickets');

export const getAllTicketsApi = (): Promise<ApiResponse<{ tickets: TicketItem[] }>> =>
  apiRequest<{ tickets: TicketItem[] }>('GET', '/tickit/all');

export const updateTicketStatusApi = (
  ticketId: number,
  status: TicketStatus
): Promise<ApiResponse<null>> =>
  apiRequest<null>('PUT', `/tickit/${ticketId}/status`, { status });

export const getTicketMessagesApi = (
  ticketId: number
): Promise<ApiResponse<TicketThreadResponse>> =>
  apiRequest<TicketThreadResponse>('GET', `/tickit/${ticketId}/messages`);

export const addTicketMessageApi = (
  ticketId: number,
  message: string
): Promise<ApiResponse<null>> =>
  apiRequest<null>('POST', '/tickit/message', { ticket_id: ticketId, message });

