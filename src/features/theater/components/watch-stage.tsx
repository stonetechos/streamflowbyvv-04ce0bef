/**
 * Watch stage — Sprint H1, extended in H2, promoted to the room's main stage.
 *
 * The centre panel is the room. It renders exactly one of three honest states:
 * a source StreamFlow is permitted to embed and play in sync, a service
 * StreamFlow may only coordinate around, or nothing chosen yet. The empty
 * state is actionable for the host and informative for a guest — a guest is
 * never shown a host-only action. Fullscreen belongs to the embedded case
 * only: a provider-native player owns its own fullscreen and the room never
 * pretends otherwise.
 */
import { ActionButton, Surface } from "@/design-system/components";
import { useTranslation } from "@/foundation/localization";
import type { RoomPhase, WatchProviderCapability, WatchSource } from "@/domain";

import { deriveStageView } from "../stage-view";
import { providerModeKey } from "./provider-bar";

export interface WatchStageProps {
  readonly source: WatchSource | null;
  readonly capability: WatchProviderCapability;
  readonly containerRef: React.RefObject<HTMLDivElement | null>;
  /** Element that goes fullscreen; only used for embeddable sources. */
  readonly stageRef?: React.RefObject<HTMLDivElement | null>;
  readonly hasFailed: boolean;
  readonly isReady: boolean;
  readonly isHost: boolean;
  readonly phase: RoomPhase;
  /** Host-typed or derived name of what the room picked. */
  readonly title?: string | null;
  /** Seconds left in a running countdown, or null. */
  readonly countdownSeconds?: number | null;
  /** Opens the host's app/provider selection flow. */
  onChooseContent?(): void;
  /** Opens the chosen service in a new tab. Launch-only and manual services. */
  onOpenProvider?(): void;
}

export function WatchStage({
  source,
  capability,
  containerRef,
  stageRef,
  hasFailed,
  isReady,
  isHost,
  phase,
  title = null,
  countdownSeconds = null,
  onChooseContent,
  onOpenProvider,
}: WatchStageProps) {
  const { t } = useTranslation();
  const view = deriveStageView({ source, capability, isHost, phase });

  if (view.kind === "empty") {
    return (
      <Surface
        tone="glass"
        padding="lg"
        className="relative flex aspect-video w-full items-center justify-center overflow-hidden text-center"
        data-sf-stage="empty"
        data-sf-stage-role={view.role}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,theme(colors.primary/18%),transparent_65%)]"
        />
        <div className="relative flex max-w-sm flex-col items-center gap-4 px-2">
          <span
            aria-hidden="true"
            className="flex size-14 items-center justify-center rounded-2xl border border-border/60 bg-background/40 text-2xl shadow-e1"
          >
            ▶
          </span>
          <p className="text-balance text-base font-semibold sm:text-lg">
            {t("theater.stage.empty")}
          </p>
          {view.showsChooseCta ? (
            <ActionButton
              size="lg"
              onClick={onChooseContent}
              data-sf-stage-cta="choose-content"
              className="w-full sm:w-auto"
            >
              {t("theater.stage.host_cta")}
            </ActionButton>
          ) : (
            <p className="text-sm text-muted-foreground" data-sf-stage-waiting>
              {t("theater.stage.guest_waiting")}
            </p>
          )}
        </div>
      </Surface>
    );
  }

  const statusLine = `${capability.displayName} · ${t(providerModeKey(capability.playbackControlMode))}`;

  if (view.kind === "handoff") {
    return (
      <Surface
        tone="glass"
        padding="lg"
        className="relative flex aspect-video w-full flex-col items-center justify-center gap-3 overflow-hidden text-center"
        data-sf-stage="handoff"
        data-sf-stage-role={view.role}
        data-sf-stage-provider={capability.providerId}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,theme(colors.primary/14%),transparent_65%)]"
        />
        <div className="relative flex w-full max-w-md flex-col items-center gap-3 px-2">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{statusLine}</p>
          <p className="text-balance text-lg font-semibold sm:text-2xl" data-sf-stage-title>
            {title ?? capability.displayName}
          </p>
          {countdownSeconds !== null ? (
            <p
              className="text-4xl font-semibold tabular-nums"
              data-sf-stage-countdown={countdownSeconds}
            >
              {countdownSeconds}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground" data-sf-stage-status>
              {t(view.statusKey)}
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            {t("theater.stage.external_title", { provider: capability.displayName })}
          </p>
          <ul className="space-y-1 text-xs text-muted-foreground">
            {capability.limitations.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          {source?.url || onOpenProvider ? (
            <ActionButton
              tone="secondary"
              size="md"
              onClick={onOpenProvider}
              data-sf-stage-open-provider={capability.providerId}
            >
              {t("theater.stage.open_provider", { provider: capability.displayName })}
            </ActionButton>
          ) : null}
        </div>
      </Surface>
    );
  }

  return (
    <div
      ref={stageRef}
      data-sf-stage="embedded"
      data-sf-stage-role={view.role}
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
