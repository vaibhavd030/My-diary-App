"use client";

import axios, { AxiosInstance } from "axios";
import { clearAuth, getToken, AuthUser } from "./auth";

const BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

export const api: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error?.response?.status === 401 && typeof window !== "undefined") {
      clearAuth();
      if (!window.location.pathname.startsWith("/login")) {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  },
);

// ─── Domain types — mirror backend ──────────────────────────────────────

export type EntryType =
  | "meditation"
  | "cleaning"
  | "sitting"
  | "group_meditation"
  | "sleep"
  | "gym"
  | "activity"
  | "journal_note";

export interface EntryOut {
  id: string;
  entry_date: string;
  type: EntryType;
  data: Record<string, unknown>;
  updated_at: string;
}

export interface DayOut {
  date: string;
  entries: Partial<Record<EntryType, EntryOut>>;
}

export interface CalendarCell {
  date: string;
  richness: number;
  types: EntryType[];
}

export interface CalendarMonthOut {
  year: number;
  month: number;
  cells: CalendarCell[];
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user: AuthUser;
}

// ─── Auth ───────────────────────────────────────────────────────────────

export async function loginUser(
  email: string,
  password: string,
): Promise<LoginResponse> {
  const { data } = await api.post<LoginResponse>("/auth/login", { email, password });
  return data;
}

export interface RegisterPayload {
  email: string;
  password: string;
  first_name?: string;
  last_name?: string;
  abhyasi_id?: string;
}

export async function registerUser(payload: RegisterPayload): Promise<AuthUser> {
  const { data } = await api.post<AuthUser>("/auth/register", payload);
  return data;
}

// ─── Entries ────────────────────────────────────────────────────────────

export async function getDay(date: string): Promise<DayOut> {
  const { data } = await api.get<DayOut>(`/api/days/${date}`);
  return data;
}

export async function upsertEntry(
  date: string,
  type: EntryType,
  payload: Record<string, unknown>,
): Promise<EntryOut> {
  const { data } = await api.put<EntryOut>(`/api/days/${date}/${type}`, {
    data: payload,
  });
  return data;
}

export async function deleteEntry(
  date: string,
  type: EntryType,
): Promise<void> {
  await api.delete(`/api/days/${date}/${type}`);
}

export async function getCalendar(
  year: number,
  month: number,
): Promise<CalendarMonthOut> {
  const { data } = await api.get<CalendarMonthOut>(
    `/api/calendar/${year}/${month}`,
  );
  return data;
}
