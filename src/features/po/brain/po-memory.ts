/**
 * Po memory — Milestone H1 §6.
 *
 * Two kinds only:
 * - session memory, which is the conversation itself and dies with the tab;
 * - explicit preference memory, which is a thing the person asked Po to
 *   remember, in their own words.
 *
 * Po never infers a memory. There is no personality profile, no behavioural
 * model, and no derived taste record (ADR-001 §11). Nothing here may hold a
 * credential, a provider token, a cookie, or any secret (Foundation §10.1);
 * the store accepts a short line of the person's own text and nothing else.
 *
 * Storage is device-local and scoped to the profile, and every write is gated
 * on `privacy_preferences.po_memory_opt_in` by the tools that call it.
 */
import { clearLocalPreference, readLocalJson, writeLocalJson } from "@/foundation/preferences";

const MEMORY_KEY = "po-memory";
const MAX_MEMORIES = 20;
const MAX_SUMMARY_LENGTH = 160;

/** Shapes that look like credential material are refused outright. */
const SECRET_SHAPED =
  /(password|passcode|otp|api[_ -]?key|secret|token|cookie|session id|credit card|cvv|\b\d{12,19}\b|eyJ[A-Za-z0-9_-]{10,})/i;

export type PoMemorySource = "explicit";

export interface PoMemoryRecord {
  readonly id: string;
  readonly summary: string;
  readonly source: PoMemorySource;
  readonly createdAt: string;
}

function memoryId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `mem-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function parse(raw: unknown): readonly PoMemoryRecord[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (entry): entry is PoMemoryRecord =>
      typeof entry === "object" &&
      entry !== null &&
      typeof (entry as PoMemoryRecord).id === "string" &&
      typeof (entry as PoMemoryRecord).summary === "string",
  );
}

export function listPoMemories(profileId: string | null): readonly PoMemoryRecord[] {
  if (!profileId) return [];
  return parse(readLocalJson<unknown>(MEMORY_KEY, profileId));
}

export function isMemorable(summary: string): boolean {
  const trimmed = summary.trim();
  return trimmed.length > 0 && trimmed.length <= MAX_SUMMARY_LENGTH && !SECRET_SHAPED.test(trimmed);
}

/**
 * Stores one explicit memory. Returns null when the text is unusable or looks
 * like a secret — Po then says it will not keep that, rather than keeping it.
 */
export function storePoMemory(profileId: string | null, summary: string): PoMemoryRecord | null {
  if (!profileId || !isMemorable(summary)) return null;

  const record: PoMemoryRecord = {
    id: memoryId(),
    summary: summary.trim(),
    source: "explicit",
    createdAt: new Date().toISOString(),
  };

  const existing = listPoMemories(profileId).filter(
    (entry) => entry.summary.toLowerCase() !== record.summary.toLowerCase(),
  );
  const next = [record, ...existing].slice(0, MAX_MEMORIES);
  writeLocalJson(MEMORY_KEY, next, profileId);
  return record;
}

export function deletePoMemory(profileId: string | null, memoryId_: string): boolean {
  if (!profileId) return false;
  const existing = listPoMemories(profileId);
  const next = existing.filter((entry) => entry.id !== memoryId_);
  if (next.length === existing.length) return false;
  writeLocalJson(MEMORY_KEY, next, profileId);
  return true;
}

/** Finds a memory by a fragment of its own text, for "forget that I …". */
export function findPoMemory(profileId: string | null, fragment: string): PoMemoryRecord | null {
  const needle = fragment.trim().toLowerCase();
  if (needle.length === 0) return null;
  return (
    listPoMemories(profileId).find((entry) => entry.summary.toLowerCase().includes(needle)) ?? null
  );
}

export function forgetAllPoMemories(profileId: string | null): void {
  if (!profileId) return;
  clearLocalPreference(MEMORY_KEY, profileId);
}
