/**
 * Home screen — Milestone E, integrated in Milestone G.5.
 *
 * The signed-in landing surface. It composes rails whose contents were all
 * decided elsewhere: `HomeReadModel` chose which room is resumable and which
 * invites are pending, `ProviderCatalogService` chose which services may be
 * offered. This component arranges them and nothing more.
 *
 * The order is fixed by the consumer specification: continue watching,
 * invitations, rooms, friends, providers, settings. Each rail rises into place
 * in that same reading order.
 */
import { memo, type ReactNode } from "react";

import { ActionButton, EmptyState, SectionHeader } from "@/design-system/components";
import { InviteCard } from "@/features/invitations";
import { PoCompanion } from "@/features/po";
import { HomeSocialRails, useSocial } from "@/features/social";
import { useTranslation } from "@/foundation/localization";

import type { HomeModel } from "../use-home";
import { ContinueWatchingCard } from "./continue-watching-card";
import { HomeHero } from "./home-hero";
import { HomeQuickSettings } from "./home-quick-settings";
import { HomeSkeleton } from "./home-skeleton";
import { ProvidersSection } from "./providers-section";
import { RoomEntryCards } from "./room-entry-cards";
import { RoomListSection } from "./room-list-section";

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

  return (
    <div className="mx-auto w-full max-w-6xl space-y-10 px-4 py-8 pb-28 sm:px-6 lg:py-12 md:pb-12">
      <Rail index={0}>
        <HomeHero
          displayName={displayName}
          isFirstTime={snapshot.isFirstTime}
          hostedRoomCount={snapshot.hostedRoomCount}
          mood={snapshot.continueRoom ? "happy" : "calm"}
        />
      </Rail>

      {!home.isAvailable ? (
        <EmptyState
          title={t("home.unavailable.title")}
          description={t("home.unavailable.description")}
          illustration={<PoCompanion mood="waiting" className="h-24 w-36" />}
        />
      ) : null}

      {snapshot.continueRoom ? (
        <Rail index={1}>
          <ContinueWatchingCard summary={snapshot.continueRoom} />
        </Rail>
      ) : null}

      <Rail index={2}>
        <RoomEntryCards home={home} />
      </Rail>

      {snapshot.pendingInvites.length > 0 ? (
        <Rail index={3}>
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

      <Rail index={4}>
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
      </Rail>

      <Rail index={5}>
        <RoomListSection
          title={t("home.recent.title")}
          description={t("home.recent.description")}
          rooms={snapshot.recentRooms}
          emptyTitle={t("home.recent.empty.title")}
          emptyDescription={t("home.recent.empty.description")}
        />
      </Rail>

      <Rail index={6}>
        <HomeSocialRails social={social} {...(onInvite ? { onInvite } : {})} />
      </Rail>

      <Rail index={7}>
        <ProvidersSection profileId={profileId} />
      </Rail>

      <Rail index={8}>
        <HomeQuickSettings />
      </Rail>
    </div>
  );
}
