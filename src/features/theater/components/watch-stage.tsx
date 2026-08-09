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
import { CapabilityNote } from "./capability-note";
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
  /** A choice is being written: the stage shows a skeleton, never a blank. */
  readonly isPreparing?: boolean;
  /** The service has been opened in this person's own browser. */
  readonly hasLaunched?: boolean;
  /** The host has opened the service for the party — a room fact. */
  readonly hostLaunched?: boolean;
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
  isPreparing = false,
  hasLaunched = false,
  hostLaunched = false,
  onChooseContent,
  onOpenProvider,
}: WatchStageProps) {
  const { t } = useTranslation();
  const view = deriveStageView({
    source,
    capability,
    isHost,
    phase,
    isPreparing,
    hasLaunched,
    hostLaunched,
  });

  // One shared frame keeps every stage state the same size and weight, so a
  // change of state reads as a transition inside the room rather than a
  // re-layout of the page.
  const frame =
    "sf-stage-enter relative w-full overflow-hidden min-h-[13rem] sm:min-h-0 sm:aspect-video shadow-e2 ring-1 ring-border/50";

  if (view.kind === "preparing") {
    return (
      <Surface
        key="stage-preparing"
        tone="glass"
        padding="lg"
        className={`${frame} flex items-center justify-center text-center`}
        data-sf-stage="preparing"
        data-sf-stage-role={view.role}
      >
        <div className="relative flex w-full max-w-sm flex-col items-center gap-3 px-2">
          <div
            aria-hidden="true"
            className="h-3 w-28 rounded-full bg-muted motion-safe:animate-pulse"
          />
          <div
            aria-hidden="true"
            className="h-6 w-52 rounded-lg bg-muted motion-safe:animate-pulse"
          />
          <div
            aria-hidden="true"
            className="h-3 w-40 rounded-full bg-muted motion-safe:animate-pulse"
          />
          <p role="status" className="text-sm text-muted-foreground" data-sf-stage-status>
            {t(view.statusKey)}
          </p>
        </div>
      </Surface>
    );
  }

  if (view.kind === "empty") {
    return (
      <Surface
        key="stage-empty"
        tone="glass"
        padding="lg"
        className={`${frame} flex items-center justify-center text-center`}
        data-sf-stage="empty"
        data-sf-stage-role={view.role}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,theme(colors.primary/18%),transparent_65%)]"
        />
        <div className="relative flex w-full max-w-sm flex-col items-center gap-3 px-1 sm:gap-4 sm:px-2">
          <span
            aria-hidden="true"
            className="flex size-12 items-center justify-center rounded-2xl border border-border/60 bg-background/40 text-xl shadow-e1 sm:size-14 sm:text-2xl"
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
        key={`stage-handoff-${capability.providerId}`}
        tone="glass"
        padding="lg"
        className={`${frame} flex flex-col items-center justify-center gap-3 text-center`}
        data-sf-stage="handoff"
        data-sf-stage-role={view.role}
        data-sf-stage-provider={capability.providerId}
        data-sf-stage-launched={hasLaunched ? "true" : "false"}
        data-sf-stage-host-launched={hostLaunched ? "true" : "false"}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,theme(colors.primary/14%),transparent_65%)]"
        />
        <div className="relative flex w-full max-w-md flex-col items-center gap-2.5 px-1 sm:gap-3 sm:px-2">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{statusLine}</p>
          <p className="text-balance text-lg font-semibold sm:text-2xl" data-sf-stage-title>
            {title ?? capability.displayName}
          </p>
          {/* A guest must be able to see, at a glance, that the host is already
              in front of the service — not infer it from a status sentence. */}
          {hostLaunched && !hasLaunched ? (
            <span
              className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-medium"
              data-sf-stage-host-badge
            >
              <span aria-hidden="true" className="size-1.5 rounded-full bg-primary" />
              {t("theater.stage.host_live", { provider: capability.displayName })}
            </span>
          ) : null}
          {countdownSeconds !== null ? (
            <p
              className="text-4xl font-semibold tabular-nums sm:text-5xl"
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
          {/* Capability limits are part of the room, on every screen size. */}
          <CapabilityNote capability={capability} variant="compact" />
          {source?.url || onOpenProvider ? (
            <ActionButton
              tone={hasLaunched ? "secondary" : "primary"}
              size="lg"
              onClick={onOpenProvider}
              data-sf-stage-open-provider={capability.providerId}
              data-sf-stage-launch={view.launchKey}
              className="w-full sm:w-auto"
            >
              {t(view.launchKey, { provider: capability.displayName })}
            </ActionButton>
          ) : null}
        </div>
      </Surface>
    );
  }

  return (
    <div
      key="stage-embedded"
      ref={stageRef}
      data-sf-stage="embedded"
      data-sf-stage-role={view.role}
      className="sf-stage-enter relative aspect-video w-full overflow-hidden rounded-2xl bg-black shadow-e2 ring-1 ring-border/50"
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
