/**
 * Join by room code — Sprint H9.
 *
 * The fastest way into a room from an app that is already open: read the six
 * characters off the host's screen, type them, and be in the lobby. The card
 * validates shape only; every question about whether this person may enter is
 * answered below, and whatever comes back is said in plain language.
 */
import { useNavigate } from "@tanstack/react-router";
import { useEffect, type FormEvent } from "react";

import { ActionButton, Surface } from "@/design-system/components";
import { trackEvent } from "@/features/analytics";
import { useTranslation } from "@/foundation/localization";

import { useRoomKeyJoin } from "../use-room-key-join";
import type { HomeModel } from "../use-home";
import { RoomKeyField } from "./room-key-field";

export function JoinByCodeCard({ home }: { home: HomeModel }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const join = useRoomKeyJoin(home);

  useEffect(() => {
    trackEvent("join_by_code_opened", {});
  }, []);

  async function onJoin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const roomId = await join.submit();
    if (roomId) void navigate({ to: "/rooms/$roomId", params: { roomId } });
  }

  const tone =
    join.state === "validating"
      ? "busy"
      : join.state === "success"
        ? "valid"
        : join.messageKey
          ? "invalid"
          : "neutral";

  return (
    <Surface padding="md" as="section" aria-labelledby="join-room-heading">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h2
            id="join-room-heading"
            className="font-display text-base font-semibold tracking-tight"
          >
            {t("home.join.title")}
          </h2>
          <p id="join-room-help" className="mt-1 text-sm text-muted-foreground">
            {t("home.join.description")}
          </p>
        </div>

        <form className="flex w-full flex-col gap-3 sm:w-auto sm:items-end" onSubmit={onJoin}>
          <RoomKeyField
            label={t("home.join.code_label")}
            describedBy="join-room-help"
            value={join.value}
            tone={tone}
            disabled={join.state === "validating"}
            onChange={join.setValue}
            onPasted={join.notePaste}
          />
          <div className="flex items-center gap-3">
            <p role="status" aria-live="polite" className="min-h-5 text-xs text-muted-foreground">
              {join.messageKey ? t(join.messageKey) : ""}
            </p>
            <ActionButton
              type="submit"
              tone="secondary"
              loading={join.isBusy}
              disabled={!join.canSubmit}
            >
              {t("home.join.action")}
            </ActionButton>
          </div>
        </form>
      </div>
    </Surface>
  );
}
