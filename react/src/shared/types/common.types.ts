export type Gender = 'male' | 'female' | 'other';

export interface User {
  id: string | number;
  username: string;
  firstname: string;
  lastname: string;
  email: string;
  phone: string;
  role: 'admin' | 'subadmin' | 'user';
  image_url?: string | null;
  gender?: Gender;
  status?: 'active' | 'pending' | 'inactive' | 'delete';
}

export interface Admin {
  id: number;
  username: string;
  email: string;
  role: 'admin';
  image_url?: string | null;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
}

export interface UserInfo {
  id: number;
  username: string;
  role: 'admin' | 'subadmin' | 'user';
  firstname?: string;
  lastname?: string;
  email: string;
  phone?: string;
}