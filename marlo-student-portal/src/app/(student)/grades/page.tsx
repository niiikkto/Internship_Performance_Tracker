"use client";

import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { Card, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Spinner } from "@/components/ui/Spinner";
import { formatDateTime } from "@/lib/utils";
import type { Feedback, StudentKPIValue } from "@/lib/types";

export default function GradesPage() {
  const [loading, setLoading] = useState(true);
  const [performance, setPerformance] = useState(0);
  const [kpiValues, setKpiValues] = useState<StudentKPIValue[]>([]);
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [avgScore, setAvgScore] = useState<number | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      setError("");
      const [kpiResult, feedbackResult] = await Promise.allSettled([
        api.myKpi(),
        api.myFeedback(),
      ]);

      if (kpiResult.status === "fulfilled") {
        setPerformance(kpiResult.value.performance_score ?? 0);
        setKpiValues(kpiResult.value.kpi_values ?? []);
      } else {
        const msg =
          kpiResult.reason instanceof ApiError
            ? kpiResult.reason.message
            : "Не удалось загрузить KPI";
        setError((prev) => (prev ? `${prev}; ${msg}` : msg));
      }

      if (feedbackResult.status === "fulfilled") {
        setFeedbacks(feedbackResult.value.items ?? []);
        setAvgScore(feedbackResult.value.average_score ?? null);
      } else {
        const msg =
          feedbackResult.reason instanceof ApiError
            ? feedbackResult.reason.message
            : "Не удалось загрузить отзывы";
        setError((prev) => (prev ? `${prev}; ${msg}` : msg));
      }

      setLoading(false);
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
        <h1 className="text-2xl font-bold text-slate-900">Мои оценки и KPI</h1>
        <p className="mt-1 text-slate-500">Показатели эффективности и обратная связь</p>
      </div>

      {error && (
        <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {error}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="bg-gradient-to-br from-brand-600 to-brand-800 !border-0 text-white">
          <p className="text-sm font-medium text-brand-100">Performance Score</p>
          <p className="mt-2 text-5xl font-bold">{Math.round(performance)}%</p>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/20">
            <div
              className="h-full rounded-full bg-white transition-all"
              style={{ width: `${Math.min(100, performance)}%` }}
            />
          </div>
        </Card>
        <Card>
          <CardTitle subtitle="По всем отзывам">Средняя оценка</CardTitle>
          <p className="text-4xl font-bold text-slate-900">
            {avgScore != null ? avgScore.toFixed(1) : "—"}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            {feedbacks.length} отзывов
          </p>
        </Card>
      </div>

      <Card>
        <CardTitle subtitle="Взвешенные метрики">KPI</CardTitle>
        {kpiValues.length === 0 ? (
          <EmptyState
            title="KPI ещё не выставлены"
            description="Менеджер добавит показатели позже"
          />
        ) : (
          <div className="space-y-4">
            {kpiValues.map((k) => {
              const max = k.template?.max_value ?? 100;
              const pct = max > 0 ? (k.value / max) * 100 : 0;
              return (
                <div key={k.id}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="font-medium text-slate-900">
                      {k.template?.name ?? "KPI"}
                    </span>
                    <span className="text-slate-500">
                      {k.value} / {max}
                      {k.template?.weight != null
                        ? ` (вес ${k.template.weight}%)`
                        : ""}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-brand-500 transition-all"
                      style={{ width: `${Math.min(100, pct)}%` }}
                    />
                  </div>
                  {k.template?.description && (
                    <p className="mt-1 text-xs text-slate-500">
                      {k.template.description}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Card>
        <CardTitle subtitle="От менеджера">Обратная связь</CardTitle>
        {feedbacks.length === 0 ? (
          <EmptyState title="Отзывов пока нет" />
        ) : (
          <ul className="divide-y divide-slate-100">
            {feedbacks.map((f) => (
              <li key={f.id} className="py-4 first:pt-0 last:pb-0">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium capitalize text-brand-600">
                      {f.feedback_type}
                    </p>
                    <p className="mt-1 text-slate-800">{f.content}</p>
                    <p className="mt-1 text-xs text-slate-400">
                      {formatDateTime(f.created_at)}
                    </p>
                  </div>
                  {f.score != null && (
                    <span className="shrink-0 rounded-xl bg-emerald-50 px-3 py-1 text-lg font-bold text-emerald-700">
                      {f.score}
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
