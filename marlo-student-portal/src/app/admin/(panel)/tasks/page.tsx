"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { adminApi } from "@/lib/admin-api";
import { ApiError } from "@/lib/api";
import { Card, CardTitle } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import type { Task, User } from "@/lib/types";
import { formatDate, taskStatusClass, taskStatusLabel } from "@/lib/utils";

export default function AdminTasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [students, setStudents] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [creating, setCreating] = useState(false);

  const [assignTaskId, setAssignTaskId] = useState<number | null>(null);
  const [selectedStudents, setSelectedStudents] = useState<number[]>([]);
  const [assigning, setAssigning] = useState(false);
  const [assignmentCounts, setAssignmentCounts] = useState<Record<number, number>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [tasksRes, studentsRes] = await Promise.all([
        adminApi.tasks({ limit: 100 }),
        adminApi.students(),
      ]);
      setTasks(tasksRes.items);
      setStudents(studentsRes);

      const counts: Record<number, number> = {};
      await Promise.all(
        tasksRes.items.slice(0, 20).map(async (t) => {
          try {
            const detail = await adminApi.task(t.id);
            counts[t.id] = detail.assignments?.length ?? 0;
          } catch {
            counts[t.id] = 0;
          }
        }),
      );
      setAssignmentCounts(counts);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Ошибка загрузки");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError("");
    setSuccess("");
    try {
      const isoDate = new Date(dueDate).toISOString();
      await adminApi.createTask({
        title,
        description: description || undefined,
        due_date: isoDate,
      });
      setTitle("");
      setDescription("");
      setDueDate("");
      setSuccess("Задача создана");
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Не удалось создать задачу");
    } finally {
      setCreating(false);
    }
  }

  function toggleStudent(id: number) {
    setSelectedStudents((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    );
  }

  async function handleAssign() {
    if (assignTaskId == null || selectedStudents.length === 0) return;
    setAssigning(true);
    setError("");
    setSuccess("");
    try {
      const res = await adminApi.assignTask(assignTaskId, selectedStudents);
      setSuccess(res.message);
      setAssignTaskId(null);
      setSelectedStudents([]);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Не удалось назначить");
    } finally {
      setAssigning(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Задачи</h1>
        <p className="mt-1 text-slate-500">Создание и назначение заданий стажёрам</p>
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}
      {success && (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {success}
        </p>
      )}

      <Card>
        <CardTitle subtitle="Новое задание для стажёров">Создать задачу</CardTitle>
        <form onSubmit={handleCreate} className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Название"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Подготовить отчёт"
          />
          <Input
            label="Дедлайн"
            type="datetime-local"
            required
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
          <div className="sm:col-span-2">
            <Input
              label="Описание"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Необязательно"
            />
          </div>
          <div className="sm:col-span-2">
            <Button type="submit" disabled={creating}>
              {creating ? "Создание…" : "Создать задачу"}
            </Button>
          </div>
        </form>
      </Card>

      <Card>
        <CardTitle subtitle={`Всего: ${tasks.length}`}>Список задач</CardTitle>
        {tasks.length === 0 ? (
          <EmptyState title="Задач пока нет" description="Создайте первую задачу выше" />
        ) : (
          <ul className="space-y-3">
            {tasks.map((task) => (
              <li
                key={task.id}
                className="rounded-xl border border-slate-100 bg-slate-50/50 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-slate-900">{task.title}</p>
                    {task.description && (
                      <p className="mt-1 text-sm text-slate-600">{task.description}</p>
                    )}
                    <p className="mt-2 text-xs text-slate-500">
                      Дедлайн: {formatDate(task.due_date)} · назначено:{" "}
                      {assignmentCounts[task.id] ?? "…"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={taskStatusClass(task.status)}>
                      {taskStatusLabel(task.status)}
                    </Badge>
                    <Button
                      type="button"
                      variant="secondary"
                      className="!px-3 !py-1.5 text-xs"
                      onClick={() => {
                        setAssignTaskId(task.id);
                        setSelectedStudents([]);
                        setSuccess("");
                        setError("");
                      }}
                    >
                      Назначить
                    </Button>
                  </div>
                </div>

                {assignTaskId === task.id && (
                  <div className="mt-4 border-t border-slate-200 pt-4">
                    <p className="mb-2 text-sm font-medium text-slate-700">
                      Выберите стажёров
                    </p>
                    {students.length === 0 ? (
                      <p className="text-sm text-slate-500">Нет зарегистрированных студентов</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {students.map((s) => (
                          <label
                            key={s.id}
                            className={`cursor-pointer rounded-lg border px-3 py-2 text-sm transition ${
                              selectedStudents.includes(s.id)
                                ? "border-brand-500 bg-brand-50 text-brand-800"
                                : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                            }`}
                          >
                            <input
                              type="checkbox"
                              className="sr-only"
                              checked={selectedStudents.includes(s.id)}
                              onChange={() => toggleStudent(s.id)}
                            />
                            {s.full_name}
                          </label>
                        ))}
                      </div>
                    )}
                    <div className="mt-3 flex gap-2">
                      <Button
                        type="button"
                        disabled={assigning || selectedStudents.length === 0}
                        onClick={handleAssign}
                      >
                        {assigning ? "Назначение…" : "Назначить выбранным"}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => setAssignTaskId(null)}
                      >
                        Отмена
                      </Button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
