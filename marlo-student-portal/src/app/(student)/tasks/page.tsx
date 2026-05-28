"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/EmptyState";
import { Spinner } from "@/components/ui/Spinner";
import {
  formatDate,
  taskStatusClass,
  taskStatusLabel,
} from "@/lib/utils";
import type { TaskAssignment, TaskStatus } from "@/lib/types";

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "Все статусы" },
  { value: "pending", label: "Ожидает" },
  { value: "in_progress", label: "В работе" },
  { value: "done", label: "Выполнено" },
  { value: "overdue", label: "Просрочено" },
];

export default function TasksPage() {
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [items, setItems] = useState<TaskAssignment[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setMessage("");
    try {
      const res = await api.myTasks({
        task_status: statusFilter ? (statusFilter as TaskStatus) : undefined,
        limit: 50,
      });
      setItems(res.items);
      setTotal(res.total);
    } catch (err) {
      setMessage(err instanceof ApiError ? err.message : "Ошибка загрузки");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  async function updateStatus(
    assignment: TaskAssignment,
    status: TaskStatus,
  ) {
    setUpdatingId(assignment.id);
    try {
      await api.updateAssignment(assignment.task_id, assignment.id, {
        status,
      });
      await load();
    } catch (err) {
      setMessage(err instanceof ApiError ? err.message : "Не удалось обновить");
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Мои задачи</h1>
          <p className="mt-1 text-slate-500">
            {total} {total === 1 ? "задача" : total < 5 ? "задачи" : "задач"}
          </p>
        </div>
        <div className="w-full sm:w-56">
          <Select
            label="Фильтр по статусу"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {message && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {message}
        </p>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      ) : items.length === 0 ? (
        <Card>
          <EmptyState
            title="Задач не найдено"
            description={
              statusFilter
                ? "Попробуйте сбросить фильтр"
                : "Менеджер ещё не назначил вам задачи"
            }
          />
        </Card>
      ) : (
        <ul className="space-y-4">
          {items.map((a) => (
            <li key={a.id}>
              <Card className="transition hover:shadow-elevated">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-semibold text-slate-900">
                        {a.task.title}
                      </h3>
                      <Badge className={taskStatusClass(a.status)}>
                        {taskStatusLabel(a.status)}
                      </Badge>
                    </div>
                    {a.task.description && (
                      <p className="mt-2 text-sm text-slate-600">
                        {a.task.description}
                      </p>
                    )}
                    <p className="mt-2 text-xs text-slate-500">
                      Срок: {formatDate(a.task.due_date)}
                    </p>
                    {a.feedback && (
                      <p className="mt-2 rounded-lg bg-slate-50 p-2 text-sm text-slate-600">
                        Отзыв: {a.feedback}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {a.status !== "in_progress" && a.status !== "done" && (
                      <Button
                        variant="secondary"
                        disabled={updatingId === a.id}
                        onClick={() => updateStatus(a, "in_progress")}
                      >
                        В работу
                      </Button>
                    )}
                    {a.status !== "done" && (
                      <Button
                        disabled={updatingId === a.id}
                        onClick={() => updateStatus(a, "done")}
                      >
                        Выполнено
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
