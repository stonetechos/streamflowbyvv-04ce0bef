import { createFileRoute } from "@tanstack/react-router";

import { SectionHeader } from "@/design-system/components";
import { useAuth } from "@/features/auth";
import { SettingsPanel } from "@/features/profiles";
import { useTranslation } from "@/foundation/localization";

/**
 * Settings — Milestone E.
 *
 * One screen for identity and the five preference aggregates. Device-only
 * choices (theme, motion) apply immediately and are mirrored to the account so
 * the next device starts where this one left off.
 */
export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Settings — StreamFlow" },
      {
        name: "description",
        content:
          "Manage your profile, appearance, notifications, privacy, language and accessibility preferences.",
      },
      { property: "og:title", content: "Settings — StreamFlow" },
      {
        property: "og:description",
        content: "Your StreamFlow profile and preferences.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SettingsRoute,
});

function SettingsRoute() {
  const { t } = useTranslation();
  const auth = useAuth();

  return (
    <div className="mx-auto w-full max-w-3xl space-y-8 px-4 py-8 pb-28 sm:px-6 md:pb-12">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          {t("settings.title")}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("settings.description")}</p>
      </div>

      <SettingsPanel profileId={auth.session?.identity.profileId ?? null} />

      <SectionHeader title={t("settings.session.title")} />
      <a
        href="/auth/sign-out"
        className="inline-flex min-h-12 items-center rounded-xl border border-border px-5 text-sm font-medium transition-colors hover:bg-accent"
      >
        {t("auth.action.sign_out")}
      </a>
    </div>
  );
}
