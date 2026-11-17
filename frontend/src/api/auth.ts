import { api, setAccessToken } from "./client";
import type { AuthResponse, MeResponse } from "../types";

export interface RegisterPayload {
  organization_name: string;
  organization_slug: string;
  email: string;
  display_name: string;
  password: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export const authApi = {
  async register(payload: RegisterPayload): Promise<AuthResponse> {
    const res = await api.post<AuthResponse>("/api/v1/auth/register", payload);
    setAccessToken(res.data.access_token);
    return res.data;
  },

  async login(payload: LoginPayload): Promise<AuthResponse> {
    const res = await api.post<AuthResponse>("/api/v1/auth/login", payload);
    setAccessToken(res.data.access_token);
    return res.data;
  },

  async refresh(): Promise<AuthResponse> {
    const res = await api.post<AuthResponse>("/api/v1/auth/refresh");
    setAccessToken(res.data.access_token);
    return res.data;
  },

  async logout(): Promise<void> {
    try {
      await api.post("/api/v1/auth/logout");
    } finally {
      setAccessToken(null);
    }
  },

  async getMe(): Promise<MeResponse> {
    const res = await api.get<MeResponse>("/api/v1/auth/me");
    return res.data;
  },

  async signInToDemo(): Promise<AuthResponse> {
    const credentials: RegisterPayload = {
      organization_name: "Northstar Store",
      organization_slug: "northstar-demo",
      email: "demo@northstar.example",
      display_name: "Demo Owner",
      password: "correct horse battery",
    };
    try {
      return await this.register(credentials);
    } catch (err: unknown) {
      // If already registered, log in
      if ((err as { response?: { status?: number } }).response?.status === 409) {
        return await this.login({
          email: credentials.email,
          password: credentials.password,
        });
      }
      throw err;
    }
  },
};
