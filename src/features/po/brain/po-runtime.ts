/**
 * Po runtime — Milestone H1 §9.
 *
 * Po's window onto what is happening right now. Two kinds of thing live here:
 * who is speaking, and the live controls of the room the person is currently
 * in. Both are published by the surfaces that already own them (the Po
 * provider publishes the actor, the Waiting Room publishes its controls), so
 * Po reuses the room's existing orchestration instead of starting a second
 * one.
 *
 * A tool that needs a live control reads it from here and refuses honestly
 * when it is absent — that is how Po can say "you're not in a room" instead of
 * pretending (Milestone H1 §10).
 */

export type PoNavigationTarget = string;

export interface PoActor {
  readonly profileId: string | null;
  readonly displayName: string;
}

/** The live room, exactly as the Waiting Room already models it. */
export interface PoRoomControls {
  readonly roomId: string;
  readonly roomCode: string;
  readonly roomName: string;
  readonly isHost: boolean;
  readonly isMember: boolean;
  readonly providerId: string | null;
  readonly memberCount: number;
  readonly readyCount: number;
  readonly countdownSeconds: number;
  readonly countdownState: string;
  readonly canStartCountdown: boolean;
  readonly syncHealth: string;
  readonly isReady: boolean;
  readonly voice: {
    readonly isAvailable: boolean;
    readonly isConnected: boolean;
    readonly isMuted: boolean;
  };
  startCountdown(): void;
  cancelCountdown(): void;
  setReady(ready: boolean): void;
  remeasureSync(): void;
  joinVoice(): void;
  leaveVoice(): void;
  setMuted(muted: boolean): void;
  leaveRoom(): void;
}

export interface PoRuntime {
  readonly actor: PoActor;
  readonly room: PoRoomControls | null;
  navigate(to: PoNavigationTarget): void;
}

const NO_ACTOR: PoActor = Object.freeze({ profileId: null, displayName: "" });

let runtime: PoRuntime = {
  actor: NO_ACTOR,
  room: null,
  navigate: () => {
    /* No router attached yet; navigation tools report unavailability. */
  },
};

let hasNavigator = false;

const listeners = new Set<() => void>();

function publish(): void {
  for (const listener of listeners) listener();
}

export function getPoRuntime(): PoRuntime {
  return runtime;
}

export function subscribeToPoRuntime(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setPoActor(actor: PoActor): void {
  if (runtime.actor.profileId === actor.profileId && runtime.actor.displayName === actor.displayName) {
    return;
  }
  runtime = { ...runtime, actor };
  publish();
}

export function setPoNavigator(navigate: (to: PoNavigationTarget) => void): void {
  runtime = { ...runtime, navigate };
  hasNavigator = true;
  publish();
}

export function canPoNavigate(): boolean {
  return hasNavigator;
}

/**
 * Publishes the live room. Called by the Waiting Room on every meaningful
 * change; the object is small and replaced wholesale so Po never reads a
 * half-updated room.
 */
export function setPoRoomControls(room: PoRoomControls | null): void {
  runtime = { ...runtime, room };
  publish();
}

export function clearPoRoomControls(roomId: string): void {
  if (runtime.room?.roomId !== roomId) return;
  runtime = { ...runtime, room: null };
  publish();
}

/** Test-support only. */
export function resetPoRuntime(): void {
  runtime = { actor: NO_ACTOR, room: null, navigate: () => {} };
  hasNavigator = false;
  publish();
}
