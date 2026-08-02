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

import { useRoomCountdown } from "../use-room-countdown";
import { useRoomSetup } from "../use-room-setup";
import { useWaitingRoom } from "../use-waiting-room";
import { InviteSummary } from "./invite-summary";
import { MemberList } from "./member-list";
import { MembershipActions } from "./membership-actions";
import { RoomInfoCard } from "./room-info-card";
import { CountdownPanel } from "./countdown-panel";
import { RoomSetupCard } from "./room-setup-card";
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

  const countdown = useRoomCountdown({
    roomId,
    actorProfileId: model.viewer.profileId,
    isHost: model.viewer.isHost,
    durationSeconds: model.room?.countdownSeconds ?? 5,
    enabled: model.status === "ready" && model.viewer.isMember,
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
            gazeToken={model.lastArrivalProfileId}
          />
          <RoomInfoCard room={room} isLive={model.isLive} />
          <CountdownPanel
            countdown={countdown}
            isHost={model.viewer.isHost}
            members={model.members}
            hasProvider={room.providerId !== null}
          />
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
          <MembershipActions
            viewer={model.viewer}
            pending={model.pending}
            canJoin={canJoin}
            onJoin={model.join}
            onLeave={model.leave}
            onReadyChange={model.setReady}
          />
          <InviteSummary pendingInviteCount={room.pendingInviteCount} roomCode={room.code} />
        </>
      }
    />
  );
}
