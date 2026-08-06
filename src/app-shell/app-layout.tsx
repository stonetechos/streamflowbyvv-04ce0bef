/**
 * Application layout — Sprint 1.0 §2, extended in Milestone E.
 *
 * Landmark structure (banner / main / contentinfo) plus the skip link. The
 * navigation chrome is responsive by composition: `AppNav` carries the desktop
 * and tablet rail inside the banner, `BottomNav` takes over below `md`.
 * Signed-out surfaces (auth, landing) opt out with `chrome="minimal"`.
 */
import type { ReactNode } from "react";

import { AppNav, BottomNav } from "@/features/navigation";
import { PoConsole } from "@/features/po";
import { useTranslation } from "@/foundation/localization";

export interface AppLayoutProps {
  readonly children: ReactNode;
  /** `minimal` keeps the landmarks but hides the primary destinations. */
  readonly chrome?: "full" | "minimal";
}

export function AppLayout({ children, chrome = "full" }: AppLayoutProps) {
  const { t } = useTranslation();
  const showNav = chrome === "full";

  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <a href="#main-content" className="skip-link">
        {t("a11y.skip_to_content")}
      </a>

      <header
        role="banner"
        className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur-xl"
      >
        {showNav ? (
          <AppNav />
        ) : (
          <div className="mx-auto flex h-14 w-full max-w-6xl items-center px-4">
            <span className="text-sm font-semibold tracking-tight">{t("common.app.name")}</span>
          </div>
        )}
      </header>

      <main
        id="main-content"
        tabIndex={-1}
        aria-label={t("a11y.main_content.label")}
        className="flex-1 focus:outline-none"
      >
        {children}
      </main>

      {/* Sprint 85 — the tagline is desktop chrome; on a phone the bottom bar
          owns that edge and the footer only reserves room for it. */}
      <footer role="contentinfo" className="border-t border-border max-md:border-0">
        <div className="mx-auto w-full max-w-6xl px-4 pb-24 text-xs text-muted-foreground max-md:sr-only md:py-4 md:pb-4">
          {t("common.app.tagline")}
        </div>
      </footer>

      {showNav ? <BottomNav /> : null}
      {/* Milestone H1 — Po sits beside the app, never over it. */}
      {showNav ? <PoConsole /> : null}
    </div>
  );
}
