/** Shared caption shape, kept free of imports so both the hook and the pure
 * caption reader can use it without a cycle. */
export interface CaptionTrack {
  readonly id: string;
  readonly label: string;
  readonly language: string;
}
