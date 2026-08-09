/**
 * Post-session summary — Sprint H8.
 *
 * Shown once the room is over, in the participant's own terms: how long, who
 * was there, what you were using, whether you got to watching. No telemetry
 * words appear on this surface — no activation, no funnel, no cohort.
 */
import { Surface } from "@/design-system/components";
import { shouldShowReconnects, summaryMinutes, type SessionSummary } from "@/domain";
import { useTranslation } from "@/foundation/localization";

export interface SessionSummaryCardProps {
  readonly summary: SessionSummary;
  readonly providerName: string | null;
}

export function SessionSummaryCard({ summary, providerName }: SessionSummaryCardProps) {
  const { t } = useTranslation();
  const minutes = summaryMinutes(summary);

  const rows: readonly { key: string; label: string; value: string }[] = [
    {
      key: "duration",
      label: t("room.recap.duration"),
      value:
        minutes === null ? t("room.recap.duration.unknown") : t("room.recap.minutes", { minutes }),
    },
    {
      key: "people",
      label: t("room.recap.people"),
      value: String(summary.participantCount),
    },
    {
      key: "service",
      label: t("room.recap.service"),
      value: providerName ?? t("room.recap.service.none"),
    },
    {
      key: "watched",
      label: t("room.recap.watched"),
      value: summary.reachedWatching ? t("room.recap.watched.yes") : t("room.recap.watched.no"),
    },
    {
      key: "talking",
      label: t("room.recap.talking"),
      value: summary.voiceAvailable
        ? t("room.recap.talking.available")
        : t("room.recap.talking.unavailable"),
    },
    {
      key: "chat",
      label: t("room.recap.chat"),
      value: summary.chatAvailable
        ? t("room.recap.chat.available")
        : t("room.recap.chat.unavailable"),
    },
  ];

  return (
    <Surface tone="card" padding="md" className="flex flex-col gap-3" data-sf-session-summary>
      <h2 className="text-sm font-semibold">{t("room.recap.title")}</h2>
      <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
        {rows.map((row) => (
          <div key={row.key} className="flex items-baseline justify-between gap-3">
            <dt className="text-xs text-muted-foreground">{row.label}</dt>
            <dd className="text-sm font-medium">{row.value}</dd>
          </div>
        ))}
      </dl>
      {shouldShowReconnects(summary) ? (
        <p className="text-xs text-muted-foreground">
          {t("room.recap.reconnects", { count: summary.reconnects })}
        </p>
      ) : null}
    </Surface>
  );
}
