/**
 * Voice session hook — Milestone G.
 *
 * The Feature-layer half of voice. It owns the lifecycle a person can see —
 * join, leave, mute, deafen, recover — and delegates everything else: the
 * transport lives behind `VoiceAdapter`, the grant behind `VoiceTokenProvider`,
 * and the room's voice narrative behind `VoiceService`.
 *
 * No LiveKit type, symbol, or string reaches this file (Foundation §2).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { VOICE_SERVICE, isServiceBound, resolveService } from "@/domain";
import { logger } from "@/foundation/logging";
import {
  resolveVoiceAdapter,
  resolveVoiceTokenProvider,
  type VoiceAdapter,
  type VoiceConnectionState,
  type VoiceParticipant,
  type VoiceQuality,
} from "@/infrastructure/voice";

import {
  toVoiceError,
  type VoiceError,
  type VoiceMemberView,
  type VoicePendingAction,
  type VoiceUiState,
} from "./voice.types";

const MODULE = "voice-session";
const EMPTY_MEMBERS: readonly VoiceMemberView[] = Object.freeze([]);

export interface UseVoiceSessionInput {
  readonly roomId: string;
  readonly profileId: string | null;
  readonly displayName: string;
  /** Voice is only offered to a joined member of the room. */
  readonly enabled: boolean;
  /** Preference: connect as soon as the member is in the room. */
  readonly autoJoin: boolean;
  /** Preference: arrive muted, and opt in to being heard. */
  readonly joinMuted: boolean;
  readonly inputDeviceId?: string | null;
  readonly outputDeviceId?: string | null;
}

export interface VoiceSessionModel {
  readonly state: VoiceUiState;
  readonly isAvailable: boolean;
  readonly isConnected: boolean;
  readonly isConnecting: boolean;
  readonly isReconnecting: boolean;
  readonly isMuted: boolean;
  readonly isDeafened: boolean;
  readonly quality: VoiceQuality;
  readonly members: readonly VoiceMemberView[];
  /** Profile ids currently speaking — the roster reads this directly. */
  readonly speakingProfileIds: ReadonlySet<string>;
  readonly error: VoiceError | null;
  readonly pending: VoicePendingAction;
  join(): void;
  leave(): void;
  setMuted(muted: boolean): void;
  toggleMute(): void;
  setDeafened(deafened: boolean): void;
  toggleDeafen(): void;
  /** Clears the error and tries the whole handshake again. */
  recover(): void;
}

const STATE_MAP: Readonly<Record<VoiceConnectionState, VoiceUiState>> = {
  disconnected: "idle",
  connecting: "connecting",
  connected: "connected",
  reconnecting: "reconnecting",
  failed: "error",
};

