import { AuthGuard } from "@/components/auth/AuthGuard";
import { StudentShell } from "@/components/layout/StudentShell";

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <StudentShell>{children}</StudentShell>
    </AuthGuard>
  );
}
