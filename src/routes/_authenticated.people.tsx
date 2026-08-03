import { createFileRoute } from "@tanstack/react-router";

import { EmptyState, SectionHeader } from "@/design-system/components";
import { useAuth } from "@/features/auth";
import { FriendLists, UserSearchPanel, useSocial, useUserSearch } from "@/features/social";
import { useTranslation } from "@/foundation/localization";

/**
 * People — Milestone F.0.
 *
 * Search the directory, answer requests, and see the friend graph. Every rule
 * about who may be found and what may be done to whom belongs to
 * `SocialService`; this route supplies identity and nothing else.
 */
export const Route = createFileRoute("/_authenticated/people")({
  head: () => ({
    meta: [
      { title: "People — StreamFlow" },
      {
        name: "description",
        content:
          "Find the people you watch with, answer friend requests, and manage who can reach you on StreamFlow.",
      },
      { property: "og:title", content: "People — StreamFlow" },
      {
        property: "og:description",
        content: "Your friends, requests and recent watch partners in one place.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PeopleRoute,
});

function PeopleRoute() {
  const { t } = useTranslation();
  const auth = useAuth();
  const viewerProfileId = auth.session?.identity.profileId ?? null;
  const social = useSocial(viewerProfileId);
  const search = useUserSearch(viewerProfileId);

  return (
    <div className="mx-auto w-full max-w-4xl space-y-10 px-4 py-8 pb-28 sm:px-6 md:pb-12">
      <SectionHeader title={t("social.title")} description={t("social.description")} />

      {social.isAvailable ? (
        <>
          <UserSearchPanel search={search} social={social} />
          <FriendLists social={social} />
        </>
      ) : (
        <EmptyState
          title={t("social.unavailable.title")}
          description={t("social.unavailable.description")}
        />
      )}
    </div>
  );
}
