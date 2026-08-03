/**
 * Home settings shortcut — Milestone G.5.
 *
 * Closes the Home hierarchy the way the specification orders it: after the
 * people and the services comes the one place where a person changes how
 * StreamFlow behaves for them. Presentation only — it links, it decides
 * nothing.
 */
import { Link } from "@tanstack/react-router";

import { Surface } from "@/design-system/components";
import { useTranslation } from "@/foundation/localization";

export function HomeQuickSettings() {
  const { t } = useTranslation();

  return (
    <Surface
      as="section"
      tone="glass"
      padding="md"
      aria-labelledby="home-settings-heading"
      className="flex flex-wrap items-center justify-between gap-4"
    >
      <div className="min-w-0">
        <h2
          id="home-settings-heading"
          className="font-display text-lg font-semibold tracking-tight"
        >
          {t("home.settings.title")}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("home.settings.description")}</p>
      </div>
      <Link
        to="/settings"
        className="inline-flex h-11 shrink-0 items-center rounded-xl border border-border px-4 text-sm font-medium transition-colors duration-fast ease-standard hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {t("home.settings.action")}
      </Link>
    </Surface>
  );
}
