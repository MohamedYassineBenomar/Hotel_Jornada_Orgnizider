"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useT } from "./locale-provider";

interface Props {
  email: string;
}

export function TopNav({ email }: Props) {
  const router = useRouter();
  const t = useT();
  const [pending, startTransition] = React.useTransition();

  async function handleLogout(): Promise<void> {
    await fetch("/api/auth/logout", { method: "POST" });
    startTransition(() => {
      router.push("/entrar");
    });
  }
  return (
    <header className="flex h-14 items-center justify-between border-b bg-card px-6">
      <div className="text-sm text-muted-foreground">{email}</div>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleLogout}
        disabled={pending}
      >
        <LogOut className="mr-2 h-4 w-4" /> {t("nav.logout")}
      </Button>
    </header>
  );
}
