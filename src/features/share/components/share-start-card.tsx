/**
 * Share start card — Milestone L.
 *
 * The primary call to action on Home. The journey now begins inside the
 * streaming app, so this card teaches the one gesture that matters and offers
 * a paste-a-link fallback for desktops and browsers with no share target.
 */
import { useState, type FormEvent } from "react";
import { useNavigate } from "@tanstack/react-router";

import { ActionButton, Surface, TextField } from "@/design-system/components";
import { useTranslation } from "@/foundation/localization";

export function ShareStartCard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [link, setLink] = useState("");

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const url = link.trim();
    if (url.length === 0) return;
    void navigate({ to: "/share", search: { url } });
  }

  return (
    <Surface tone="glass" padding="lg" className="space-y-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {t("home.share.eyebrow")}
        </p>
        <h2 className="mt-2 font-display text-xl font-semibold tracking-tight sm:text-2xl">
          {t("home.share.title")}
        </h2>
        <p className="mt-2 max-w-xl text-sm text-muted-foreground">{t("home.share.description")}</p>
      </div>

      <ol className="grid gap-3 sm:grid-cols-3">
        {["one", "two", "three"].map((step, index) => (
          <li key={step} className="rounded-xl border border-border/60 bg-surface/50 p-3 text-sm">
            <span className="text-xs font-semibold text-muted-foreground">
              {t("home.share.step_label", { number: index + 1 })}
            </span>
            <p className="mt-1">{t(`home.share.step.${step}`)}</p>
          </li>
        ))}
      </ol>

      <form onSubmit={onSubmit} className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="flex-1">
          <TextField
            label={t("home.share.paste_label")}
            placeholder={t("home.share.paste_placeholder")}
            value={link}
            onChange={(event) => setLink(event.target.value)}
          />
        </div>
        <ActionButton type="submit" size="sm" disabled={link.trim().length === 0}>
          {t("home.share.paste_action")}
        </ActionButton>
      </form>
    </Surface>
  );
}
