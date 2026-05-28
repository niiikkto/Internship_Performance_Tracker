"use client";

import { useCallback, useEffect, useState } from "react";
import { adminApi } from "@/lib/admin-api";
import { ApiError } from "@/lib/api";
import { AdminOnlyGuard } from "@/components/auth/AdminOnlyGuard";
import { Card, CardTitle } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import { Button } from "@/components/ui/Button";
import type { Role, User } from "@/lib/types";

export default function AdminUsersPage() {
  return (
    <AdminOnlyGuard>
      <UsersContent />
    </AdminOnlyGuard>
  );
}

function UsersContent() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const list = await adminApi.users();
      setUsers(list);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Ошибка загрузки");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function toggleActive(user: User) {
    setBusyId(user.id);
    try {
      if (user.is_active) {
        await adminApi.deactivateUser(user.id);
      } else {
        await adminApi.activateUser(user.id);
      }
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Ошибка");
    } finally {
      setBusyId(null);
    }
  }

  async function changeRole(user: User, role: Role) {
    setBusyId(user.id);
    try {
      await adminApi.updateUserRole(user.id, role);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Ошибка смены роли");
    } finally {
      setBusyId(null);
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Пользователи</h1>
        <p className="mt-1 text-slate-500">Управление аккаунтами и ролями</p>
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      <Card>
        <CardTitle subtitle={`Всего: ${users.length}`}>Все аккаунты</CardTitle>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-slate-500">
                <th className="pb-3 font-medium">ФИО</th>
                <th className="pb-3 font-medium">Email</th>
                <th className="pb-3 font-medium">Роль</th>
                <th className="pb-3 font-medium">Статус</th>
                <th className="pb-3 font-medium">Действия</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-slate-50">
                  <td className="py-3 font-medium text-slate-900">{u.full_name}</td>
                  <td className="py-3 text-slate-600">{u.email}</td>
                  <td className="py-3">
                    <select
                      value={u.role}
                      disabled={busyId === u.id}
                      onChange={(e) => changeRole(u, e.target.value as Role)}
                      className="rounded-lg border border-slate-200 px-2 py-1 text-sm"
                    >
                      <option value="student">Студент</option>
                      <option value="manager">Менеджер</option>
                      <option value="admin">Администратор</option>
                    </select>
                  </td>
                  <td className="py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        u.is_active
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {u.is_active ? "Активен" : "Отключён"}
                    </span>
                  </td>
                  <td className="py-3">
                    <Button
                      type="button"
                      variant={u.is_active ? "secondary" : "primary"}
                      className="!px-3 !py-1.5 text-xs"
                      disabled={busyId === u.id}
                      onClick={() => toggleActive(u)}
                    >
                      {u.is_active ? "Деактивировать" : "Активировать"}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