export function useVoiceSession(input: UseVoiceSessionInput): VoiceSessionModel {
  const { roomId, profileId, displayName, enabled, autoJoin, joinMuted } = input;

  const adapterRef = useRef<VoiceAdapter | null>(null);
  const mounted = useRef(true);
  const autoJoinAttempted = useRef(false);

  const [transportState, setTransportState] = useState<VoiceConnectionState>("disconnected");
  const [participants, setParticipants] = useState<readonly VoiceParticipant[]>([]);
  const [quality, setQuality] = useState<VoiceQuality>("unknown");
  const [isMuted, setIsMuted] = useState(joinMuted);
  const [isDeafened, setIsDeafened] = useState(false);
  const [error, setError] = useState<VoiceError | null>(null);
  const [pending, setPending] = useState<VoicePendingAction>(null);

  const tokenProvider = useMemo(() => resolveVoiceTokenProvider(), []);
  const isAvailable = Boolean(tokenProvider) && enabled && Boolean(profileId);

  // The room's voice narrative is a Domain concern; the transport only reports
  // facts. Publication is best-effort: a dropped event never breaks a call.
  const announce = useCallback(
    (publish: (service: ReturnType<typeof voiceService>) => Promise<unknown>) => {
      if (!isServiceBound(VOICE_SERVICE) || !profileId) return;
      try {
        void publish(resolveService(VOICE_SERVICE)).catch((cause) => {
          logger.debug("Voice event not published", { module: MODULE, error: cause });
        });
      } catch (cause) {
        logger.debug("Voice event not published", { module: MODULE, error: cause });
      }
    },
    [profileId],
  );

  const ensureAdapter = useCallback((): VoiceAdapter | null => {
    if (!adapterRef.current) adapterRef.current = resolveVoiceAdapter();
    return adapterRef.current;
  }, []);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  // One subscription for the lifetime of the room screen.
  useEffect(() => {
    const adapter = ensureAdapter();
    if (!adapter) return;
    return adapter.subscribe({
      onStateChange(next) {
        if (!mounted.current) return;
        setTransportState(next);
      },
      onParticipantsChange(next) {
        if (!mounted.current) return;
        setParticipants(next);
      },
      onStatsChange(next) {
        if (!mounted.current) return;
        setQuality(next.quality);
      },
      onError(cause) {
        if (!mounted.current) return;
        setError(toVoiceError(cause));
      },
    });
  }, [ensureAdapter]);

  const voiceSessionId = useMemo(() => `voice-${roomId}`, [roomId]);

  const connect = useCallback(async () => {
    const adapter = ensureAdapter();
    if (!adapter || !tokenProvider || !profileId) {
      setError({ code: "SF-VOICE-UNAVAILABLE", messageKey: "voice.error.not_configured" });
      return;
    }
    setPending("join");
    setError(null);
    try {
      const grant = await tokenProvider.issue({
        roomId,
        participantIdentity: profileId,
        displayName,
      });
      await adapter.connect({
        serverUrl: grant.serverUrl,
        token: grant.token,
        startMuted: joinMuted,
        ...(input.inputDeviceId ? { deviceId: input.inputDeviceId } : {}),
      });
      if (input.outputDeviceId && adapter.setOutputDevice) {
        await adapter.setOutputDevice(input.outputDeviceId);
      }
      if (!mounted.current) return;
      setIsMuted(joinMuted);
      setIsDeafened(false);
      announce((service) =>
        service.participantJoined(
          { roomId, voiceSessionId, profileId, status: "active" },
          { correlationId: crypto.randomUUID(), actorProfileId: profileId },
        ),
      );
    } catch (cause) {
      logger.warn("Voice join failed", { module: MODULE, roomId, error: cause });
      if (mounted.current) setError(toVoiceError(cause));
    } finally {
      if (mounted.current) setPending(null);
    }
  }, [
    announce,
    displayName,
    ensureAdapter,
    input.inputDeviceId,
    input.outputDeviceId,
    joinMuted,
    profileId,
    roomId,
    tokenProvider,
    voiceSessionId,
  ]);

  const disconnect = useCallback(
    async (reason: string) => {
      const adapter = adapterRef.current;
      if (!adapter) return;
      setPending("leave");
      try {
        await adapter.disconnect();
        if (profileId) {
          announce((service) =>
            service.participantLeft(
              { roomId, voiceSessionId, profileId, reason },
              { correlationId: crypto.randomUUID(), actorProfileId: profileId },
            ),
          );
        }
      } finally {
        if (mounted.current) {
          setPending(null);
          setParticipants([]);
          setIsDeafened(false);
        }
      }
    },
    [announce, profileId, roomId, voiceSessionId],
  );

  // Preference-driven auto-join, attempted at most once per room screen.
  useEffect(() => {
    if (!isAvailable || !autoJoin || autoJoinAttempted.current) return;
    if (transportState !== "disconnected") return;
    autoJoinAttempted.current = true;
    void connect();
  }, [autoJoin, connect, isAvailable, transportState]);

  /**
   * Sprint J.2 — voice never outlives membership. If the call stops being
   * offered while the screen is still mounted (the member left, the room
   * ended, the grant went away), the transport is closed here rather than
   * waiting for unmount. The auto-join attempt resets so a later rejoin
   * reconnects normally.
   */
  useEffect(() => {
    if (isAvailable) return;
    autoJoinAttempted.current = false;
    if (transportState === "disconnected") return;
    void disconnect("session_unavailable");
  }, [disconnect, isAvailable, transportState]);

  // Leaving the room screen always ends the call; nothing keeps a mic open.
  useEffect(
    () => () => {
      void adapterRef.current?.disconnect();
    },
    [],
  );

  const setMuted = useCallback(
    (next: boolean) => {
      const adapter = adapterRef.current;
      if (!adapter) return;
      setPending("mute");
      setIsMuted(next);
      void adapter
        .setMuted(next)
        .then(() => {
          if (!profileId) return;
          announce((service) =>
            service.muteChanged(
              { roomId, voiceSessionId, profileId, isMuted: next, isDeafened },
              { correlationId: crypto.randomUUID(), actorProfileId: profileId },
            ),
          );
        })
        .catch((cause: unknown) => {
          if (mounted.current) setError(toVoiceError(cause));
        })
        .finally(() => {
          if (mounted.current) setPending(null);
        });
    },
    [announce, isDeafened, profileId, roomId, voiceSessionId],
  );

  const setDeafened = useCallback(
    (next: boolean) => {
      const adapter = adapterRef.current;
      if (!adapter) return;
      setPending("deafen");
      setIsDeafened(next);
      // Deafening also mutes: you should not be heard by a room you cannot hear.
      if (next && !isMuted) {
        setIsMuted(true);
        void adapter.setMuted(true).catch(() => undefined);
      }
      void Promise.resolve(adapter.setDeafened?.(next))
        .catch((cause: unknown) => {
          if (mounted.current) setError(toVoiceError(cause));
        })
        .finally(() => {
          if (mounted.current) setPending(null);
        });
    },
    [isMuted],
  );

  // Device preferences apply live to an existing call.
  useEffect(() => {
    const adapter = adapterRef.current;
    if (!adapter || transportState !== "connected" || !input.inputDeviceId) return;
    void adapter.setInputDevice(input.inputDeviceId).catch(() => undefined);
  }, [input.inputDeviceId, transportState]);

  useEffect(() => {
    const adapter = adapterRef.current;
    if (!adapter || transportState !== "connected" || !input.outputDeviceId) return;
    void adapter.setOutputDevice?.(input.outputDeviceId).catch(() => undefined);
  }, [input.outputDeviceId, transportState]);

  const members = useMemo<readonly VoiceMemberView[]>(() => {
    if (participants.length === 0) return EMPTY_MEMBERS;
    return participants.map((participant) => ({
      profileId: participant.identity,
      displayName: participant.displayName,
      isSpeaking: participant.isSpeaking && !participant.isMuted,
      isMuted: participant.isMuted,
      isSelf: participant.isLocal,
    }));
  }, [participants]);

  const speakingProfileIds = useMemo(
    () => new Set(members.filter((member) => member.isSpeaking).map((member) => member.profileId)),
    [members],
  );

  const state: VoiceUiState = !isAvailable
    ? "unavailable"
    : error && transportState !== "connected"
      ? "error"
      : STATE_MAP[transportState];

  return {
    state,
    isAvailable,
    isConnected: transportState === "connected",
    isConnecting: transportState === "connecting",
    isReconnecting: transportState === "reconnecting",
    isMuted,
    isDeafened,
    quality,
    members,
    speakingProfileIds,
    error,
    pending,
    join: () => void connect(),
    leave: () => void disconnect("left"),
    setMuted,
    toggleMute: () => setMuted(!isMuted),
    setDeafened,
    toggleDeafen: () => setDeafened(!isDeafened),
    recover: () => {
      setError(null);
      void connect();
    },
  };
}

/** Type-only helper so `announce` can name the service without importing it twice. */
function voiceService() {
  return resolveService(VOICE_SERVICE);
}
