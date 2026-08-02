import { createFileRoute } from "@tanstack/react-router";

import { appConfig } from "@/config";
import { useFeatureFlags } from "@/foundation/feature-flags";
import { useLocalization } from "@/foundation/localization";
import { usePo } from "@/features/po";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "StreamFlow — Foundation" },
      {
        name: "description",
        content:
          "Sprint 1.0 foundation build of StreamFlow: application shell, design system, localization, feature flags and Po core.",
      },
      { property: "og:title", content: "StreamFlow — Foundation" },
      {
        property: "og:description",
        content: "The foundation layer of StreamFlow's watch-together platform is in place.",
      },
    ],
  }),
  component: FoundationStatusPage,
});

/**
 * Sprint 1.0 status page. Deliberately minimal: it exists to prove the shell,
 * design tokens, localization and provider graph are wired. Product pages are
 * out of scope for this sprint (Build Rules §1).
 */
function FoundationStatusPage() {
  const { locale, availableLocales, setLocale, t } = useLocalization();
  const { subject } = useFeatureFlags();
  const po = usePo();

  const checks = [
    { label: "Configuration", value: `${appConfig.environment} · log ${appConfig.logLevel}` },
    { label: "Localization", value: `${locale} · ${availableLocales.length} locales` },
    { label: "Feature flags", value: subject ? "subject bound" : "registry empty" },
    { label: "Po core", value: po.isAvailable ? "tools registered" : "shell only" },
  ];

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-16">
      <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
        Sprint 1.0
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">{t("common.app.name")}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{t("common.app.tagline")}</p>

      <dl className="mt-10 divide-y divide-border border-y border-border">
        {checks.map((check) => (
          <div key={check.label} className="flex items-center justify-between gap-4 py-3">
            <dt className="text-sm font-medium">{check.label}</dt>
            <dd className="text-sm text-muted-foreground">{check.value}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-8">
        <label htmlFor="locale-select" className="text-sm font-medium">
          {t("settings.language.label")}
        </label>
        <select
          id="locale-select"
          value={locale}
          onChange={(event) => setLocale(event.target.value as typeof locale)}
          className="mt-2 block rounded-md border border-border bg-background px-3 py-2 text-sm"
        >
          {availableLocales.map((option) => (
            <option key={option.code} value={option.code}>
              {option.nativeName}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
