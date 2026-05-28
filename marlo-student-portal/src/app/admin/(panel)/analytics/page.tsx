"use client";

import { useEffect, useState } from "react";
import { adminApi } from "@/lib/admin-api";
import { ApiError } from "@/lib/api";
import { Card, CardTitle } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import type { DashboardStats, OverdueTaskItem, TopPerformer } from "@/lib/types";
import { formatDate } from "@/lib/utils";

export default function AdminAnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [top, setTop] = useState<TopPerformer[]>([]);
  const [overdue, setOverdue] = useState<OverdueTaskItem[]>([]);

  useEffect(() => {
    async function load() {
      try {
        const [s, t, o] = await Promise.all([
          adminApi.dashboardStats(),
          adminApi.topPerformers(10),
          adminApi.overdueTasks(0, 15),
        ]);
        setStats(s);
        setTop(t.items);
        setOverdue(o.items);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Не удалось загрузить аналитику");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

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
        <h1 className="text-2xl font-bold text-slate-900">Аналитика</h1>
        <p className="mt-1 text-slate-500">Сводка по стажировкам и эффективности</p>
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      {stats && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MiniStat label="Студентов" value={stats.total_students} />
          <MiniStat
            label="Performance"
            value={`${Math.round(stats.avg_performance_score)}%`}
          />
          <MiniStat
            label="Посещаемость"
            value={`${Math.round(stats.avg_attendance_rate)}%`}
          />
          <MiniStat label="Просрочено задач" value={stats.overdue_tasks} />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardTitle subtitle="По performance score">Топ стажёров</CardTitle>
          {top.length === 0 ? (
            <EmptyState title="Данных пока нет" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-500">
                    <th className="pb-2 font-medium">#</th>
                    <th className="pb-2 font-medium">Имя</th>
                    <th className="pb-2 font-medium">Performance</th>
                    <th className="pb-2 font-medium">Задачи</th>
                  </tr>
                </thead>
                <tbody>
                  {top.map((p, i) => (
                    <tr key={p.student_id} className="border-b border-slate-50">
                      <td className="py-2.5 text-slate-400">{i + 1}</td>
                      <td className="py-2.5 font-medium text-slate-900">{p.full_name}</td>
                      <td className="py-2.5">{Math.round(p.performance_score)}%</td>
                      <td className="py-2.5 text-slate-600">
                        {p.tasks_completed}/{p.tasks_total}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card>
          <CardTitle subtitle="Требуют внимания">Просроченные задачи</CardTitle>
          {overdue.length === 0 ? (
            <EmptyState title="Просрочек нет" />
          ) : (
            <ul className="space-y-3">
              {overdue.map((item) => (
                <li
                  key={item.assignment_id}
                  className="rounded-xl border border-amber-100 bg-amber-50/50 p-3 text-sm"
                >
                  <p className="font-medium text-slate-900">{item.task_title}</p>
                  <p className="text-slate-600">{item.student_name}</p>
                  <p className="mt-1 text-xs text-amber-800">
                    Дедлайн: {formatDate(item.due_date)} · просрочка {item.days_overdue} дн.
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
      <p className="text-xs font-medium uppercase text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
    </div>
  );
}
