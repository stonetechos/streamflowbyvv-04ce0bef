/**
 * Party message bar — the persistent bottom edge of the theatre.
 *
 * One line, always there: type to the room and press send. The bubble on the
 * right opens the full transcript when someone wants to read back, and carries
 * the unread count so a quiet bar is never mistaken for a quiet room.
 */
import { useState, type FormEvent } from "react";
import { MessageSquare, SendHorizontal } from "lucide-react";

import { useTranslation } from "@/foundation/localization";
import { cn } from "@/lib/utils";

export interface PartyMessageBarProps {
  readonly canSend: boolean;
  readonly maxLength: number;
  readonly unreadCount: number;
  readonly isTranscriptOpen: boolean;
  readonly disabledReason: "chat_disabled" | "muted" | "left" | null;
  onSend(body: string): void;
  onToggleTranscript(): void;
}

export function PartyMessageBar({
  canSend,
  maxLength,
  unreadCount,
  isTranscriptOpen,
  disabledReason,
  onSend,
  onToggleTranscript,
}: PartyMessageBarProps) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState("");

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!canSend || draft.trim().length === 0) return;
    onSend(draft);
    setDraft("");
  };

  return (
    <div className="shrink-0 px-3 pb-3 pt-2 sm:px-4" data-sf-party-message-bar>
      {disabledReason ? (
        <p className="pb-1 text-xs text-muted-foreground" data-sf-chat-disabled={disabledReason}>
          {t(`theater.chat.disabled.${disabledReason}`)}
        </p>
      ) : null}

      <form className="flex items-center gap-2" onSubmit={submit}>
        <label className="sr-only" htmlFor="party-message-input">
          {t("party.message.placeholder")}
        </label>
        <input
          id="party-message-input"
          type="text"
          value={draft}
          maxLength={maxLength}
          disabled={!canSend}
          placeholder={t("party.message.placeholder")}
          onChange={(event) => setDraft(event.target.value)}
          className="min-h-11 w-full rounded-full border border-border/70 bg-muted/40 px-4 text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
        />

        <button
          type="submit"
          disabled={!canSend || draft.trim().length === 0}
          aria-label={t("theater.chat.send")}
          className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
        >
          <SendHorizontal className="size-4" aria-hidden="true" />
        </button>

        <button
          type="button"
          onClick={onToggleTranscript}
          aria-pressed={isTranscriptOpen}
          aria-label={t("theater.chat.title")}
          data-sf-party-transcript-toggle={isTranscriptOpen ? "open" : "closed"}
          className={cn(
            "relative inline-flex size-11 shrink-0 items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            isTranscriptOpen
              ? "bg-secondary text-secondary-foreground"
              : "bg-muted/60 text-muted-foreground hover:bg-muted",
          )}
        >
          <MessageSquare className="size-4" aria-hidden="true" />
          {unreadCount > 0 && !isTranscriptOpen ? (
            <span className="absolute -right-0.5 -top-0.5 min-w-4 rounded-full bg-primary px-1 text-[0.625rem] font-semibold leading-4 text-primary-foreground">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          ) : null}
        </button>
      </form>
    </div>
  );
}
