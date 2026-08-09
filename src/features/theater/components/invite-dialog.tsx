/**
 * Invite dialog — the "Invite a friend" card that floats over the stage.
 *
 * Three ways out of an empty room: the system share sheet, the clipboard, and
 * the short room key a person can read aloud. Each one reports honestly: a
 * sheet the browser refused is not a share, and a clipboard that said no is
 * not a copy.
 */
import { useCallback, useState } from "react";
import { KeyRound, Link2, Share2, X } from "lucide-react";

import { useTranslation } from "@/foundation/localization";
import { cn } from "@/lib/utils";

export type InviteBlockedReason = "locked" | "full" | "expired" | null;

export interface InviteDialogProps {
  readonly open: boolean;
  readonly link: string;
  readonly roomCode: string | null;
  readonly participantCount: number;
  readonly blocked: InviteBlockedReason;
  onClose(): void;
  onCopied?(): void;
  onShared?(): void;
}

type Feedback = "copied" | "shared" | "code_copied" | "failed" | null;

const CIRCLE =
  "inline-flex size-12 items-center justify-center rounded-full transition-colors " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 " +
  "focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50";

export function InviteDialog({
  open,
  link,
  roomCode,
  participantCount,
  blocked,
  onClose,
  onCopied,
  onShared,
}: InviteDialogProps) {
  const { t } = useTranslation();
  const [feedback, setFeedback] = useState<Feedback>(null);

  const write = useCallback(async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      return true;
    } catch {
      return false;
    }
  }, []);

  const handleCopy = useCallback(() => {
    void write(link).then((ok) => {
      setFeedback(ok ? "copied" : "failed");
      if (ok) onCopied?.();
    });
  }, [link, write, onCopied]);

  const handleCopyCode = useCallback(() => {
    if (!roomCode) return;
    void write(roomCode).then((ok) => setFeedback(ok ? "code_copied" : "failed"));
  }, [roomCode, write]);

  const canShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

  const handleShare = useCallback(() => {
    if (typeof navigator.share !== "function") return;
    navigator.share({ url: link }).then(
      () => {
        setFeedback("shared");
        onShared?.();
      },
      () => {
        void write(link).then((ok) => setFeedback(ok ? "copied" : "failed"));
      },
    );
  }, [link, write, onShared]);

  if (!open) return null;

  const message =
    feedback === "copied"
      ? t("invite.share.copied")
      : feedback === "shared"
        ? t("room.invite.share_success")
        : feedback === "code_copied"
          ? t("party.invite.code_copied")
          : feedback === "failed"
            ? t("room.invite.copy_failed")
            : null;

  return (
    <div
      className="absolute inset-0 z-30 flex items-center justify-center bg-background/70 p-4 backdrop-blur-sm"
      data-sf-invite-dialog
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t("party.invite.title")}
        className="w-full max-w-sm rounded-2xl border border-border/60 bg-card p-5 shadow-e3"
      >
        <div className="flex items-start justify-between gap-2">
          <h2 className="text-sm font-semibold">{t("party.invite.title")}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("common.action.close")}
            className="rounded-full p-1 text-muted-foreground hover:bg-muted"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>

        {blocked ? (
          <p className="mt-4 text-sm text-muted-foreground" data-sf-invite-blocked={blocked}>
            {t(`room.invite.state.${blocked}`)}
          </p>
        ) : (
          <>
            <div className="mt-4 flex items-start justify-center gap-6">
              {canShare ? (
                <div className="flex flex-col items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleShare}
                    data-sf-share-invite
                    className={cn(CIRCLE, "bg-muted text-foreground hover:bg-muted/80")}
                  >
                    <Share2 className="size-5" aria-hidden="true" />
                  </button>
                  <span className="text-[0.6875rem] text-muted-foreground">
                    {t("party.invite.share")}
                  </span>
                </div>
              ) : null}

              <div className="flex flex-col items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleCopy}
                  data-sf-copy-invite
                  className={cn(CIRCLE, "bg-muted text-foreground hover:bg-muted/80")}
                >
                  <Link2 className="size-5" aria-hidden="true" />
                </button>
                <span className="text-[0.6875rem] text-muted-foreground">
                  {t("party.invite.copy")}
                </span>
              </div>

              {roomCode ? (
                <div className="flex flex-col items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleCopyCode}
                    data-sf-copy-room-key
                    className={cn(CIRCLE, "bg-primary text-primary-foreground hover:bg-primary/90")}
                  >
                    <KeyRound className="size-5" aria-hidden="true" />
                  </button>
                  <span className="text-[0.6875rem] text-muted-foreground">
                    {t("party.invite.key")}
                  </span>
                </div>
              ) : null}
            </div>

            {roomCode ? (
              <p className="mt-4 text-center font-mono text-lg tracking-[0.3em]">{roomCode}</p>
            ) : null}

            <p className="mt-4 truncate rounded-lg bg-muted px-3 py-2 text-center font-mono text-xs text-muted-foreground">
              {link}
            </p>

            <p className="mt-4 text-center text-sm text-muted-foreground">
              {participantCount <= 1
                ? t("party.invite.empty")
                : t("room.invite.people", { count: participantCount })}
            </p>
          </>
        )}

        <p aria-live="polite" className="mt-3 min-h-4 text-center text-xs text-muted-foreground">
          {message}
        </p>
      </div>
    </div>
  );
}
