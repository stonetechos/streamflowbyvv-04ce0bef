/**
 * Home screen — Milestone H2 (product experience).
 *
 * The signed-in landing surface, ordered the way a viewer thinks: the question
 * first, then where they watch, then who they watch with, then the machinery.
 * Room creation is no longer a headline — choosing a service creates the room.
 *
 * Everything shown here was decided elsewhere: `HomeReadModel` chose the rooms
 * and invitations, `ProviderCatalogService` chose the services. This component
 * arranges them and nothing more.
 */
import { memo, type ReactNode } from "react";

import { ActionButton, SectionHeader } from "@/design-system/components";
import { InviteCard } from "@/features/invitations";
import { HomeSocialRails, useSocial } from "@/features/social";
import { useTranslation } from "@/foundation/localization";

import type { HomeModel } from "../use-home";
import { ContinueWatchingCard } from "./continue-watching-card";
import { HomeHero } from "./home-hero";
import { HomeQuickSettings } from "./home-quick-settings";
import { HomeSkeleton } from "./home-skeleton";
import { JoinByCodeCard } from "./join-by-code-card";
import { LivePartiesSection } from "./live-parties-section";
import { RoomListSection } from "./room-list-section";
import { ServiceShelf } from "./service-shelf";

export interface HomeScreenProps {
  readonly home: HomeModel;
  readonly displayName: string;
  readonly profileId: string | null;
}

/** One vertical rail. Purely presentational; carries the stagger index. */
const Rail = memo(function Rail({ index, children }: { index: number; children: ReactNode }) {
  return (
    <div className="sf-rail-enter" style={{ ["--sf-rail-index" as string]: index }}>
      {children}
    </div>
  );
});

export function HomeScreen({ home, displayName, profileId }: HomeScreenProps) {
  const { t } = useTranslation();
  const { snapshot } = home;
  const social = useSocial(profileId);

  // Quick invite is only offered when there is somewhere to invite people to.
  const quickInviteRoomId = snapshot.continueRoom?.room.id ?? null;
  const onInvite = quickInviteRoomId
    ? (inviteeProfileId: string) => void home.inviteToRoom(quickInviteRoomId, inviteeProfileId)
    : undefined;

  if (home.isLoading) {
    return (
      <div
        className="mx-auto w-full max-w-6xl px-4 py-8 pb-28 sm:px-6 md:pb-12"
        role="status"
        aria-label={t("common.state.loading")}
      >
        <HomeSkeleton />
      </div>
    );
  }

  // Po speaks only in gentle observations, and only about what is on screen.
  const friendCount = social.overview.friends.length;
  const poLine = snapshot.continueRoom
    ? t("home.po.resume")
    : friendCount > 0
      ? t("home.po.friends", { count: friendCount })
      : t("home.po.idle");

  return (
    <div className="mx-auto w-full max-w-6xl space-y-10 px-4 py-8 pb-32 sm:px-6 lg:py-12 md:pb-12">
      <Rail index={0}>
        <HomeHero
          displayName={displayName}
          isFirstTime={snapshot.isFirstTime}
          hostedRoomCount={snapshot.hostedRoomCount}
          mood={snapshot.continueRoom ? "happy" : "calm"}
          poLine={poLine}
        />
      </Rail>

      <Rail index={1}>
        <ServiceShelf home={home} profileId={profileId} />
      </Rail>

      <Rail index={2}>
        <JoinByCodeCard home={home} />
      </Rail>

      {snapshot.continueRoom ? (
        <Rail index={3}>
          <ContinueWatchingCard summary={snapshot.continueRoom} />
        </Rail>
      ) : null}

      <Rail index={4}>
        <HomeSocialRails social={social} {...(onInvite ? { onInvite } : {})} />
      </Rail>

      <Rail index={5}>
        <LivePartiesSection
          rooms={snapshot.liveRooms}
          action={
            <ActionButton size="sm" tone="ghost" onClick={home.refresh}>
              {t("common.action.refresh")}
            </ActionButton>
          }
        />
      </Rail>

      <Rail index={6}>
        <RoomListSection
          title={t("home.recent.title")}
          description={t("home.recent.description")}
          rooms={snapshot.recentRooms}
          emptyTitle={t("home.recent.empty.title")}
          emptyDescription={t("home.recent.empty.description")}
        />
      </Rail>

      {snapshot.pendingInvites.length > 0 ? (
        <Rail index={7}>
          <section className="space-y-4">
            <SectionHeader
              title={t("home.invites.title")}
              description={t("home.invites.description")}
            />
            <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {snapshot.pendingInvites.map((summary) => (
                <li key={summary.invite.id}>
                  <InviteCard
                    summary={summary}
                    busy={home.pendingInviteId === summary.invite.id}
                    onAccept={(id) => void home.acceptInvite(id)}
                    onDecline={(id) => void home.declineInvite(id)}
                  />
                </li>
              ))}
            </ul>
          </section>
        </Rail>
      ) : null}

      <Rail index={8}>
        <HomeQuickSettings />
      </Rail>
    </div>
  );
}
