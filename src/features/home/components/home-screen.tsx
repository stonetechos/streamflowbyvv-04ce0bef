/**
 * Home screen — UX Simplification Pass.
 *
 * Four things, in the order a person thinks about them: what shall we watch,
 * where were we, who is around, and where have we been. Nothing else lives on
 * this screen — the machinery it used to expose is either gone from the
 * default view or reachable from its own destination.
 */
import { memo, useEffect, useState, type ReactNode } from "react";

import { claimRoomEndedNotice } from "@/features/shared/room-ended-notice";
import { useSocial } from "@/features/social";
import { useTranslation } from "@/foundation/localization";

import type { HomeModel } from "../use-home";
import { ContinueWatchingCard } from "./continue-watching-card";
import { FriendsRail } from "./friends-rail";
import { HomeHero } from "./home-hero";
import { HomeSkeleton } from "./home-skeleton";
import { JoinByCodeCard } from "./join-by-code-card";
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
  const [joining, setJoining] = useState(false);

  // The watch party ended while this person was in it; Home says so once.
  const [endedNotice, setEndedNotice] = useState(false);
  useEffect(() => {
    if (claimRoomEndedNotice()) setEndedNotice(true);
  }, []);



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
    <div
      data-sf-screen="home"
      className="mx-auto w-full max-w-6xl space-y-10 px-4 py-8 pb-32 sm:px-6 lg:py-12 md:pb-12"
    >
      {endedNotice ? (
        <div
          role="status"
          className="flex items-center justify-between gap-4 rounded-xl border border-border bg-muted/60 px-4 py-3 text-sm"
        >
          <span>{t("home.notice.room_ended")}</span>
          <button
            type="button"
            onClick={() => setEndedNotice(false)}
            className="min-h-9 rounded-lg px-3 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            {t("common.action.dismiss")}
          </button>
        </div>
      ) : null}

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

      {snapshot.continueRoom ? (
        <Rail index={2}>
          <ContinueWatchingCard summary={snapshot.continueRoom} />
        </Rail>
      ) : null}

      <Rail index={3}>
        <FriendsRail social={social} />
      </Rail>

      <Rail index={4}>
        <RoomListSection
          title={t("home.recent.title")}
          rooms={snapshot.recentRooms}
          emptyTitle={t("home.recent.empty.title")}
          emptyDescription={t("home.recent.empty.description")}
        />
      </Rail>

      {/* A quiet way in for someone who was handed a code. */}
      <Rail index={5}>
        {joining ? (
          <JoinByCodeCard home={home} />
        ) : (
          <button
            type="button"
            onClick={() => setJoining(true)}
            className="mx-auto flex min-h-11 items-center justify-center rounded-full px-4 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {t("home.join.prompt")}
          </button>
        )}
      </Rail>
    </div>
  );
}
