import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

import { ActionButton, Surface } from "@/design-system/components";
import { useAuth } from "@/features/auth";
import { ServiceLogo } from "@/features/home";
import { PoCompanion } from "@/features/po";
import { useTranslation } from "@/foundation/localization";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "StreamFlow — Watch together, perfectly synced" },
      {
        name: "description",
        content:
          "StreamFlow keeps a group's playback in sync across the streaming services they already pay for, with a shared countdown and live voice. Own accounts only, nothing re-streamed.",
      },
      { property: "og:title", content: "StreamFlow — Watch together, perfectly synced" },
      {
        property: "og:description",
        content:
          "StreamFlow keeps a group's playback in sync across the streaming services they already pay for, with a shared countdown and live voice. Own accounts only, nothing re-streamed.",
      },
      { property: "og:type", content: "website" },
      {
        property: "og:image",
        content: "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/74ea0993-6b2e-4c9e-8f4f-dcbfcd53fbdb",
      },
      { name: "twitter:card", content: "summary_large_image" },
      {
        name: "twitter:image",
        content: "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/74ea0993-6b2e-4c9e-8f4f-dcbfcd53fbdb",
      },
    ],
    links: [
      {
        rel: "canonical",
        href: "https://project--9fb64234-2e83-4a74-bb9c-83d15f6b5a75.lovable.app/",
      },
    ],
  }),
  component: LandingPage,
});

/** Marks already drawn in the project; monochrome, never stretched. */
const SERVICE_MARKS: readonly { key: string; name: string }[] = [
  { key: "netflix", name: "Netflix" },
  { key: "prime_video", name: "Prime Video" },
  { key: "disney_hotstar", name: "Disney+" },
  { key: "jiohotstar", name: "JioHotstar" },
  { key: "youtube", name: "YouTube" },
  { key: "apple_tv_plus", name: "Apple TV+" },
];

const FEATURE_CARDS = ["together", "subscription", "voice"] as const;
const STEPS = [1, 2, 3] as const;

function LandingPage() {
  const { t } = useTranslation();
  const auth = useAuth();
  const navigate = useNavigate();
  const isAuthenticated = Boolean(auth.session);

  useEffect(() => {
    if (isAuthenticated) void navigate({ to: "/home", replace: true });
  }, [isAuthenticated, navigate]);

  return (
    <div className="mx-auto w-full max-w-5xl space-y-12 px-4 py-12 sm:px-6 sm:py-16 lg:space-y-16">
      <Surface tone="glass" padding="lg" className="relative isolate overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 opacity-70"
          style={{
            background:
              "radial-gradient(48rem 28rem at 110% -10%, var(--color-info) 0%, transparent 60%), radial-gradient(38rem 24rem at -10% 120%, var(--color-primary) 0%, transparent 60%)",
          }}
        />
        <div className="flex flex-col gap-10 md:flex-row md:items-center">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              {t("common.app.name")}
            </p>
            <h1 className="mt-4 text-balance font-display text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
              {t("landing.headline")}
            </h1>
            <p className="mt-5 max-w-xl text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
              {t("landing.subheadline")}
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link to="/auth/sign-up" className="sm:w-auto">
                <ActionButton size="lg" className="w-full sm:w-auto">
                  {t("landing.cta.primary")}
                </ActionButton>
              </Link>
              <Link to="/auth/sign-in" className="sm:w-auto">
                <ActionButton size="lg" tone="ghost" className="w-full sm:w-auto">
                  {t("landing.cta.secondary")}
                </ActionButton>
              </Link>
            </div>
          </div>

          <PoCompanion mood="happy" className="h-32 w-44 shrink-0 self-center sm:h-40 sm:w-56" />
        </div>
      </Surface>

      <section aria-labelledby="landing-features">
        <h2 id="landing-features" className="sr-only">
          {t("landing.how.title")}
        </h2>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURE_CARDS.map((card) => (
            <li key={card}>
              <Surface
                padding="md"
                className="h-full transition-transform duration-200 ease-out hover:-translate-y-0.5 motion-reduce:transform-none motion-reduce:transition-none"
              >
                <h3 className="font-display text-base font-semibold tracking-tight">
                  {t(`landing.card.${card}.title`)}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {t(`landing.card.${card}.body`)}
                </p>
              </Surface>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="landing-how" className="space-y-6">
        <div className="max-w-xl">
          <h2
            id="landing-how"
            className="font-display text-2xl font-semibold tracking-tight sm:text-3xl"
          >
            {t("landing.how.title")}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground sm:text-base">
            {t("landing.how.description")}
          </p>
        </div>
        <ol className="grid gap-4 sm:grid-cols-3">
          {STEPS.map((step) => (
            <li key={step}>
              <Surface padding="md" className="h-full">
                <span className="inline-flex size-8 items-center justify-center rounded-full bg-primary/10 font-display text-sm font-semibold text-primary">
                  {step}
                </span>
                <p className="mt-3 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  {t("landing.how.step", { step })}
                </p>
                <p className="mt-2 text-sm leading-relaxed">{t(`landing.how.step${step}`)}</p>
              </Surface>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="landing-services" className="space-y-5">
        <h2
          id="landing-services"
          className="font-display text-lg font-semibold tracking-tight sm:text-xl"
        >
          {t("landing.services.title")}
        </h2>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {SERVICE_MARKS.map((mark) => (
            <li key={mark.key}>
              <Surface
                padding="sm"
                className="flex h-16 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
              >
                <ServiceLogo
                  brandKey={mark.key}
                  name={mark.name}
                  className="h-8 w-auto max-w-full"
                />
                <span className="sr-only">{mark.name}</span>
              </Surface>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
