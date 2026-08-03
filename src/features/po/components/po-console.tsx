/**
 * Po Console — Milestone H1 §2.
 *
 * Po's one interactive surface. It is a corner panel, never a takeover: the
 * screen behind it stays visible and usable, because Po assists the room and
 * does not replace it (Milestone H1 §4).
 *
 * This file renders state and forwards text. Every decision — what Po
 * understood, whether it must ask, what it will run, and what it says — is
 * made by the brain and reaches here as turns, a pending question and an
 * outcome. Nothing here interprets or retries.
 */
import { Loader2, MessageSquare, X } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAccessibility, useAnnouncer } from "@/foundation/accessibility";
import { useTranslation } from "@/foundation/localization";
import { cn } from "@/lib/utils";

import { usePo } from "../po-provider";
import { PoCompanion } from "./po-companion";
import { PoConsoleTranscript } from "./po-console-transcript";

export function PoConsole() {
  const { t } = useTranslation();
  const announce = useAnnouncer();
  const { prefersReducedMotion } = useAccessibility();
  const po = usePo();

  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const panelId = useId();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const spokenOutcome = useRef<unknown>(null);

  const close = useCallback(() => {
    setIsOpen(false);
    triggerRef.current?.focus();
  }, []);

  // Keyboard: Ctrl/Cmd-K opens Po and focuses the input, Escape closes it.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setIsOpen((open) => !open);
        return;
      }
      if (event.key === "Escape" && isOpen) {
        event.preventDefault();
        close();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [close, isOpen]);

  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  // Focus returns to the input after every reply, so a clarification can be
  // answered without reaching for the mouse.
  useEffect(() => {
    if (!po.isBusy && isOpen) inputRef.current?.focus();
  }, [po.isBusy, isOpen, po.lastOutcome]);

  // Screen readers hear Po's reply even when the panel is not their focus.
  useEffect(() => {
    const outcome = po.lastOutcome;
    if (!outcome || outcome === spokenOutcome.current) return;
    spokenOutcome.current = outcome;
    announce(
      t(outcome.message.key, outcome.message.values),
      outcome.status === "failed" || outcome.status === "refused" ? "assertive" : "polite",
    );
  }, [announce, po.lastOutcome, t]);

  const send = useCallback(
    (text: string) => {
      const said = text.trim();
      if (said.length === 0 || po.isBusy) return;
      setDraft("");
      void po.submitUtterance(said, "text");
    },
    [po],
  );

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    send(draft);
  };

  if (!isOpen) {
    return (
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-end p-4 pb-24 md:pb-6">
        <Button
          ref={triggerRef}
          type="button"
          variant="secondary"
          aria-expanded={false}
          aria-controls={panelId}
          onClick={() => setIsOpen(true)}
          className="pointer-events-auto h-11 gap-2 rounded-full border border-border/70 pl-2 pr-4 shadow-lg shadow-black/20 backdrop-blur"
        >
          <span aria-hidden="true" className="flex h-7 w-7 items-center justify-center">
            <PoCompanion mood="calm" size="sm" />
          </span>
          <span className="text-sm font-medium">{t("po.console.open")}</span>
        </Button>
      </div>
    );
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-end p-3 pb-20 md:p-4 md:pb-6">
      <section
        id={panelId}
        aria-label={t("po.console.title")}
        className={cn(
          "pointer-events-auto flex w-full max-w-md flex-col overflow-hidden rounded-2xl border border-border/70 bg-card/95 shadow-2xl shadow-black/30 backdrop-blur-xl",
          "max-h-[min(70dvh,32rem)]",
          prefersReducedMotion ? undefined : "animate-in fade-in slide-in-from-bottom-4",
        )}
      >
        <header className="flex items-center gap-3 border-b border-border/60 px-4 py-3">
          <span aria-hidden="true" className="flex h-8 w-8 items-center justify-center">
            <PoCompanion mood={po.isBusy ? "thinking" : "calm"} size="sm" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-sm font-semibold tracking-tight">
              {t("po.console.title")}
            </h2>
            <p className="truncate text-xs text-muted-foreground">{t("po.console.subtitle")}</p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={t("po.console.close")}
            onClick={close}
          >
            <X aria-hidden="true" className="h-4 w-4" />
          </Button>
        </header>

        <PoConsoleTranscript
          turns={po.turns}
          steps={po.steps}
          pending={po.pending}
          outcome={po.lastOutcome}
          isBusy={po.isBusy}
          phase={po.phase}
          onAnswer={send}
        />

        <form onSubmit={onSubmit} className="border-t border-border/60 p-3">
          <label className="sr-only" htmlFor={`${panelId}-input`}>
            {t("po.console.placeholder")}
          </label>
          <div className="flex items-end gap-2">
            <Textarea
              id={`${panelId}-input`}
              ref={inputRef}
              rows={1}
              value={draft}
              disabled={!po.isAvailable}
              placeholder={
                po.isAvailable ? t("po.console.placeholder") : t("po.console.unavailable")
              }
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  send(draft);
                }
              }}
              className="max-h-28 min-h-11 resize-none"
            />
            <Button
              type="submit"
              size="icon"
              aria-label={t("po.console.send")}
              disabled={!po.isAvailable || po.isBusy || draft.trim().length === 0}
              className="h-11 w-11 shrink-0"
            >
              {po.isBusy ? (
                <Loader2
                  aria-hidden="true"
                  className={cn("h-4 w-4", prefersReducedMotion ? undefined : "animate-spin")}
                />
              ) : (
                <MessageSquare aria-hidden="true" className="h-4 w-4" />
              )}
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}
