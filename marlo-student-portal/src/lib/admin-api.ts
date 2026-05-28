import { apiRequest } from "./api";
import type {
  DashboardStats,
  Feedback,
  KPITemplate,
  OverdueTaskItem,
  Paginated,
  Role,
  StudentKPIValue,
  StudentRanking,
  Task,
  TaskDetail,
  TopPerformer,
  User,
} from "./types";

export const adminApi = {
  students: () => apiRequest<User[]>("/auth/students"),

  users: () => apiRequest<User[]>("/auth/users"),

  tasks: (params?: { skip?: number; limit?: number; search?: string }) => {
    const q = new URLSearchParams();
    if (params?.skip != null) q.set("skip", String(params.skip));
    if (params?.limit != null) q.set("limit", String(params.limit));
    if (params?.search) q.set("search", params.search);
    const qs = q.toString();
    return apiRequest<Paginated<Task>>(`/api/v1/tasks${qs ? `?${qs}` : ""}`);
  },

  task: (taskId: number) => apiRequest<TaskDetail>(`/api/v1/tasks/${taskId}`),

  createTask: (data: {
    title: string;
    description?: string;
    due_date: string;
  }) =>
    apiRequest<Task>("/api/v1/tasks", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  assignTask: (taskId: number, studentIds: number[]) =>
    apiRequest<{ message: string }>(`/api/v1/tasks/${taskId}/assign`, {
      method: "POST",
      body: JSON.stringify({ task_id: taskId, student_ids: studentIds }),
    }),

  createFeedback: (data: {
    student_id: number;
    content: string;
    score?: number;
    task_id?: number;
    feedback_type?: "general" | "task" | "performance";
  }) =>
    apiRequest<Feedback>("/api/v1/feedback", {
      method: "POST",
      body: JSON.stringify({ feedback_type: "general", ...data }),
    }),

  studentFeedback: (studentId: number, skip = 0, limit = 20) =>
    apiRequest<Paginated<Feedback> & { average_score: number | null }>(
      `/api/v1/feedback/${studentId}?skip=${skip}&limit=${limit}`,
    ),

  studentKpi: (studentId: number) =>
    apiRequest<{
      student_id: number;
      performance_score: number;
      kpi_values: StudentKPIValue[];
    }>(`/api/v1/kpi/student/${studentId}`),

  setKpiValue: (studentId: number, templateId: number, value: number) =>
    apiRequest<StudentKPIValue>("/api/v1/kpi/values", {
      method: "POST",
      body: JSON.stringify({
        student_id: studentId,
        template_id: templateId,
        value,
      }),
    }),

  rankings: (skip = 0, limit = 50) =>
    apiRequest<Paginated<StudentRanking>>(
      `/api/v1/rankings?skip=${skip}&limit=${limit}`,
    ),

  deactivateUser: (userId: number) =>
    apiRequest<{ message: string }>(`/auth/users/${userId}/deactivate`, {
      method: "PATCH",
    }),

  activateUser: (userId: number) =>
    apiRequest<{ message: string }>(`/auth/users/${userId}/activate`, {
      method: "PATCH",
    }),

  updateUserRole: (userId: number, role: Role) =>
    apiRequest<User>(`/auth/users/${userId}/role`, {
      method: "PATCH",
      body: JSON.stringify({ role }),
    }),

  dashboardStats: () =>
    apiRequest<DashboardStats>("/api/v1/dashboard/stats"),

  topPerformers: (limit = 10) =>
    apiRequest<{ items: TopPerformer[]; total: number }>(
      `/api/v1/top-performers?limit=${limit}`,
    ),

  overdueTasks: (skip = 0, limit = 20) =>
    apiRequest<Paginated<OverdueTaskItem>>(
      `/api/v1/overdue-tasks?skip=${skip}&limit=${limit}`,
    ),

  kpiTemplates: (skip = 0, limit = 50) =>
    apiRequest<Paginated<KPITemplate>>(
      `/api/v1/kpi/templates?skip=${skip}&limit=${limit}`,
    ),

  createKpiTemplate: (data: {
    name: string;
    description?: string;
    weight: number;
    max_value?: number;
  }) =>
    apiRequest<KPITemplate>("/api/v1/kpi/templates", {
      method: "POST",
      body: JSON.stringify({
        max_value: 100,
        ...data,
      }),
    }),

  updateKpiTemplate: (
    id: number,
    data: Partial<{
      name: string;
      description: string;
      weight: number;
      max_value: number;
    }>,
  ) =>
    apiRequest<KPITemplate>(`/api/v1/kpi/templates/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  checkOverdue: () =>
    apiRequest<{ message: string; updated_count?: number }>(
      "/api/v1/tasks/check-overdue",
      { method: "POST" },
    ),
};
