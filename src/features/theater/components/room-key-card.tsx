/**
 * Room key card — Sprint H9.
 *
 * The six characters a host reads aloud, shown large enough to be read from
 * across a sofa and copied in one tap. It is a shortcut to the same room the
 * invite link opens; it grants nothing on its own, and every check that
 * applies to the link applies here too.
 *
 * The key is derived from the room's own code, so it cannot drift from it.
 */
import { useCallback, useEffect, useState } from "react";

import { ROOM_KEY_GROUP, encodeRoomKey, formatRoomKey } from "@/domain";
import { Surface } from "@/design-system/components";
import { trackEvent } from "@/features/analytics";
import { useTranslation } from "@/foundation/localization";
import { cn } from "@/lib/utils";

export interface RoomKeyCardProps {
  /** The room's persisted code; the shown key is derived from it. */
  readonly roomCode: string | null;
  readonly blocked?: boolean;
  readonly compact?: boolean;
}

export function RoomKeyCard({ roomCode, blocked = false, compact = false }: RoomKeyCardProps) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const key = encodeRoomKey(roomCode);

  useEffect(() => {
    if (key) trackEvent("room_code_viewed", {});
  }, [key]);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(timer);
  }, [copied]);

  const copy = useCallback(() => {
    if (!key) return;
    void navigator.clipboard.writeText(key).then(
      () => {
        setCopied(true);
        trackEvent("room_code_copied", {});
      },
      () => setCopied(false),
    );
  }, [key]);

  if (!key) return null;

  const display = formatRoomKey(key);

  return (
    <Surface
      padding={compact ? "sm" : "md"}
      as="section"
      aria-labelledby="room-key-heading"
      className="flex flex-wrap items-center justify-between gap-3"
    >
      <div className="min-w-0">
        <h2
          id="room-key-heading"
          className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
        >
          {t("room.key.title")}
        </h2>
        <p
          data-sf-room-key
          className={cn(
            "font-display font-semibold tracking-[0.2em] tabular-nums",
            compact ? "text-2xl" : "text-3xl sm:text-4xl",
          )}
        >
          <span className="sr-only">
            {t("room.key.spoken", { characters: key.split("").join(" ") })}
          </span>
          <span aria-hidden="true">{display}</span>
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {blocked ? t("room.key.blocked") : t("room.key.description", { group: ROOM_KEY_GROUP })}
        </p>
      </div>

      <button
        type="button"
        onClick={copy}
        className={cn(
          "min-h-11 rounded-xl border border-border px-4 text-sm font-medium",
          "transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        )}
      >
        {copied ? t("room.key.copied") : t("room.key.copy")}
      </button>
      <span role="status" aria-live="polite" className="sr-only">
        {copied ? t("room.key.copied") : ""}
      </span>
    </Surface>
  );
}
