"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Moon, Sun } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuditWorkspace } from "@/components/audit-workspace";
import { useTheme } from "@/components/theme-provider";
import driftLogo from "@/figs/drift-ai.jpeg";

const NAV_ITEMS = [
  { href: "/", label: "Scan" },
  { href: "/evidence", label: "Transactions" },
  { href: "/insights", label: "Pattern Lab" },
  { href: "/plan", label: "Plan" },
  { href: "/scenario", label: "What-if" },
  { href: "/intercept", label: "Intercept" },
  { href: "/report", label: "Report" },
  { href: "/account", label: "Account" },
  { href: "/settings", label: "Privacy" }
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { scan } = useAuditWorkspace();
  const { toggleTheme } = useTheme();

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border/80 bg-background/90 px-5 py-4 backdrop-blur md:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Image
                alt="Drift.ai"
                className="size-9 rounded-[8px] border border-border object-cover"
                height={36}
                priority
                src={driftLogo}
                width={36}
              />
              <div>
                <p className="text-sm font-semibold">Drift</p>
                <p className="text-xs text-muted-foreground">Private lifestyle audit</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="rounded-[8px] border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-200">
                {scan.sourceLabel}
              </Badge>
              <Button
                variant="outline"
                className="h-9 rounded-[8px] border-border bg-card px-3"
                aria-label="Toggle color mode"
                onClick={toggleTheme}
              >
                <Sun className="hidden size-4 dark:block" />
                <Moon className="size-4 dark:hidden" />
              </Button>
            </div>
          </div>
          <nav className="flex gap-2 overflow-x-auto">
            {NAV_ITEMS.map((item) => {
              const isActive = pathname === item.href;

              return (
                <Link
                  key={item.href}
                  className={`rounded-[8px] border px-3 py-2 text-sm font-medium ${
                    isActive
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card text-muted-foreground hover:text-foreground"
                  }`}
                  href={item.href}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>
      {children}
    </main>
  );
}
