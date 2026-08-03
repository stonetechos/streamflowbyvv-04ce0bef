/**
 * Member strip — UX Simplification Pass.
 *
 * Who is here, and how many seats are still open. One row of faces, a name
 * under each, and a soft "Waiting" for every empty seat. No presence bands,
 * no clock health, no readiness ratios.
 */
import { Avatar } from "@/design-system/components";
import { useTranslation } from "@/foundation/localization";
import { cn } from "@/lib/utils";

import type { MemberView } from "../waiting-room.types";

export interface MemberStripProps {
  readonly members: readonly MemberView[];
  readonly capacity: number;
}

export function MemberStrip({ members, capacity }: MemberStripProps) {
  const { t } = useTranslation();
  const present = members.filter((member) => member.state !== "left");
  const emptySeats = Math.max(0, Math.min(capacity, 4) - present.length);

  return (
    <ul
      className="flex flex-wrap items-start justify-center gap-5"
      aria-label={t("room.members.list_label")}
    >
      {present.map((member) => (
        <li key={member.id} className="flex w-16 flex-col items-center gap-2">
          <span className="relative">
            <Avatar name={member.label} size="md" />
            <span
              aria-hidden="true"
              className={cn(
                "absolute -bottom-0.5 -right-0.5 size-3.5 rounded-full border-2 border-background",
                member.isReady ? "bg-success" : "bg-muted-foreground/50",
              )}
            />
          </span>
          <span className="w-full truncate text-center text-xs font-medium">
            {member.isViewer ? t("room.member.you") : member.label}
          </span>
        </li>
      ))}

      {Array.from({ length: emptySeats }, (_, index) => (
        <li key={`seat-${index}`} className="flex w-16 flex-col items-center gap-2">
          <span
            aria-hidden="true"
            className="size-12 rounded-full border border-dashed border-border/70"
          />
          <span className="w-full truncate text-center text-xs text-muted-foreground">
            {t("room.members.seat_waiting")}
          </span>
        </li>
      ))}
    </ul>
  );
}
