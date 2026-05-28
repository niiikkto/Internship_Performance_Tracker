"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { Upload, Download, FileText } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/EmptyState";
import { Spinner } from "@/components/ui/Spinner";
import { formatDateTime, formatFileSize } from "@/lib/utils";
import type { Submission } from "@/lib/types";

export default function UploadsPage() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [description, setDescription] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await api.mySubmissions();
      setSubmissions(res.items);
    } catch {
      /* api handles auth */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleUpload(e: FormEvent) {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setError("Выберите файл");
      return;
    }
    setError("");
    setUploading(true);
    try {
      await api.uploadSubmission(file, description || undefined);
      setDescription("");
      if (fileRef.current) fileRef.current.value = "";
      setMessage("Файл успешно загружен");
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Ошибка загрузки");
    } finally {
      setUploading(false);
    }
  }

  async function downloadReport() {
    try {
      const blob = await api.downloadMyReport("csv");
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "my_report.csv";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Не удалось скачать отчёт");
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Загрузка отчётов и файлов
        </h1>
        <p className="mt-1 text-slate-500">
          PDF, DOC, изображения и архивы до 10 МБ
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardTitle subtitle="Отправить менеджеру">Новый отчёт</CardTitle>
          <form onSubmit={handleUpload} className="space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">
                Файл
              </span>
              <div
                className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50 px-6 py-10 transition hover:border-brand-400 hover:bg-brand-50/30"
                onClick={() => fileRef.current?.click()}
              >
                <Upload className="mb-2 h-8 w-8 text-slate-400" />
                <p className="text-sm font-medium text-slate-700">
                  Нажмите или перетащите файл
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  .pdf, .doc, .docx, .txt, .zip, .png, .jpg
                </p>
                <input
                  ref={fileRef}
                  type="file"
                  className="hidden"
                  accept=".pdf,.doc,.docx,.txt,.zip,.png,.jpg,.jpeg"
                  onChange={() => setError("")}
                />
              </div>
            </label>
            <Textarea
              label="Описание (необязательно)"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="О чём этот отчёт…"
            />
            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}
            {message && (
              <p className="text-sm text-emerald-600">{message}</p>
            )}
            <Button type="submit" disabled={uploading} className="w-full">
              {uploading ? "Загрузка…" : "Загрузить"}
            </Button>
          </form>
        </Card>

        <Card>
          <CardTitle subtitle="Сводка по стажировке">Скачать отчёт</CardTitle>
          <p className="mb-4 text-sm text-slate-600">
            CSV с KPI, посещаемостью, задачами и оценками.
          </p>
          <Button variant="secondary" onClick={downloadReport}>
            <Download className="h-4 w-4" />
            Скачать мой отчёт (CSV)
          </Button>
        </Card>
      </div>

      <Card>
        <CardTitle subtitle="История загрузок">Мои файлы</CardTitle>
        {loading ? (
          <div className="flex justify-center py-8">
            <Spinner />
          </div>
        ) : submissions.length === 0 ? (
          <EmptyState
            title="Файлов пока нет"
            description="Загрузите первый отчёт выше"
          />
        ) : (
          <ul className="divide-y divide-slate-100">
            {submissions.map((s) => (
              <li
                key={s.id}
                className="flex items-center gap-4 py-4 first:pt-0 last:pb-0"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100">
                  <FileText className="h-5 w-5 text-slate-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-slate-900">
                    {s.original_filename}
                  </p>
                  <p className="text-xs text-slate-500">
                    {formatFileSize(s.file_size)} · {formatDateTime(s.created_at)}
                  </p>
                  {s.description && (
                    <p className="mt-1 text-sm text-slate-600">{s.description}</p>
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
