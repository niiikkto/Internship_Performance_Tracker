import type { TaskStatus } from "./types";

export function formatDate(date: string) {
  return new Date(date).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(date: string) {
  return new Date(date).toLocaleString("ru-RU", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const STATUS_LABELS: Record<TaskStatus, string> = {
  pending: "Ожидает",
  in_progress: "В работе",
  done: "Выполнено",
  overdue: "Просрочено",
};

const STATUS_COLORS: Record<TaskStatus, string> = {
  pending: "bg-slate-100 text-slate-700",
  in_progress: "bg-blue-100 text-blue-800",
  done: "bg-emerald-100 text-emerald-800",
  overdue: "bg-red-100 text-red-800",
};

export function taskStatusLabel(status: TaskStatus) {
  return STATUS_LABELS[status] ?? status;
}

export function taskStatusClass(status: TaskStatus) {
  return STATUS_COLORS[status] ?? "bg-slate-100 text-slate-700";
}

const EVENT_ICONS: Record<string, string> = {
  task_created: "📋",
  task_assigned: "📌",
  task_completed: "✅",
  kpi_updated: "📊",
  report_uploaded: "📎",
  feedback_added: "💬",
};

export function eventIcon(type: string) {
  return EVENT_ICONS[type] ?? "•";
}
