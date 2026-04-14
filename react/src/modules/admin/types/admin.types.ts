import type { Gender } from "../../../shared/types/common.types";

export interface UpdateUserRequest {
  username: string;
  firstname: string;
  lastname: string;
  email: string;
  phone: string;
  gender: Gender;
  role_id?: number;
}

export interface UpdateAdminRequest {
  username: string;
  email: string;
}