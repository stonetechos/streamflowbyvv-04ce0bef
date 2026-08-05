/**
 * Invite friends — UX Simplification Pass.
 *
 * One big button. Behind it, the four ways people actually share a room:
 * WhatsApp, copy link, copy code, and the platform share sheet. No invite
 * counts, no history, no menus.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";

import { ActionButton } from "@/design-system/components";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { copyText } from "@/features/shared/copy-text";
import { useAnnouncer } from "@/foundation/accessibility";
import { useTranslation } from "@/foundation/localization";
import { cn } from "@/lib/utils";

export interface InviteFriendsProps {
  readonly roomName: string;
  readonly roomCode: string;
  /**
   * Sprint 85 — when inviting is the only thing to do on the screen, the
   * trigger carries the primary weight. Elsewhere it stays a quiet option.
   */
  readonly emphasis?: "primary" | "secondary";
}

export function InviteFriends({ roomName, roomCode, emphasis = "secondary" }: InviteFriendsProps) {
  const { t } = useTranslation();
  const announce = useAnnouncer();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState<"link" | "code" | null>(null);

  const joinUrl = useMemo(() => {
    const origin = typeof window === "undefined" ? "" : window.location.origin;
    // One link, one destination: the lobby. Signing in on the way is handled
    // by the invite landing route, never by the person pasting a code.
    return `${origin}/join/${encodeURIComponent(roomCode)}`;
  }, [roomCode]);

  const message = t("invite.share.text", { room: roomName });

  // A phone pointed at a laptop is the fastest invite there is. The code is
  // rendered locally from the join link; nothing leaves the device.
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void QRCode.toDataURL(joinUrl, { width: 320, margin: 1 })
      .then((url) => {
        if (!cancelled) setQrDataUrl(url);
      })
      .catch(() => {
        if (!cancelled) setQrDataUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [open, joinUrl]);

  const copy = useCallback(
    async (value: string, kind: "link" | "code") => {
      const copiedOk = await copyText(value);
      if (!copiedOk) {
        announce(t("invite.share.copy_failed"), "assertive");
        return;
      }
      setCopied(kind);
      announce(t("invite.share.copied"));
      window.setTimeout(() => setCopied(null), 2400);
    },
    [announce, t],
  );

  const shareNative = useCallback(async () => {
    if (typeof navigator.share !== "function") {
      void copy(joinUrl, "link");
      return;
    }
    try {
      await navigator.share({ title: t("invite.share.title"), text: message, url: joinUrl });
    } catch {
      // A cancelled share sheet is not an error worth reporting.
    }
  }, [copy, joinUrl, message, t]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl text-base font-semibold",
            "transition-[transform,background-color] duration-fast ease-standard active:scale-[0.99] motion-reduce:transform-none",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            emphasis === "primary"
              ? "bg-primary text-primary-foreground shadow-e2 hover:bg-primary/90"
              : "border border-border bg-surface/70 hover:bg-accent",
          )}
        >
          {t("room.invite.action")}
        </button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("room.invite.action")}</DialogTitle>
          <DialogDescription>{t("room.invite.description")}</DialogDescription>
        </DialogHeader>

        {qrDataUrl ? (
          <figure className="flex flex-col items-center gap-2">
            <img
              src={qrDataUrl}
              alt={t("room.invite.qr_alt", { room: roomName })}
              className="size-40 rounded-2xl border border-border bg-background p-2"
            />
            <figcaption className="text-xs text-muted-foreground">
              {t("room.invite.qr_caption")}
            </figcaption>
          </figure>
        ) : null}

        <div className="grid gap-2">
          <a
            href={`https://wa.me/?text=${encodeURIComponent(`${message} ${joinUrl}`)}`}
            target="_blank"
            rel="noreferrer"
            className="flex min-h-14 items-center justify-center rounded-2xl bg-primary text-base font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {t("room.invite.whatsapp")}
          </a>

          <ActionButton tone="secondary" onClick={() => void copy(joinUrl, "link")}>
            {copied === "link" ? t("invite.share.copied") : t("room.invite.copy_link")}
          </ActionButton>

          <ActionButton tone="secondary" onClick={() => void copy(roomCode, "code")}>
            {copied === "code"
              ? t("invite.share.copied")
              : t("room.invite.copy_code", { code: roomCode })}
          </ActionButton>

          <ActionButton tone="ghost" onClick={() => void shareNative()}>
            {t("invite.share.share")}
          </ActionButton>
        </div>
      </DialogContent>
    </Dialog>
  );
}
