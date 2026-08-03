/**
 * Waiting Room screen — Sprint 2.0.
 *
 * Composes the lobby from the hook's model and resolves loading, error, and
 * empty states in one place so no child has to know about them.
 */
import { useMemo } from "react";

import { ErrorState, LoadingState } from "@/app-shell";
import type { SyncHealth } from "@/domain";
import { Skeleton } from "@/components/ui/skeleton";
import { PoWaitingBanner } from "@/features/po";
import { useProfile } from "@/features/profiles";
import {
  readVoiceDevicePreferences,
  useVoiceSession,
  VoicePanel,
  type VoiceIndicatorState,
} from "@/features/voice";
import { WatchPartyScreen } from "@/features/watch-party";
import { useTranslation } from "@/foundation/localization";

import { usePlaybackSync } from "../use-playback-sync";
import { useRoomCountdown } from "../use-room-countdown";
import { useRoomPlayback } from "../use-room-playback";
import { useProviderLaunch } from "../use-provider-launch";
import { useRoomReady } from "../use-room-ready";
import { useRoomSetup } from "../use-room-setup";
import { usePoRoomBridge } from "../use-po-room-bridge";
import { useWaitingRoom } from "../use-waiting-room";
import { InviteSummary } from "./invite-summary";
import { MemberList } from "./member-list";
import { MembershipActions } from "./membership-actions";
import { RoomInfoCard } from "./room-info-card";
import { CountdownPanel } from "./countdown-panel";
import { ManualPlayReminder } from "./manual-play-reminder";
import { ReadyConfirmationCard } from "./ready-confirmation-card";
import { RoomSummaryCard } from "./room-summary-card";
import { PlaybackReadinessPanel } from "./playback-readiness-panel";
import { ProviderLaunchPanel } from "./provider-launch-panel";
import { RoomSetupCard } from "./room-setup-card";
import { RoomSyncCard } from "./room-sync-card";
import { SyncHealthCard } from "./sync-health-card";
import { WaitingRoomLayout } from "./waiting-room-layout";

