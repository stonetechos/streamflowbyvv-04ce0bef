/**
 * Beta dashboard — Sprint H7.
 *
 * An internal, session-only view of the closed-beta funnel. It reads the tab's
 * analytics store directly: no query, no persistence, no export. Everything
 * resets when the tab does, which is exactly the intent — this is a development
 * instrument, not a product analytics surface and not certification evidence.
 */
import { Surface } from "@/design-system/components";
import type { FunnelCounts, FunnelMetrics } from "@/domain";
import { useBetaSnapshot } from "@/features/analytics";
import { useTranslation } from "@/foundation/localization";

const METRIC_KEYS: readonly (keyof FunnelMetrics)[] = [
  "landingToRoomCreation",
  "roomCreationToInvite",
  "inviteOpenToGuestJoin",
  "roomWithGuest",
  "guestJoinToContentSelection",
  "contentSelectionToCountdown",
  "countdownToWatching",
  "watchingToVoiceConnection",
  "reconnectRecovery",
  "roomRepeatCreation",
];

const COUNT_KEYS: readonly (keyof FunnelCounts)[] = [
  "roomsCreated",
  "roomsWithGuest",
  "watchingStarted",
  "invitesOpened",
  "guestsJoined",
];

export function BetaDashboard() {
  const { t } = useTranslation();
  const snapshot = useBetaSnapshot();
  const counters = snapshot.counters;

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 pb-28 sm:px-6" data-sf-beta-dashboard>
      <h1 className="font-display text-2xl font-semibold tracking-tight">{t("beta.title")}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{t("beta.subtitle")}</p>

      <section className="mt-6" aria-labelledby="beta-funnel">
        <h2 id="beta-funnel" className="text-sm font-semibold">
          {t("beta.section.funnel")}
        </h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {METRIC_KEYS.map((key) => {
            const value = snapshot.metrics[key];
            return (
              <Surface key={key} tone="card" padding="md" className="flex flex-col gap-1">
                <p className="text-xs text-muted-foreground">{t(`beta.metric.${key}`)}</p>
                <p className="font-mono text-lg">
                  {value === null ? "—" : `${Math.round(value * 100)}%`}
                </p>
                {value === null ? (
                  <p className="text-[0.6875rem] text-muted-foreground">{t("beta.no_target")}</p>
                ) : null}
              </Surface>
            );
          })}
        </div>
      </section>

      <section className="mt-8" aria-labelledby="beta-rooms">
        <h2 id="beta-rooms" className="text-sm font-semibold">
          {t("beta.section.rooms")}
        </h2>
        <dl className="mt-3 grid gap-3 sm:grid-cols-3">
          {COUNT_KEYS.map((key) => (
            <Surface key={key} tone="card" padding="md">
              <dt className="text-xs text-muted-foreground">{t(`beta.count.${key}`)}</dt>
              <dd className="font-mono text-lg">{snapshot.counts[key]}</dd>
            </Surface>
          ))}
        </dl>
      </section>

      <section className="mt-8" aria-labelledby="beta-reliability">
        <h2 id="beta-reliability" className="text-sm font-semibold">
          {t("beta.section.reliability")}
        </h2>
        <dl className="mt-3 grid gap-3 sm:grid-cols-3">
          {(
            [
              ["voiceConnected", counters["voice_connected"] ?? 0],
              ["voiceFailed", counters["voice_failed"] ?? 0],
              ["reconnects", snapshot.counts.reconnectsStarted],
              ["reconnectsRecovered", snapshot.counts.reconnectsRecovered],
              ["providerLaunches", counters["provider_launch_clicked"] ?? 0],
              ["manualSync", counters["manual_sync_requested"] ?? 0],
              ["roomStartFailed", counters["room_start_failed"] ?? 0],
            ] as const
          ).map(([key, value]) => (
            <Surface key={key} tone="card" padding="md">
              <dt className="text-xs text-muted-foreground">{t(`beta.count.${key}`)}</dt>
              <dd className="font-mono text-lg">{value}</dd>
            </Surface>
          ))}
        </dl>
      </section>

      <section className="mt-8" aria-labelledby="beta-feedback">
        <h2 id="beta-feedback" className="text-sm font-semibold">
          {t("beta.section.feedback")}
        </h2>
        {snapshot.feedbackSummary.total === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">{t("beta.empty")}</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {snapshot.feedback.map((entry) => (
              <li key={entry.at} className="rounded-xl border border-border px-3 py-2 text-sm">
                <span className="font-medium">{t(`room.feedback.outcome.${entry.outcome}`)}</span>
                {entry.categories.length > 0 ? (
                  <span className="text-muted-foreground">
                    {" · "}
                    {entry.categories.map((c) => t(`room.feedback.category.${c}`)).join(", ")}
                  </span>
                ) : null}
                {entry.comment ? (
                  <p className="mt-1 text-muted-foreground">{entry.comment}</p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-8" aria-labelledby="beta-events">
        <h2 id="beta-events" className="text-sm font-semibold">
          {t("beta.section.events")}
        </h2>
        {snapshot.recent.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">{t("beta.empty")}</p>
        ) : (
          <ul className="mt-3 space-y-1 font-mono text-xs text-muted-foreground">
            {snapshot.recent
              .slice(-20)
              .reverse()
              .map((event, index) => (
                <li key={`${event.at}-${index}`}>
                  {event.at.slice(11, 19)} · {event.name} · {event.context.role}
                </li>
              ))}
          </ul>
        )}
      </section>
    </div>
  );
}
