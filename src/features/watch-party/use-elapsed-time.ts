/**
 * Shared elapsed time — Milestone G.
 *
 * How long the room has been watching, counted from the anchor the room
 * agreed on. Every device computes the same number from the same instant, so
 * nobody has to be told it.
 *
 * It ticks once a second and stops when there is no anchor. It never asks the
 * provider anything: this is the room's clock, not the player's position.
 */
import { useEffect, useState } from "react";

export interface ElapsedTime {
  readonly totalSeconds: number;
  readonly label: string;
  readonly isRunning: boolean;
}

const STOPPED: ElapsedTime = Object.freeze({
  totalSeconds: 0,
  label: "00:00",
  isRunning: false,
});

export function formatElapsed(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;
  const pad = (value: number) => String(value).padStart(2, "0");
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${pad(minutes)}:${pad(seconds)}`;
}

/**
 * @param startedAt ISO-8601 instant the room started watching, or null.
 * @param offsetMs This device's measured clock offset, so a skewed device
 *   still reports the room's elapsed time rather than its own.
 */
export function useElapsedTime(startedAt: string | null, offsetMs = 0): ElapsedTime {
  const [totalSeconds, setTotalSeconds] = useState(() => elapsedSeconds(startedAt, offsetMs));

  useEffect(() => {
    if (!startedAt) {
      setTotalSeconds(0);
      return;
    }
    setTotalSeconds(elapsedSeconds(startedAt, offsetMs));
    const timer = window.setInterval(() => {
      setTotalSeconds(elapsedSeconds(startedAt, offsetMs));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [startedAt, offsetMs]);

  if (!startedAt) return STOPPED;
  return { totalSeconds, label: formatElapsed(totalSeconds), isRunning: true };
}

function elapsedSeconds(startedAt: string | null, offsetMs: number): number {
  if (!startedAt) return 0;
  const started = Date.parse(startedAt);
  if (Number.isNaN(started)) return 0;
  return Math.max(0, Math.floor((Date.now() + offsetMs - started) / 1000));
}
