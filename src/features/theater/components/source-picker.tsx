/**
 * Source picker — Sprint H1.
 *
 * The host names what the room is watching. The panel states the truth about
 * the pasted service before anything is saved: StreamFlow plays what it is
 * permitted to embed, and coordinates around everything else (ADR-014).
 */
import { useState, type FormEvent } from "react";

import { ActionButton, Surface, TextField } from "@/design-system/components";
import { parseWatchSource, watchSourceCapability } from "@/domain";
import { useTranslation } from "@/foundation/localization";

export interface SourcePickerProps {
  readonly current: string;
  readonly isSaving: boolean;
  readonly error: string | null;
  onSubmit(input: string): void;
}

export function SourcePicker({ current, isSaving, error, onSubmit }: SourcePickerProps) {
  const { t } = useTranslation();
  const [value, setValue] = useState(current);

  const parsed = parseWatchSource(value);
  const capability = watchSourceCapability(parsed);
  const showPreview = value.trim().length > 0;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit(value);
  };

  return (
    <Surface tone="card" padding="md" className="flex flex-col gap-3">
      <form className="flex flex-col gap-3" onSubmit={submit}>
        <TextField
          label={t("theater.source.label")}
          description={t("theater.source.description")}
          placeholder="https://www.youtube.com/watch?v=..."
          value={value}
          error={error}
          onChange={(event) => setValue(event.target.value)}
        />
        <ActionButton type="submit" size="sm" loading={isSaving} disabled={value.trim().length === 0}>
          {t("theater.source.save")}
        </ActionButton>
      </form>

      {showPreview ? (
        <div className="rounded-xl border border-border/60 p-3 text-xs" data-sf-source-verdict={parsed?.kind ?? "unrecognized"}>
          {!parsed ? (
            <p className="text-muted-foreground">{t("theater.source.unrecognized")}</p>
          ) : (
            <>
              <p className="font-semibold">
                {capability.supported
                  ? t("theater.source.playable", { provider: capability.displayName })
                  : t("theater.source.coordinate_only", { provider: capability.displayName })}
              </p>
              <ul className="mt-1 space-y-1 text-muted-foreground">
                {capability.limitations.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </>
          )}
        </div>
      ) : null}
    </Surface>
  );
}
