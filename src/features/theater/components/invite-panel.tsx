/**
 * Invite panel — Sprint H7.
 *
 * Copying and sharing are the whole job. Both report success and failure
 * honestly: a share sheet that never opened is not a share, and a clipboard
 * that refused is not a copy. The link itself is always visible so a person
 * can select it by hand when the browser blocks everything else.
 */
import { useCallback, useState } from "react";

import { ActionButton, Surface } from "@/design-system/components";
import { useTranslation } from "@/foundation/localization";

export type InviteBlockedReason = "locked" | "full" | "expired" | null;

export interface InvitePanelProps {
  readonly link: string;
  readonly participantCount: number;
  readonly blocked: InviteBlockedReason;
  readonly onCopied?: () => void;
  readonly onShared?: () => void;
}

type Feedback = "copied" | "shared" | "share_failed" | "copy_failed" | null;

export function InvitePanel({
  link,
  participantCount,
  blocked,
  onCopied,
  onShared,
}: InvitePanelProps) {
  const { t } = useTranslation();
  const [feedback, setFeedback] = useState<Feedback>(null);

  const copy = useCallback(async (): Promise<boolean> => {
    try {
      await navigator.clipboard.writeText(link);
      return true;
    } catch {
      return false;
    }
  }, [link]);

  const handleCopy = useCallback(() => {
    void copy().then((ok) => {
      setFeedback(ok ? "copied" : "copy_failed");
      if (ok) onCopied?.();
    });
  }, [copy, onCopied]);

  const canShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

  const handleShare = useCallback(() => {
    if (typeof navigator.share !== "function") return;
    navigator.share({ url: link }).then(
      () => {
        setFeedback("shared");
        onShared?.();
      },
      () => {
        // A dismissed sheet and a blocked sheet look the same; either way the
        // person still needs the link, so it is placed on the clipboard.
        void copy().then((ok) => setFeedback(ok ? "share_failed" : "copy_failed"));
      },
    );
  }, [link, copy, onShared]);

  const message =
    feedback === "copied"
      ? t("invite.share.copied")
      : feedback === "shared"
        ? t("room.invite.share_success")
        : feedback === "share_failed"
          ? t("room.invite.share_failed")
          : feedback === "copy_failed"
            ? t("room.invite.copy_failed")
            : null;

  return (
    <Surface tone="card" padding="md" className="flex flex-col gap-3" data-sf-invite-panel>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium">{t("room.invite.copy_link")}</p>
        <p className="text-xs text-muted-foreground">
          {t("room.invite.people", { count: participantCount })}
        </p>
      </div>

      <p className="truncate rounded-lg bg-muted px-3 py-2 font-mono text-xs text-muted-foreground">
        {link}
      </p>

      {blocked ? (
        <p className="text-sm text-muted-foreground" data-sf-invite-blocked={blocked}>
          {t(`room.invite.state.${blocked}`)}
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          <ActionButton
            tone="secondary"
            onClick={handleCopy}
            className="min-h-11"
            data-sf-copy-invite
          >
            {t("room.invite.copy_link")}
          </ActionButton>
          {canShare ? (
            <ActionButton
              tone="ghost"
              onClick={handleShare}
              className="min-h-11"
              data-sf-share-invite
            >
              {t("room.invite.share_native")}
            </ActionButton>
          ) : null}
        </div>
      )}

      {participantCount <= 1 && !blocked ? (
        <p className="text-xs text-muted-foreground" data-sf-invite-reminder>
          {t("room.invite.reminder")}
        </p>
      ) : null}

      <p aria-live="polite" className="min-h-4 text-xs text-muted-foreground">
        {message}
      </p>
    </Surface>
  );
}
