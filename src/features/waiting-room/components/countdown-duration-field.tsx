/**
 * Countdown duration field — Sprint 2.2.
 *
 * Chooses how long the shared countdown will run. It stores a preference and
 * nothing else: no timer starts here, and no playback is implied. The engine
 * that consumes this value arrives in a later sprint.
 */
import { useEffect, useId, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTranslation } from "@/foundation/localization";
import { COUNTDOWN } from "@/shared/constants/system-constants";

export interface CountdownDurationFieldProps {
  readonly seconds: number;
  readonly disabled: boolean;
  readonly isSaving: boolean;
  onCommit(seconds: number): void;
}

export function CountdownDurationField({
  seconds,
  disabled,
  isSaving,
  onCommit,
}: CountdownDurationFieldProps) {
  const { t } = useTranslation();
  const inputId = useId();
  const [draft, setDraft] = useState(String(seconds));

  // Follow the room when someone else changes it; the draft owns typing only.
  useEffect(() => {
    setDraft(String(seconds));
  }, [seconds]);

  const parsed = Number.parseInt(draft, 10);
  const isValid =
    Number.isFinite(parsed) &&
    parsed >= COUNTDOWN.MIN_SECONDS &&
    parsed <= COUNTDOWN.MAX_SECONDS;
  const isDirty = isValid && parsed !== seconds;

  return (
    <div className="space-y-2">
      <Label htmlFor={inputId}>{t("room.setup.countdown.label")}</Label>
      <div className="flex items-start gap-2">
        <Input
          id={inputId}
          type="number"
          inputMode="numeric"
          min={COUNTDOWN.MIN_SECONDS}
          max={COUNTDOWN.MAX_SECONDS}
          value={draft}
          disabled={disabled}
          aria-invalid={!isValid}
          aria-describedby={`${inputId}-hint`}
          onChange={(event) => setDraft(event.target.value)}
          className="w-28"
        />
        <Button
          type="button"
          variant="secondary"
          disabled={disabled || !isDirty || isSaving}
          onClick={() => onCommit(parsed)}
        >
          {t(isSaving ? "common.saving" : "common.save")}
        </Button>
      </div>
      <p id={`${inputId}-hint`} className="text-xs text-muted-foreground">
        {isValid
          ? t("room.setup.countdown.hint", {
              min: String(COUNTDOWN.MIN_SECONDS),
              max: String(COUNTDOWN.MAX_SECONDS),
            })
          : t("room.setup.countdown.invalid", {
              min: String(COUNTDOWN.MIN_SECONDS),
              max: String(COUNTDOWN.MAX_SECONDS),
            })}
      </p>
    </div>
  );
}
