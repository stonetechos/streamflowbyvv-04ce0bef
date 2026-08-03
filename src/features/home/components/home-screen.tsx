/**
 * Home screen — Milestone E.
 *
 * The signed-in landing surface. It composes rails whose contents were all
 * decided elsewhere: `HomeReadModel` chose which room is resumable and which
 * invites are pending, `ProviderCatalogService` chose which services may be
 * offered. This component arranges them and nothing more.
 */
import { ActionButton, EmptyState, SectionHeader } from "@/design-system/components";
import { InviteCard } from "@/features/invitations";
import { PoCompanion } from "@/features/po";
import { HomeSocialRails, useSocial } from "@/features/social";
import { useTranslation } from "@/foundation/localization";

import type { HomeModel } from "../use-home";
import { ContinueWatchingCard } from "./continue-watching-card";
import { HomeHero } from "./home-hero";
import { UpcomingPartiesPlaceholder } from "./home-placeholders";
import { HomeSkeleton } from "./home-skeleton";
import { ProvidersSection } from "./providers-section";
import { RoomEntryCards } from "./room-entry-cards";
import { RoomListSection } from "./room-list-section";

export interface HomeScreenProps {
  readonly home: HomeModel;
  readonly displayName: string;
  readonly profileId: string | null;
}

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

  return (
    <div className="mx-auto w-full max-w-6xl space-y-10 px-4 py-8 pb-28 sm:px-6 md:pb-12">
      <HomeHero
        displayName={displayName}
        isFirstTime={snapshot.isFirstTime}
        hostedRoomCount={snapshot.hostedRoomCount}
        mood={snapshot.continueRoom ? "happy" : "calm"}
      />

      {!home.isAvailable ? (
        <EmptyState
          title={t("home.unavailable.title")}
          description={t("home.unavailable.description")}
          illustration={<PoCompanion mood="waiting" className="h-24 w-36" />}
        />
      ) : null}

      {snapshot.continueRoom ? <ContinueWatchingCard summary={snapshot.continueRoom} /> : null}

      <RoomEntryCards home={home} />

      {snapshot.pendingInvites.length > 0 ? (
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
      ) : null}

      <RoomListSection
        title={t("home.live.title")}
        description={t("home.live.description")}
        rooms={snapshot.liveRooms}
        emptyTitle={t("home.live.empty.title")}
        emptyDescription={t("home.live.empty.description")}
        action={
          <ActionButton size="sm" tone="ghost" onClick={home.refresh}>
            {t("common.action.refresh")}
          </ActionButton>
        }
      />

      <ProvidersSection profileId={profileId} />

      <RoomListSection
        title={t("home.recent.title")}
        description={t("home.recent.description")}
        rooms={snapshot.recentRooms}
        emptyTitle={t("home.recent.empty.title")}
        emptyDescription={t("home.recent.empty.description")}
      />

      <HomeSocialRails social={social} {...(onInvite ? { onInvite } : {})} />

      <UpcomingPartiesPlaceholder />
    </div>
  );
}
