/**
 * Member list — Sprint 2.0, upgraded in Milestone G.
 *
 * The lobby roster: who is here, who hosts, who has signalled ready, who is on
 * the call, and how each member's clock is standing. It renders state; it
 * never derives membership rules, and since Milestone D.5 it no longer counts
 * readiness either — that number arrives from `ReadyCoordinator`.
 */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { SyncHealth } from "@/domain";
import type { VoiceIndicatorState } from "@/features/voice";
import { useTranslation } from "@/foundation/localization";

import type { MemberView } from "../waiting-room.types";
import { MemberCard } from "./member-card";

export interface MemberListProps {
  readonly members: readonly MemberView[];
  /** Confirmed members, as decided by `ReadyCoordinator`. */
  readonly readyCount: number;
  /** Members the readiness verdict covers. */
  readonly readyTotal: number;
  /** Voice standing per profile; absent members are simply not on the call. */
  readonly voiceByProfileId?: ReadonlyMap<string, VoiceIndicatorState>;
  /** Measured clock band per profile, from `RoomSyncCoordinator`. */
  readonly syncByProfileId?: ReadonlyMap<string, SyncHealth>;
}

export function MemberList({
  members,
  readyCount,
  readyTotal,
  voiceByProfileId,
  syncByProfileId,
}: MemberListProps) {
  const { t } = useTranslation();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-baseline justify-between gap-2 text-base">
          <span>{t("room.members.title", { count: members.length })}</span>
          {members.length > 0 ? (
            <span className="text-xs font-normal text-muted-foreground">
              {t("room.members.ready_count", { ready: readyCount, total: readyTotal })}
            </span>
          ) : null}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {members.length === 0 ? (
          <p className="rounded-md border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
            {t("room.members.empty")}
          </p>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2" aria-label={t("room.members.list_label")}>
            {members.map((member) => (
              <MemberCard
                key={member.id}
                member={member}
                voice={voiceByProfileId?.get(member.profileId) ?? "absent"}
                syncHealth={syncByProfileId?.get(member.profileId) ?? null}
              />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
