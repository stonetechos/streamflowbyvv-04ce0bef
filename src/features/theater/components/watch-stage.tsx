/**
 * Watch stage — Sprint H1, extended in H2.
 *
 * The shared screen. It renders exactly one of three honest states: a source
 * StreamFlow is permitted to embed and play in sync, a service StreamFlow may
 * only coordinate around, or nothing chosen yet. Fullscreen belongs to the
 * embedded case only — a provider-native player owns its own fullscreen and
 * the room never pretends otherwise.
 */
import { Surface } from "@/design-system/components";
import { useTranslation } from "@/foundation/localization";
import type { WatchProviderCapability, WatchSource } from "@/domain";

export interface WatchStageProps {
  readonly source: WatchSource | null;
  readonly capability: WatchProviderCapability;
  readonly containerRef: React.RefObject<HTMLDivElement | null>;
  /** Element that goes fullscreen; only used for embeddable sources. */
  readonly stageRef?: React.RefObject<HTMLDivElement | null>;
  readonly hasFailed: boolean;
  readonly isReady: boolean;
}

export function WatchStage({
  source,
  capability,
  containerRef,
  stageRef,
  hasFailed,
  isReady,
}: WatchStageProps) {
  const { t } = useTranslation();

  if (!source) {
    return (
      <Surface
        tone="glass"
        padding="lg"
        className="flex aspect-video w-full items-center justify-center text-center"
        data-sf-stage="empty"
      >
        <p className="max-w-sm text-sm text-muted-foreground">{t("theater.stage.empty")}</p>
      </Surface>
    );
  }

  if (source.kind !== "youtube" || !capability.allowsEmbeddedPlayback) {
    return (
      <Surface
        tone="glass"
        padding="lg"
        className="flex aspect-video w-full flex-col items-center justify-center gap-3 text-center"
        data-sf-stage="handoff"
      >
        <p className="text-base font-semibold">
          {t("theater.stage.external_title", { provider: capability.displayName })}
        </p>
        <ul className="max-w-md space-y-1 text-sm text-muted-foreground">
          {capability.limitations.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
        {source.url ? (
          <a
            className="text-sm font-medium text-primary underline underline-offset-4"
            href={source.url}
            target="_blank"
            rel="noreferrer noopener"
          >
            {t("theater.stage.open_provider", { provider: capability.displayName })}
          </a>
        ) : null}
      </Surface>
    );
  }

  return (
    <div
      ref={stageRef}
      data-sf-stage="embedded"
      className="relative aspect-video w-full overflow-hidden rounded-2xl bg-black shadow-e2"
    >
      <div ref={containerRef} className="absolute inset-0 [&_iframe]:h-full [&_iframe]:w-full" />
      {hasFailed ? (
        <div className="absolute inset-0 flex items-center justify-center bg-background/85 p-6 text-center">
          <p className="max-w-sm text-sm text-muted-foreground">{t("theater.stage.blocked")}</p>
        </div>
      ) : null}
      {!isReady && !hasFailed ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-sm text-muted-foreground">{t("common.state.loading")}</p>
        </div>
      ) : null}
    </div>
  );
}
