/**
 * Theater screen — Sprint H1, rebuilt for the H2 hybrid watch party.
 *
 * The room is the product: who is here, what we picked, when we press play,
 * and what the provider actually lets us do about it. Everything the screen
 * claims comes from the capability model, so a launch-only service is never
 * dressed up as a controlled one (ADR-014).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { ActionButton, Avatar, Surface } from "@/design-system/components";
import {
  DEFAULT_READINESS_THRESHOLD,
  classifyPresence,
  deriveRoomPhase,
  deriveRoomScope,
  shouldPromptFeedback,
  providerBrowseUrl,
  summarizeReadiness,
  watchProviderById,
  type ActivationAction,
  type CoordinationKind,
  type FailureKind,
  type ParticipantRuntime,
  type WatchProviderCapability,
} from "@/domain";
import {
  dismissFeedback,
  markRoomMoment,
  noteRoomFact,
  observeActivation,
  readSessionSummary,
  recordFeedback,
  recordResearch,
  useAnalytics,
} from "@/features/analytics";
import { useProviderCatalog } from "@/features/providers";
import { useVoiceSession, useVoiceDevices } from "@/features/voice";
import { useMicrophonePermission } from "@/features/voice/use-microphone-permission";
import {
  useMemberNames,
  useRoomCountdown,
  useWaitingRoom,
  memberLabel,
  type MemberView,
} from "@/features/waiting-room";
import { useTranslation } from "@/foundation/localization";

import { ActivationPanel } from "./components/activation-panel";
import { BetaFeedback } from "./components/beta-feedback";
import { ResearchPanel } from "./components/research-panel";
import { SessionSummaryCard } from "./components/session-summary-card";
import { ChatPanel } from "./components/chat-panel";
import { FailureNotice } from "./components/failure-notice";
import { InvitePanel } from "./components/invite-panel";
import { RoomKeyCard } from "./components/room-key-card";
import { ConnectionBanner } from "./components/connection-banner";
import { HostModeration } from "./components/host-moderation";
import { VoiceRoomPanel } from "./components/voice-room-panel";
import { ManualCoordination } from "./components/manual-coordination";
import { ParticipantRail } from "./components/participant-rail";
import { RoomDrawer } from "./components/room-drawer";
import { HostTransport } from "./components/host-transport";
import { MediaCard } from "./components/media-card";
import { ProviderBar } from "./components/provider-bar";
import { SourcePicker } from "./components/source-picker";
import { SyncBadge } from "./components/sync-badge";
import { WatchStage } from "./components/watch-stage";
import { deriveStageView } from "./stage-view";
import { useRoomChat } from "./use-room-chat";
import { useWatchSource } from "./use-watch-source";
import { useRoomRuntime } from "./use-room-runtime";
import { useDirectPlayer } from "./use-direct-player";
import { useConnectionRecovery } from "./use-connection-recovery";
import { useProductAnalytics } from "./use-product-analytics";
import { useRoomActivation } from "./use-room-activation";
import { useRoomGovernance } from "./use-room-governance";

export interface TheaterProps {
  readonly roomId: string;
}

/** Rate nudge used while a guest is inside the soft drift band. */
const NUDGE_RATE = 1.05;

interface OrientationLock {
  lock?(orientation: string): Promise<void>;
}

