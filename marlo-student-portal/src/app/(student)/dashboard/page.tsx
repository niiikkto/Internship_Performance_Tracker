"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ListTodo,
  BarChart3,
  Clock,
  TrendingUp,
  ArrowRight,
} from "lucide-react";
import { api } from "@/lib/api";
import { getStoredUser } from "@/lib/auth";
import { Card, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { formatDate, taskStatusClass, taskStatusLabel } from "@/lib/utils";
import type { TaskAssignment, TimelineEvent } from "@/lib/types";

export default function DashboardPage() {
  const user = getStoredUser();
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<TaskAssignment[]>([]);
  const [performance, setPerformance] = useState(0);
  const [avgFeedback, setAvgFeedback] = useState<number | null>(null);
  const [attendanceRate, setAttendanceRate] = useState<number | null>(null);
  const [recentEvents, setRecentEvents] = useState<TimelineEvent[]>([]);
  const [taskStats, setTaskStats] = useState({
    pending: 0,
    inProgress: 0,
    done: 0,
    total: 0,
  });

  useEffect(() => {
    async function load() {
      try {
        const [tasksRes, kpiRes, feedbackRes, attendanceRes, timelineRes] =
          await Promise.all([
            api.myTasks({ limit: 100 }),
            api.myKpi(),
            api.myFeedback(),
            api.myAttendance(),
            api.timeline(0, 5),
          ]);
        setTasks(tasksRes.items.slice(0, 5));
        setPerformance(kpiRes.performance_score);
        const all = tasksRes.items;
        setTaskStats({
          pending: all.filter((t) => t.status === "pending").length,
          inProgress: all.filter((t) => t.status === "in_progress").length,
          done: all.filter((t) => t.status === "done").length,
          total: tasksRes.total,
        });
        setAvgFeedback(feedbackRes.average_score);
        setAttendanceRate(attendanceRes.attendance_rate);
        setRecentEvents(timelineRes.items);
      } catch {
        /* handled by api client */
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
        <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
          Привет, {user?.full_name?.split(" ")[0] ?? "студент"}!
        </h1>
        <p className="mt-1 text-slate-500">Обзор вашей стажировки</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={<TrendingUp className="h-5 w-5 text-brand-600" />}
          label="Performance"
          value={`${Math.round(performance)}%`}
          hint="Взвешенный KPI"
        />
        <StatCard
          icon={<BarChart3 className="h-5 w-5 text-emerald-600" />}
          label="Средняя оценка"
          value={avgFeedback != null ? `${avgFeedback}` : "—"}
          hint="По отзывам менеджера"
        />
        <StatCard
          icon={<ListTodo className="h-5 w-5 text-blue-600" />}
          label="Задачи"
          value={`${taskStats.done} / ${taskStats.total || "—"}`}
          hint={`${taskStats.inProgress} в работе`}
        />
        <StatCard
          icon={<Clock className="h-5 w-5 text-amber-600" />}
          label="Посещаемость"
          value={
            attendanceRate != null ? `${attendanceRate}%` : "—"
          }
          hint="За весь период"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <div className="flex items-center justify-between">
            <CardTitle subtitle="Ближайшие дедлайны">Мои задачи</CardTitle>
            <Link
              href="/tasks"
              className="flex items-center gap-1 text-sm font-medium text-brand-600 hover:underline"
            >
              Все <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          {tasks.length === 0 ? (
            <p className="text-sm text-slate-500">Задач пока нет</p>
          ) : (
            <ul className="space-y-3">
              {tasks.map((a) => (
                <li
                  key={a.id}
                  className="flex items-start justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/50 p-3"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-900">
                      {a.task.title}
                    </p>
                    <p className="text-xs text-slate-500">
                      до {formatDate(a.task.due_date)}
                    </p>
                  </div>
                  <Badge className={taskStatusClass(a.status)}>
                    {taskStatusLabel(a.status)}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <CardTitle subtitle="Последние события">Активность</CardTitle>
            <Link
              href="/timeline"
              className="flex items-center gap-1 text-sm font-medium text-brand-600 hover:underline"
            >
              Вся лента <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          {recentEvents.length === 0 ? (
            <p className="text-sm text-slate-500">Событий пока нет</p>
          ) : (
            <ul className="space-y-3">
              {recentEvents.map((e) => (
                <li key={e.id} className="flex gap-3 text-sm">
                  <span className="mt-0.5 shrink-0 text-lg">
                    {e.event_type === "kpi_updated"
                      ? "📊"
                      : e.event_type === "report_uploaded"
                        ? "📎"
                        : "📋"}
                  </span>
                  <div>
                    <p className="text-slate-800">{e.description}</p>
                    <p className="text-xs text-slate-400">
                      {new Date(e.created_at).toLocaleString("ru-RU")}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <Card className="!p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50">
          {icon}
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            {label}
          </p>
          <p className="text-xl font-bold text-slate-900">{value}</p>
          <p className="text-xs text-slate-400">{hint}</p>
        </div>
      </div>
    </Card>
  );
}
