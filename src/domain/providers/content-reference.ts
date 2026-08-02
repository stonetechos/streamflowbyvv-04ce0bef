/**
 * Content reference — Sprint 2.2, Foundation §12.
 *
 * A neutral pointer to *what* a room is watching. It is deliberately not a
 * media URL, not a manifest, not a signed playback token, and never anything
 * obtained by scraping: it is the identifier a human could read off the
 * provider's own address bar, plus optional display metadata.
 *
 * Persisted as an opaque string on `rooms.content_reference` (Database Spec
 * §3.2); the encoding lives here so no adapter invents its own.
 */

export const CONTENT_REFERENCE_KINDS = ["provider_id", "provider_url", "local_file"] as const;
export type ContentReferenceKind = (typeof CONTENT_REFERENCE_KINDS)[number];

export interface ContentReference {
  readonly providerKey: string;
  readonly kind: ContentReferenceKind;
  /** Provider-scoped id, a public https URL, or a local file label. */
  readonly value: string;
  readonly title: string | null;
  readonly seasonNumber: number | null;
  readonly episodeNumber: number | null;
  /** Runtime when the human supplied it; never measured from the provider. */
  readonly durationMs: number | null;
}

export interface ContentReferenceDraft {
  readonly providerKey: string;
  readonly kind: ContentReferenceKind;
  readonly value: string;
  readonly title?: string | null;
  readonly seasonNumber?: number | null;
  readonly episodeNumber?: number | null;
  readonly durationMs?: number | null;
}

const MAX_VALUE_LENGTH = 512;
const MAX_TITLE_LENGTH = 200;

function clamp(value: string, max: number): string {
  const trimmed = value.trim();
  return trimmed.length > max ? trimmed.slice(0, max) : trimmed;
}

/** Builds a frozen reference, normalising absent fields to `null`. */
export function createContentReference(draft: ContentReferenceDraft): ContentReference {
  return Object.freeze({
    providerKey: draft.providerKey.trim(),
    kind: draft.kind,
    value: clamp(draft.value, MAX_VALUE_LENGTH),
    title: draft.title ? clamp(draft.title, MAX_TITLE_LENGTH) : null,
    seasonNumber: draft.seasonNumber ?? null,
    episodeNumber: draft.episodeNumber ?? null,
    durationMs: draft.durationMs ?? null,
  });
}

/** Encodes for storage. Stable, portable, and readable in a psql session. */
export function serializeContentReference(reference: ContentReference): string {
  return JSON.stringify(reference);
}

/** Tolerant decode: a malformed or legacy value yields `null`, never a throw. */
export function parseContentReference(raw: string | null): ContentReference | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<ContentReference>;
    if (
      typeof parsed?.providerKey !== "string" ||
      typeof parsed?.value !== "string" ||
      !(CONTENT_REFERENCE_KINDS as readonly string[]).includes(String(parsed?.kind))
    ) {
      return null;
    }
    return createContentReference({
      providerKey: parsed.providerKey,
      kind: parsed.kind as ContentReferenceKind,
      value: parsed.value,
      title: parsed.title ?? null,
      seasonNumber: parsed.seasonNumber ?? null,
      episodeNumber: parsed.episodeNumber ?? null,
      durationMs: parsed.durationMs ?? null,
    });
  } catch {
    return null;
  }
}
