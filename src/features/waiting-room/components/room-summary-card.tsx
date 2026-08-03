/**
 * Host room summary — Sprint 2.9.
 *
 * One place where the host sees the whole room: who is ready, who is still
 * being waited for, how synchronized the room is, which provider was chosen,
 * and whether a countdown may be offered. Every line is a Domain answer.
 */
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "@/foundation/localization";

import type { RoomSyncModel } from "../use-room-sync";
import type { RoomReadyModel } from "../use-room-ready";
import type { MemberView } from "../waiting-room.types";

const BLOCK_KEYS: Readonly<Record<string, string>> = {
  no_participants: "room.ready.block.no_participants",
  no_provider: "room.ready.block.no_provider",
  not_everyone_ready: "room.ready.block.not_everyone_ready",
  resync_required: "room.ready.block.resync_required",
};

const HEALTH_KEYS: Readonly<Record<string, string>> = {
  excellent: "room.sync.health.excellent",
  good: "room.sync.health.good",
  warning: "room.sync.health.warning",
  resync_required: "room.sync.health.resync_required",
  unknown: "room.sync.health.unknown",
};

export interface RoomSummaryCardProps {
  readonly ready: RoomReadyModel;
  readonly sync: RoomSyncModel;
  readonly members: readonly MemberView[];
  readonly providerId: string | null;
  readonly isHost: boolean;
}

export function RoomSummaryCard({
  ready,
  sync,
  members,
  providerId,
  isHost,
}: RoomSummaryCardProps) {
  const { t } = useTranslation();
  const snapshot = ready.snapshot;

  if (!isHost || !snapshot) return null;

  const summary = snapshot.hostSummary;
  const labelFor = (profileId: string) =>
    members.find((member) => member.profileId === profileId)?.label ?? profileId;
  const waitingLabels = snapshot.waitingProfileIds.map(labelFor);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("room.summary.title")}</CardTitle>
        <CardDescription>{t("room.summary.description")}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-2 text-sm">
        <dl className="grid gap-2 sm:grid-cols-2">
          <div>
            <dt className="text-xs text-muted-foreground">{t("room.summary.members_ready")}</dt>
            <dd className="font-medium">
              {summary.membersReady} / {summary.participantCount}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">{t("room.summary.members_waiting")}</dt>
            <dd className="font-medium">{summary.membersWaiting}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">{t("room.summary.synchronization")}</dt>
            <dd className="font-medium">
              {t(HEALTH_KEYS[sync.health] ?? "room.sync.health.unknown")}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">{t("room.summary.provider")}</dt>
            <dd className="font-medium">{providerId ?? t("room.summary.provider_missing")}</dd>
          </div>
        </dl>

        <p className="text-xs text-muted-foreground">
          {t("room.summary.countdown")}:{" "}
          {t(summary.countdownAvailable ? "common.yes" : "common.no")}
        </p>

        {summary.blockReason ? (
          <p className="text-xs text-muted-foreground">
            {t(BLOCK_KEYS[summary.blockReason] ?? "room.ready.block.not_everyone_ready")}
          </p>
        ) : null}

        {waitingLabels.length > 0 ? (
          <p className="text-xs text-muted-foreground">
            {t("room.summary.waiting_on", { members: waitingLabels.join(", ") })}
          </p>
        ) : null}

        {summary.timedOutProfileIds.length > 0 ? (
          <p className="text-xs text-destructive">
            {t("room.summary.timed_out", {
              members: summary.timedOutProfileIds.map(labelFor).join(", "),
            })}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
