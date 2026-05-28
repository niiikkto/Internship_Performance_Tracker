import { clearAuth, getAccessToken, getRefreshToken, saveAuth } from "./auth";
import type {
  Feedback,
  Paginated,
  StudentKPIValue,
  Submission,
  TaskAssignment,
  TaskStatus,
  TimelineEvent,
  TokenPair,
  User,
} from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

function parseApiError(body: unknown, fallback: string): string {
  if (!body || typeof body !== "object") return fallback;
  const detail = (body as { detail?: unknown }).detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((item) => {
        if (item && typeof item === "object" && "msg" in item) {
          const loc = "loc" in item && Array.isArray((item as { loc?: unknown }).loc)
            ? ((item as { loc: unknown[] }).loc).filter((p: unknown) => p !== "body").join(".")
            : "";
          return loc ? `${loc}: ${String(item.msg)}` : String(item.msg);
        }
        return JSON.stringify(item);
      })
      .join("; ");
  }
  return fallback;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

async function refreshAccessToken(): Promise<string | null> {
  const refresh = getRefreshToken();
  if (!refresh) return null;

  const res = await fetch(`${API_URL}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refresh }),
  });

  if (!res.ok) {
    clearAuth();
    return null;
  }

  const tokens = (await res.json()) as TokenPair;
  const userRes = await fetch(`${API_URL}/auth/me`, {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  if (userRes.ok) {
    const user = (await userRes.json()) as User;
    saveAuth(tokens, user);
    return tokens.access_token;
  }
  return tokens.access_token;
}

function loginRedirectPath(): string {
  if (typeof window !== "undefined" && window.location.pathname.startsWith("/admin")) {
    return "/admin/login";
  }
  return "/login";
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
  retry = true,
): Promise<T> {
  const token = getAccessToken();
  const headers = new Headers(options.headers);

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  if (!(options.body instanceof FormData)) {
    headers.set("Content-Type", headers.get("Content-Type") ?? "application/json");
  }

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, { ...options, headers });
  } catch {
    throw new ApiError(
      `Не удалось подключиться к API (${API_URL}). Убедитесь, что backend запущен: uvicorn app.main:app --reload`,
      0,
    );
  }

  if (res.status === 401 && retry) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      return request<T>(path, options, false);
    }
    clearAuth();
    if (typeof window !== "undefined") {
      window.location.href = loginRedirectPath();
    }
    throw new ApiError("Сессия истекла", 401);
  }

  if (!res.ok) {
    let message = res.statusText;
    try {
      const body = await res.json();
      message = parseApiError(body, message);
    } catch {
      /* ignore */
    }
    throw new ApiError(message, res.status);
  }

  if (res.status === 204) return undefined as T;
  const contentType = res.headers.get("content-type");
  if (contentType?.includes("application/json")) {
    return res.json() as Promise<T>;
  }
  return res.text() as Promise<T>;
}

const request = apiRequest;

export const api = {
  login: (email: string, password: string) =>
    apiRequest<TokenPair>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  register: (data: {
    full_name: string;
    email: string;
    password: string;
  }) =>
    request<User>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ ...data, role: "student" }),
    }),

  me: () => request<User>("/auth/me"),

  changePassword: (old_password: string, new_password: string) =>
    request<{ message: string }>("/auth/me/password", {
      method: "POST",
      body: JSON.stringify({ old_password, new_password }),
    }),

  myTasks: (params?: { task_status?: TaskStatus; skip?: number; limit?: number }) => {
    const q = new URLSearchParams();
    if (params?.task_status) q.set("task_status", params.task_status);
    if (params?.skip != null) q.set("skip", String(params.skip));
    if (params?.limit != null) q.set("limit", String(params.limit));
    const qs = q.toString();
    return request<Paginated<TaskAssignment>>(
      `/api/v1/tasks/my-tasks${qs ? `?${qs}` : ""}`,
    );
  },

  updateAssignment: (
    taskId: number,
    assignmentId: number,
    data: { status?: TaskStatus; feedback?: string },
  ) =>
    request<TaskAssignment>(
      `/api/v1/tasks/${taskId}/assignments/${assignmentId}`,
      { method: "PUT", body: JSON.stringify(data) },
    ),

  timeline: (skip = 0, limit = 50) =>
    request<Paginated<TimelineEvent>>(
      `/api/v1/timeline?skip=${skip}&limit=${limit}`,
    ),

  myKpi: () =>
    request<{
      student_id: number;
      performance_score: number;
      kpi_values: StudentKPIValue[];
    }>("/api/v1/kpi/my-kpi"),

  myFeedback: () =>
    request<Paginated<Feedback> & { average_score: number | null }>(
      "/api/v1/feedback/my-feedback",
    ),

  myAttendance: () =>
    request<{
      student_id: number;
      attendance_rate: number;
      items: unknown[];
      total: number;
    }>("/api/v1/attendance/my-attendance"),

  mySubmissions: () =>
    request<Paginated<Submission>>("/api/v1/submissions/my"),

  uploadSubmission: (file: File, description?: string, taskId?: number) => {
    const form = new FormData();
    form.append("file", file);
    if (description) form.append("description", description);
    if (taskId != null) form.append("task_id", String(taskId));
    return request<Submission>("/api/v1/submissions/upload", {
      method: "POST",
      body: form,
    });
  },

  downloadMyReport: async (format: "json" | "csv" = "csv") => {
    const token = getAccessToken();
    const res = await fetch(
      `${API_URL}/api/v1/reports/my-report?format=${format}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (!res.ok) throw new ApiError("Не удалось скачать отчёт", res.status);
    return res.blob();
  },
};
