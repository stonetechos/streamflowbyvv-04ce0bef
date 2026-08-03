/**
 * Authentication shell — Milestone E.
 *
 * The frame every auth screen sits in: a calm two-column composition on
 * desktop (story on the left, form on the right) that collapses to a single
 * focused column on a phone. Po appears here as the welcome, not as an
 * assistant — decorative only (Po Rule).
 */
import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { Surface } from "@/design-system/components";
import { PoCompanion, type PoMood } from "@/features/po";
import { useTranslation } from "@/foundation/localization";

export interface AuthShellProps {
  readonly title: string;
  readonly subtitle: string;
  readonly children: ReactNode;
  readonly footer?: ReactNode;
  readonly mood?: PoMood;
}

export function AuthShell({ title, subtitle, children, footer, mood = "calm" }: AuthShellProps) {
  const { t } = useTranslation();

  return (
    <div className="relative isolate min-h-[calc(100dvh-3.5rem)] w-full overflow-hidden">
      {/* Ambient field: two soft token-coloured washes, no imagery to load. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 opacity-70"
        style={{
          background:
            "radial-gradient(60rem 40rem at 12% -10%, var(--color-primary) 0%, transparent 55%), radial-gradient(50rem 36rem at 95% 110%, var(--color-info) 0%, transparent 55%)",
        }}
      />

      <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-10 lg:grid-cols-[1.05fr_minmax(0,26rem)] lg:items-center lg:py-16">
        {/* Story column — hidden on phones, where the form is the whole job. */}
        <section className="hidden lg:block">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            {t("common.app.publisher")}
          </p>
          <h2 className="mt-4 max-w-lg font-display text-4xl font-semibold leading-tight tracking-tight">
            {t("auth.story.headline")}
          </h2>
          <p className="mt-4 max-w-md text-base text-muted-foreground">
            {t("auth.story.body")}
          </p>

          <ul className="mt-8 space-y-3 text-sm">
            {["auth.story.point.accounts", "auth.story.point.countdown", "auth.story.point.voice"].map(
              (key) => (
                <li key={key} className="flex items-start gap-3">
                  <span
                    aria-hidden="true"
                    className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary"
                  />
                  <span className="text-muted-foreground">{t(key)}</span>
                </li>
              ),
            )}
          </ul>

          <PoCompanion mood={mood} className="mt-10 h-32 w-44" />
        </section>

        {/* Form column */}
        <Surface tone="glass" padding="lg" as="section" className="w-full">
          <h1 className="font-display text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>

          <div className="mt-6">{children}</div>

          {footer ? <div className="mt-6 text-sm text-muted-foreground">{footer}</div> : null}

          <p className="mt-8 border-t border-border/60 pt-4 text-xs leading-relaxed text-muted-foreground">
            {t("auth.legal.notice")}{" "}
            <Link to="/" className="underline underline-offset-2 hover:text-foreground">
              {t("common.action.learn_more")}
            </Link>
          </p>
        </Surface>
      </div>
    </div>
  );
}
