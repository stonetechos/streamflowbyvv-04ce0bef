/**
 * Theater screen — Sprint H1.
 *
 * Where the watch party actually happens: the shared stage, who is here, the
 * host's transport, a measured sync verdict, and chat. The room's membership
 * and presence come from the existing lobby model; this surface adds only the
 * watching.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { ActionButton, Avatar, Surface } from "@/design-system/components";
import {
  useMemberNames,
  useWaitingRoom,
  memberLabel,
  type MemberView,
} from "@/features/waiting-room";
import { useTranslation } from "@/foundation/localization";

import { ChatPanel } from "./components/chat-panel";
import { HostTransport } from "./components/host-transport";
import { SourcePicker } from "./components/source-picker";
import { SyncBadge } from "./components/sync-badge";
import { WatchStage } from "./components/watch-stage";
import { useRoomChat } from "./use-room-chat";
import { useWatchSource } from "./use-watch-source";
import { useWatchSync } from "./use-watch-sync";
import { useYouTubePlayer } from "./use-youtube-player";

export interface TheaterProps {
  readonly roomId: string;
}

/** Rate nudge used while a guest is inside the soft drift band. */
const NUDGE_RATE = 1.05;

export function Theater({ roomId }: TheaterProps) {
  const { t } = useTranslation();
  const room = useWaitingRoom(roomId);
  const names = useMemberNames(room.members.map((member) => member.profileId));

  const isHost = room.viewer.isHost;
  const profileId = room.viewer.profileId;
  const enabled = room.viewer.isMember && room.room !== null;

  const source = useWatchSource({
    roomId,
    profileId,
    isHost,
    enabled,
    revision: room.members.length,
  });

  const videoId = source.source?.kind === "youtube" ? source.source.videoId : null;
  const localPhase = useRef<string | null>(null);
  const [localPositionMs, setLocalPositionMs] = useState<number | null>(null);
  const [durationMs, setDurationMs] = useState<number | null>(null);
  const suppressUntil = useRef(0);

  const player = useYouTubePlayer({
    videoId,
    onPhase: (phase, positionMs) => {
      localPhase.current = phase;
      setLocalPositionMs(positionMs);
    },
  });

  const sync = useWatchSync({
    roomId,
    profileId,
    isHost,
    enabled: enabled && videoId !== null,
    clockOffsetMs: room.clockSync.snapshot?.offset?.offsetMs ?? 0,
    readLocalPositionMs: () => player.positionMs(),
    applyRemote: ({ phase, positionMs, hardSeek }) => {
      if (!player.isReady) return;
      // A local correction must never be read back as a host intent.
      if (Date.now() < suppressUntil.current) return;

      if (hardSeek) {
        player.seekTo(positionMs);
        suppressUntil.current = Date.now() + 600;
      }

      if (phase === "playing") {
        const drift = (player.positionMs() ?? positionMs) - positionMs;
        player.setRate(!hardSeek && drift < 0 ? NUDGE_RATE : 1);
        player.play();
      } else if (phase === "paused" || phase === "idle") {
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

  // A guest that arrives mid-film lands where the room already is.
  useEffect(() => {
    if (isHost || !player.isReady || !sync.state) return;
    const target = sync.targetPositionMs();
    if (target !== null) player.seekTo(target);
    // Only on the transition into readiness for this source.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [player.isReady, videoId]);

  const isPlaying = sync.state?.phase === "playing";

  const togglePlay = useCallback(() => {
    const position = player.positionMs() ?? sync.targetPositionMs() ?? 0;
    if (isPlaying) sync.pause(position);
    else sync.play(position);
  }, [isPlaying, player, sync]);

  const seekBy = useCallback(
    (deltaMs: number) => {
      const base = player.positionMs() ?? sync.targetPositionMs() ?? 0;
      sync.seek(Math.max(0, base + deltaMs), isPlaying);
    },
    [isPlaying, player, sync],
  );

  const nameFor = useCallback(
    (id: string) => names.get(id) ?? memberLabel(id),
    [names],
  );

  const presentMembers: readonly MemberView[] = useMemo(
    () => room.members.filter((member) => member.state === "joined"),
    [room.members],
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
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-6">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 sm:flex sm:flex-wrap sm:justify-between">
        <div className="flex min-w-0 flex-col">
          <h1 className="truncate text-xl font-semibold sm:text-2xl">{room.room.name}</h1>
          <p className="truncate text-sm text-muted-foreground">
            {t("theater.header.people", { count: presentMembers.length })}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <SyncBadge verdict={sync.verdict} driftMs={sync.driftMs} isLive={sync.isLive} />
          <ActionButton tone="ghost" size="sm" onClick={room.leave} loading={room.pending === "leave"}>
            {t("theater.action.leave")}
          </ActionButton>
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="flex min-w-0 flex-col gap-4">
          <WatchStage
            source={source.source}
            capability={source.capability}
            containerRef={player.containerRef}
            hasFailed={player.hasFailed}
            isReady={player.isReady}
          />

          <Surface tone="card" padding="md" className="flex flex-col gap-3">
            <HostTransport
              isHost={isHost}
              isPlaying={isPlaying}
              canControl={player.isReady && sync.isAvailable}
              positionMs={localPositionMs}
              durationMs={durationMs}
              onTogglePlay={togglePlay}
              onSeekBy={seekBy}
              onRestart={() => sync.seek(0, isPlaying)}
            />
          </Surface>

          <ul className="flex flex-wrap gap-3">
            {presentMembers.map((member) => (
              <li key={member.id} className="flex items-center gap-2">
                <Avatar name={nameFor(member.profileId)} size="sm" />
                <span className="text-sm">
                  {nameFor(member.profileId)}
                  {member.isHost ? ` · ${t("theater.header.host")}` : ""}
                </span>
              </li>
            ))}
          </ul>

          {isHost ? (
            <SourcePicker
              current={source.source?.kind === "youtube" ? source.source.url : (source.source?.url ?? "")}
              isSaving={source.isSaving}
              error={source.error ? t("theater.source.error") : null}
              onSubmit={source.save}
            />
          ) : null}
        </div>

        <aside className="min-h-[24rem] lg:h-[calc(100vh-12rem)]">
          <ChatPanel chat={chat} nameFor={nameFor} canSend={chat.isAvailable && enabled} />
        </aside>
      </div>
    </main>
  );
}
