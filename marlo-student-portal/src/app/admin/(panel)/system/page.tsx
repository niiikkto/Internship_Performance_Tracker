"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { adminApi } from "@/lib/admin-api";
import { ApiError } from "@/lib/api";
import { AdminOnlyGuard } from "@/components/auth/AdminOnlyGuard";
import { Card, CardTitle } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/EmptyState";
import type { KPITemplate } from "@/lib/types";

export default function AdminSystemPage() {
  return (
    <AdminOnlyGuard>
      <SystemContent />
    </AdminOnlyGuard>
  );
}

function SystemContent() {
  const [templates, setTemplates] = useState<KPITemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [checking, setChecking] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [weight, setWeight] = useState("10");
  const [maxValue, setMaxValue] = useState("100");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.kpiTemplates();
      setTemplates(res.items);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Ошибка загрузки");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleCheckOverdue() {
    setChecking(true);
    setError("");
    setSuccess("");
    try {
      const res = await adminApi.checkOverdue();
      setSuccess(res.message);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Ошибка");
    } finally {
      setChecking(false);
    }
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await adminApi.createKpiTemplate({
        name,
        description: description || undefined,
        weight: Number(weight),
        max_value: Number(maxValue),
      });
      setName("");
      setDescription("");
      setWeight("10");
      setMaxValue("100");
      setSuccess("Шаблон KPI создан");
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Не удалось создать шаблон");
    } finally {
      setSaving(false);
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
        <h1 className="text-2xl font-bold text-slate-900">Управление системой</h1>
        <p className="mt-1 text-slate-500">KPI-шаблоны и обслуживание задач</p>
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
        <CardTitle subtitle="Обновить статусы просроченных назначений">
          Обслуживание
        </CardTitle>
        <Button type="button" onClick={handleCheckOverdue} disabled={checking}>
          {checking ? "Проверка…" : "Проверить просроченные задачи"}
        </Button>
      </Card>

      <Card>
        <CardTitle subtitle="Новый показатель для расчёта performance">
          Создать шаблон KPI
        </CardTitle>
        <form onSubmit={handleCreate} className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Название"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Качество кода"
          />
          <Input
            label="Вес (%)"
            type="number"
            required
            min={0.1}
            max={100}
            step={0.1}
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
          />
          <Input
            label="Макс. значение"
            type="number"
            required
            min={1}
            value={maxValue}
            onChange={(e) => setMaxValue(e.target.value)}
          />
          <Input
            label="Описание"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Необязательно"
          />
          <div className="sm:col-span-2">
            <Button type="submit" disabled={saving}>
              {saving ? "Сохранение…" : "Добавить шаблон"}
            </Button>
          </div>
        </form>
      </Card>

      <Card>
        <CardTitle subtitle={`Всего шаблонов: ${templates.length}`}>
          Шаблоны KPI
        </CardTitle>
        {templates.length === 0 ? (
          <EmptyState
            title="Шаблонов пока нет"
            description="Создайте первый шаблон выше"
          />
        ) : (
          <ul className="space-y-3">
            {templates.map((t) => (
              <li
                key={t.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-100 bg-slate-50/80 p-4"
              >
                <div>
                  <p className="font-medium text-slate-900">{t.name}</p>
                  {t.description && (
                    <p className="text-sm text-slate-500">{t.description}</p>
                  )}
                </div>
                <div className="text-sm text-slate-600">
                  Вес: <strong>{t.weight}%</strong> · макс. {t.max_value}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
