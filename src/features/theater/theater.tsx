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
  deriveRoomPhase,
  providerBrowseUrl,
  summarizeReadiness,
  watchProviderById,
  type CoordinationKind,
  type ParticipantRuntime,
  type WatchProviderCapability,
} from "@/domain";
import {
  useMemberNames,
  useRoomCountdown,
  useWaitingRoom,
  memberLabel,
  type MemberView,
} from "@/features/waiting-room";
import { useTranslation } from "@/foundation/localization";

import { ChatPanel } from "./components/chat-panel";
import { ManualCoordination } from "./components/manual-coordination";
import { ParticipantRail } from "./components/participant-rail";
import { RoomDrawer } from "./components/room-drawer";
import { HostTransport } from "./components/host-transport";
import { MediaCard } from "./components/media-card";
import { ProviderBar } from "./components/provider-bar";
import { SourcePicker } from "./components/source-picker";
import { SyncBadge } from "./components/sync-badge";
import { WatchStage } from "./components/watch-stage";
import { useRoomChat } from "./use-room-chat";
import { useWatchSource } from "./use-watch-source";
import { useRoomRuntime } from "./use-room-runtime";
import { useDirectPlayer } from "./use-direct-player";

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

  const [providerId, setProviderId] = useState<string | null>(null);
  const activeProviderId = providerId ?? source.source?.providerId ?? null;
  const activeProvider: WatchProviderCapability | null = useMemo(
    () => (activeProviderId ? watchProviderById(activeProviderId) : null),
    [activeProviderId],
  );

  const directUrl = source.source?.kind === "direct" ? source.source.url : null;
  const [localPositionMs, setLocalPositionMs] = useState<number | null>(null);
  const [durationMs, setDurationMs] = useState<number | null>(null);
  const [volume, setVolume] = useState(80);
  const [copied, setCopied] = useState(false);
  const suppressUntil = useRef(0);
  const stageRef = useRef<HTMLDivElement | null>(null);

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
      () => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2_000);
      },
      () => undefined,
    );
  }, [room.room]);

  const selectProvider = useCallback(
    (provider: WatchProviderCapability) => {
      setProviderId(provider.providerId);
      const browseUrl = providerBrowseUrl(provider.providerId);
      if (provider.selectionMode === "browse" && browseUrl && !source.source) {
        window.open(browseUrl, "_blank", "noopener,noreferrer");
      }
    },
    [source.source],
  );

  const nameFor = useCallback((id: string) => names.get(id) ?? memberLabel(id), [names]);

  const presentMembers: readonly MemberView[] = useMemo(
    () => room.members.filter((member) => member.state === "joined"),
    [room.members],
  );

  const countdownSeconds = countdownRemaining;

  // Presence and a person's own tap are the only readiness inputs: the room
  // never infers that somebody is watching.
  const participants = useMemo<readonly ParticipantRuntime[]>(
    () =>
      room.members
        .filter((member) => member.state !== "left")
        .map((member) => ({
          participantId: member.profileId,
          displayName: nameFor(member.profileId),
          isHost: member.isHost,
          state:
            member.presence === "offline"
              ? ("disconnected" as const)
              : member.presence === "stale"
                ? ("reconnecting" as const)
                : member.isViewer && selfReady
                  ? ("ready" as const)
                  : member.isReady
                    ? ("ready" as const)
                    : ("joined" as const),
        })),
    [room.members, nameFor, selfReady],
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
    window.open(url, "_blank", "noopener,noreferrer");
  }, [source.source, capabilityProviderId, chat, t]);

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
          <h1 className="truncate text-xl font-semibold sm:text-2xl">{room.room.name}</h1>
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
          <ActionButton tone="secondary" size="sm" onClick={copyInvite} data-sf-copy-invite>
            {copied ? t("invite.share.copied") : t("room.invite.copy_link")}
          </ActionButton>
          <ActionButton
            tone="ghost"
            size="sm"
            onClick={room.leave}
            loading={room.pending === "leave"}
          >
            {t("theater.action.leave")}
          </ActionButton>
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="flex min-w-0 flex-col gap-4">
          <WatchStage
            source={source.source}
            capability={capability}
            containerRef={player.containerRef}
            stageRef={stageRef}
            hasFailed={player.hasFailed}
            isReady={player.isReady}
          />

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
              onLeave={room.leave}
            />
          )}

          <RoomDrawer
            chat={<ChatPanel chat={chat} nameFor={nameFor} canSend={chat.isAvailable && enabled} />}
            people={
              <ParticipantRail
                participants={participants}
                readiness={readiness}
                showReadiness={!runtime.isAutomatic}
              />
            }
            unreadHint={chat.lines.length}
          />

          {isHost ? (
            <div className="flex flex-col gap-3">
              <ProviderBar
                activeProviderId={activeProviderId}
                isHost={isHost}
                onSelect={selectProvider}
              />
              {activeProvider ? (
                <SourcePicker
                  provider={activeProvider}
                  currentUrl={source.source?.url ?? ""}
                  currentTitle={source.selection.title ?? ""}
                  isSaving={source.isSaving}
                  error={source.error ? t("theater.source.error") : null}
                  onSubmit={(url, title) => source.save(url, title)}
                />
              ) : null}
            </div>
          ) : null}
        </div>

        <aside className="hidden min-h-[24rem] flex-col gap-4 lg:flex lg:h-[calc(100vh-12rem)]">
          <ParticipantRail
            participants={participants}
            readiness={readiness}
            showReadiness={!runtime.isAutomatic}
          />
          <div className="min-h-0 flex-1">
            <ChatPanel chat={chat} nameFor={nameFor} canSend={chat.isAvailable && enabled} />
          </div>
        </aside>
      </div>
    </main>
  );
}
