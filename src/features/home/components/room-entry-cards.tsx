/**
 * Room entry — Milestone E.
 *
 * Two ways into a room from the home screen, side by side: start one, or join
 * one with a code. Validation of the code's *shape* is presentation (a typo
 * should not cost a round trip); whether the code exists and whether this
 * person may join is decided by `RoomFlowService`.
 */
import { useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";

import { ActionButton, Surface, TextField } from "@/design-system/components";
import { normalizeRoomCode, validateRoomCode } from "@/features/auth";
import { useTranslation } from "@/foundation/localization";

import type { HomeModel } from "../use-home";

export function RoomEntryCards({ home }: { home: HomeModel }) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [roomName, setRoomName] = useState("");
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState<string | null>(null);

  async function onCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = roomName.trim() || t("home.create.default_name");
    const roomId = await home.createRoom(name);
    if (roomId) {
      setRoomName("");
      void navigate({ to: "/rooms/$roomId", params: { roomId } });
    }
  }

  async function onJoin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const key = validateRoomCode(code);
    setCodeError(key ? t(key) : null);
    if (key) return;

    const roomId = await home.joinByCode(normalizeRoomCode(code));
    if (roomId) {
      setCode("");
      void navigate({ to: "/rooms/$roomId", params: { roomId } });
    } else {
      setCodeError(t("home.join.not_found"));
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Surface padding="md" as="section" aria-labelledby="create-room-heading">
        <h2 id="create-room-heading" className="font-display text-lg font-semibold tracking-tight">
          {t("home.create.title")}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("home.create.description")}</p>

        <form className="mt-4 space-y-3" onSubmit={onCreate}>
          <TextField
            label={t("home.create.name_label")}
            placeholder={t("home.create.name_placeholder")}
            value={roomName}
            maxLength={60}
            onChange={(event) => setRoomName(event.target.value)}
          />
          <ActionButton type="submit" block loading={home.pending === "create"}>
            {t("home.create.action")}
          </ActionButton>
        </form>
      </Surface>

      <Surface padding="md" as="section" aria-labelledby="join-room-heading">
        <h2 id="join-room-heading" className="font-display text-lg font-semibold tracking-tight">
          {t("home.join.title")}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("home.join.description")}</p>

        <form className="mt-4 space-y-3" onSubmit={onJoin}>
          <TextField
            label={t("home.join.code_label")}
            placeholder="ROM-000123"
            value={code}
            error={codeError}
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
            className="font-mono tracking-[0.14em]"
            onChange={(event) => {
              setCode(event.target.value.toUpperCase());
              if (codeError) setCodeError(null);
            }}
          />
          <ActionButton type="submit" tone="secondary" block loading={home.pending === "join"}>
            {t("home.join.action")}
          </ActionButton>
        </form>
      </Surface>
    </div>
  );
}
