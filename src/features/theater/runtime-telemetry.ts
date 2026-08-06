/**
 * Room runtime telemetry — Sprint H5.
 *
 * Development-only counters. Nothing here is certification evidence, nothing
 * is persisted, and nothing leaves the device: it exists so a developer can
 * answer "did that recover?" without guessing. Provider credentials, cookies
 * and protected content are never touched.
 */
import { logger } from "@/foundation/logging";

const MODULE = "theater-runtime";

export type RuntimeCounter =
  | "room.join.success"
  | "room.join.failure"
  | "countdown.start.success"
  | "countdown.start.failure"
  | "reconnect.recovered"
  | "revision.stale.rejected"
  | "sync.correction"
  | "readiness.completed"
  | "provider.launch.success"
  | "room.closed"
  | "chat.send.failed";

export interface RuntimeMetrics {
  readonly counters: Readonly<Record<string, number>>;
  /** Mean absolute drift in ms for automatic sources; null when unmeasured. */
  readonly meanAbsDriftMs: number | null;
  readonly maxAbsDriftMs: number | null;
  readonly correctionsPerMinute: number | null;
  /** Milliseconds from selection to countdown start; null until measured. */
  readonly selectionToStartMs: number | null;
  /** Milliseconds a reconnecting client needed to reach the room position. */
  readonly reconnectCatchUpMs: number | null;
}

interface MutableState {
  counters: Record<string, number>;
  driftSamples: number[];
  startedAtMs: number;
  selectionAtMs: number | null;
  selectionToStartMs: number | null;
  reconnectStartedAtMs: number | null;
  reconnectCatchUpMs: number | null;
}

const isDev = import.meta.env.DEV;

function freshState(): MutableState {
  return {
    counters: {},
    driftSamples: [],
    startedAtMs: Date.now(),
    selectionAtMs: null,
    selectionToStartMs: null,
    reconnectStartedAtMs: null,
    reconnectCatchUpMs: null,
  };
}

/** One telemetry sink per room instance. Cheap, bounded, and discardable. */
export function createRuntimeTelemetry(roomId: string) {
  let state = freshState();
  const MAX_SAMPLES = 300;

  const snapshot = (): RuntimeMetrics => {
    const samples = state.driftSamples;
    const elapsedMinutes = Math.max(1 / 60, (Date.now() - state.startedAtMs) / 60_000);
    const corrections = state.counters["sync.correction"] ?? 0;
    return {
      counters: { ...state.counters },
      meanAbsDriftMs:
        samples.length === 0
          ? null
          : Math.round(samples.reduce((sum, value) => sum + value, 0) / samples.length),
      maxAbsDriftMs: samples.length === 0 ? null : Math.round(Math.max(...samples)),
      correctionsPerMinute: corrections === 0 ? null : Number((corrections / elapsedMinutes).toFixed(2)),
      selectionToStartMs: state.selectionToStartMs,
      reconnectCatchUpMs: state.reconnectCatchUpMs,
    };
  };

  return {
    count(counter: RuntimeCounter, amount = 1): void {
      state.counters[counter] = (state.counters[counter] ?? 0) + amount;
      if (isDev) logger.debug(counter, { module: MODULE, roomId, amount });
    },
    /** Absolute drift of this device against the room, in milliseconds. */
    sampleDrift(driftMs: number): void {
      if (!Number.isFinite(driftMs)) return;
      state.driftSamples.push(Math.abs(driftMs));
      if (state.driftSamples.length > MAX_SAMPLES) state.driftSamples.shift();
    },
    markSelection(): void {
      state.selectionAtMs = Date.now();
    },
    markCountdownStart(): void {
      if (state.selectionAtMs !== null && state.selectionToStartMs === null) {
        state.selectionToStartMs = Date.now() - state.selectionAtMs;
      }
    },
    markReconnectStart(): void {
      if (state.reconnectStartedAtMs === null) state.reconnectStartedAtMs = Date.now();
    },
    markReconnectRecovered(): void {
      if (state.reconnectStartedAtMs !== null) {
        state.reconnectCatchUpMs = Date.now() - state.reconnectStartedAtMs;
        state.reconnectStartedAtMs = null;
      }
    },
    reset(): void {
      state = freshState();
    },
    snapshot,
  };
}

export type RuntimeTelemetry = ReturnType<typeof createRuntimeTelemetry>;
