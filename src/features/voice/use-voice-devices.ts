/**
 * Audio device hook — Milestone G.
 *
 * Presents the OS's audio devices as two simple lists and keeps them fresh
 * when hardware comes and goes. Enumeration is a browser capability resolved
 * through Infrastructure, never touched directly here.
 */
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  isMediaDeviceSelectionSupported,
  listAudioDevices,
  subscribeToDeviceChanges,
  type AudioDeviceOption,
} from "@/infrastructure/voice";

export interface VoiceDevicesModel {
  readonly isSupported: boolean;
  readonly inputs: readonly AudioDeviceOption[];
  readonly outputs: readonly AudioDeviceOption[];
  /** True until the browser has granted labels (permission not yet given). */
  readonly isAnonymous: boolean;
  refresh(): void;
}

const EMPTY: readonly AudioDeviceOption[] = Object.freeze([]);

export function useVoiceDevices(enabled = true): VoiceDevicesModel {
  const [devices, setDevices] = useState<readonly AudioDeviceOption[]>(EMPTY);
  const isSupported = useMemo(() => isMediaDeviceSelectionSupported(), []);

  const refresh = useCallback(() => {
    if (!isSupported || !enabled) return;
    void listAudioDevices()
      .then(setDevices)
      .catch(() => setDevices(EMPTY));
  }, [enabled, isSupported]);

  useEffect(() => {
    refresh();
    return subscribeToDeviceChanges(refresh);
  }, [refresh]);

  const inputs = useMemo(() => devices.filter((d) => d.kind === "audioinput"), [devices]);
  const outputs = useMemo(() => devices.filter((d) => d.kind === "audiooutput"), [devices]);

  return {
    isSupported,
    inputs,
    outputs,
    isAnonymous: devices.length > 0 && devices.every((device) => device.label === ""),
    refresh,
  };
}
