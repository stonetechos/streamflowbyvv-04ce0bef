/**
 * Catch-up assistant — Watch Party Engine v2.0, ADR-014 compliant.
 *
 * StreamFlow cannot read a provider's playhead and cannot move it. What it can
 * do is arithmetic: the room agreed on an instant, so it knows how far along
 * everyone *should* be. The member reads their own player, types it in, and
 * StreamFlow tells them the difference and which way to nudge.
 *
 * No seek is ever issued. The member moves their own player, or nobody does.
 */
import { useMemo, useState } from "react";

import { ActionButton, TextField } from "@/design-system/components";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useTranslation } from "@/foundation/localization";

export interface CatchUpSheetProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  /** Room anchor; the expected position is derived from it. */
  readonly startedAt: string | null;
  readonly clockOffsetMs: number;
  /** Below this many seconds the room counts as together. */
  readonly toleranceSeconds?: number;
}

/** Accepts `mm:ss`, `h:mm:ss`, or a plain number of seconds. */
export function parseClockInput(raw: string): number | null {
  const trimmed = raw.trim();
  if (trimmed.length === 0) return null;
  const parts = trimmed.split(":");
  if (parts.length > 3) return null;
  let total = 0;
  for (const part of parts) {
    if (!/^\d+(\.\d+)?$/.test(part.trim())) return null;
    total = total * 60 + Number(part);
  }
  return Number.isFinite(total) ? total : null;
}

export function CatchUpSheet({
  open,
  onOpenChange,
  startedAt,
  clockOffsetMs,
  toleranceSeconds = 3,
}: CatchUpSheetProps) {
  const { t } = useTranslation();
  const [value, setValue] = useState("");
  const [reported, setReported] = useState<number | null>(null);

  const expectedSeconds = useMemo(() => {
    if (!startedAt) return null;
    const started = Date.parse(startedAt);
    if (Number.isNaN(started)) return null;
    return Math.max(0, (Date.now() + clockOffsetMs - started) / 1000);
  }, [startedAt, clockOffsetMs, open, reported]); // eslint-disable-line react-hooks/exhaustive-deps

  const difference =
    reported === null || expectedSeconds === null ? null : expectedSeconds - reported;
  const magnitude = difference === null ? null : Math.abs(difference).toFixed(1);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("watch_party.catch_up.title")}</DialogTitle>
          <DialogDescription>{t("watch_party.catch_up.description")}</DialogDescription>
        </DialogHeader>

        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            setReported(parseClockInput(value));
          }}
        >
          <TextField
            label={t("watch_party.catch_up.field")}
            value={value}
            placeholder="12:34"
            inputMode="numeric"
            onChange={(event) => setValue(event.target.value)}
          />

          <ActionButton type="submit" tone="primary">
            {t("watch_party.catch_up.compare")}
          </ActionButton>
        </form>

        {magnitude !== null && difference !== null ? (
          <div className="rounded-2xl border border-border bg-surface/70 p-4 text-sm" role="status">
            {Math.abs(difference) <= toleranceSeconds ? (
              <p className="font-medium text-success">{t("watch_party.catch_up.in_sync")}</p>
            ) : (
              <>
                <p className="font-medium">
                  {difference > 0
                    ? t("watch_party.catch_up.behind", { seconds: magnitude })
                    : t("watch_party.catch_up.ahead", { seconds: magnitude })}
                </p>
                <p className="mt-1 text-muted-foreground">
                  {difference > 0
                    ? t("watch_party.catch_up.advice_behind", { seconds: magnitude })
                    : t("watch_party.catch_up.advice_ahead", { seconds: magnitude })}
                </p>
              </>
            )}
          </div>
        ) : null}

        <p className="text-xs text-muted-foreground">{t("watch_party.catch_up.footnote")}</p>
      </DialogContent>
    </Dialog>
  );
}
