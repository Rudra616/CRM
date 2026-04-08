import type { UserInfo } from "./types/common.types";
const USER_KEY = 'user_info';

export const saveUserToStorage = (user: UserInfo) => {
  localStorage.setItem(USER_KEY, JSON.stringify({
    id: user.id,
    role: user.role,
    username: user.username,
    email: user.email,
    firstname: user.firstname,
    lastname: user.lastname,
    phone: user.phone,
  }));
};

export const loadUserFromStorage = (): UserInfo | null => {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const clearUserStorage = () => {
  localStorage.removeItem(USER_KEY);
};