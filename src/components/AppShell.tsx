import type { ReactNode } from "react";
import { useNavigate, useRouter } from "@tanstack/react-router";
import { ChevronLeft, LogOut } from "lucide-react";

import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

export function AppShell({
  title,
  subtitle,
  showBack,
  actions,
  children,
}: {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const router = useRouter();

  return (
    <div className="min-h-screen bg-background pb-16">
      <header className="gradient-header sticky top-0 z-30 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          {showBack ? (
            <button
              type="button"
              onClick={() => router.history.back()}
              className="-ml-2 rounded-full p-2 text-surface-deep-foreground/80 transition-colors hover:bg-surface-deep-foreground/10"
              aria-label="Back"
            >
              <ChevronLeft className="size-5" />
            </button>
          ) : null}
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-semibold text-surface-deep-foreground">
              {title}
            </h1>
            {subtitle ? (
              <p className="truncate text-xs text-surface-deep-foreground/70">{subtitle}</p>
            ) : null}
          </div>
          {actions}
          <Button
            variant="ghost"
            size="icon"
            aria-label="Sign out"
            className="text-surface-deep-foreground/80 hover:bg-surface-deep-foreground/10 hover:text-surface-deep-foreground"
            onClick={async () => {
              await signOut();
              navigate({ to: "/auth", replace: true });
            }}
          >
            <LogOut className="size-4" />
          </Button>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-4">{children}</main>
    </div>
  );
}