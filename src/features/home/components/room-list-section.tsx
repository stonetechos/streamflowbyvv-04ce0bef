/**
 * Room rails — Milestone E.
 *
 * Live rooms and recent rooms share one presentation: a compact card grid with
 * the room's name, seat count and status. Rooms that can be re-entered link to
 * the room; rooms that are over do not pretend to.
 */
import { Link } from "@tanstack/react-router";

import { EmptyState, SectionHeader, Surface } from "@/design-system/components";
import { useTranslation } from "@/foundation/localization";
import type { HomeRoomSummary } from "@/domain";

export interface RoomListSectionProps {
  readonly title: string;
  readonly description?: string;
  readonly rooms: readonly HomeRoomSummary[];
  readonly emptyTitle: string;
  readonly emptyDescription: string;
  readonly action?: React.ReactNode;
}

export function RoomListSection({
  title,
  description,
  rooms,
  emptyTitle,
  emptyDescription,
  action,
}: RoomListSectionProps) {
  const { t } = useTranslation();

  return (
    <section className="space-y-4">
      <SectionHeader
        title={title}
        {...(description ? { description } : {})}
        {...(action ? { action } : {})}
      />

      {rooms.length === 0 ? (
        <EmptyState title={emptyTitle} description={emptyDescription} />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {rooms.map(({ room, memberCount, isHost, isResumable }) => (
            <li key={room.id}>
              <Surface
                padding="sm"
                interactive={isResumable}
                className="flex h-full flex-col justify-between gap-4"
              >
                <div className="min-w-0">
                  <p className="truncate font-display text-base font-semibold">{room.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t("home.room.members", { count: memberCount, capacity: room.maxMembers })}
                    {isHost ? ` · ${t("home.room.you_host")}` : ""}
                  </p>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <span className="inline-flex items-center rounded-full border border-border px-2.5 py-1 text-[0.6875rem] font-medium text-muted-foreground">
                    {t(`room.status.${room.status}`)}
                  </span>

                  {isResumable ? (
                    <Link
                      to="/rooms/$roomId"
                      params={{ roomId: room.id }}
                      className="inline-flex min-h-11 items-center rounded-xl px-3 text-sm font-medium text-primary transition-colors hover:bg-accent"
                    >
                      {t("home.room.open")}
                    </Link>
                  ) : (
                    <span className="font-mono text-xs text-muted-foreground">{room.code}</span>
                  )}
                </div>
              </Surface>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
