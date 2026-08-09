/**
 * Caption track reading — Sprint H12.1.
 *
 * A pure view over `video.textTracks`. Captions are only ever what the source
 * actually carries: subtitle and caption kinds, in the order the element
 * reports them. Nothing is invented for a source that ships no tracks, so an
 * empty list is a truthful answer and the caption control stays hidden.
 */
import type { CaptionTrack } from "./caption-track-types";

export type { CaptionTrack } from "./caption-track-types";

/** Stable identity for a track, matching what the player writes back. */
export function captionTrackId(track: { id?: string | null }, index: number): string {
  return track.id ? track.id : `track-${index}`;
}

interface TextTrackLike {
  readonly kind: string;
  readonly id?: string | null;
  readonly label?: string | null;
  readonly language?: string | null;
}

/** Subtitles and captions only — descriptions, chapters and metadata are not captions. */
export function toCaptionTracks(tracks: readonly TextTrackLike[]): readonly CaptionTrack[] {
  return tracks
    .filter((track) => track.kind === "subtitles" || track.kind === "captions")
    .map((track, index) => ({
      id: captionTrackId(track, index),
      label: track.label || track.language || `Track ${index + 1}`,
      language: track.language ?? "",
    }));
}