export function WaitingRoom({ roomId }: { roomId: string }) {
  const { t } = useTranslation();
  const model = useWaitingRoom(roomId);
  const setup = useRoomSetup({
    roomId,
    actorProfileId: model.viewer.profileId,
    isHost: model.viewer.isHost,
    onChanged: model.refresh,
  });

  // Sprint 2.5 measures this device's clock; Sprint 2.6 aggregates the room.
  // Both come from the model so there is exactly one source of sync truth.
  const sync = model.clockSync;
  const roomSync = model.roomSync;

  const countdown = useRoomCountdown({
    roomId,
    actorProfileId: model.viewer.profileId,
    isHost: model.viewer.isHost,
    durationSeconds: model.room?.countdownSeconds ?? 5,
    enabled: model.status === "ready" && model.viewer.isMember,
    // Foundation §15 gate, owned by RoomSyncCoordinator.
    assertSyncEligible: roomSync.assertCountdownEligible,
  });

  // Sprint 2.4: reaching zero arms the room. Nothing is launched — everyone
  // simply becomes ready to press play in their own app.
  const playback = useRoomPlayback({
    roomId,
    actorProfileId: model.viewer.profileId,
    isHost: model.viewer.isHost,
    countdownState: countdown.state,
    enabled: model.status === "ready" && model.viewer.isMember,
  });

  // Sprint 2.8 — where to send this member. Local to the viewer: StreamFlow
  // cannot observe whether anyone's provider actually opened.
  const providerLaunch = useProviderLaunch({
    providerId: model.room?.providerId ?? null,
    contentReference: model.room?.contentReference ?? null,
    enabled: model.status === "ready" && model.viewer.isMember,
  });

  // Sprint 2.7 — the third member of the synchronization pipeline. Everything
  // shown below about timing, drift, or readiness is decided in Domain.
  const playbackSync = usePlaybackSync({
    roomId,
    runtime: playback.runtime,
    roomSyncSnapshot: roomSync.snapshot,
    members: model.members,
    presenceByProfileId: model.presenceByProfileId,
    isHost: model.viewer.isHost,
    actorProfileId: model.viewer.profileId,
    enabled: model.status === "ready" && model.viewer.isMember,
  });

  // Sprint 2.9 — the single authority for who is ready and what may follow.
  const ready = useRoomReady({
    roomId,
    members: model.members,
    presenceByProfileId: model.presenceByProfileId,
    viewerProfileId: model.viewer.profileId,
    hasProvider: model.room?.providerId !== null && model.room?.providerId !== undefined,
    launchPending: providerLaunch.status === "launching",
    syncSnapshot: roomSync.snapshot,
    enabled: model.status === "ready" && model.viewer.isMember,
    isConfirming: model.pending === "readiness",
    setReady: model.setReady,
  });

  // Milestone G — voice. Preferences decide whether the call is joined for
  // the member; the transport decides nothing about the room.
  const profile = useProfile(model.viewer.profileId);
  const devicePreferences = useMemo(() => readVoiceDevicePreferences(), []);
  const voice = useVoiceSession({
    roomId,
    profileId: model.viewer.profileId,
    displayName: profile.profile?.displayName ?? t("room.member.you"),
    enabled: model.status === "ready" && model.viewer.isMember,
    autoJoin: profile.settings?.privacy.voiceAutoJoin ?? false,
    joinMuted: profile.settings?.privacy.voiceJoinMuted ?? true,
    inputDeviceId: devicePreferences.inputDeviceId,
    outputDeviceId: devicePreferences.outputDeviceId,
  });

  /**
   * Sprint J.2 — the end of the journey. Once this viewer has left, or the
   * room itself has ended, the call is closed and the person is returned Home.
   * Presence, realtime, sync, and Po are torn down by unmounting this screen;
   * voice is closed explicitly so the microphone never outlives the room.
   */
  const navigate = useNavigate();
  const isOver = model.departed || model.hasEnded;
  const leaveVoice = voice.leave;
  useEffect(() => {
    if (!isOver) return;
    leaveVoice();
    void navigate({ to: "/home" });
  }, [isOver, leaveVoice, navigate]);



  // Per-member voice and clock standing, keyed by profile so the roster can
  // stay a pure renderer.
  const voiceByProfileId = useMemo(() => {
    const map = new Map<string, VoiceIndicatorState>();
    for (const member of voice.members) {
      map.set(
        member.profileId,
        member.isMuted ? "muted" : member.isSpeaking ? "speaking" : "listening",
      );
    }
    return map;
  }, [voice.members]);

  const syncByProfileId = useMemo(() => {
    const map = new Map<string, SyncHealth>();
    for (const participant of roomSync.snapshot?.participants ?? []) {
      map.set(participant.profileId, participant.health);
    }
    return map;
  }, [roomSync.snapshot]);

  // Milestone H1 — publish the live lobby so Po acts through this screen's
  // existing orchestration. Values only; every decision stays where it is.
  usePoRoomBridge(
    model.room && model.viewer.isMember
      ? {
          roomId,
          roomCode: model.room.code,
          roomName: model.room.name,
          isHost: model.viewer.isHost,
          isMember: model.viewer.isMember,
          isReady: model.viewer.isReady,
          providerId: model.room.providerId ?? null,
          memberCount: model.members.length,
          readyCount: ready.snapshot?.readyCount ?? 0,
          countdownSeconds: model.room.countdownSeconds,
          countdownState: countdown.state,
          canStartCountdown: roomSync.canStartCountdown,
          syncHealth: roomSync.snapshot?.health ?? "unknown",
          voice: {
            isAvailable: voice.isAvailable,
            isConnected: voice.isConnected,
            isMuted: voice.isMuted,
          },
          actions: {
            startCountdown: countdown.start,
            cancelCountdown: countdown.cancel,
            setReady: model.setReady,
            remeasureSync: sync.remeasure,
            joinVoice: voice.join,
            leaveVoice: voice.leave,
            setMuted: voice.setMuted,
            leaveRoom: model.leave,
          },
        }
      : null,
  );

  if (model.status === "loading") {
    return (
      <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
        <LoadingState label={t("room.waiting_room.loading")} />
        <div aria-hidden="true" className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    );
  }

  if (model.status === "error" || !model.room) {
    return (
      <ErrorState
        code={model.error?.code ?? "SF-SYS-UNEXPECTED"}
        messageKey={model.error?.messageKey ?? "error.sys.unexpected"}
        onRetry={model.refresh}
      />
    );
  }

  const room = model.room;
  // Readiness and seat availability are Domain answers; this screen only
  // forwards them (Milestone D.5).
  const readySnapshot = ready.snapshot;

  // Milestone G — the countdown is over and the room has an anchor: this is a
  // watch party now, not a lobby. The transition is a screen swap, not a
  // route change, so voice and presence are never torn down.
  if (playback.runtime?.startedAt && playback.runtime.state !== "completed") {
    return (
      <WatchPartyScreen
        room={room}
        members={model.members}
        providerName={providerLaunch.plan?.providerKey ?? room.providerId}
        startedAt={playback.runtime.startedAt}
        clockOffsetMs={sync.snapshot?.offset?.offsetMs ?? 0}
        voice={voice}
        playbackSync={playbackSync}
        clockSync={sync}
        voiceByProfileId={voiceByProfileId}
        syncByProfileId={syncByProfileId}
        onLeave={model.leave}
        isLeaving={model.pending === "leave"}
      />
    );
  }

  return (
    <WaitingRoomLayout
      header={
        <header>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            {t("room.waiting_room.eyebrow")}
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
            {t("room.waiting_room.title")}
          </h1>
        </header>
      }
      primary={
        <>
          <PoWaitingBanner
            allReady={readySnapshot?.everyoneReady ?? false}
            isBusy={setup.pending !== null || model.pending !== null}
            hasProvider={model.room?.providerId !== null}
            isCounting={countdown.isLive}
            hasCompleted={countdown.state === "completed"}
            wasCancelled={countdown.state === "cancelled" || countdown.state === "expired"}
            isPlaybackReady={playback.isReady}
            isSyncing={sync.isAvailable && sync.health === "unknown"}
            isSyncSatisfied={sync.isSatisfactory}
            isRoomOutOfSync={roomSync.needsResync}
            hasRoomRecovered={roomSync.justRecovered}
            needsSyncEncouragement={playbackSync.needsEncouragement}
            isSynchronizationReady={playbackSync.justBecameReady}
            someoneBecameReady={(readySnapshot?.readyCount ?? 0) > 0}
            isEveryoneReady={readySnapshot?.everyoneReady ?? false}
            isWaitingForMembers={(readySnapshot?.waitingCount ?? 0) > 0}
            gazeToken={model.lastArrivalProfileId}
          />
          <RoomInfoCard room={room} isLive={model.isLive} />
          <ManualPlayReminder
            isDue={readySnapshot?.manualPlayReminderDue ?? false}
            hasCountdownFinished={countdown.state === "completed"}
          />
          <RoomSummaryCard
            ready={ready}
            sync={roomSync}
            members={model.members}
            providerId={room.providerId}
            isHost={model.viewer.isHost}
          />
          <CountdownPanel
            countdown={countdown}
            isHost={model.viewer.isHost}
            members={model.members}
            hasProvider={room.providerId !== null}
            canStartCountdown={
              roomSync.canStartCountdown && (readySnapshot?.countdownAvailable ?? false)
            }
            blockReasonKey={roomSync.blockReasonKey}
            hasSyncAdvisory={roomSync.hasAdvisory}
          />
          <ProviderLaunchPanel model={providerLaunch} />
          <PlaybackReadinessPanel
            playback={playback}
            members={model.members}
            countdownCompleted={countdown.state === "completed"}
            sync={playbackSync}
          />
          <RoomSyncCard
            sync={roomSync}
            isHost={model.viewer.isHost}
            readyCount={readySnapshot?.readyCount ?? 0}
            waitingCount={readySnapshot?.waitingCount ?? 0}
          />
          <SyncHealthCard sync={sync} />
          <MemberList
            members={model.members}
            readyCount={readySnapshot?.readyCount ?? 0}
            readyTotal={readySnapshot?.participantCount ?? 0}
            voiceByProfileId={voiceByProfileId}
            syncByProfileId={syncByProfileId}
          />
          <RoomSetupCard
            setup={setup}
            isHost={model.viewer.isHost}
            selectedProviderId={room.providerId}
            countdownSeconds={room.countdownSeconds}
          />
        </>
      }
      secondary={
        <>
          <VoicePanel voice={voice} />
          <ReadyConfirmationCard ready={ready} />
          <MembershipActions
            viewer={model.viewer}
            pending={model.pending}
            canJoin={model.viewer.canJoin}
            onJoin={model.join}
            onLeave={model.leave}
          />
          <InviteSummary pendingInviteCount={room.pendingInviteCount} roomCode={room.code} />
        </>
      }
    />
  );
}
