/**
 * Profile adapter selection — Milestone E.
 *
 * The neutral seam the composition root imports for profile and preference
 * persistence. Replacing Supabase here is a change to this file plus one
 * sibling adapter folder.
 */
import { registerSupabaseProfileAdapter } from "../supabase/profiles";

export function registerProfileAdapter(): boolean {
  return registerSupabaseProfileAdapter();
}
