/**
 * Social adapter selection — Milestone F.0.
 *
 * The neutral seam the composition root imports for the friend graph, the
 * block list, the recent-partners read side and the profile directory.
 */
import { registerSupabaseSocialAdapter } from "../supabase/social";

export function registerSocialAdapter(): boolean {
  return registerSupabaseSocialAdapter();
}
