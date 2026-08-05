/**
 * Waiting Room screen — Sprint 2.0.
 *
 * Composes the lobby from the hook's model and resolves loading, error, and
 * empty states in one place so no child has to know about them.
 */
import { useEffect, useMemo } from "react";
import { useNavigate } from "@tanstack/react-router";

import { ErrorState, LoadingState } from "@/app-shell";
import type { SyncHealth } from "@/domain";
import { Skeleton } from "@/components/ui/skeleton";
import { serviceBrandName } from "@/features/home";
import { PoWaitingBanner } from "@/features/po";
import { useProfile } from "@/features/profiles";
import { markRoomEnded } from "@/features/shared/room-ended-notice";
import {
  readVoiceDevicePreferences,
  useVoiceSession,
  VoiceDock,
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
import { CountdownOverlay } from "./countdown-overlay";
import { InviteFriends } from "./invite-friends";
import { ManualPlayReminder } from "./manual-play-reminder";
import { MemberStrip } from "./member-strip";
import { ReadyConfirmationCard } from "./ready-confirmation-card";
import { RoomDetails } from "./room-details";
import { RoomStage } from "./room-stage";
import { RoomSummaryCard } from "./room-summary-card";
import { PlaybackReadinessPanel } from "./playback-readiness-panel";
import { ProviderLaunchPanel } from "./provider-launch-panel";
import { ProviderSessionCard } from "./provider-session-card";
import { RoomSetupCard } from "./room-setup-card";
import { RoomSyncCard } from "./room-sync-card";
import { SyncHealthCard } from "./sync-health-card";

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
  const roomHasEnded = model.hasEnded;
  const leaveVoice = voice.leave;
  useEffect(() => {
    if (!isOver) return;
    leaveVoice();
    // The room ending is news; leaving voluntarily is not.
    if (roomHasEnded) markRoomEnded();
    void navigate({ to: "/home" });
  }, [isOver, leaveVoice, navigate, roomHasEnded]);

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

  // Watch Party Engine v2.0 — when the countdown lands, the call opens itself.
  // Nobody should have to find a microphone button while the film starts. It
  // is attempted once per transition and never retried over an error.
  const isWatching =
    Boolean(playback.runtime?.startedAt) && playback.runtime?.state !== "completed";
  const joinVoice = voice.join;
  const canAutoJoinVoice =
    isWatching &&
    voice.isAvailable &&
    !voice.isConnected &&
    !voice.isConnecting &&
    voice.error === null;
  useEffect(() => {
    if (!canAutoJoinVoice) return;
    joinVoice();
  }, [canAutoJoinVoice, joinVoice]);

  // Milestone G — the countdown is over and the room has an anchor: this is a
  // watch party now, not a lobby. The transition is a screen swap, not a
  // route change, so voice and presence are never torn down.
  if (playback.runtime?.startedAt && playback.runtime.state !== "completed") {
    return (
      <WatchPartyScreen
        room={room}
        members={model.members}
        providerName={
          serviceBrandName(providerLaunch.plan?.providerKey) ??
          providerLaunch.plan?.providerKey ??
          room.providerId
        }
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

  const providerKey = providerLaunch.plan?.providerKey ?? null;
  const providerName = serviceBrandName(providerKey) ?? providerKey ?? room.providerId;
  const hostLabel = model.members.find((member) => member.isHost)?.label ?? null;
  const isCountingDown = countdown.state === "counting_down" || countdown.state === "preparing";

  // The room disappears while the countdown runs: three numbers, one line.
  if (isCountingDown) {
    return <CountdownOverlay seconds={countdown.remainingSeconds} providerName={providerName} />;
  }

  const canStart = roomSync.canStartCountdown && (readySnapshot?.countdownAvailable ?? false);

  // The lobby is a journey, not a dashboard. Exactly one stage is on screen at
  // a time, and each stage asks for exactly one thing. Nothing here decides
  // anything new — the stage is read off state the coordinators already own.
  const presentMembers = model.members.filter((member) => member.state !== "left");
  const joinedCount = presentMembers.length;
  const seatTotal = Math.min(room.capacity, 4);
  const stage: "invite" | "waiting" | "ready" =
    joinedCount <= 1 ? "invite" : canStart ? "ready" : "waiting";

  const guideLine =
    stage === "invite"
      ? t("room.journey.po.invite")
      : stage === "ready"
        ? t("room.journey.po.ready")
        : t("room.journey.po.waiting");

  return (
    <>
      <section
        aria-label={t("room.waiting_room.region_label")}
        data-sf-screen="waiting-room"
        data-sf-stage={stage}
        data-sf-live={model.isLive ? "true" : "false"}
        data-sf-room-code={room.code}
        data-sf-joined={joinedCount}
        data-sf-ready-count={readySnapshot?.readyCount ?? 0}
        data-sf-viewer-ready={model.viewer.isReady ? "true" : "false"}
        data-sf-can-start={canStart ? "true" : "false"}
        className="sf-screen-enter mx-auto w-full max-w-xl space-y-8 px-4 py-6 pb-48 sm:px-6 md:pb-36"
      >
        <RoomStage
          room={room}
          providerName={providerName}
          providerKey={providerKey}
          hostLabel={hostLabel}
        />

        {/* One stage, one instruction. */}
        <div className="space-y-6 text-center">
          <h2 className="text-balance font-display text-xl font-semibold tracking-tight sm:text-2xl">
            {stage === "invite"
              ? t("room.journey.invite.title")
              : stage === "ready"
                ? t("room.journey.ready.title")
                : t("room.journey.waiting.title")}
          </h2>

          {stage === "invite" ? (
            <InviteFriends roomName={room.name} roomCode={room.code} />
          ) : (
            <>
              <MemberStrip members={model.members} capacity={room.capacity} />
              <p className="text-sm font-medium text-muted-foreground">
                {t("room.journey.progress", { joined: joinedCount, total: seatTotal })}
              </p>
            </>
          )}

          {stage === "ready" ? (
            model.viewer.isHost ? (
              <button
                type="button"
                onClick={countdown.start}
                disabled={!countdown.isAvailable || countdown.pending !== null}
                className="flex min-h-14 w-full items-center justify-center rounded-2xl bg-primary text-base font-semibold text-primary-foreground shadow-e2 transition-[transform,background-color] duration-normal ease-standard hover:bg-primary/90 active:scale-[0.99] disabled:opacity-50 motion-reduce:transform-none"
              >
                {t("room.countdown.action.start")}
              </button>
            ) : (
              <p className="text-sm text-muted-foreground">{t("room.countdown.guest_hint")}</p>
            )
          ) : null}

          {stage === "waiting" ? <ReadyConfirmationCard ready={ready} /> : null}

          {stage !== "invite" ? (
            <div className="flex justify-center">
              <InviteFriends roomName={room.name} roomCode={room.code} />
            </div>
          ) : null}
        </div>

        <PoWaitingBanner
          allReady={readySnapshot?.everyoneReady ?? false}
          isBusy={setup.pending !== null || model.pending !== null}
          hasProvider={model.room?.providerId !== null}
          isCounting={countdown.isLive}
          hasCompleted={countdown.state === "completed"}
          wasCancelled={countdown.state === "cancelled" || countdown.state === "expired"}
          isPlaybackReady={playback.isReady}
          isSyncing={false}
          isSyncSatisfied={sync.isSatisfactory}
          isRoomOutOfSync={false}
          hasRoomRecovered={roomSync.justRecovered}
          needsSyncEncouragement={false}
          isSynchronizationReady={playbackSync.justBecameReady}
          someoneBecameReady={(readySnapshot?.readyCount ?? 0) > 0}
          isEveryoneReady={readySnapshot?.everyoneReady ?? false}
          isWaitingForMembers={(readySnapshot?.waitingCount ?? 0) > 0}
          gazeToken={model.lastArrivalProfileId}
        />
        <p className="text-center text-sm text-muted-foreground" aria-live="polite">
          {guideLine}
        </p>

        {model.viewer.canJoin ? (
          <MembershipActions
            viewer={model.viewer}
            pending={model.pending}
            canJoin={model.viewer.canJoin}
            onJoin={model.join}
            onLeave={model.leave}
          />
        ) : null}

        <RoomDetails>
          <RoomInfoCard room={room} isLive={model.isLive} />
          <ProviderSessionCard
            room={room}
            providerName={providerName}
            hostLabel={hostLabel}
            supportsDeepLink={(providerLaunch.plan?.primaryTarget ?? null) !== null}
          />
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
            canStartCountdown={canStart}
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
          <InviteSummary pendingInviteCount={room.pendingInviteCount} roomCode={room.code} />
        </RoomDetails>
      </section>

      <VoiceDock voice={voice} onLeaveRoom={model.leave} isLeaving={model.pending === "leave"} />
    </>
  );
}
