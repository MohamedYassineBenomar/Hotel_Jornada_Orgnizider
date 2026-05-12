import "./globals.css";

import type { Metadata } from "next";

import { Toaster } from "@/components/ui/toast";

export const metadata: Metadata = {
  title: "Jornada",
  description:
    "Auto-llena, revisa y publica el horario semanal de tu restaurante en segundos.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans antialiased">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
