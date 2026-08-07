/**
 * Beta dashboard — Sprints H7 and H8.
 *
 * An internal, session-only view of the closed-beta experiment. It reads the
 * tab's analytics store directly: no query, no persistence, no export.
 * Everything resets when the tab does, which is exactly the intent — this is a
 * development instrument, not a product analytics surface and not
 * certification evidence.
 *
 * It shows cohort dimensions, never identities: the only identifier on this
 * screen is the anonymous cohort id.
 */
import { useMemo, useState } from "react";

import { Surface } from "@/design-system/components";
import {
  COHORT_DIMENSIONS,
  INTERVIEW_QUESTIONS,
  activationRate,
  buildInterviewQueue,
  type CohortDimension,
  type CohortFilter,
  type FunnelCounts,
  type FunnelMetrics,
  type ReliabilityMetrics,
} from "@/domain";
import { cohortValues, countByCohort, useBetaSnapshot } from "@/features/analytics";
import { useTranslation } from "@/foundation/localization";
import { cn } from "@/lib/utils";

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

const RELIABILITY_KEYS: readonly (keyof ReliabilityMetrics)[] = [
  "inviteOpenSuccess",
  "guestJoinSuccess",
  "countdownCompletion",
  "reconnectRecovery",
  "voiceConnectionSuccess",
  "chatSendFailure",
  "providerLaunchAction",
];

const COUNT_KEYS: readonly (keyof FunnelCounts)[] = [
  "roomsCreated",
  "roomsWithGuest",
  "watchingStarted",
  "roomsActivated",
  "invitesOpened",
  "guestsJoined",
];

function percent(value: number | null): string {
  return value === null ? "—" : `${Math.round(value * 100)}%`;
}

function duration(value: number | null): string {
  if (value === null) return "—";
  if (value < 1000) return `${Math.round(value)} ms`;
  return `${(value / 1000).toFixed(1)} s`;
}

