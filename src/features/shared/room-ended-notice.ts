/**
 * Room-ended notice — Production Certification Sprint.
 *
 * When a watch party ends the participants are returned Home, and Home must
 * say why. The reason is a one-shot hand-off between two screens, so it lives
 * in session storage: it survives the route change and nothing else.
 *
 * Presentation-adjacent utility: no service, no state, no policy.
 */
const KEY = "streamflow.room-ended-notice";

export function markRoomEnded(): void {
  try {
    window.sessionStorage.setItem(KEY, "1");
  } catch {
    // Private-mode Safari refuses storage; the banner is optional.
  }
}

/** Reads the notice and clears it, so it is shown exactly once. */
export function claimRoomEndedNotice(): boolean {
  try {
    const value = window.sessionStorage.getItem(KEY);
    if (value) window.sessionStorage.removeItem(KEY);
    return Boolean(value);
  } catch {
    return false;
  }
}
