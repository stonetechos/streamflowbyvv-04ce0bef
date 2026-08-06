/**
 * Manual coordination controls — Sprint H5.
 *
 * The launch-only room. There is no transport here because the application
 * does not reach the provider's player: what it can do is open the service,
 * let people say they are ready, and broadcast a request that other humans
 * act on. Nothing in this panel asserts that anyone's device paused (ADR-014).
 */
import { ActionButton, Surface } from "@/design-system/components";
import type { CoordinationKind, WatchProviderCapability, WatchSource } from "@/domain";
import { useTranslation } from "@/foundation/localization";

export interface RoomEventEntry {
  readonly id: string;
  readonly kind: CoordinationKind;
  readonly who: string;
  readonly createdAt: string;
}

export interface ManualCoordinationProps {
  readonly capability: WatchProviderCapability;
  readonly source: WatchSource | null;
  readonly isHost: boolean;
  readonly isReady: boolean;
  readonly canAct: boolean;
  readonly events: readonly RoomEventEntry[];
  onOpenProvider(): void;
  onToggleReady(): void;
  onRequest(kind: CoordinationKind): void;
  onLeave(): void;
}

const EVENT_KEY: Record<CoordinationKind, string> = {
  "pause-request": "room.event.pause_request",
  "resume-request": "room.event.resume_request",
  "resync-request": "room.event.resync_request",
  "ready-ack": "room.event.ready_ack",
};

export function ManualCoordination({
  capability,
  source,
  isHost,
  isReady,
  canAct,
  events,
  onOpenProvider,
  onToggleReady,
  onRequest,
  onLeave,
}: ManualCoordinationProps) {
  const { t } = useTranslation();
  const recent = events.slice(-5);

  return (
    <Surface
      tone="card"
      padding="md"
      className="flex flex-col gap-4"
      data-sf-manual-coordination={capability.providerId}
    >
      <div className="flex flex-col gap-1">
        <p className="text-sm font-semibold">
          {t("room.manual.title", { provider: capability.displayName })}
        </p>
        <p className="text-xs text-muted-foreground">
          {t("room.manual.explainer", { provider: capability.displayName })}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <ActionButton
          tone="primary"
          size="sm"
          onClick={onOpenProvider}
          disabled={!source}
          data-sf-open-provider={capability.providerId}
        >
          {t("theater.stage.open_provider", { provider: capability.displayName })}
        </ActionButton>
        <ActionButton
          tone={isReady ? "secondary" : "primary"}
          size="sm"
          onClick={onToggleReady}
          disabled={!canAct}
          data-sf-ready-toggle={isReady ? "ready" : "not-ready"}
        >
          {isReady ? t("room.manual.not_ready") : t("room.manual.ready")}
        </ActionButton>
        <ActionButton
          tone="secondary"
          size="sm"
          onClick={() => onRequest("pause-request")}
          disabled={!canAct}
          data-sf-request="pause"
        >
          {t("room.manual.request_pause")}
        </ActionButton>
        <ActionButton
          tone="secondary"
          size="sm"
          onClick={() => onRequest("resume-request")}
          disabled={!canAct}
          data-sf-request="resume"
        >
          {t("room.manual.request_resume")}
        </ActionButton>
        {isHost ? (
          <ActionButton
            tone="ghost"
            size="sm"
            onClick={() => onRequest("resync-request")}
            disabled={!canAct}
            data-sf-request="resync"
          >
            {t("room.manual.request_resync")}
          </ActionButton>
        ) : null}
        <ActionButton tone="ghost" size="sm" onClick={onLeave} data-sf-leave-party>
          {t("room.manual.leave")}
        </ActionButton>
      </div>

      <p className="text-xs text-muted-foreground" data-sf-resync-instructions>
        {t("room.manual.instructions", { provider: capability.displayName })}
      </p>

      {recent.length > 0 ? (
        <ul className="flex flex-col gap-1 border-t border-border/50 pt-3" data-sf-room-events>
          {recent.map((event) => (
            <li key={event.id} className="text-xs text-muted-foreground">
              {t(EVENT_KEY[event.kind], { name: event.who })}
            </li>
          ))}
        </ul>
      ) : null}
    </Surface>
  );
}
