/**
 * Host moderation panel — Sprint H6.
 *
 * Renders only for a seat that may actually act. Every destructive act asks
 * once, in words, before it happens; nothing here is a silent switch.
 */
import { useState } from "react";

import { ActionButton, Surface } from "@/design-system/components";
import { useTranslation } from "@/foundation/localization";

import type { RoomGovernanceModel } from "../use-room-governance";

export interface HostModerationProps {
  readonly governance: RoomGovernanceModel;
  readonly onCancelCountdown: (() => void) | null;
  readonly onRestartCountdown: (() => void) | null;
}

export function HostModeration({
  governance,
  onCancelCountdown,
  onRestartCountdown,
}: HostModerationProps) {
  const { t } = useTranslation();
  const [confirming, setConfirming] = useState<"close" | null>(null);

  if (!governance.can("lock_room") && !governance.can("close_room")) return null;
  const { settings } = governance;

  return (
    <Surface tone="card" padding="md" className="flex flex-col gap-3" data-sf-host-moderation>
      <h2 className="text-sm font-semibold">{t("room.host.title")}</h2>
      <p className="text-xs text-muted-foreground">{t("room.host.description")}</p>

      <div className="flex flex-wrap gap-2">
        <ActionButton
          tone="secondary"
          size="sm"
          className="min-h-11"
          loading={governance.pending === "lock"}
          onClick={() => governance.setLocked(!settings.isLocked)}
          data-sf-room-lock={settings.isLocked ? "locked" : "unlocked"}
        >
          {settings.isLocked ? t("room.host.unlock") : t("room.host.lock")}
        </ActionButton>

        <ActionButton
          tone="secondary"
          size="sm"
          className="min-h-11"
          loading={governance.pending === "chat"}
          onClick={() => governance.setChatEnabled(!settings.isChatEnabled)}
          data-sf-chat-toggle={settings.isChatEnabled ? "enabled" : "disabled"}
        >
          {settings.isChatEnabled ? t("room.host.chat_disable") : t("room.host.chat_enable")}
        </ActionButton>

        <ActionButton
          tone="secondary"
          size="sm"
          className="min-h-11"
          loading={governance.pending === "invite"}
          onClick={() => governance.setInviteActive(!settings.isInviteActive)}
          data-sf-invite-toggle={settings.isInviteActive ? "active" : "revoked"}
        >
          {settings.isInviteActive ? t("room.host.invite_revoke") : t("room.host.invite_restore")}
        </ActionButton>

        {onCancelCountdown ? (
          <ActionButton tone="ghost" size="sm" className="min-h-11" onClick={onCancelCountdown}>
            {t("room.host.countdown_cancel")}
          </ActionButton>
        ) : null}
        {onRestartCountdown ? (
          <ActionButton tone="ghost" size="sm" className="min-h-11" onClick={onRestartCountdown}>
            {t("room.host.countdown_restart")}
          </ActionButton>
        ) : null}
      </div>

      {governance.can("close_room") ? (
        <div className="flex flex-col gap-2 border-t border-border pt-3">
          {confirming === "close" ? (
            <div className="flex flex-col gap-2" role="alertdialog" aria-label={t("room.host.close")}>
              <p className="text-xs text-muted-foreground">{t("room.host.close_confirm")}</p>
              <div className="flex gap-2">
                <ActionButton
                  tone="destructive"
                  size="sm"
                  className="min-h-11"
                  loading={governance.pending === "close"}
                  onClick={() => {
                    governance.closeRoom();
                    setConfirming(null);
                  }}
                >
                  {t("room.host.close_yes")}
                </ActionButton>
                <ActionButton
                  tone="ghost"
                  size="sm"
                  className="min-h-11"
                  onClick={() => setConfirming(null)}
                >
                  {t("common.action.dismiss")}
                </ActionButton>
              </div>
            </div>
          ) : (
            <ActionButton
              tone="ghost"
              size="sm"
              className="min-h-11 self-start"
              onClick={() => setConfirming("close")}
            >
              {t("room.host.close")}
            </ActionButton>
          )}
        </div>
      ) : null}

      {governance.error ? (
        <p className="text-xs text-destructive" role="alert">
          {t(`room.host.error.${governance.error}`)}
        </p>
      ) : null}
    </Surface>
  );
}
