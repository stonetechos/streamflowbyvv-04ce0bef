/**
 * Microphone permission hook — Sprint H6.
 *
 * Permission is asked for only when a person taps Join voice. The hook reports
 * exactly what the browser reports and never guesses: an unsupported browser
 * stays `unknown` rather than being called `granted`.
 */
import { useCallback, useEffect, useState } from "react";

export type MicPermission = "unknown" | "prompt" | "requesting" | "granted" | "denied";

export interface MicrophonePermissionModel {
  readonly permission: MicPermission;
  readonly isSupported: boolean;
  /** Prompts the user; resolves to true only when the mic is usable. */
  request(): Promise<boolean>;
}

function mediaSupported(): boolean {
  return typeof navigator !== "undefined" && Boolean(navigator.mediaDevices?.getUserMedia);
}

export function useMicrophonePermission(): MicrophonePermissionModel {
  const [permission, setPermission] = useState<MicPermission>("unknown");
  const isSupported = mediaSupported();

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.permissions?.query) return;
    let cancelled = false;
    void navigator.permissions
      .query({ name: "microphone" as PermissionName })
      .then((status) => {
        if (cancelled) return;
        setPermission(
          status.state === "granted" ? "granted" : status.state === "denied" ? "denied" : "prompt",
        );
        status.onchange = () => {
          setPermission(
            status.state === "granted"
              ? "granted"
              : status.state === "denied"
                ? "denied"
                : "prompt",
          );
        };
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const request = useCallback(async () => {
    if (!mediaSupported()) {
      setPermission("denied");
      return false;
    }
    setPermission("requesting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // The transport opens its own track; this one was only a permission probe.
      for (const track of stream.getTracks()) track.stop();
      setPermission("granted");
      return true;
    } catch {
      setPermission("denied");
      return false;
    }
  }, []);

  return { permission, isSupported, request };
}
