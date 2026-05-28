"use client";

import type { TokenPair, User } from "./types";

const ACCESS_KEY = "marlo_access_token";
const REFRESH_KEY = "marlo_refresh_token";
const USER_KEY = "marlo_user";

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACCESS_KEY);
}

export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(REFRESH_KEY);
}

export function getStoredUser(): User | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

export function saveTokens(tokens: TokenPair) {
  localStorage.setItem(ACCESS_KEY, tokens.access_token);
  localStorage.setItem(REFRESH_KEY, tokens.refresh_token);
}

export function saveAuth(tokens: TokenPair, user: User) {
  saveTokens(tokens);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearAuth() {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(USER_KEY);
}

export function isStudentLoggedIn(): boolean {
  const user = getStoredUser();
  const token = getAccessToken();
  return Boolean(token && user?.role === "student");
}

export function isStaffLoggedIn(): boolean {
  const user = getStoredUser();
  const token = getAccessToken();
  return Boolean(
    token && (user?.role === "admin" || user?.role === "manager"),
  );
}

export function isAdminLoggedIn(): boolean {
  const user = getStoredUser();
  const token = getAccessToken();
  return Boolean(token && user?.role === "admin");
}
