"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  BarChart3,
  Users,
  Settings,
  LogOut,
  Menu,
  X,
  Shield,
  ListTodo,
  MessageSquare,
} from "lucide-react";
import { useState } from "react";
import { clearAuth, getStoredUser, isAdminLoggedIn } from "@/lib/auth";

const NAV_ALL = [
  { href: "/admin/dashboard", label: "Дашборд", icon: LayoutDashboard },
  { href: "/admin/tasks", label: "Задачи", icon: ListTodo },
  { href: "/admin/reviews", label: "Оценки", icon: MessageSquare },
  { href: "/admin/analytics", label: "Статистика", icon: BarChart3 },
  { href: "/admin/users", label: "Пользователи", icon: Users, adminOnly: true },
  { href: "/admin/system", label: "Система", icon: Settings, adminOnly: true },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const user = getStoredUser();
  const isAdmin = isAdminLoggedIn();
  const [mobileOpen, setMobileOpen] = useState(false);

  const nav = NAV_ALL.filter((item) => !item.adminOnly || isAdmin);

  function logout() {
    clearAuth();
    router.push("/admin/login");
  }

  const roleLabel =
    user?.role === "admin"
      ? "Администратор"
      : user?.role === "manager"
        ? "Менеджер"
        : "";

  const navContent = (
    <>
      <div className="mb-8 px-2">
        <div className="flex items-center gap-2">
          <Shield className="h-6 w-6 text-amber-400" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Marlo
            </p>
            <h1 className="text-lg font-bold text-white">
              {user?.role === "manager" ? "Портал наставника" : "Админ-портал"}
            </h1>
          </div>
        </div>
      </div>
      <nav className="flex flex-1 flex-col gap-1">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                active
                  ? "bg-amber-500/20 text-amber-100"
                  : "text-slate-300 hover:bg-white/10 hover:text-white"
              }`}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto border-t border-white/10 pt-4">
        <p className="truncate px-3 text-sm font-medium text-white">
          {user?.full_name ?? "Сотрудник"}
        </p>
        <p className="truncate px-3 text-xs text-slate-400">{user?.email}</p>
        <p className="px-3 text-xs text-amber-400/90">{roleLabel}</p>
        <button
          type="button"
          onClick={logout}
          className="mt-3 flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm text-slate-300 transition hover:bg-white/10 hover:text-white"
        >
          <LogOut className="h-4 w-4" />
          Выйти
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-slate-100">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col bg-gradient-to-b from-slate-900 to-slate-950 p-4 lg:flex">
        {navContent}
      </aside>

      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-amber-600" />
          <p className="text-sm font-semibold text-slate-900">
            {user?.role === "manager" ? "Портал наставника" : "Админ-портал"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setMobileOpen(!mobileOpen)}
          className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"
          aria-label="Меню"
        >
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </header>

      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40 lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-gradient-to-b from-slate-900 to-slate-950 p-4 lg:hidden">
            {navContent}
          </aside>
        </>
      )}

      <main className="lg:pl-64">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:py-8">{children}</div>
      </main>
    </div>
  );
}
