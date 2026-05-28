"use client";

import { FormEvent, useState } from "react";
import { User as UserIcon, Shield } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { getStoredUser } from "@/lib/auth";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { formatDate } from "@/lib/utils";

export default function ProfilePage() {
  const user = getStoredUser();
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handlePasswordChange(e: FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");
    if (newPassword !== confirmPassword) {
      setError("Пароли не совпадают");
      return;
    }
    if (newPassword.length < 6) {
      setError("Минимум 6 символов");
      return;
    }
    setLoading(true);
    try {
      await api.changePassword(oldPassword, newPassword);
      setMessage("Пароль успешно изменён");
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Ошибка");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Профиль</h1>
        <p className="mt-1 text-slate-500">Ваши данные и безопасность</p>
      </div>

      <Card>
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-100 text-brand-700">
            <UserIcon className="h-8 w-8" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-slate-900">
              {user?.full_name}
            </h2>
            <p className="text-slate-500">{user?.email}</p>
            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              <span className="rounded-full bg-brand-50 px-2.5 py-1 font-medium text-brand-700 capitalize">
                {user?.role}
              </span>
              <span
                className={`rounded-full px-2.5 py-1 font-medium ${
                  user?.is_active
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-red-50 text-red-700"
                }`}
              >
                {user?.is_active ? "Активен" : "Неактивен"}
              </span>
            </div>
          </div>
        </div>
        {user?.created_at && (
          <p className="mt-4 border-t border-slate-100 pt-4 text-sm text-slate-500">
            В системе с {formatDate(user.created_at)}
          </p>
        )}
      </Card>

      <Card>
        <div className="mb-4 flex items-center gap-2">
          <Shield className="h-5 w-5 text-slate-600" />
          <CardTitle>Смена пароля</CardTitle>
        </div>
        <form onSubmit={handlePasswordChange} className="space-y-4">
          <Input
            label="Текущий пароль"
            type="password"
            required
            value={oldPassword}
            onChange={(e) => setOldPassword(e.target.value)}
          />
          <Input
            label="Новый пароль"
            type="password"
            required
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <Input
            label="Подтвердите пароль"
            type="password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}
          {message && (
            <p className="text-sm text-emerald-600">{message}</p>
          )}
          <Button type="submit" disabled={loading}>
            {loading ? "Сохранение…" : "Обновить пароль"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
