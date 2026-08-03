/**
 * Audio device enumeration — Milestone G.
 *
 * A browser capability, not a vendor one, but it stays in Infrastructure so
 * the voice feature never touches `navigator` directly and a Capacitor host
 * can substitute its own implementation later (Foundation §2).
 */
export type AudioDeviceKind = "audioinput" | "audiooutput";

export interface AudioDeviceOption {
  readonly deviceId: string;
  readonly label: string;
  readonly kind: AudioDeviceKind;
}

export function isMediaDeviceSelectionSupported(): boolean {
  return typeof navigator !== "undefined" && Boolean(navigator.mediaDevices?.enumerateDevices);
}

/** Labels are only populated once microphone permission has been granted. */
export async function listAudioDevices(): Promise<readonly AudioDeviceOption[]> {
  if (!isMediaDeviceSelectionSupported()) return [];
  const devices = await navigator.mediaDevices.enumerateDevices();
  return devices
    .filter((device) => device.kind === "audioinput" || device.kind === "audiooutput")
    .map((device, index) => ({
      deviceId: device.deviceId || `default-${index}`,
      label: device.label || "",
      kind: device.kind as AudioDeviceKind,
    }));
}

/** Fires whenever the OS gains or loses an audio device. Returns unsubscribe. */
export function subscribeToDeviceChanges(listener: () => void): () => void {
  if (!isMediaDeviceSelectionSupported()) return () => {};
  navigator.mediaDevices.addEventListener("devicechange", listener);
  return () => navigator.mediaDevices.removeEventListener("devicechange", listener);
}
