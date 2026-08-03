/**
 * Join by code — Milestone H2 (product experience).
 *
 * A secondary way in, kept below the shelf. Shape validation stays in
 * presentation; whether the code exists and whether this person may join is
 * still `RoomFlowService`'s decision.
 */
import { useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";

import { ActionButton, Surface, TextField } from "@/design-system/components";
import { normalizeRoomCode, validateRoomCode } from "@/features/auth";
import { useTranslation } from "@/foundation/localization";

import type { HomeModel } from "../use-home";

export function JoinByCodeCard({ home }: { home: HomeModel }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState<string | null>(null);

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
    <Surface padding="md" as="section" aria-labelledby="join-room-heading">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h2
            id="join-room-heading"
            className="font-display text-base font-semibold tracking-tight"
          >
            {t("home.join.title")}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("home.join.description")}</p>
        </div>

        <form className="flex w-full items-end gap-3 sm:w-auto" onSubmit={onJoin}>
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
          <ActionButton type="submit" tone="secondary" loading={home.pending === "join"}>
            {t("home.join.action")}
          </ActionButton>
        </form>
      </div>
    </Surface>
  );
}
