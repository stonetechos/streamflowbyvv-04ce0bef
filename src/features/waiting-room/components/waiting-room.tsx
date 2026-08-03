/**
 * Waiting Room screen — Sprint 2.0.
 *
 * Composes the lobby from the hook's model and resolves loading, error, and
 * empty states in one place so no child has to know about them.
 */
import { ErrorState, LoadingState } from "@/app-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { PoWaitingBanner } from "@/features/po";
import { useTranslation } from "@/foundation/localization";

import { usePlaybackSync } from "../use-playback-sync";
import { useRoomCountdown } from "../use-room-countdown";
import { useRoomPlayback } from "../use-room-playback";
import { useProviderLaunch } from "../use-provider-launch";
import { useRoomReady } from "../use-room-ready";
import { useRoomSetup } from "../use-room-setup";
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
  const canJoin = room.status === "lobby" && room.joinedCount < room.capacity;

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
            allReady={model.allReady}
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
            someoneBecameReady={(ready.snapshot?.readyCount ?? 0) > 0}
            isEveryoneReady={ready.snapshot?.everyoneReady ?? false}
            isWaitingForMembers={(ready.snapshot?.waitingCount ?? 0) > 0}
            gazeToken={model.lastArrivalProfileId}
          />
          <RoomInfoCard room={room} isLive={model.isLive} />
          <ManualPlayReminder
            isDue={ready.snapshot?.manualPlayReminderDue ?? false}
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
            canStartCountdown={roomSync.canStartCountdown && (ready.snapshot?.countdownAvailable ?? false)}
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
          <RoomSyncCard sync={roomSync} isHost={model.viewer.isHost} />
          <SyncHealthCard sync={sync} />
          <MemberList members={model.members} />
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
          <ReadyConfirmationCard ready={ready} />
          <MembershipActions
            viewer={model.viewer}
            pending={model.pending}
            canJoin={canJoin}
            onJoin={model.join}
            onLeave={model.leave}
          />
          <InviteSummary pendingInviteCount={room.pendingInviteCount} roomCode={room.code} />
        </>
      }
    />
  );
}