export function BetaDashboard() {
  const { t } = useTranslation();
  const snapshot = useBetaSnapshot();
  const counters = snapshot.counters;
  const [filter, setFilter] = useState<CohortFilter>({});
  const [showComments, setShowComments] = useState(false);

  const isEmpty = snapshot.counts.roomsCreated === 0 && snapshot.counts.landingViewed === 0;

  const queue = useMemo(
    () =>
      buildInterviewQueue(
        snapshot.rooms.map((room) => ({
          cohortId: `${snapshot.cohort.cohortId}-${room.roomKey.slice(0, 6)}`,
          activated: room.activated,
          invitedGuest: room.timeline.firstGuestAt !== null,
          reachedWatching: room.activated,
          returned: false,
          usedVoice: room.usedVoice,
          usedManualSync: room.usedManualSync,
          reconnectFailures: room.reconnectFailures,
        })),
      ),
    [snapshot.rooms, snapshot.cohort.cohortId],
  );

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 pb-28 sm:px-6" data-sf-beta-dashboard>
      <h1 className="font-display text-2xl font-semibold tracking-tight">{t("beta.title")}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{t("beta.subtitle")}</p>
      <p className="mt-1 font-mono text-xs text-muted-foreground">
        {t("beta.cohort.label")}: {snapshot.cohort.cohortId} · {snapshot.cohort.inviteSource} ·{" "}
        {snapshot.cohort.betaFlag ? t("beta.cohort.in") : t("beta.cohort.out")}
      </p>

      {isEmpty ? (
        <Surface tone="card" padding="lg" className="mt-6" data-sf-beta-empty>
          <h2 className="text-sm font-semibold">{t("beta.empty.title")}</h2>
          <p className="mt-2 text-sm text-muted-foreground">{t("beta.empty.description")}</p>
        </Surface>
      ) : null}

      <section className="mt-6" aria-labelledby="beta-cohorts">
        <h2 id="beta-cohorts" className="text-sm font-semibold">
          {t("beta.section.cohorts")}
        </h2>
        <div className="mt-3 flex flex-wrap gap-3">
          {COHORT_DIMENSIONS.map((dimension) => (
            <CohortSelect
              key={dimension}
              dimension={dimension}
              value={filter[dimension] ?? ""}
              onChange={(value) =>
                setFilter((current) => ({ ...current, [dimension]: value || undefined }))
              }
            />
          ))}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          {t("beta.cohort.matching", {
            rooms: countByCohort("room_created", filter),
            activated: countByCohort("room_reached_watching_with_host_and_guest", filter),
          })}
        </p>
      </section>

      <section className="mt-8" aria-labelledby="beta-activation">
        <h2 id="beta-activation" className="text-sm font-semibold">
          {t("beta.section.activation")}
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">{t("beta.activation.definition")}</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Stat label={t("beta.count.roomsCreated")} value={String(snapshot.counts.roomsCreated)} />
          <Stat
            label={t("beta.count.roomsWithGuest")}
            value={String(snapshot.counts.roomsWithGuest)}
          />
          <Stat
            label={t("beta.count.watchingStarted")}
            value={String(snapshot.counts.watchingStarted)}
          />
          <Stat
            label={t("beta.count.roomsActivated")}
            value={String(snapshot.counts.roomsActivated)}
          />
          <Stat
            label={t("beta.metric.activationRate")}
            value={percent(activationRate(snapshot.counts))}
          />
          <Stat
            label={t("beta.metric.medianTimeToFirstGuest")}
            value={duration(snapshot.activation.medianTimeToFirstGuestMs)}
          />
          <Stat
            label={t("beta.metric.medianSelectionToWatching")}
            value={duration(snapshot.activation.medianSelectionToWatchingMs)}
          />
        </div>
      </section>

      <section className="mt-8" aria-labelledby="beta-funnel">
        <h2 id="beta-funnel" className="text-sm font-semibold">
          {t("beta.section.funnel")}
        </h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {METRIC_KEYS.map((key) => (
            <Stat
              key={key}
              label={t(`beta.metric.${key}`)}
              value={percent(snapshot.metrics[key])}
              hint={snapshot.metrics[key] === null ? t("beta.no_target") : null}
            />
          ))}
        </div>
      </section>

      <section className="mt-8" aria-labelledby="beta-reliability">
        <h2 id="beta-reliability" className="text-sm font-semibold">
          {t("beta.section.reliability")}
        </h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {RELIABILITY_KEYS.map((key) => (
            <Stat
              key={key}
              label={t(`beta.reliability.${key}`)}
              value={percent(snapshot.reliability[key])}
            />
          ))}
        </div>
        <dl className="mt-3 grid gap-3 sm:grid-cols-3">
          {(
            [
              ["reconnects", snapshot.counts.reconnectsStarted],
              ["reconnectsRecovered", snapshot.counts.reconnectsRecovered],
              ["providerLaunches", counters["provider_launch_clicked"] ?? 0],
              ["manualSync", counters["manual_sync_requested"] ?? 0],
              ["roomStartFailed", counters["room_start_failed"] ?? 0],
              ["voiceFailed", counters["voice_failed"] ?? 0],
            ] as const
          ).map(([key, value]) => (
            <Surface key={key} tone="card" padding="md">
              <dt className="text-xs text-muted-foreground">{t(`beta.count.${key}`)}</dt>
              <dd className="font-mono text-lg">{value}</dd>
            </Surface>
          ))}
        </dl>
      </section>

      <section className="mt-8" aria-labelledby="beta-engagement">
        <h2 id="beta-engagement" className="text-sm font-semibold">
          {t("beta.section.engagement")}
        </h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Stat
            label={t("beta.metric.chatUsage")}
            value={percent(snapshot.activation.chatUsageAmongActivated)}
          />
          <Stat
            label={t("beta.metric.voiceUsage")}
            value={percent(snapshot.activation.voiceUsageAmongActivated)}
          />
          <Stat
            label={t("beta.metric.averageParticipants")}
            value={
              snapshot.activation.averageParticipantsPerActivatedRoom === null
                ? "—"
                : snapshot.activation.averageParticipantsPerActivatedRoom.toFixed(2)
            }
          />
          <Stat
            label={t("beta.metric.medianSessionDuration")}
            value={duration(snapshot.activation.medianSessionDurationMs)}
          />
          <Stat
            label={t("beta.metric.roomRepeatCreation")}
            value={percent(snapshot.metrics.roomRepeatCreation)}
            hint={t("beta.metric.repeatWindow")}
          />
        </div>
      </section>

      <section className="mt-8" aria-labelledby="beta-feedback">
        <h2 id="beta-feedback" className="text-sm font-semibold">
          {t("beta.section.feedback")}
        </h2>
        {snapshot.feedbackSummary.total === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">{t("beta.empty")}</p>
        ) : (
          <>
            <dl className="mt-3 grid gap-3 sm:grid-cols-3">
              {(["yes", "partly", "no"] as const).map((outcome) => (
                <Surface key={outcome} tone="card" padding="md">
                  <dt className="text-xs text-muted-foreground">{t(`beta.feedback.${outcome}`)}</dt>
                  <dd className="font-mono text-lg">
                    {snapshot.feedbackSummary.byOutcome[outcome]}
                  </dd>
                </Surface>
              ))}
            </dl>
            <ul className="mt-3 flex flex-wrap gap-2">
              {Object.entries(snapshot.feedbackSummary.byCategory).map(([category, count]) => (
                <li
                  key={category}
                  className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground"
                >
                  {t(`room.feedback.category.${category}`)} · {count}
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => setShowComments((current) => !current)}
              className="mt-3 min-h-11 rounded-xl border border-border px-3 text-sm"
              aria-expanded={showComments}
            >
              {showComments ? t("beta.comments.hide") : t("beta.comments.show")}
            </button>
            {showComments ? (
              <ul className="mt-2 space-y-2">
                {snapshot.feedback
                  .filter((entry) => entry.comment !== null)
                  .map((entry) => (
                    <li
                      key={entry.at}
                      className="rounded-xl border border-border px-3 py-2 text-sm"
                    >
                      {entry.comment}
                    </li>
                  ))}
              </ul>
            ) : (
              <p className="mt-2 text-xs text-muted-foreground">{t("beta.comments.protected")}</p>
            )}
          </>
        )}
      </section>

      <section className="mt-8" aria-labelledby="beta-research">
        <h2 id="beta-research" className="text-sm font-semibold">
          {t("beta.section.research")}
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">{t("beta.research.disclaimer")}</p>
        <ul className="mt-3 space-y-2">
          {snapshot.researchSummary
            .filter((entry) => entry.responses > 0)
            .map((entry) => (
              <li
                key={entry.concept}
                className="flex flex-wrap items-baseline justify-between gap-2 rounded-xl border border-border px-3 py-2 text-sm"
              >
                <span>{t(`research.concept.${entry.concept}`)}</span>
                <span className="font-mono text-xs text-muted-foreground">
                  n={entry.responses} · {t("beta.research.valuable")} {percent(entry.valuableRate)}{" "}
                  · {t("beta.research.pay")} {percent(entry.payYesRate)}
                </span>
              </li>
            ))}
        </ul>
        {snapshot.researchSummary.every((entry) => entry.responses === 0) ? (
          <p className="mt-2 text-sm text-muted-foreground">{t("beta.empty")}</p>
        ) : null}
      </section>

      <section className="mt-8" aria-labelledby="beta-interviews">
        <h2 id="beta-interviews" className="text-sm font-semibold">
          {t("beta.section.interviews")}
        </h2>
        {queue.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">{t("beta.empty")}</p>
        ) : (
          <ol className="mt-3 space-y-2">
            {queue.map((entry) => (
              <li
                key={entry.cohortId}
                className="rounded-xl border border-border px-3 py-2 text-sm"
              >
                <span className="font-mono text-xs">{entry.cohortId}</span>
                <span className="ml-2 text-muted-foreground">
                  {entry.signals.map((signal) => t(`beta.signal.${signal}`)).join(" · ")}
                </span>
              </li>
            ))}
          </ol>
        )}
        <details className="mt-3">
          <summary className="min-h-11 cursor-pointer text-sm">
            {t("beta.interviews.questions")}
          </summary>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
            {INTERVIEW_QUESTIONS.map((question) => (
              <li key={question}>{t(`beta.interview.${question}`)}</li>
            ))}
          </ol>
        </details>
      </section>

      <section className="mt-8" aria-labelledby="beta-join-speed">
        <h2 id="beta-join-speed" className="text-sm font-semibold">
          {t("beta.section.join_speed")}
        </h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat
            label={t("beta.join.attempts")}
            value={String(snapshot.joinSpeed.codeAttempts)}
            hint={t("beta.join.attempts_hint")}
          />
          <Stat
            label={t("beta.join.success_rate")}
            value={percent(snapshot.joinSpeed.codeSuccessRate)}
          />
          <Stat
            label={t("beta.join.code_share")}
            value={percent(snapshot.joinSpeed.codeShare)}
            hint={t("beta.join.code_share_hint")}
          />
          <Stat
            label={t("beta.join.median")}
            value={duration(snapshot.joinSpeed.medianTimeToCodeJoinMs)}
          />
        </div>
      </section>

      <section className="mt-8" aria-labelledby="beta-personalization">
        <h2 id="beta-personalization" className="text-sm font-semibold">
          {t("beta.section.personalization")}
        </h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat
            label={t("beta.personalization.rate")}
            value={percent(snapshot.personalization.customizationRate)}
          />
          <Stat
            label={t("beta.personalization.favorite_rate")}
            value={percent(snapshot.personalization.favoriteSelectionRate)}
          />
          <Stat
            label={t("beta.personalization.reorders")}
            value={String(snapshot.personalization.reorders)}
            hint={t("beta.personalization.resets", {
              count: snapshot.personalization.resets,
            })}
          />
          <Stat
            label={t("beta.personalization.favorite_speed")}
            value={duration(snapshot.personalization.medianSelectionMsFromFavorite)}
            hint={t("beta.personalization.other_speed", {
              value: duration(snapshot.personalization.medianSelectionMsOther),
            })}
          />
        </div>
        {snapshot.personalization.mostPinned.length > 0 ? (
          <p className="mt-2 text-xs text-muted-foreground">
            {t("beta.personalization.most_pinned")}:{" "}
            {snapshot.personalization.mostPinned
              .map((entry) => `${entry.key} (${entry.count})`)
              .join(" · ")}
          </p>
        ) : null}
        {snapshot.personalization.mostHidden.length > 0 ? (
          <p className="mt-1 text-xs text-muted-foreground">
            {t("beta.personalization.most_hidden")}:{" "}
            {snapshot.personalization.mostHidden
              .map((entry) => `${entry.key} (${entry.count})`)
              .join(" · ")}
          </p>
        ) : null}
      </section>

      <section className="mt-8" aria-labelledby="beta-events">
        <h2 id="beta-events" className="text-sm font-semibold">
          {t("beta.section.events")}
        </h2>
        {snapshot.recent.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">{t("beta.empty")}</p>
        ) : (
          <ul className="mt-3 space-y-1 font-mono text-xs text-muted-foreground">
            {snapshot.recent.slice(0, 20).map((event, index) => (
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

function Stat({ label, value, hint }: { label: string; value: string; hint?: string | null }) {
  return (
    <Surface tone="card" padding="md" className="flex flex-col gap-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-mono text-lg">{value}</p>
      {hint ? <p className="text-[0.6875rem] text-muted-foreground">{hint}</p> : null}
    </Surface>
  );
}

function CohortSelect({
  dimension,
  value,
  onChange,
}: {
  dimension: CohortDimension;
  value: string;
  onChange: (value: string) => void;
}) {
  const { t } = useTranslation();
  const options: readonly string[] = cohortValues(dimension);
  const id = `cohort-${dimension}`;
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-xs text-muted-foreground">
        {t(`beta.dimension.${dimension}`)}
      </label>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={cn(
          "min-h-11 rounded-xl border border-border bg-background px-3 text-sm",
          value ? "border-primary" : null,
        )}
      >
        <option value="">{t("beta.dimension.all")}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}
