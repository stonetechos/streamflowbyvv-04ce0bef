/**
 * Coordination panel — Sprint H2.
 *
 * What the room shows when the provider cannot be driven. There is no fake
 * transport here: the host presses nothing that pretends to reach Netflix.
 * Instead the room agrees on a moment, tells everyone the same instruction,
 * and offers a re-sync prompt when people fall apart (ADR-014).
 */
import { ActionButton, Surface } from "@/design-system/components";
import type { WatchProviderCapability, WatchSource } from "@/domain";
import { useTranslation } from "@/foundation/localization";

export interface CoordinationPanelProps {
  readonly capability: WatchProviderCapability;
  readonly source: WatchSource | null;
  readonly isHost: boolean;
  /** True while the shared countdown is running. */
  readonly isCounting: boolean;
  onNudge(): void;
}

export function CoordinationPanel({
  capability,
  source,
  isHost,
  isCounting,
  onNudge,
}: CoordinationPanelProps) {
  const { t } = useTranslation();
  const openUrl = source && source.kind !== "youtube" ? source.url : null;

  return (
    <Surface
      tone="card"
      padding="md"
      className="flex flex-col gap-3"
      data-sf-coordination={capability.playbackControlMode}
    >
      <p className="text-sm font-semibold">
        {t("theater.coordinate.title", { provider: capability.displayName })}
      </p>
      <p className="text-xs text-muted-foreground">
        {isCounting ? t("theater.coordinate.counting") : t("theater.coordinate.idle")}
      </p>

      <div className="flex flex-wrap gap-2">
        {openUrl ? (
          <a
            className="rounded-full border border-border/60 px-4 py-2 text-sm font-medium hover:border-primary/60"
            href={openUrl}
            target="_blank"
            rel="noreferrer noopener"
            data-sf-open-provider={capability.providerId}
          >
            {t("theater.stage.open_provider", { provider: capability.displayName })}
          </a>
        ) : null}
        {isHost ? (
          <ActionButton tone="secondary" size="sm" onClick={onNudge} data-sf-resync>
            {t("theater.coordinate.resync")}
          </ActionButton>
        ) : null}
      </div>
    </Surface>
  );
}
