import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Marlo — Студенческий портал",
  description: "Портал студента: задачи, KPI, активность и отчёты",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru">
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
