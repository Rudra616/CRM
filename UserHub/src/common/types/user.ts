export interface User {
  id: number;
  username: string;
  password: string;
  firstname: string;
  lastname: string;
  phone: string;
  email: string;
  role_id: number;
  image_url?: string | null;
  gender?: "male" | "female" | "other";
  status: 'active' | 'pending' | 'inactive' | 'delete';

}

export interface RegisterUserDTO {
  username: string;
  password: string;
  firstname: string;
  lastname: string;
  phone: string;
  email: string;
  gender?: "male" | "female" | "other";
}

export interface LoginDTO {
  username: string;
  password: string;
}

export interface UpdateProfileDTO {
  username: string;
  firstname: string;
  lastname: string;
  phone: string;
  email: string;
  newPassword?: string;
  image_url?: string;
  gender?: "male" | "female" | "other";
}

export interface UpdateAdminDTO {
  username?: string;
  email?: string;
  password?: string;
  image_url?: string | null;
}