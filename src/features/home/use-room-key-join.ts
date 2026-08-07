/**
 * Join by room code — Sprint H9 (feature layer).
 *
 * A small state machine around one question: "can this person walk into the
 * room behind this code?". It resolves the typed code to the room's persisted
 * code, hands the decision to the existing join path, and then names whatever
 * came back in the vocabulary the surface speaks.
 *
 * It bypasses nothing. Beta admission, room locks, capacity, closure and
 * membership are decided exactly where they were before H9; the only thing
 * added here is a friendlier way to point at the room.
 */
import { useCallback, useMemo, useRef, useState } from "react";

import {
  isBlockedJoinState,
  normalizeRoomKeyInput,
  redactRoomKey,
  resolveJoinCode,
  roomKeyStateFromRefusal,
  roomKeyStateMessageKey,
  ROOM_KEY_LENGTH,
  validateRoomKeyShape,
  type RoomKeyJoinState,
} from "@/domain";
import { recordJoinAttempt, sinceAppOpen, trackEvent } from "@/features/analytics";
import { refusalCode } from "@/features/shared/refusal-message";

import type { HomeModel } from "./use-home";

export interface RoomKeyJoinModel {
  readonly value: string;
  readonly state: RoomKeyJoinState;
  readonly isBusy: boolean;
  /** The sentence to show, or null while the field is simply being typed in. */
  readonly messageKey: string | null;
  readonly canSubmit: boolean;
  setValue(next: string): void;
  clear(): void;
  notePaste(): void;
  submit(): Promise<string | null>;
}

/**
 * `betaBlocked` is passed in rather than decided here: admission belongs to
 * the beta module, and this hook only reports the state it produces.
 */
export function useRoomKeyJoin(
  home: HomeModel,
  options: { readonly betaBlocked?: boolean } = {},
): RoomKeyJoinModel {
  const [value, setValueState] = useState("");
  const [state, setState] = useState<RoomKeyJoinState>("empty");
  const submitting = useRef(false);

  const setValue = useCallback((next: string) => {
    const normalized = normalizeRoomKeyInput(next);
    setValueState(normalized);
    setState(normalized.length === 0 ? "empty" : "typing");
  }, []);

  const clear = useCallback(() => {
    setValueState("");
    setState("empty");
  }, []);

  const notePaste = useCallback(() => {
    trackEvent("room_code_pasted", {});
  }, []);

  const submit = useCallback(async (): Promise<string | null> => {
    if (submitting.current) return null;

    if (options.betaBlocked) {
      setState("beta_blocked");
      trackEvent("room_code_join_blocked", { reason: "beta_blocked" });
      recordJoinAttempt({
        path: "code",
        outcome: "blocked",
        reason: "beta_blocked",
        elapsedMs: sinceAppOpen(),
      });
      return null;
    }

    trackEvent("room_code_submitted", { length: redactRoomKey(value) });

    const shapeError = validateRoomKeyShape(value);
    if (shapeError !== null) {
      setState("invalid");
      trackEvent("room_code_invalid", { reason: "shape" });
      recordJoinAttempt({
        path: "code",
        outcome: "blocked",
        reason: "invalid",
        elapsedMs: sinceAppOpen(),
      });
      return null;
    }

    const entityCode = resolveJoinCode(value);
    if (entityCode === null) {
      setState("invalid");
      trackEvent("room_code_invalid", { reason: "unreadable" });
      return null;
    }

    submitting.current = true;
    setState("validating");
    trackEvent("room_code_valid", {});

    const roomId = await home.joinByCode(entityCode);
    submitting.current = false;

    if (roomId) {
      setState("success");
      trackEvent("room_code_joined", {}, { role: "guest", roomKey: roomId });
      recordJoinAttempt({
        path: "code",
        outcome: "success",
        reason: null,
        elapsedMs: sinceAppOpen(),
      });
      return roomId;
    }

    // The domain refused. It already decided why; this only names the state.
    const next = roomKeyStateFromRefusal(refusalCode(home.error));
    setState(next);
    if (next === "expired") trackEvent("room_code_expired", {});
    else if (next === "revoked") trackEvent("room_code_revoked", {});
    else if (next === "invalid") trackEvent("room_code_invalid", { reason: "unknown_room" });
    if (isBlockedJoinState(next)) {
      trackEvent("room_code_join_blocked", { reason: next });
      recordJoinAttempt({
        path: "code",
        outcome: "blocked",
        reason: next,
        elapsedMs: sinceAppOpen(),
      });
    }
    return null;
  }, [home, options.betaBlocked, value]);

  return useMemo(
    () => ({
      value,
      state,
      isBusy: state === "validating" || home.pending === "join",
      messageKey: state === "empty" || state === "typing" ? null : roomKeyStateMessageKey(state),
      canSubmit: value.length >= ROOM_KEY_LENGTH && state !== "validating",
      setValue,
      clear,
      notePaste,
      submit,
    }),
    [clear, home.pending, notePaste, setValue, state, submit, value],
  );
}