export function Theater({ roomId }: TheaterProps) {
  const { t } = useTranslation();
  const room = useWaitingRoom(roomId);
  const names = useMemberNames(room.members.map((member) => member.profileId));

  const isHost = room.viewer.isHost;
  const profileId = room.viewer.profileId;
  const enabled = room.viewer.isMember && room.room !== null;

  // The selection is shared room state: it arrives with the snapshot, so the
  // host, every guest, and every late joiner render exactly the same choice.
  const source = useWatchSource({
    roomId,
    profileId,
    isHost,
    mediaRef: room.room?.mediaRef ?? null,
  });

  // A room created from a service tile belongs to that service. The catalog
  // key behind the room's provider is translated once, and the room offers
  // that service and nothing else (product correction pass).
  const catalog = useProviderCatalog(profileId);
  const scopeKey = useMemo(() => {
    const id = room.room?.providerId ?? null;
    if (!id) return null;
    return catalog.options.find((option) => option.id === id)?.key ?? null;
  }, [catalog.options, room.room?.providerId]);
  const scope = useMemo(
    () => deriveRoomScope({ scopeKey, mediaRef: room.room?.mediaRef ?? null }),
    [scopeKey, room.room?.mediaRef],
  );

  const [providerId, setProviderId] = useState<string | null>(null);
  const [isPicking, setIsPicking] = useState(false);
  const activeProviderId = scope.providerId ?? providerId ?? source.source?.providerId ?? null;
  const activeProvider: WatchProviderCapability | null = useMemo(
    () => (activeProviderId ? watchProviderById(activeProviderId) : null),
    [activeProviderId],
  );

  const directUrl = source.source?.kind === "direct" ? source.source.url : null;
  const [localPositionMs, setLocalPositionMs] = useState<number | null>(null);
  const [durationMs, setDurationMs] = useState<number | null>(null);
  const [volume, setVolume] = useState(80);
  const suppressUntil = useRef(0);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const pickerRef = useRef<HTMLDivElement | null>(null);

  const countdown = useRoomCountdown({
    roomId,
    actorProfileId: profileId,
    isHost,
    durationSeconds: room.room?.countdownSeconds ?? 5,
    enabled: enabled && room.status === "ready",
  });
  const countdownRemaining =
    countdown.state === "counting_down" ? Math.max(0, countdown.remainingSeconds) : null;

  const player = useDirectPlayer({
    url: directUrl,
    onPhase: (phase, positionMs) => {
      setLocalPositionMs(positionMs);
      setIsBuffering(phase === "buffering");
    },
  });

  const [isBuffering, setIsBuffering] = useState(false);
  const [selfReady, setSelfReady] = useState(false);
  const [hasOpenedProvider, setHasOpenedProvider] = useState(false);
  const [failure, setFailure] = useState<FailureKind | null>(null);
  const [feedbackState, setFeedbackState] = useState<"pending" | "answered" | "dismissed">(
    "pending",
  );
  const [hasLeft, setHasLeft] = useState(false);
  const [researchState, setResearchState] = useState<"pending" | "done">("pending");
  const [reconnectCount, setReconnectCount] = useState(0);
  // A countdown that was cancelled must not count as completed.
  const countdownCompletedRef = useRef(false);

  const runtime = useRoomRuntime({
    roomId,
    profileId,
    isHost,
    enabled,
    capability: source.capability,
    hasMedia: source.source !== null,
    mediaValid: (room.room?.mediaRef?.validity ?? "valid") !== "invalid",
    roomClosed: room.room?.status === "abandoned" || room.room?.status === "ended",
    isCountingDown: countdownRemaining !== null,
    clockOffsetMs: room.clockSync.snapshot?.offset?.offsetMs ?? 0,
    readLocalPositionSeconds: () => {
      const ms = player.positionMs();
      return ms === null ? null : ms / 1000;
    },
    isBuffering,
    applyRemote: ({ status, positionSeconds, correction, rate }) => {
      if (!player.isReady) return;
      // A local correction must never be read back as a host intent.
      if (Date.now() < suppressUntil.current) return;

      if (correction === "hard") {
        player.seekTo(Math.round(positionSeconds * 1000));
        suppressUntil.current = Date.now() + 600;
      }
      if (status === "playing") {
        player.setRate(rate);
        player.play();
      } else if (status === "paused" || status === "idle") {
        player.setRate(1);
        player.pause();
      }
    },
  });

  const chat = useRoomChat({ roomId, profileId, enabled });
  const analytics = useProductAnalytics();
  const beta = useAnalytics({
    role: isHost ? "host" : "guest",
    providerId: source.capability.providerId,
    syncMode: source.capability.playbackControlMode,
    roomKey: roomId,
  });

  const governance = useRoomGovernance({
    roomId,
    enabled,
    viewerRole: room.viewer.role,
    viewerState: room.viewer.state,
    viewerMutedByHost: room.viewer.isMutedByHost,
    roomStatus: room.room?.status ?? "lobby",
    snapshotSettings: room.room?.governance ?? null,
    onChanged: room.refresh,
    onModeration: (action) =>
      action === "close_room"
        ? analytics.track("room_closed")
        : action === "remove_participant"
          ? analytics.track("participant_removed")
          : undefined,
  });

  const recovery = useConnectionRecovery({
    enabled,
    onResume: () => {
      room.refresh();
      analytics.track("reconnect_recovered");
    },
    onInterrupted: () => analytics.track("reconnect_started"),
  });

  // The banner only clears once a snapshot has actually landed again.
  useEffect(() => {
    if (room.status === "ready") recovery.markRecovered();
  }, [room.status, room.room?.status, recovery]);

  const microphone = useMicrophonePermission();
  const voiceDevices = useVoiceDevices();
  const [inputDeviceId, setInputDeviceId] = useState<string | null>(null);
  const [outputDeviceId, setOutputDeviceId] = useState<string | null>(null);
  const [voiceRequested, setVoiceRequested] = useState(false);
  const voice = useVoiceSession({
    roomId,
    profileId,
    displayName: profileId ? (names.get(profileId) ?? memberLabel(profileId)) : "",
    enabled: enabled && voiceRequested && !room.viewer.isMutedByHost,
    autoJoin: voiceRequested,
    joinMuted: true,
    inputDeviceId,
    outputDeviceId,
  });

  const joinVoice = useCallback(() => {
    void microphone.request().then((granted) => {
      if (!granted) return;
      setVoiceRequested(true);
      voice.join();
      analytics.track("voice_connected");
    });
  }, [microphone, voice, analytics]);

  const leaveVoice = useCallback(() => {
    voice.leave();
    setVoiceRequested(false);
    analytics.track("voice_join_requested", { left: true });
  }, [voice, analytics]);

  // Keep the transport clock and duration fresh for the host's own readout.
  useEffect(() => {
    if (!player.isReady) return;
    const timer = window.setInterval(() => {
      setLocalPositionMs(player.positionMs());
      setDurationMs(player.durationMs());
    }, 1_000);
    return () => window.clearInterval(timer);
  }, [player]);

  // Volume is a device comfort setting; it is applied locally and never sent.
  useEffect(() => {
    if (player.isReady) player.setVolume(volume);
  }, [player, volume]);

  // A guest that arrives mid-film lands where the room already is.
  useEffect(() => {
    if (isHost || !player.isReady || runtime.playback.revision < 0) return;
    player.seekTo(Math.round(runtime.positionSeconds() * 1000));
    // Only on the transition into readiness for this source.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [player.isReady, directUrl]);

  const isPlaying = runtime.playback.status === "playing";
  const capability = source.capability;
  const isEmbedded = capability.allowsEmbeddedPlayback && directUrl !== null;
  const capabilityProviderId = capability.providerId;

  const togglePlay = useCallback(() => {
    const seconds = (player.positionMs() ?? 0) / 1000 || runtime.positionSeconds();
    runtime.send(
      isPlaying
        ? { kind: "pause", positionSeconds: seconds }
        : { kind: "play", positionSeconds: seconds },
    );
  }, [isPlaying, player, runtime]);

  const seekBy = useCallback(
    (deltaMs: number) => {
      const base = player.positionMs() ?? runtime.positionSeconds() * 1000;
      runtime.send({
        kind: "seek",
        positionSeconds: Math.max(0, base + deltaMs) / 1000,
        playing: isPlaying,
      });
    },
    [isPlaying, player, runtime],
  );

  const requestFullscreen = useCallback(() => {
    const element = stageRef.current;
    if (!element) return;
    void element.requestFullscreen?.().then(
      () => {
        // Landscape is an intent, not a guarantee: desktops and iOS refuse it.
        const orientation = screen.orientation as unknown as OrientationLock | undefined;
        void orientation?.lock?.("landscape").catch(() => undefined);
      },
      () => undefined,
    );
  }, []);

  const copyInvite = useCallback(() => {
    if (!room.room) return;
    const link = `${window.location.origin}/join/${encodeURIComponent(room.room.code)}`;
    void navigator.clipboard?.writeText(link).then(
      () => beta.track("invite_copied"),
      () => undefined,
    );
  }, [room.room, beta]);

  /**
   * Choosing a service is a room decision, not a private one. It is written to
   * the shared selection immediately, so the stage leaves its empty state for
   * an honest handoff instead of staying blank while the host is off in
   * another tab (product correction pass).
   */
  const selectProvider = useCallback(
    (provider: WatchProviderCapability) => {
      setProviderId(provider.providerId);
      const browseUrl = providerBrowseUrl(provider.providerId);
      if (provider.selectionMode === "browse" && browseUrl && !source.source) {
        if (isHost) source.save(browseUrl, null);
      }
    },
    [source, isHost],
  );

  // A room created from a service tile already knows its service. The host
  // never re-picks it from a grid: the session opens on that service's stage.
  useEffect(() => {
    if (!isHost || !scope.isScoped || !scope.providerId) return;
    if (source.source || source.isSaving) return;
    const browseUrl = providerBrowseUrl(scope.providerId);
    if (browseUrl) source.save(browseUrl, null);
  }, [isHost, scope.isScoped, scope.providerId, source]);

  const nameFor = useCallback((id: string) => names.get(id) ?? memberLabel(id), [names]);

  const presentMembers: readonly MemberView[] = useMemo(
    () => room.members.filter((member) => member.state === "joined"),
    [room.members],
  );

  const countdownSeconds = countdownRemaining;

  // Presence and a person's own tap are the only readiness inputs: the room
  // never infers that somebody is watching.
  const voiceProfileIds = useMemo(
    () => new Set(voice.isConnected ? voice.members.map((member) => member.profileId) : []),
    [voice.isConnected, voice.members],
  );

  const isWatchPhase = runtime.playback.status === "playing";

  const participants = useMemo<readonly ParticipantRuntime[]>(
    () =>
      room.members
        .filter((member) => member.state !== "left" && member.state !== "removed")
        .map((member) => {
          const presence = classifyPresence({
            membership: member.state,
            liveness: member.presence,
            // Only the one plane we actually observe counts as watching.
            isWatching: isWatchPhase && member.presence === "online" && isEmbedded,
            hasSelfDeclaredReady: member.isViewer ? selfReady : member.isReady,
            voice: voiceProfileIds.has(member.profileId)
              ? member.isMutedByHost || (member.isViewer && voice.isMuted)
                ? "muted"
                : "connected"
              : "off",
          });
          const state: ParticipantRuntime["state"] =
            presence === "watching"
              ? "watching"
              : presence === "reconnecting"
                ? "reconnecting"
                : presence === "disconnected"
                  ? "disconnected"
                  : presence === "ready"
                    ? "ready"
                    : "joined";
          return {
            participantId: member.profileId,
            displayName: nameFor(member.profileId),
            isHost: member.isHost,
            state,
          };
        }),
    [room.members, nameFor, selfReady, voiceProfileIds, voice.isMuted, isWatchPhase, isEmbedded],
  );

  const readiness = useMemo(
    () => summarizeReadiness(participants, DEFAULT_READINESS_THRESHOLD),
    [participants],
  );

  const roomEvents = useMemo(
    () =>
      chat.events.map((event) => ({
        id: event.id,
        kind: event.kind,
        who: nameFor(event.profileId),
        createdAt: event.createdAt,
      })),
    [chat.events, nameFor],
  );

  const requestCoordination = useCallback(
    (kind: CoordinationKind) => {
      chat.sendCoordination(kind, t(`room.manual.sent.${kind}`));
    },
    [chat, t],
  );

  const leaveRoom = useCallback(() => {
    beta.track("room_left");
    setHasLeft(true);
    room.leave();
  }, [beta, room]);

  const toggleReady = useCallback(() => {
    setSelfReady((current) => {
      if (!current) chat.sendCoordination("ready", t("room.manual.sent.ready"));
      return !current;
    });
  }, [chat, t]);

  const openProvider = useCallback(() => {
    const url = source.source?.url ?? providerBrowseUrl(capabilityProviderId);
    if (!url) return;
    chat.sendCoordination("provider-launched", t("room.manual.sent.provider-launched"));
    beta.track("provider_launch_clicked");
    const opened = window.open(url, "_blank", "noopener,noreferrer");
    setHasOpenedProvider(true);
    // A blocked pop-up is a real failure, and the person needs a next step.
    setFailure(opened === null ? "provider_launch_failed" : null);
  }, [source.source, capabilityProviderId, chat, t, beta]);

  // One derivation, one snapshot: the host and every guest read the same phase.
  const mediaRef = room.room?.mediaRef ?? null;
  const phase = deriveRoomPhase({
    mediaRef,
    isCountingDown: countdownSeconds !== null,
    playbackPhase:
      runtime.playback.status === "playing"
        ? "playing"
        : runtime.playback.status === "paused"
          ? "paused"
          : runtime.playback.revision >= 0
            ? "idle"
            : null,
    roomClosed: room.room?.status === "abandoned",
    roomEnded: room.room?.status === "ended",
  });

  // The host opening the service is a room fact, announced once through the
  // coordination stream, so a guest's stage never sits blank while the host is
  // already watching.
  const hostProfileId = room.members.find((member) => member.role === "host")?.profileId ?? null;
  const hostLaunched = useMemo(
    () =>
      chat.events.some(
        (event) => event.kind === "provider-launched" && event.profileId === hostProfileId,
      ),
    [chat.events, hostProfileId],
  );

  // The centre panel is the room's stage: one derivation decides what it shows
  // and whether the lower media card would only repeat it.
  const stageView = deriveStageView({
    source: source.source,
    capability,
    isHost,
    phase,
    hasLaunched: hasOpenedProvider,
    hostLaunched,
  });

  // The host's stage CTA is the entry point into the app/provider picker.
  const chooseContent = useCallback(() => {
    setIsPicking(true);
    // The picker sits directly under the stage, so the room never scrolls into
    // an empty page while a choice is being made.
    window.requestAnimationFrame(() => {
      const node = pickerRef.current;
      if (!node) return;
      node.scrollIntoView({ behavior: "smooth", block: "nearest" });
      node.querySelector<HTMLElement>("button, input")?.focus({ preventScroll: true });
    });
  }, []);

  const guestCount = Math.max(0, presentMembers.length - 1);

  const activation = useRoomActivation({
    isHost,
    guestCount,
    hasContent: source.source !== null,
    isCountingDown: countdownSeconds !== null,
    phase,
    isEmbedded,
    hasOpenedProvider,
    isSelfReady: selfReady,
    isVoiceConnected: voice.isConnected,
    isVoiceAvailable: microphone.isSupported && !room.viewer.isMutedByHost,
  });

  const inviteLink = `${typeof window === "undefined" ? "" : window.location.origin}/join/${encodeURIComponent(room.room?.code ?? "")}`;

  const inviteBlocked = governance.settings.isLocked
    ? ("locked" as const)
    : phase === "closed" || phase === "ended"
      ? ("expired" as const)
      : null;

  const handleActivation = useCallback(
    (action: ActivationAction) => {
      switch (action) {
        case "invite_someone":
          copyInvite();
          break;
        case "start_countdown":
          beta.track("countdown_started");
          countdown.start();
          break;
        case "open_provider":
          openProvider();
          break;
        case "join_voice":
          joinVoice();
          break;
        case "mark_ready":
          toggleReady();
          break;
        default:
          break;
      }
    },
    [copyInvite, countdown, openProvider, joinVoice, toggleReady, beta],
  );

  useEffect(() => {
    if (countdownRemaining === 0) countdownCompletedRef.current = true;
  }, [countdownRemaining]);

  const showFeedback = shouldPromptFeedback({
    phase,
    hasLeft,
    alreadyAnswered: feedbackState === "answered",
    dismissed: feedbackState === "dismissed",
  });

  const canSendChat = chat.isAvailable && enabled && governance.can("send_chat");
  const chatDisabledReason = canSendChat
    ? null
    : governance.seat === "removed"
      ? ("left" as const)
      : !governance.settings.isChatEnabled
        ? ("chat_disabled" as const)
        : !enabled
          ? ("left" as const)
          : null;

  const moderation =
    governance.can("mute_participant") || governance.can("remove_participant")
      ? {
          canMute: governance.can("mute_participant"),
          canRemove: governance.can("remove_participant"),
          mutedProfileIds: new Set(
            room.members.filter((m) => m.isMutedByHost).map((m) => m.profileId),
          ),
          memberIdByProfileId: new Map(room.members.map((m) => [m.profileId, m.id])),
          busy: governance.pending === "mute" || governance.pending === "remove",
          onMute: governance.muteParticipant,
          onRemove: governance.removeParticipant,
        }
      : null;

  useEffect(() => {
    if (phase === "watching") beta.track("watching_started");
  }, [phase, beta]);

  // Activation is observed, never asserted: the domain tracker decides whether
  // this room actually reached a host and a guest watching together.
  useEffect(() => {
    if (!enabled) return;
    observeActivation(
      roomId,
      {
        hasHost: presentMembers.length > 0,
        guestCount,
        hasValidMedia: source.source !== null && (mediaRef?.validity ?? "valid") !== "invalid",
        countdownCompleted: countdownCompletedRef.current,
        phase,
      },
      { role: isHost ? "host" : "guest", providerId: capabilityProviderId },
    );
  }, [
    enabled,
    roomId,
    presentMembers.length,
    guestCount,
    source.source,
    mediaRef?.validity,
    phase,
    isHost,
    capabilityProviderId,
  ]);

  useEffect(() => {
    if (enabled) markRoomMoment(roomId, "createdAt");
  }, [enabled, roomId]);

  useEffect(() => {
    if (guestCount > 0) markRoomMoment(roomId, "firstGuestAt");
    noteRoomFact(roomId, { participants: presentMembers.length });
  }, [guestCount, presentMembers.length, roomId]);

  useEffect(() => {
    if (source.source !== null) markRoomMoment(roomId, "mediaSelectedAt");
  }, [source.source, roomId]);

  useEffect(() => {
    if (phase === "watching") markRoomMoment(roomId, "watchingAt");
    if (phase === "ended" || phase === "closed") markRoomMoment(roomId, "endedAt");
  }, [phase, roomId]);

  useEffect(() => {
    if (voice.isConnected) noteRoomFact(roomId, { usedVoice: true });
  }, [voice.isConnected, roomId]);

  useEffect(() => {
    if (chat.lines.length > 0) noteRoomFact(roomId, { usedChat: true });
  }, [chat.lines.length, roomId]);

  useEffect(() => {
    if (recovery.phase === "recovering") {
      noteRoomFact(roomId, { reconnectFailure: true });
      setReconnectCount((current) => current + 1);
    }
  }, [recovery.phase, roomId]);

  const chatPanel = (
    <ChatPanel
      chat={chat}
      nameFor={nameFor}
      canSend={canSendChat}
      disabledReason={chatDisabledReason}
    />
  );

  const participantRail = (
    <ParticipantRail
      participants={participants}
      readiness={readiness}
      showReadiness={!runtime.isAutomatic}
      moderation={moderation}
      voiceProfileIds={voiceProfileIds}
    />
  );

  if (!room.room) {
    return (
      <main className="mx-auto flex min-h-[60vh] max-w-3xl items-center justify-center px-4">
        <p className="text-sm text-muted-foreground">
          {room.status === "loading" ? t("common.state.loading") : t("theater.room.unavailable")}
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-6" data-sf-phase={phase}>
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 sm:flex sm:flex-wrap sm:justify-between">
        <div className="flex min-w-0 flex-col">
          <h1 className="truncate text-xl font-semibold sm:text-2xl">
            {source.label ?? room.room.name}
          </h1>
          <p className="truncate text-sm text-muted-foreground">
            {t("theater.header.people", { count: presentMembers.length })}
            {source.source ? ` · ${capability.displayName}` : ""}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <SyncBadge
            verdict={runtime.syncStatus}
            driftMs={runtime.isAutomatic ? runtime.driftMs : null}
            isLive={runtime.isLive}
          />
          <ActionButton
            tone="ghost"
            size="sm"
            onClick={leaveRoom}
            loading={room.pending === "leave"}
          >
            {t("theater.action.leave")}
          </ActionButton>
        </div>
      </header>

      <ConnectionBanner phase={recovery.phase} />

      {governance.settings.isLocked ? (
        <p className="text-xs text-muted-foreground" data-sf-room-locked>
          {t("room.privacy.locked")}
        </p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_19rem] lg:items-start">
        <div className="flex min-w-0 flex-col gap-4">
          <WatchStage
            source={source.source}
            capability={capability}
            containerRef={player.containerRef}
            stageRef={stageRef}
            hasFailed={player.hasFailed}
            isReady={player.isReady}
            isHost={isHost}
            phase={phase}
            title={source.label}
            countdownSeconds={countdownSeconds}
            isPreparing={source.isSaving}
            hasLaunched={hasOpenedProvider}
            hostLaunched={hostLaunched}
            onChooseContent={chooseContent}
            onOpenProvider={openProvider}
          />

          {/* Capability limits belong in the room, on screen, for everyone —
              not only in a specification document. */}
          {source.source ? <CapabilityNote capability={capability} /> : null}



          {/* A scoped room never shows a launcher grid: it already is that
              service's room. Only an open room asks which service, and the
              link field is a fallback, not a step. */}
          {isHost && (isPicking || source.source === null) ? (
            <div className="flex flex-col gap-3" ref={pickerRef} data-sf-selection-flow>
              {scope.isScoped ? null : (
                <ProviderBar
                  activeProviderId={activeProviderId}
                  isHost={isHost}
                  providers={scope.providers}
                  isScoped={scope.isScoped}
                  onSelect={selectProvider}
                />
              )}
              {activeProvider && activeProvider.selectionMode !== "browse" ? (
                <SourcePicker
                  provider={activeProvider}
                  currentUrl={source.source?.url ?? ""}
                  currentTitle={source.selection.title ?? ""}
                  isSaving={source.isSaving}
                  error={source.error ? t("theater.source.error") : null}
                  onSubmit={(url, title) => {
                    source.save(url, title);
                    setIsPicking(false);
                  }}
                />
              ) : activeProvider ? (
                <details className="rounded-2xl border border-border/60 px-4 py-3">
                  <summary className="cursor-pointer text-sm text-muted-foreground">
                    {t("theater.source.advanced")}
                  </summary>
                  <div className="pt-3">
                    <SourcePicker
                      provider={activeProvider}
                      currentUrl={source.source?.url ?? ""}
                      currentTitle={source.selection.title ?? ""}
                      isSaving={source.isSaving}
                      error={source.error ? t("theater.source.error") : null}
                      onSubmit={(url, title) => {
                        source.save(url, title);
                        setIsPicking(false);
                      }}
                    />
                  </div>
                </details>
              ) : null}
            </div>
          ) : null}

          {isHost && !isPicking && source.source !== null ? (
            <div>
              <ActionButton
                tone="ghost"
                size="sm"
                onClick={chooseContent}
                data-sf-stage-cta="change-content"
              >
                {t("theater.stage.change_cta")}
              </ActionButton>
            </div>
          ) : null}

          {/* Inviting people belongs with the room's start-of-session work,
              not in the top-right utility strip. */}
          <InvitePanel
            link={inviteLink}
            participantCount={presentMembers.length}
            blocked={inviteBlocked}
            onCopied={() => beta.track("invite_copied")}
            onShared={() => beta.track("native_share_opened")}
          />

          <RoomKeyCard roomCode={room.room?.code ?? null} blocked={inviteBlocked !== null} />

          <ActivationPanel
            plan={activation}
            onAct={handleActivation}
            busy={countdown.pending === "start"}
          />

          {failure ? (
            <FailureNotice
              kind={failure}
              onRetry={failure === "provider_launch_failed" ? openProvider : null}
              onDismiss={() => setFailure(null)}
            />
          ) : null}

          {showFeedback ? (
            <BetaFeedback
              onSubmit={(input) => {
                recordFeedback(input);
                beta.track("session_ended", { outcome: input.outcome });
                setFeedbackState("answered");
              }}
              onDismiss={() => {
                dismissFeedback();
                setFeedbackState("dismissed");
              }}
            />
          ) : null}

          {(phase === "ended" || phase === "closed") && !hasLeft ? (
            <SessionSummaryCard
              summary={readSessionSummary(roomId, {
                providerId: capabilityProviderId,
                chatAvailable: chat.isAvailable,
                voiceAvailable: microphone.isSupported,
                reconnects: reconnectCount,
              })}
              providerName={capability.displayName}
            />
          ) : null}

          {(phase === "ended" || phase === "closed") &&
          feedbackState !== "pending" &&
          researchState === "pending" ? (
            <ResearchPanel
              onRespond={(input) =>
                recordResearch({ concept: input.concept, value: input.value, pay: input.pay })
              }
              onDismiss={() => setResearchState("done")}
            />
          ) : null}

          {stageView.showsMediaCard ? (
            <MediaCard
              source={source.source}
              label={source.label}
              capability={capability}
              isHost={isHost}
              participantCount={presentMembers.length}
              countdownSeconds={countdownSeconds}
              phase={phase}
              validity={mediaRef?.validity ?? null}
              canStart={
                source.source !== null && mediaRef?.validity !== "invalid" && countdown.isAvailable
              }
              isStarting={countdown.pending === "start"}
              onStart={countdown.start}
              onCancel={countdown.cancel}
              onFullscreen={
                isEmbedded && capability.allowsFullscreenFromRoom ? requestFullscreen : null
              }
              volume={volume}
              onVolumeChange={setVolume}
              showVolume={isEmbedded}
            />
          ) : null}

          {isEmbedded ? (
            <Surface tone="card" padding="md" className="flex flex-col gap-3">
              <HostTransport
                isHost={isHost}
                isPlaying={isPlaying}
                canControl={player.isReady && runtime.isAvailable}
                positionMs={localPositionMs}
                durationMs={durationMs}
                onTogglePlay={togglePlay}
                onSeekBy={seekBy}
                onRestart={() => runtime.send({ kind: "restart" })}
              />
            </Surface>
          ) : (
            <ManualCoordination
              capability={capability}
              source={source.source}
              isHost={isHost}
              isReady={selfReady}
              canAct={enabled && chat.isAvailable}
              events={roomEvents}
              onOpenProvider={openProvider}
              onToggleReady={toggleReady}
              onRequest={requestCoordination}
              onLeave={leaveRoom}
            />
          )}

          <VoiceRoomPanel
            voice={voice}
            permission={microphone.permission}
            isMicSupported={microphone.isSupported}
            isMutedByHost={room.viewer.isMutedByHost}
            onJoin={joinVoice}
            onLeave={leaveVoice}
            onReconnect={voice.recover}
            inputDevices={voiceDevices.inputs}
            outputDevices={voiceDevices.outputs}
            inputDeviceId={inputDeviceId}
            outputDeviceId={outputDeviceId}
            onInputDevice={setInputDeviceId}
            onOutputDevice={setOutputDeviceId}
          />

          <HostModeration
            governance={governance}
            onCancelCountdown={countdownSeconds !== null ? countdown.cancel : null}
            onRestartCountdown={
              countdownSeconds === null && countdown.isAvailable ? countdown.start : null
            }
          />

          <RoomDrawer chat={chatPanel} people={participantRail} unreadHint={chat.lines.length} />
        </div>

        <aside className="hidden min-h-[24rem] flex-col gap-4 lg:flex lg:h-[calc(100vh-12rem)]">
          {participantRail}
          <div className="min-h-0 flex-1">{chatPanel}</div>
        </aside>
      </div>
    </main>
  );
}
