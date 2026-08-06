/**
 * Host transport — Sprint H1.
 *
 * Only the host sees controls, because only the host's intents are
 * authoritative. Guests get the same information without the illusion of
 * control they do not have.
 */
import { ActionButton } from "@/design-system/components";
import { useTranslation } from "@/foundation/localization";

export interface HostTransportProps {
  readonly isHost: boolean;
  readonly isPlaying: boolean;
  readonly canControl: boolean;
  readonly positionMs: number | null;
  readonly durationMs: number | null;
  onTogglePlay(): void;
  onSeekBy(deltaMs: number): void;
  onRestart(): void;
}

function clockLabel(ms: number | null): string {
  if (ms === null || !Number.isFinite(ms)) return "--:--";
  const total = Math.max(0, Math.round(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  const hours = Math.floor(minutes / 60);
  const mm = String(hours > 0 ? minutes % 60 : minutes).padStart(hours > 0 ? 2 : 1, "0");
  const ss = String(seconds).padStart(2, "0");
  return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`;
}

export function HostTransport({
  isHost,
  isPlaying,
  canControl,
  positionMs,
  durationMs,
  onTogglePlay,
  onSeekBy,
  onRestart,
}: HostTransportProps) {
  const { t } = useTranslation();

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 sm:flex sm:justify-between">
      <p className="min-w-0 truncate text-sm tabular-nums text-muted-foreground">
        {clockLabel(positionMs)}
        {durationMs ? ` / ${clockLabel(durationMs)}` : ""}
      </p>

      {isHost ? (
        <div className="flex shrink-0 items-center gap-2">
          <ActionButton tone="ghost" size="sm" onClick={onRestart} disabled={!canControl}>
            {t("theater.transport.restart")}
          </ActionButton>
          <ActionButton tone="ghost" size="sm" onClick={() => onSeekBy(-10_000)} disabled={!canControl}>
            {t("theater.transport.back")}
          </ActionButton>
          <ActionButton tone="primary" size="sm" onClick={onTogglePlay} disabled={!canControl}>
            {isPlaying ? t("theater.transport.pause") : t("theater.transport.play")}
          </ActionButton>
          <ActionButton tone="ghost" size="sm" onClick={() => onSeekBy(10_000)} disabled={!canControl}>
            {t("theater.transport.forward")}
          </ActionButton>
        </div>
      ) : (
        <p className="shrink-0 text-sm text-muted-foreground">{t("theater.transport.host_leads")}</p>
      )}
    </div>
  );
}
