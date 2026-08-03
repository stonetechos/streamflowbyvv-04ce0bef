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

/**
 * What sort of thing the room is watching — Sprint K.1. Display metadata
 * only: naming a season or an episode grants StreamFlow no ability to select,
 * start, or control it.
 */
export const CONTENT_KINDS = ["movie", "episode", "series", "video", "unknown"] as const;
export type ContentKind = (typeof CONTENT_KINDS)[number];

export interface ContentReference {
  readonly providerKey: string;
  readonly kind: ContentReferenceKind;
  /** Provider-scoped id, a public https URL, or a local file label. */
  readonly value: string;
  readonly title: string | null;
  readonly contentKind: ContentKind;
  readonly seasonNumber: number | null;
  readonly episodeNumber: number | null;
  /** Public artwork URL supplied by the host; never scraped, never proxied. */
  readonly artworkUrl: string | null;
  /** Opaque provider display metadata. No rule may depend on its contents. */
  readonly providerMetadata: Readonly<Record<string, unknown>>;
  /** Runtime when the human supplied it; never measured from the provider. */
  readonly durationMs: number | null;
}

export interface ContentReferenceDraft {
  readonly providerKey: string;
  readonly kind: ContentReferenceKind;
  readonly value: string;
  readonly title?: string | null;
  readonly contentKind?: ContentKind;
  readonly seasonNumber?: number | null;
  readonly episodeNumber?: number | null;
  readonly artworkUrl?: string | null;
  readonly providerMetadata?: Readonly<Record<string, unknown>>;
  readonly durationMs?: number | null;
}

const MAX_VALUE_LENGTH = 512;
const MAX_TITLE_LENGTH = 200;

const NO_METADATA: Readonly<Record<string, unknown>> = Object.freeze({});

function clamp(value: string, max: number): string {
  const trimmed = value.trim();
  return trimmed.length > max ? trimmed.slice(0, max) : trimmed;
}

/** Only a public http(s) address may be shown as artwork. */
function safeArtwork(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return /^https?:\/\//i.test(trimmed) ? clamp(trimmed, MAX_VALUE_LENGTH) : null;
}

/** Builds a frozen reference, normalising absent fields to `null`. */
export function createContentReference(draft: ContentReferenceDraft): ContentReference {
  return Object.freeze({
    providerKey: draft.providerKey.trim(),
    kind: draft.kind,
    value: clamp(draft.value, MAX_VALUE_LENGTH),
    title: draft.title ? clamp(draft.title, MAX_TITLE_LENGTH) : null,
    contentKind: draft.contentKind ?? "unknown",
    seasonNumber: draft.seasonNumber ?? null,
    episodeNumber: draft.episodeNumber ?? null,
    artworkUrl: safeArtwork(draft.artworkUrl),
    providerMetadata: draft.providerMetadata
      ? Object.freeze({ ...draft.providerMetadata })
      : NO_METADATA,
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
      contentKind: (CONTENT_KINDS as readonly string[]).includes(String(parsed.contentKind))
        ? (parsed.contentKind as ContentKind)
        : "unknown",
      seasonNumber: parsed.seasonNumber ?? null,
      episodeNumber: parsed.episodeNumber ?? null,
      artworkUrl: parsed.artworkUrl ?? null,
      providerMetadata:
        typeof parsed.providerMetadata === "object" && parsed.providerMetadata !== null
          ? (parsed.providerMetadata as Readonly<Record<string, unknown>>)
          : NO_METADATA,
      durationMs: parsed.durationMs ?? null,
    });
  } catch {
    return null;
  }
}
