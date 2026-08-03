/**
 * Invite friends — UX Simplification Pass.
 *
 * One big button. Behind it, the four ways people actually share a room:
 * WhatsApp, copy link, copy code, and the platform share sheet. No invite
 * counts, no history, no menus.
 */
import { useCallback, useMemo, useState } from "react";

import { ActionButton } from "@/design-system/components";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useAnnouncer } from "@/foundation/accessibility";
import { useTranslation } from "@/foundation/localization";

export interface InviteFriendsProps {
  readonly roomName: string;
  readonly roomCode: string;
}

export function InviteFriends({ roomName, roomCode }: InviteFriendsProps) {
  const { t } = useTranslation();
  const announce = useAnnouncer();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState<"link" | "code" | null>(null);

  const joinUrl = useMemo(() => {
    const origin = typeof window === "undefined" ? "" : window.location.origin;
    return `${origin}/home?code=${encodeURIComponent(roomCode)}`;
  }, [roomCode]);

  const message = t("invite.share.text", { room: roomName });

  const copy = useCallback(
    async (value: string, kind: "link" | "code") => {
      try {
        await navigator.clipboard.writeText(value);
        setCopied(kind);
        announce(t("invite.share.copied"));
        window.setTimeout(() => setCopied(null), 2400);
      } catch {
        announce(t("invite.share.copy_failed"), "assertive");
      }
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
          className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl border border-border bg-surface/70 text-base font-semibold transition-colors duration-fast hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {t("room.invite.action")}
        </button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("room.invite.action")}</DialogTitle>
          <DialogDescription>{t("room.invite.description")}</DialogDescription>
        </DialogHeader>

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
