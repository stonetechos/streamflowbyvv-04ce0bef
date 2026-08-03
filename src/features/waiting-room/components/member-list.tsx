/**
 * Member list — Sprint 2.0.
 *
 * The lobby roster: who is here, who hosts, and who has signalled ready. It
 * renders state; it never derives membership rules, and since Milestone D.5
 * it no longer counts readiness either — that number arrives from
 * `ReadyCoordinator`.
 */
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "@/foundation/localization";

import type { MemberView } from "../waiting-room.types";
import { PresenceIndicator } from "./presence-indicator";

export interface MemberListProps {
  readonly members: readonly MemberView[];
  /** Confirmed members, as decided by `ReadyCoordinator`. */
  readonly readyCount: number;
  /** Members the readiness verdict covers. */
  readonly readyTotal: number;
}

export function MemberList({ members, readyCount, readyTotal }: MemberListProps) {
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
          <ul className="divide-y divide-border" aria-label={t("room.members.list_label")}>
            {members.map((member) => (
              <MemberRow key={member.id} member={member} />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function MemberRow({ member }: { member: MemberView }) {
  const { t } = useTranslation();
  const readinessKey = member.isReady ? "room.member.ready" : "room.member.not_ready";

  return (
    <li className="flex flex-wrap items-center justify-between gap-3 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <span
          aria-hidden="true"
          className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted font-mono text-xs"
        >
          {member.label.slice(0, 2)}
        </span>
        <div className="min-w-0 space-y-0.5">
          <p className="truncate text-sm font-medium">
            <span className="font-mono">{member.label}</span>
            {member.isViewer ? (
              <span className="ml-2 text-xs text-muted-foreground">{t("room.member.you")}</span>
            ) : null}
          </p>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-xs text-muted-foreground">
              {t(`room.member_state.${member.state}`)}
            </span>
            <PresenceIndicator
              presence={member.presence}
              lastSeenMinutes={member.lastSeenMinutes}
            />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {member.isHost ? <Badge variant="default">{t("room.member.host_badge")}</Badge> : null}
        <Badge
          variant={member.isReady ? "secondary" : "outline"}
          className={
            member.isReady
              ? "border-success/40 bg-success/12 text-success"
              : "text-muted-foreground"
          }
        >
          <span aria-hidden="true" className="mr-1">
            {member.isReady ? "\u2713" : "\u00b7"}
          </span>
          {t(readinessKey)}
        </Badge>
      </div>
    </li>
  );
}
