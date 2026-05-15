export interface BroadcastRow {
  id: number;
  message: string;
  is_delete: number;
  created_at: Date | string;
}
export interface BroadcastResponse {
  id: number;
  message: string;
  created_at: string;
}

export interface CreateBroadcastInput {
  message: string;
}
