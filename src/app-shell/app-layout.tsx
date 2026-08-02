/**
 * Application layout — Sprint 1.0 §2.
 *
 * Landmark structure only (banner / main / contentinfo) plus the skip link.
 * Navigation, room chrome and the Po launcher are added by their own sprints.
 */
import type { ReactNode } from "react";

import { useTranslation } from "@/foundation/localization";

export function AppLayout({ children }: { children: ReactNode }) {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <a href="#main-content" className="skip-link">
        {t("a11y.skip_to_content")}
      </a>

      <header role="banner" className="border-b border-border">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center px-4">
          <span className="text-sm font-semibold tracking-tight">{t("common.app.name")}</span>
        </div>
      </header>

      <main
        id="main-content"
        tabIndex={-1}
        aria-label={t("a11y.main_content.label")}
        className="flex-1 focus:outline-none"
      >
        {children}
      </main>

      <footer role="contentinfo" className="border-t border-border">
        <div className="mx-auto w-full max-w-6xl px-4 py-4 text-xs text-muted-foreground">
          {t("common.app.tagline")}
        </div>
      </footer>
    </div>
  );
}
