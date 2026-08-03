import { createFileRoute, useParams } from "@tanstack/react-router";

import { Avatar, EmptyState, Surface, presetForName } from "@/design-system/components";
import { useAuth } from "@/features/auth";
import { FriendActions, useSocial, usePublicProfile } from "@/features/social";
import { useTranslation } from "@/foundation/localization";

/**
 * Public profile — Milestone F.0.
 *
 * What one member may see of another: name, handle, profile code, bio, and the
 * actions their standing allows. A profile hidden by a block simply does not
 * resolve — the viewer is never told a block exists.
 */
export const Route = createFileRoute("/_authenticated/people/$profileId")({
  head: () => ({
    meta: [
      { title: "Profile — StreamFlow" },
      { name: "description", content: "A StreamFlow member profile." },
      { property: "og:title", content: "Profile — StreamFlow" },
      { property: "og:description", content: "A StreamFlow member profile." },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PublicProfileRoute,
});

function PublicProfileRoute() {
  const { t } = useTranslation();
  const { profileId } = useParams({ from: "/_authenticated/people/$profileId" });
  const auth = useAuth();
  const viewerProfileId = auth.session?.identity.profileId ?? null;
  const social = useSocial(viewerProfileId);
  const profile = usePublicProfile(profileId);

  if (profile.isLoading) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-10" role="status">
        <p className="text-sm text-muted-foreground">{t("social.profile.loading")}</p>
      </div>
    );
  }

  if (!profile.profile) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-10">
        <EmptyState
          title={t("social.profile.missing.title")}
          description={t("social.profile.missing.description")}
        />
      </div>
    );
  }

  const person = profile.profile;
  const isSelf = person.id === viewerProfileId;

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 px-4 py-8 pb-28 sm:px-6 md:pb-12">
      <Surface padding="lg" as="section">
        <div className="flex items-start gap-4">
          <Avatar name={person.displayName} preset={presetForName(person.displayName)} size="lg" />
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-2xl font-semibold tracking-tight">
              {person.displayName}
            </h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {person.handle ? `@${person.handle}` : person.code}
            </p>
            {person.bio ? <p className="mt-3 text-sm leading-relaxed">{person.bio}</p> : null}
          </div>
        </div>

        {isSelf ? null : (
          <div className="mt-6 flex flex-wrap items-center gap-2">
            <FriendActions
              relationship={social.relationshipWith(person.id)}
              busy={social.pendingProfileId === person.id}
              onSendRequest={() => void social.sendRequest(person.id)}
              onAccept={(id) => void social.acceptRequest(id, person.id)}
              onDecline={(id) => void social.declineRequest(id, person.id)}
              onCancel={(id) => void social.cancelRequest(id, person.id)}
              onRemove={(id) => void social.removeFriend(id, person.id)}
              onBlock={() => void social.blockProfile(person.id)}
              onUnblock={() => void social.unblockProfile(person.id)}
            />
          </div>
        )}
      </Surface>
    </div>
  );
}
