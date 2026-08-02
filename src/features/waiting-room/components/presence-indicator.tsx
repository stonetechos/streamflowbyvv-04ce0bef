/**
 * Presence indicator — Sprint 2.1.
 *
 * A dot plus a text label. Colour is never the only carrier of meaning: the
 * state is also written out, and the whole control exposes a single readable
 * string to assistive technology (MVP §12, WCAG 1.4.1).
 */
import { useTranslation } from "@/foundation/localization";
import { cn } from "@/lib/utils";

import type { MemberPresenceView } from "../waiting-room.types";

const DOT_CLASS: Record<MemberPresenceView, string> = {
  online: "bg-success",
  idle: "bg-warning",
  away: "bg-muted-foreground",
  offline: "bg-muted-foreground/60",
  unknown: "bg-border",
};

export interface PresenceIndicatorProps {
  readonly presence: MemberPresenceView;
  readonly lastSeenMinutes: number | null;
  readonly className?: string;
}

export function PresenceIndicator({
  presence,
  lastSeenMinutes,
  className,
}: PresenceIndicatorProps) {
  const { t } = useTranslation();
  if (presence === "unknown") return null;

  const stateLabel = t(`room.presence.${presence}`);
  const seenLabel =
    presence !== "online" && lastSeenMinutes !== null
      ? t("room.presence.last_seen", { minutes: lastSeenMinutes })
      : null;

  return (
    <span
      className={cn("inline-flex items-center gap-1.5 text-xs text-muted-foreground", className)}
    >
      <span
        aria-hidden="true"
        className={cn(
          "size-2 rounded-full",
          DOT_CLASS[presence],
          presence === "online" ? "ring-2 ring-success/25" : null,
        )}
      />
      <span>{seenLabel ? `${stateLabel} · ${seenLabel}` : stateLabel}</span>
    </span>
  );
}
