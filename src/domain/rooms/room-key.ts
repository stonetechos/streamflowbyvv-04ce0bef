/**
 * Room code (product term) — Sprint H9.
 *
 * A room already carries a persisted human-readable entity code (`ROM-000123`).
 * That code is correct but unfriendly: it is long, it contains digits that are
 * easy to mishear, and it reads like a database row. H9 gives the same room a
 * short spoken-aloud form — six characters from an unambiguous alphabet,
 * displayed in two groups of three.
 *
 * The short form is a *bijective re-encoding* of the persisted code, not a new
 * identifier: nothing new is stored, no schema moves, and uniqueness is
 * inherited from the code the repository already guarantees to be unique. An
 * internal room id is never exposed here and never derivable from a key.
 *
 * Product naming: the UI says "room code" everywhere. "Lobby key" and
 * "theatre key" appear only in internal notes such as this one.
 *
 * This module decides nothing about admission. It converts, validates shape,
 * and names the state a refusal puts the join attempt in; whether a person may
 * enter stays with `RoomFlowService`.
 */

/**
 * Thirty characters. `0`, `1`, `I`, `O`, `L` and `U` are absent, so the two
 * classic confusion pairs cannot occur and no accidental word is spelled.
 */
export const ROOM_KEY_ALPHABET = "23456789ABCDEFGHJKMNPQRSTVWXYZ";

const RADIX = ROOM_KEY_ALPHABET.length;
/** Five payload characters cover every six-digit entity code (30^5 > 10^6). */
const PAYLOAD_LENGTH = 5;
/** One trailing check character, so an obvious typo is caught before a lookup. */
export const ROOM_KEY_LENGTH = PAYLOAD_LENGTH + 1;
/** Display grouping: `ABC-DEF` reads aloud far better than `ABCDEF`. */
export const ROOM_KEY_GROUP = 3;

const LEGACY_PATTERN = /^ROM-?(\d{6})$/i;
const MAX_SERIAL = 999_999;

function checkCharacter(payload: string): string {
  let sum = 0;
  for (let index = 0; index < payload.length; index += 1) {
    const value = ROOM_KEY_ALPHABET.indexOf(payload[index]!);
    if (value < 0) return "";
    // Position-weighted so a transposition changes the checksum.
    sum += value * (index + 2);
  }
  return ROOM_KEY_ALPHABET[sum % RADIX]!;
}

/** `ROM-000123` → `4H7QMX`. Returns null for anything that is not an entity code. */
export function encodeRoomKey(entityCode: string | null | undefined): string | null {
  if (!entityCode) return null;
  const match = LEGACY_PATTERN.exec(entityCode.trim());
  if (!match) return null;
  let serial = Number(match[1]);
  if (!Number.isFinite(serial) || serial < 0 || serial > MAX_SERIAL) return null;

  let payload = "";
  for (let index = 0; index < PAYLOAD_LENGTH; index += 1) {
    payload = ROOM_KEY_ALPHABET[serial % RADIX]! + payload;
    serial = Math.floor(serial / RADIX);
  }
  return payload + checkCharacter(payload);
}

/** `4H7QMX` → `ROM-000123`. Null when the shape or the check character is wrong. */
export function decodeRoomKey(key: string | null | undefined): string | null {
  if (!key) return null;
  const normalized = normalizeRoomKeyInput(key);
  if (normalized.length !== ROOM_KEY_LENGTH) return null;
  const payload = normalized.slice(0, PAYLOAD_LENGTH);
  if (checkCharacter(payload) !== normalized.slice(PAYLOAD_LENGTH)) return null;

  let serial = 0;
  for (const character of payload) {
    const value = ROOM_KEY_ALPHABET.indexOf(character);
    if (value < 0) return null;
    serial = serial * RADIX + value;
  }
  if (serial > MAX_SERIAL) return null;
  return `ROM-${String(serial).padStart(6, "0")}`;
}

/** Keeps only characters the alphabet can hold, upper-cased. */
export function normalizeRoomKeyInput(value: string): string {
  const upper = value.toUpperCase();
  let result = "";
  for (const character of upper) {
    if (ROOM_KEY_ALPHABET.includes(character)) result += character;
  }
  return result.slice(0, ROOM_KEY_LENGTH);
}

