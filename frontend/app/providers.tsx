"use client";

import { SessionProvider } from "next-auth/react";

import { ToastProvider } from "@/components/ui/toast";
import { LangProvider } from "@/lib/i18n";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <LangProvider>
        <ToastProvider>{children}</ToastProvider>
      </LangProvider>
    </SessionProvider>
  );
}
