"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  Clock4,
  LayoutDashboard,
  Settings,
  Users,
} from "lucide-react";

import { useT } from "./locale-provider";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  labelKey: string;
  icon: React.ReactNode;
}

const NAV_ITEMS: ReadonlyArray<NavItem> = [
  { href: "/panel", labelKey: "nav.dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
  { href: "/horario", labelKey: "nav.schedule", icon: <CalendarDays className="h-4 w-4" /> },
  { href: "/trabajadores", labelKey: "nav.workers", icon: <Users className="h-4 w-4" /> },
  { href: "/horas", labelKey: "nav.hours", icon: <Clock4 className="h-4 w-4" /> },
  { href: "/ajustes", labelKey: "nav.settings", icon: <Settings className="h-4 w-4" /> },
];

export function Sidebar() {
  const pathname = usePathname();
  const t = useT();
  return (
    <aside className="hidden w-56 shrink-0 border-r bg-card md:flex md:flex-col">
      <div className="flex h-14 items-center border-b px-6 text-lg font-semibold">
        {t("app.name")}
      </div>
      <nav className="flex-1 space-y-1 p-3">
        {NAV_ITEMS.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              )}
            >
              {item.icon}
              <span>{t(item.labelKey)}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
