/**
 * Chat panel — Sprint H1.
 *
 * Text alongside the film. Assistant-style neutrality: the viewer's own lines
 * carry a filled bubble, everyone else's sit directly on the surface.
 */
import { useEffect, useRef, useState, type FormEvent } from "react";

import { ActionButton, Surface } from "@/design-system/components";
import { useTranslation } from "@/foundation/localization";

import type { RoomChatModel } from "../use-room-chat";

export interface ChatPanelProps {
  readonly chat: RoomChatModel;
  readonly nameFor: (profileId: string) => string;
  readonly canSend: boolean;
}

export function ChatPanel({ chat, nameFor, canSend }: ChatPanelProps) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState("");
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [chat.lines.length]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!canSend) return;
    chat.send(draft);
    setDraft("");
  };

  return (
    <Surface tone="card" padding="md" className="flex h-full min-h-0 flex-col gap-3">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
        <h2 className="min-w-0 truncate text-sm font-semibold">{t("theater.chat.title")}</h2>
        <span className="shrink-0 text-xs text-muted-foreground">
          {chat.isLive ? t("theater.chat.live") : t("theater.chat.offline")}
        </span>
      </div>

      <div
        className="flex min-h-40 flex-1 flex-col gap-2 overflow-y-auto pr-1"
        role="log"
        aria-live="polite"
        aria-label={t("theater.chat.title")}
      >
        {chat.lines.length === 0 && !chat.isLoading ? (
          <p className="m-auto max-w-[22ch] text-center text-sm text-muted-foreground">
            {t("theater.chat.empty")}
          </p>
        ) : null}

        {chat.lines.map((line) => (
          <div
            key={line.id}
            className={line.isViewer ? "flex justify-end" : "flex justify-start"}
            data-sf-chat-line={line.isPending ? "pending" : "sent"}
          >
            <div
              className={
                line.isViewer
                  ? "max-w-[85%] rounded-2xl bg-primary px-3 py-2 text-sm text-primary-foreground"
                  : "max-w-[85%] rounded-2xl px-3 py-2 text-sm text-foreground"
              }
            >
              {!line.isViewer ? (
                <p className="text-xs font-semibold text-muted-foreground">
                  {nameFor(line.profileId)}
                </p>
              ) : null}
              <p className="whitespace-pre-wrap break-words">{line.body}</p>
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      <form className="flex items-end gap-2" onSubmit={submit}>
        <label className="sr-only" htmlFor="theater-chat-input">
          {t("theater.chat.placeholder")}
        </label>
        <textarea
          id="theater-chat-input"
          className="min-h-11 w-full resize-none rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
          rows={2}
          maxLength={chat.maxLength}
          value={draft}
          disabled={!canSend}
          placeholder={t("theater.chat.placeholder")}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              submit(event);
            }
          }}
        />
        <ActionButton type="submit" size="sm" disabled={!canSend || draft.trim().length === 0}>
          {t("theater.chat.send")}
        </ActionButton>
      </form>

      {chat.error ? (
        <p className="text-xs text-destructive" role="alert">
          {t(`theater.chat.error.${chat.error}`)}
        </p>
      ) : null}
    </Surface>
  );
}
