/**
 * Local copy prompt — Tier A.
 *
 * When the room is watching a file, each person opens their *own* copy from
 * their own device. Nothing is uploaded, shared, or streamed between people:
 * the only thing that travelled was the file's name. Once a copy is open, the
 * room drives it for real — play, pause and seek are shared.
 */
import { useRef } from "react";

import { ActionButton, Surface } from "@/design-system/components";
import { useTranslation } from "@/foundation/localization";

export interface LocalFilePromptProps {
  /** The name the host announced, so people open the matching cut. */
  readonly fileName: string;
  onPick(file: File): void;
}

export function LocalFilePrompt({ fileName, onPick }: LocalFilePromptProps) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement | null>(null);

  return (
    <Surface
      tone="glass"
      padding="lg"
      className="sf-stage-enter relative flex aspect-video w-full flex-col items-center justify-center gap-3 overflow-hidden rounded-2xl text-center shadow-e2 ring-1 ring-border/50"
      data-sf-stage="local-file"
    >
      <p className="text-xs uppercase tracking-wide text-muted-foreground">
        {t("theater.local.eyebrow")}
      </p>
      <p className="text-balance text-lg font-semibold sm:text-2xl" data-sf-local-file-name>
        {fileName}
      </p>
      <p className="max-w-sm text-sm text-muted-foreground">{t("theater.local.explainer")}</p>
      <input
        ref={inputRef}
        type="file"
        accept="video/*"
        className="sr-only"
        data-sf-local-file-input
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onPick(file);
        }}
      />
      <ActionButton size="lg" onClick={() => inputRef.current?.click()} data-sf-local-file-pick>
        {t("theater.local.pick")}
      </ActionButton>
      <p className="text-xs text-muted-foreground">{t("theater.local.privacy")}</p>
    </Surface>
  );
}
