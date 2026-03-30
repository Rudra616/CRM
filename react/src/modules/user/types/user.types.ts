import type { Gender } from '../../../shared/types/common.types';

export interface UpdateProfileRequest {
  username: string;
  firstname: string;
  lastname: string;
  email: string;
  phone: string;
  gender?: Gender;
}