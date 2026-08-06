/**
 * Room drawer — Sprint H5 (mobile).
 *
 * Chat and participants do not belong beside the stage on a phone, so they
 * live in a sheet that opens over it and closes completely. Only one sheet
 * exists, so nothing can stack on top of the player.
 */
import { useState } from "react";

import { ActionButton } from "@/design-system/components";
import { useTranslation } from "@/foundation/localization";

export type RoomDrawerTab = "chat" | "people";

export interface RoomDrawerProps {
  readonly chat: React.ReactNode;
  readonly people: React.ReactNode;
  readonly unreadHint: number;
}

export function RoomDrawer({ chat, people, unreadHint }: RoomDrawerProps) {
  const { t } = useTranslation();
  const [tab, setTab] = useState<RoomDrawerTab | null>(null);

  return (
    <div className="lg:hidden" data-sf-room-drawer={tab ?? "closed"}>
      <div className="flex gap-2">
        <ActionButton
          tone="secondary"
          size="sm"
          className="min-h-11 flex-1"
          onClick={() => setTab(tab === "chat" ? null : "chat")}
        >
          {unreadHint > 0
            ? t("room.drawer.chat_count", { count: unreadHint })
            : t("room.drawer.chat")}
        </ActionButton>
        <ActionButton
          tone="secondary"
          size="sm"
          className="min-h-11 flex-1"
          onClick={() => setTab(tab === "people" ? null : "people")}
        >
          {t("room.drawer.people")}
        </ActionButton>
      </div>

      {tab !== null ? (
        <div className="fixed inset-x-0 bottom-0 z-40 max-h-[70vh] overflow-y-auto rounded-t-3xl border-t border-border/60 bg-background p-4 shadow-2xl">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold">
              {tab === "chat" ? t("room.drawer.chat") : t("room.drawer.people")}
            </p>
            <ActionButton
              tone="ghost"
              size="sm"
              className="min-h-11"
              onClick={() => setTab(null)}
              aria-label={t("common.action.close")}
            >
              {t("common.action.close")}
            </ActionButton>
          </div>
          <div className="min-h-[18rem]">{tab === "chat" ? chat : people}</div>
        </div>
      ) : null}
    </div>
  );
}
