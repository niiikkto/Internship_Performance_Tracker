"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { adminApi } from "@/lib/admin-api";
import { ApiError } from "@/lib/api";
import { Card, CardTitle } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/EmptyState";
import type { Feedback, KPITemplate, User } from "@/lib/types";

export default function AdminReviewsPage() {
  const [students, setStudents] = useState<User[]>([]);
  const [templates, setTemplates] = useState<KPITemplate[]>([]);
  const [studentId, setStudentId] = useState<number | "">("");
  const [loading, setLoading] = useState(true);
  const [loadingStudent, setLoadingStudent] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [avgScore, setAvgScore] = useState<number | null>(null);
  const [performance, setPerformance] = useState(0);

  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackScore, setFeedbackScore] = useState("");
  const [savingFeedback, setSavingFeedback] = useState(false);

  const [kpiInputs, setKpiInputs] = useState<Record<number, string>>({});
  const [savingKpiId, setSavingKpiId] = useState<number | null>(null);

  useEffect(() => {
    async function init() {
      try {
        const [studentsRes, templatesRes] = await Promise.all([
          adminApi.students(),
          adminApi.kpiTemplates(),
        ]);
        setStudents(studentsRes);
        setTemplates(templatesRes.items);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Ошибка загрузки");
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  const loadStudentData = useCallback(async (id: number) => {
    setLoadingStudent(true);
    setError("");
    try {
      const [fbRes, kpiRes] = await Promise.all([
        adminApi.studentFeedback(id),
        adminApi.studentKpi(id),
      ]);
      setFeedbacks(fbRes.items);
      setAvgScore(fbRes.average_score);
      setPerformance(kpiRes.performance_score);
      const inputs: Record<number, string> = {};
      for (const kv of kpiRes.kpi_values) {
        inputs[kv.template_id] = String(kv.value);
      }
      setKpiInputs(inputs);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Ошибка загрузки данных студента");
    } finally {
      setLoadingStudent(false);
    }
  }, []);

  useEffect(() => {
    if (studentId !== "") {
      loadStudentData(studentId);
    }
  }, [studentId, loadStudentData]);

  async function handleFeedback(e: FormEvent) {
    e.preventDefault();
    if (studentId === "") return;
    setSavingFeedback(true);
    setError("");
    setSuccess("");
    try {
      await adminApi.createFeedback({
        student_id: studentId,
        content: feedbackText,
        score: feedbackScore ? Number(feedbackScore) : undefined,
      });
      setFeedbackText("");
      setFeedbackScore("");
      setSuccess("Отзыв сохранён");
      await loadStudentData(studentId);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Не удалось сохранить отзыв");
    } finally {
      setSavingFeedback(false);
    }
  }

  async function saveKpi(templateId: number, maxValue: number) {
    if (studentId === "") return;
    const raw = kpiInputs[templateId];
    const value = Number(raw);
    if (Number.isNaN(value) || value < 0 || value > maxValue) {
      setError(`Значение KPI должно быть от 0 до ${maxValue}`);
      return;
    }
    setSavingKpiId(templateId);
    setError("");
    setSuccess("");
    try {
      await adminApi.setKpiValue(studentId, templateId, value);
      setSuccess("KPI обновлён, performance пересчитан");
      await loadStudentData(studentId);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Не удалось сохранить KPI");
    } finally {
      setSavingKpiId(null);
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
        <h1 className="text-2xl font-bold text-slate-900">Оценки и feedback</h1>
        <p className="mt-1 text-slate-500">Отзывы наставника и выставление KPI</p>
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
        <CardTitle subtitle="Выберите стажёра">Студент</CardTitle>
        <select
          value={studentId}
          onChange={(e) =>
            setStudentId(e.target.value ? Number(e.target.value) : "")
          }
          className="w-full max-w-md rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
        >
          <option value="">— выберите —</option>
          {students.map((s) => (
            <option key={s.id} value={s.id}>
              {s.full_name} ({s.email})
            </option>
          ))}
        </select>
        {studentId !== "" && !loadingStudent && (
          <p className="mt-3 text-sm text-slate-600">
            Performance: <strong>{Math.round(performance)}%</strong>
            {avgScore != null && (
              <>
                {" "}
                · средняя оценка по отзывам: <strong>{avgScore.toFixed(1)}</strong>
              </>
            )}
          </p>
        )}
      </Card>

      {studentId === "" ? (
        <EmptyState
          title="Выберите студента"
          description="Чтобы написать feedback или выставить KPI"
        />
      ) : loadingStudent ? (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      ) : (
        <>
          <Card>
            <CardTitle subtitle="Текст и оценка 0–100">Новый feedback</CardTitle>
            <form onSubmit={handleFeedback} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Комментарий
                </label>
                <textarea
                  required
                  rows={4}
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  placeholder="Как прошла неделя, что улучшить…"
                />
              </div>
              <Input
                label="Оценка (0–100)"
                type="number"
                min={0}
                max={100}
                value={feedbackScore}
                onChange={(e) => setFeedbackScore(e.target.value)}
                placeholder="Необязательно"
              />
              <Button type="submit" disabled={savingFeedback}>
                {savingFeedback ? "Сохранение…" : "Отправить feedback"}
              </Button>
            </form>
          </Card>

          <Card>
            <CardTitle subtitle="История отзывов">Feedback</CardTitle>
            {feedbacks.length === 0 ? (
              <EmptyState title="Отзывов пока нет" />
            ) : (
              <ul className="space-y-3">
                {feedbacks.map((f) => (
                  <li
                    key={f.id}
                    className="rounded-xl border border-slate-100 bg-slate-50/80 p-3 text-sm"
                  >
                    <p className="text-slate-800">{f.content}</p>
                    <p className="mt-2 text-xs text-slate-500">
                      {new Date(f.created_at).toLocaleString("ru-RU")}
                      {f.score != null && ` · оценка: ${f.score}`}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <CardTitle subtitle="Взвешенные показатели performance">
              KPI стажёра
            </CardTitle>
            {templates.length === 0 ? (
              <EmptyState
                title="Нет шаблонов KPI"
                description="Администратор должен создать шаблоны в разделе «Система»"
              />
            ) : (
              <ul className="space-y-4">
                {templates.map((t) => (
                  <li
                    key={t.id}
                    className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-100 p-3"
                  >
                    <div className="min-w-[200px] flex-1">
                      <p className="font-medium text-slate-900">{t.name}</p>
                      <p className="text-xs text-slate-500">
                        Вес {t.weight}% · макс. {t.max_value}
                      </p>
                    </div>
                    <Input
                      label="Значение"
                      type="number"
                      min={0}
                      max={t.max_value}
                      step={0.1}
                      value={kpiInputs[t.id] ?? ""}
                      onChange={(e) =>
                        setKpiInputs((prev) => ({
                          ...prev,
                          [t.id]: e.target.value,
                        }))
                      }
                      className="!w-28"
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={savingKpiId === t.id}
                      onClick={() => saveKpi(t.id, t.max_value)}
                    >
                      {savingKpiId === t.id ? "…" : "Сохранить"}
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
