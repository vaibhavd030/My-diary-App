"use client";

const USER_KEY = "my_diary_user_v2";

export interface AuthUser {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  abhyasi_id: string | null;
  is_admin: boolean;
  created_at: string;
}

/**
 * Persist non-sensitive user profile data.
 * Note: The JWT is now handled by the backend via httpOnly cookies.
 */
export function setAuth(_token: string, user: AuthUser): void {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function getUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function clearAuth(): void {
  localStorage.removeItem(USER_KEY);
}

/**
 * Heuristic check for UI purposes.
 * Real authorization is enforced by the backend via httpOnly cookies.
 */
export function isAuthed(): boolean {
  return Boolean(getUser());
}
