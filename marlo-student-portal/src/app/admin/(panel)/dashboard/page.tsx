"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users,
  ListTodo,
  AlertTriangle,
  TrendingUp,
  BarChart3,
  ArrowRight,
} from "lucide-react";
import { adminApi } from "@/lib/admin-api";
import { getStoredUser, isAdminLoggedIn } from "@/lib/auth";
import { Card, CardTitle } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import type { DashboardStats } from "@/lib/types";

export default function AdminDashboardPage() {
  const user = getStoredUser();
  const isAdmin = isAdminLoggedIn();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    adminApi
      .dashboardStats()
      .then(setStats)
      .catch(() => setStats(null))
      .finally(() => setLoading(false));
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
          Здравствуйте, {user?.full_name?.split(" ")[0] ?? "коллега"}!
        </h1>
        <p className="mt-1 text-slate-500">
          {isAdmin
            ? "Обзор системы и быстрый доступ к разделам"
            : "Аналитика и управление стажёрами"}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          icon={<Users className="h-5 w-5 text-blue-600" />}
          label="Студентов"
          value={String(stats?.total_students ?? 0)}
        />
        <StatCard
          icon={<TrendingUp className="h-5 w-5 text-emerald-600" />}
          label="Средний performance"
          value={`${Math.round(stats?.avg_performance_score ?? 0)}%`}
        />
        <StatCard
          icon={<BarChart3 className="h-5 w-5 text-brand-600" />}
          label="Средняя посещаемость"
          value={`${Math.round(stats?.avg_attendance_rate ?? 0)}%`}
        />
        <StatCard
          icon={<ListTodo className="h-5 w-5 text-indigo-600" />}
          label="Активных задач"
          value={String(stats?.active_tasks ?? 0)}
        />
        <StatCard
          icon={<AlertTriangle className="h-5 w-5 text-amber-600" />}
          label="Просрочено"
          value={String(stats?.overdue_tasks ?? 0)}
        />
        <StatCard
          icon={<BarChart3 className="h-5 w-5 text-violet-600" />}
          label="Средняя оценка"
          value={
            stats?.avg_feedback_score != null
              ? stats.avg_feedback_score.toFixed(1)
              : "—"
          }
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <QuickLink
          href="/admin/tasks"
          title="Задачи"
          desc="Создание и назначение стажёрам"
        />
        <QuickLink
          href="/admin/reviews"
          title="Оценки"
          desc="Feedback и KPI"
        />
        <QuickLink
          href="/admin/analytics"
          title="Статистика"
          desc="Рейтинги, просрочки, динамика"
        />
        {isAdmin && (
          <>
            <QuickLink
              href="/admin/users"
              title="Пользователи"
              desc="Роли, активация аккаунтов"
            />
            <QuickLink
              href="/admin/system"
              title="Система"
              desc="Шаблоны KPI, проверка дедлайнов"
            />
          </>
        )}
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
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
        </div>
      </div>
    </Card>
  );
}

function QuickLink({
  href,
  title,
  desc,
}: {
  href: string;
  title: string;
  desc: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-card transition hover:border-amber-300 hover:shadow-elevated"
    >
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-slate-900">{title}</h3>
        <ArrowRight className="h-4 w-4 text-slate-400 transition group-hover:text-amber-600" />
      </div>
      <p className="mt-1 text-sm text-slate-500">{desc}</p>
    </Link>
  );
}
