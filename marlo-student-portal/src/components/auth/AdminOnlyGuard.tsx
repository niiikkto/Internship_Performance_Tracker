"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { isAdminLoggedIn } from "@/lib/auth";

export function AdminOnlyGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    if (!isAdminLoggedIn()) {
      router.replace("/admin/dashboard");
    }
  }, [router]);

  if (!isAdminLoggedIn()) {
    return null;
  }

  return <>{children}</>;
}
