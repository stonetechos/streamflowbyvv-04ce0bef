/**
 * Pending invite continuation — Beta UX Overhaul.
 *
 * A guest who opens an invite link while signed out is sent to sign in. This
 * remembers, for that one browser tab only, which room they were on their way
 * to, so the app can continue the journey the moment a session exists.
 *
 * Presentation-layer memory only: a room code, never a credential, never a
 * decision about whether the person may enter. Admission remains the domain's
 * call when the join is finally attempted.
 */
const STORAGE_KEY = "streamflow.pending_invite_code";

/** Codes are short and shaped; anything else is ignored rather than stored. */
function isPlausibleCode(code: string): boolean {
  return /^[A-Za-z0-9-]{3,32}$/.test(code);
}

export function rememberPendingInvite(code: string): void {
  if (typeof window === "undefined" || !isPlausibleCode(code)) return;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, code.toUpperCase());
  } catch {
    // A blocked storage is not a reason to break the journey.
  }
}

export function readPendingInvite(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const value = window.sessionStorage.getItem(STORAGE_KEY);
    return value && isPlausibleCode(value) ? value : null;
  } catch {
    return null;
  }
}

export function clearPendingInvite(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to do.
  }
}

/** Reads and forgets in one step, so a continuation can never run twice. */
export function claimPendingInvite(): string | null {
  const code = readPendingInvite();
  if (code) clearPendingInvite();
  return code;
}
