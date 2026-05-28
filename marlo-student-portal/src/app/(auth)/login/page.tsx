"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { clearAuth, saveAuth, saveTokens } from "@/lib/auth";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default function LoginPage() {
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

      if (user.role !== "student") {
        clearAuth();
        setError("Этот портал только для студентов");
        return;
      }
      saveAuth(tokens, user);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Ошибка входа");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen">
      <div className="hidden flex-1 flex-col justify-between bg-gradient-to-br from-brand-700 via-brand-800 to-slate-900 p-12 text-white lg:flex">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-brand-200">
            Marlo Internship
          </p>
          <h1 className="mt-4 max-w-md text-4xl font-bold leading-tight">
            Ваш личный кабинет стажёра
          </h1>
          <p className="mt-4 max-w-sm text-brand-100">
            Задачи, KPI, оценки и отчёты — всё в одном месте.
          </p>
        </div>
        <p className="text-sm text-brand-300">© Marlo Student Portal</p>
      </div>

      <div className="flex flex-1 flex-col justify-center px-6 py-12 sm:px-12">
        <div className="mx-auto w-full max-w-md">
          <h2 className="text-2xl font-bold text-slate-900">Вход</h2>
          <p className="mt-1 text-sm text-slate-500">
            Нет аккаунта?{" "}
            <Link href="/register" className="font-medium text-brand-600 hover:underline">
              Зарегистрироваться
            </Link>
            {" · "}
            <Link href="/admin/login" className="font-medium text-slate-600 hover:underline">
              Вход для администратора
            </Link>
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <Input
              label="Email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ivan@example.com"
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
        </div>
      </div>
    </div>
  );
}
