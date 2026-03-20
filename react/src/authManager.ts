import { roleIdToRole } from "./utils/roleUtils";

export interface UserInfo {
  id: number;
  username: string;
  role: "admin" | "subadmin" | "user";
  firstname?: string;
  lastname?: string;
  email: string;
  phone?: string;
}

class AuthManager {
  private TOKEN_KEY = "token";
  private USER_KEY = "user";

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  setToken(token: string) {
    localStorage.setItem(this.TOKEN_KEY, token);
  }

  clearToken() {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  setUser(user: UserInfo) {
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
  }

  getUser(): UserInfo | null {
  const raw = localStorage.getItem(this.USER_KEY);
  if (!raw) return null;

  const user = JSON.parse(raw);

  if (typeof user.role === "number") {
    user.role = roleIdToRole(user.role);
  }

  return user;
}
}

export default new AuthManager();