/** `4H7QMX` → `4H7-QMX`. Display only; never sent anywhere. */
export function formatRoomKey(key: string | null | undefined): string {
  if (!key) return "";
  const normalized = normalizeRoomKeyInput(key);
  if (normalized.length <= ROOM_KEY_GROUP) return normalized;
  return `${normalized.slice(0, ROOM_KEY_GROUP)}-${normalized.slice(ROOM_KEY_GROUP)}`;
}

export function isLegacyRoomCode(value: string): boolean {
  return LEGACY_PATTERN.test(value.trim());
}

/**
 * Turns whatever a person typed into the code the domain looks up. Both the
 * short room code and the older `ROM-000123` form are accepted, so a link or a
 * screenshot from before H9 still works.
 */
export function resolveJoinCode(input: string): string | null {
  const trimmed = input.trim();
  if (trimmed.length === 0) return null;
  if (isLegacyRoomCode(trimmed)) return trimmed.toUpperCase().replace(/^ROM-?/i, "ROM-");
  return decodeRoomKey(trimmed);
}

/** Shape check only. Returns a translation key, never a sentence. */
export function validateRoomKeyShape(value: string): string | null {
  const trimmed = value.trim();
  if (trimmed.length === 0) return "room.key.validation.required";
  if (isLegacyRoomCode(trimmed)) return null;
  if (normalizeRoomKeyInput(trimmed).length < ROOM_KEY_LENGTH) {
    return "room.key.validation.incomplete";
  }
  if (decodeRoomKey(trimmed) === null) return "room.key.validation.invalid";
  return null;
}

/**
 * The masked form used for logging. Analytics may know that a code was typed
 * and how it ended, never which room it pointed at.
 */
export function redactRoomKey(key: string | null | undefined): string {
  const normalized = key ? normalizeRoomKeyInput(key) : "";
  if (normalized.length === 0) return "empty";
  return `${normalized.length}-char`;
}

/* ----------------------------------------------------------- join states */

/**
 * Every state the join-by-code surface can be in. These are product states:
 * each one has its own sentence, and none of them repeats a backend term.
 */
export const ROOM_KEY_JOIN_STATES = [
  "empty",
  "typing",
  "validating",
  "success",
  "invalid",
  "expired",
  "revoked",
  "locked",
  "full",
  "beta_blocked",
  "already_in_room",
  "reconnect",
  "network_error",
] as const;

export type RoomKeyJoinState = (typeof ROOM_KEY_JOIN_STATES)[number];

/** States that mean "you are not getting in right now". */
export function isBlockedJoinState(state: RoomKeyJoinState): boolean {
  return (
    state !== "empty" &&
    state !== "typing" &&
    state !== "validating" &&
    state !== "success" &&
    state !== "reconnect"
  );
}

/**
 * Names the state a domain refusal puts the attempt in. Presentation never
 * guesses: the domain raised the code, this only translates it into the
 * vocabulary the join surface speaks.
 */
export function roomKeyStateFromRefusal(code: string | null | undefined): RoomKeyJoinState {
  switch (code) {
    case "SF-ROOM-NOT-FOUND":
      return "invalid";
    case "SF-ROOM-ENDED":
    case "SF-ROOM-NOT-ACTIVE":
      return "expired";
    case "SF-ROOM-DELETED":
    case "SF-ROOM-BLOCKED":
    case "SF-ROOM-MEMBER-REMOVED":
      return "revoked";
    case "SF-ROOM-FORBIDDEN":
    case "SF-ROOM-INVALID-TRANSITION":
      return "locked";
    case "SF-ROOM-CAPACITY-EXCEEDED":
      return "full";
    case "SF-ROOM-ALREADY-MEMBER":
      return "reconnect";
    case "SF-ROOM-ALREADY-IN-ANOTHER-ROOM":
      return "already_in_room";
    default:
      return code && code.startsWith("SF-NET-") ? "network_error" : "invalid";
  }
}

/** The sentence a person reads for a state. */
export function roomKeyStateMessageKey(state: RoomKeyJoinState): string {
  return `room.key.state.${state}`;
}
