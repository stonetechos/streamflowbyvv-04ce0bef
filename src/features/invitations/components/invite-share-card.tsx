/**
 * Invite sharing — Milestone E.
 *
 * How a person hands a room to someone else: a copyable link, the native share
 * sheet where the platform offers one, and a QR placeholder for the
 * across-the-room case. The QR image itself is deferred (MVP §7) — the space
 * it will occupy is reserved honestly rather than faked.
 *
 * No secret is rendered here: the room's display code is a code, never the
 * join-code hash, which never leaves storage (Foundation §10).
 */
import { useCallback, useState } from "react";

import { ActionButton, Surface } from "@/design-system/components";
import { useAnnouncer } from "@/foundation/accessibility";
import { useTranslation } from "@/foundation/localization";

export interface InviteShareCardProps {
  readonly roomName: string;
  readonly roomCode: string;
  readonly joinUrl: string;
}

export function InviteShareCard({ roomName, roomCode, joinUrl }: InviteShareCardProps) {
  const { t } = useTranslation();
  const announce = useAnnouncer();
  const [copied, setCopied] = useState(false);

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(joinUrl);
      setCopied(true);
      announce(t("invite.share.copied"));
      window.setTimeout(() => setCopied(false), 2400);
    } catch {
      announce(t("invite.share.copy_failed"), "assertive");
    }
  }, [announce, joinUrl, t]);

  const share = useCallback(async () => {
    if (typeof navigator.share !== "function") {
      void copy();
      return;
    }
    try {
      await navigator.share({
        title: t("invite.share.title"),
        text: t("invite.share.text", { room: roomName }),
        url: joinUrl,
      });
    } catch {
      // A cancelled share sheet is not an error worth reporting.
    }
  }, [copy, joinUrl, roomName, t]);

  return (
    <Surface padding="md" as="section" aria-labelledby="invite-share-heading">
      <h2 id="invite-share-heading" className="font-display text-lg font-semibold tracking-tight">
        {t("invite.share.title")}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">{t("invite.share.description")}</p>

      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center">
        <div
          aria-hidden="true"
          className="grid size-28 shrink-0 place-items-center rounded-2xl border border-dashed border-border bg-muted/40"
        >
          <span className="px-2 text-center text-[0.625rem] font-medium uppercase tracking-widest text-muted-foreground">
            {t("invite.share.qr_placeholder")}
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            {t("invite.share.code_label")}
          </p>
          <p className="mt-1 font-mono text-lg tracking-[0.14em]">{roomCode}</p>
          <p className="mt-2 truncate text-xs text-muted-foreground">{joinUrl}</p>

          <div className="mt-4 flex flex-wrap gap-2">
            <ActionButton size="sm" tone="secondary" onClick={() => void copy()}>
              {copied ? t("invite.share.copied") : t("invite.share.copy_link")}
            </ActionButton>
            <ActionButton size="sm" tone="ghost" onClick={() => void share()}>
              {t("invite.share.share")}
            </ActionButton>
          </div>
        </div>
      </div>
    </Surface>
  );
}
