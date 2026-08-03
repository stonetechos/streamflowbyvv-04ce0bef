import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

import { ActionButton, Surface } from "@/design-system/components";
import { useAuth } from "@/features/auth";
import { PoCompanion } from "@/features/po";
import { useTranslation } from "@/foundation/localization";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "StreamFlow — Watch together, in sync" },
      {
        name: "description",
        content:
          "StreamFlow keeps a group's playback in step across the services they already pay for, with a shared countdown and voice chat. No accounts shared, no content re-streamed.",
      },
      { property: "og:title", content: "StreamFlow — Watch together, in sync" },
      {
        property: "og:description",
        content:
          "Start a watch party on the services you already use, with a shared countdown and voice.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LandingPage,
});

function LandingPage() {
  const { t } = useTranslation();
  const auth = useAuth();
  const navigate = useNavigate();
  const isAuthenticated = Boolean(auth.session);

  useEffect(() => {
    if (isAuthenticated) void navigate({ to: "/home", replace: true });
  }, [isAuthenticated, navigate]);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-16 sm:px-6">
      <Surface tone="glass" padding="lg" className="relative isolate overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 opacity-70"
          style={{
            background:
              "radial-gradient(48rem 28rem at 110% -10%, var(--color-info) 0%, transparent 60%), radial-gradient(38rem 24rem at -10% 120%, var(--color-primary) 0%, transparent 60%)",
          }}
        />
        <div className="flex flex-col gap-8 md:flex-row md:items-center">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              {t("common.app.name")}
            </p>
            <h1 className="mt-4 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
              {t("landing.headline")}
            </h1>
            <p className="mt-4 max-w-xl text-base text-muted-foreground">
              {t("landing.subheadline")}
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/auth/sign-up">
                <ActionButton size="lg">{t("landing.cta.primary")}</ActionButton>
              </Link>
              <Link to="/auth/sign-in">
                <ActionButton size="lg" tone="ghost">
                  {t("landing.cta.secondary")}
                </ActionButton>
              </Link>
            </div>
          </div>

          <PoCompanion mood="happy" className="h-40 w-56 shrink-0 self-center" />
        </div>
      </Surface>

      <ul className="mt-8 grid gap-4 sm:grid-cols-3">
        {["accounts", "countdown", "voice"].map((point) => (
          <li key={point}>
            <Surface padding="md" className="h-full">
              <p className="text-sm text-muted-foreground">{t(`auth.story.point.${point}`)}</p>
            </Surface>
          </li>
        ))}
      </ul>
    </div>
  );
}
