"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Shield } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { clearAuth, saveAuth, saveTokens } from "@/lib/auth";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const tokens = await api.login(email, password);
      saveTokens(tokens);
      const user = await api.me();

      if (user.role !== "admin" && user.role !== "manager") {
        clearAuth();
        setError("Доступ только для администраторов и менеджеров");
        return;
      }
      if (!user.is_active) {
        clearAuth();
        setError("Аккаунт деактивирован");
        return;
      }
      saveAuth(tokens, user);
      router.push("/admin/dashboard");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Ошибка входа");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen">
      <div className="hidden flex-1 flex-col justify-between bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 p-12 text-white lg:flex">
        <div>
          <div className="flex items-center gap-3">
            <Shield className="h-10 w-10 text-amber-400" />
            <p className="text-sm font-semibold uppercase tracking-wider text-slate-400">
              Marlo Admin
            </p>
          </div>
          <h1 className="mt-6 max-w-md text-4xl font-bold leading-tight">
            Панель управления стажировками
          </h1>
          <p className="mt-4 max-w-sm text-slate-300">
            Задачи, оценки, feedback и аналитика по стажёрам.
          </p>
        </div>
        <p className="text-sm text-slate-500">© Marlo Internship Tracker</p>
      </div>

      <div className="flex flex-1 flex-col justify-center px-6 py-12 sm:px-12">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-6 flex items-center gap-2 lg:hidden">
            <Shield className="h-8 w-8 text-amber-600" />
            <span className="text-lg font-bold text-slate-900">Админ-портал</span>
          </div>
          <h2 className="text-2xl font-bold text-slate-900">
            Вход для наставника / администратора
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Студент?{" "}
            <Link href="/login" className="font-medium text-brand-600 hover:underline">
              Войти в студенческий портал
            </Link>
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <Input
              label="Email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@marlo.ru"
            />
            <Input
              label="Пароль"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Вход…" : "Войти"}
            </Button>
          </form>

          <p className="mt-6 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            Первый администратор создаётся через Swagger:{" "}
            <code className="rounded bg-amber-100 px-1">POST /auth/register</code> с{" "}
            <code className="rounded bg-amber-100 px-1">&quot;role&quot;: &quot;admin&quot;</code>
          </p>
        </div>
      </div>
    </div>
  );
}
