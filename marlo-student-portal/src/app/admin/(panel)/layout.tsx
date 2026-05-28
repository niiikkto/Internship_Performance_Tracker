import { AdminAuthGuard } from "@/components/auth/AdminAuthGuard";
import { AdminShell } from "@/components/layout/AdminShell";

export default function AdminPanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminAuthGuard>
      <AdminShell>{children}</AdminShell>
    </AdminAuthGuard>
  );
}
