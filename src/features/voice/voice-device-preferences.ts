/**
 * Voice device preferences — Milestone G.
 *
 * A chosen microphone or speaker belongs to the device, not the account, so it
 * is stored locally and never synced (Foundation §10, local-first). Reads are
 * safe during SSR: no storage access happens until the browser asks.
 */
export interface VoiceDevicePreferences {
  readonly inputDeviceId: string | null;
  readonly outputDeviceId: string | null;
}

const STORAGE_KEY = "streamflow.voice.devices";

const EMPTY: VoiceDevicePreferences = Object.freeze({
  inputDeviceId: null,
  outputDeviceId: null,
});

export function readVoiceDevicePreferences(): VoiceDevicePreferences {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Partial<VoiceDevicePreferences>;
    return {
      inputDeviceId: typeof parsed.inputDeviceId === "string" ? parsed.inputDeviceId : null,
      outputDeviceId: typeof parsed.outputDeviceId === "string" ? parsed.outputDeviceId : null,
    };
  } catch {
    return EMPTY;
  }
}

export function writeVoiceDevicePreference(
  kind: "input" | "output",
  deviceId: string | null,
): VoiceDevicePreferences {
  const current = readVoiceDevicePreferences();
  const next: VoiceDevicePreferences = {
    inputDeviceId: kind === "input" ? deviceId : current.inputDeviceId,
    outputDeviceId: kind === "output" ? deviceId : current.outputDeviceId,
  };
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* Storage is a convenience here; a refusal is not an error. */
    }
  }
  return next;
}
