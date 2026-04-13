"use client";

import Cookies from "js-cookie";

const TOKEN_KEY = "my_diary_token";
const USER_KEY = "my_diary_user";

export interface AuthUser {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  abhyasi_id: string | null;
  created_at: string;
}

export function setAuth(token: string, user: AuthUser): void {
  Cookies.set(TOKEN_KEY, token, { expires: 7, sameSite: "lax" });
  Cookies.set(USER_KEY, JSON.stringify(user), { expires: 7, sameSite: "lax" });
}

export function getToken(): string | undefined {
  return Cookies.get(TOKEN_KEY);
}

export function getUser(): AuthUser | null {
  const raw = Cookies.get(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function clearAuth(): void {
  Cookies.remove(TOKEN_KEY);
  Cookies.remove(USER_KEY);
}

export function isAuthed(): boolean {
  return Boolean(getToken());
}
