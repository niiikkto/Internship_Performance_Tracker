"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  ListTodo,
  Clock,
  BarChart3,
  Upload,
  User,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { useState } from "react";
import { clearAuth, getStoredUser } from "@/lib/auth";

const NAV = [
  { href: "/dashboard", label: "Дашборд", icon: LayoutDashboard },
  { href: "/tasks", label: "Мои задачи", icon: ListTodo },
  { href: "/timeline", label: "Активность", icon: Clock },
  { href: "/grades", label: "Оценки и KPI", icon: BarChart3 },
  { href: "/uploads", label: "Отчёты", icon: Upload },
  { href: "/profile", label: "Профиль", icon: User },
];

export function StudentShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const user = getStoredUser();
  const [mobileOpen, setMobileOpen] = useState(false);

  function logout() {
    clearAuth();
    router.push("/login");
  }

  const navContent = (
    <>
      <div className="mb-8 px-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-brand-300">
          Marlo
        </p>
        <h1 className="text-lg font-bold text-white">Студенческий портал</h1>
      </div>
      <nav className="flex flex-1 flex-col gap-1">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                active
                  ? "bg-white/15 text-white"
                  : "text-brand-100 hover:bg-white/10 hover:text-white"
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
          {user?.full_name ?? "Студент"}
        </p>
        <p className="truncate px-3 text-xs text-brand-200">{user?.email}</p>
        <button
          type="button"
          onClick={logout}
          className="mt-3 flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm text-brand-100 transition hover:bg-white/10 hover:text-white"
        >
          <LogOut className="h-4 w-4" />
          Выйти
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col bg-gradient-to-b from-brand-800 to-brand-900 p-4 lg:flex">
        {navContent}
      </aside>

      {/* Mobile header */}
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
        <div>
          <p className="text-xs font-semibold text-brand-600">Marlo</p>
          <p className="text-sm font-semibold text-slate-900">Студенческий портал</p>
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

      {/* Mobile drawer */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40 lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-gradient-to-b from-brand-800 to-brand-900 p-4 lg:hidden">
            {navContent}
          </aside>
        </>
      )}

      <main className="lg:pl-64">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
