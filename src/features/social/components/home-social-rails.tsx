/**
 * Home social rails — Milestone F.0.
 *
 * The compact social presence on Home: friends, invitations waiting for an
 * answer, and the people most recently watched with. Nothing here is a second
 * copy of the friends screen — it is the shortest path to the two actions
 * Home exists for, entering a room and inviting someone into one.
 */
import { Link } from "@tanstack/react-router";

import { ActionButton, SectionHeader, Surface } from "@/design-system/components";
import { useTranslation } from "@/foundation/localization";

import type { SocialModel } from "../use-social";
import { FriendActions } from "./friend-actions";
import { PersonRow } from "./person-row";
import { RecentPartnersRail } from "./recent-partners-rail";

export interface HomeSocialRailsProps {
  readonly social: SocialModel;
  readonly onInvite?: ((profileId: string) => void) | undefined;
}

export function HomeSocialRails({ social, onInvite }: HomeSocialRailsProps) {
  const { t } = useTranslation();
  const { overview } = social;

  if (!social.isAvailable) return null;

  const incoming = overview.incomingRequests.slice(0, 3);
  const friends = overview.friends.slice(0, 4);

  return (
    <div className="space-y-8">
      {incoming.length > 0 ? (
        <section className="space-y-4" aria-labelledby="home-requests-heading">
          <SectionHeader
            as="h3"
            title={t("social.requests.incoming.title")}
            description={t("social.requests.incoming.description")}
          />
          <Surface padding="none" as="ul" className="divide-y divide-border overflow-hidden">
            {incoming.map((person) => (
              <li key={person.profileId}>
                <PersonRow
                  profileId={person.profileId}
                  displayName={person.displayName}
                  handle={person.handle}
                  code={person.code}
                  avatarPreset={person.avatarPreset}
                  actions={
                    <FriendActions
                      compact
                      relationship={social.relationshipWith(person.profileId)}
                      busy={social.pendingProfileId === person.profileId}
                      onSendRequest={() => void social.sendRequest(person.profileId)}
                      onAccept={(id) => void social.acceptRequest(id, person.profileId)}
                      onDecline={(id) => void social.declineRequest(id, person.profileId)}
                      onCancel={(id) => void social.cancelRequest(id, person.profileId)}
                    />
                  }
                />
              </li>
            ))}
          </Surface>
        </section>
      ) : null}

      <section className="space-y-4" aria-labelledby="home-friends-heading">
        <SectionHeader
          as="h3"
          title={t("social.friends.title")}
          description={t("social.friends.description")}
          action={
            <Link
              to="/people"
              className="rounded-full border border-border px-3 py-1.5 text-xs font-medium hover:bg-accent"
            >
              {t("social.action.see_all")}
            </Link>
          }
        />
        {friends.length === 0 ? (
          <Surface padding="md">
            <p className="text-sm text-muted-foreground">{t("social.friends.empty.description")}</p>
            <Link
              to="/people"
              className="mt-3 inline-block rounded-full bg-primary px-4 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90"
            >
              {t("social.action.find_people")}
            </Link>
          </Surface>
        ) : (
          <Surface padding="none" as="ul" className="divide-y divide-border overflow-hidden">
            {friends.map((person) => (
              <li key={person.profileId}>
                <PersonRow
                  profileId={person.profileId}
                  displayName={person.displayName}
                  handle={person.handle}
                  code={person.code}
                  avatarPreset={person.avatarPreset}
                  actions={
                    onInvite ? (
                      <ActionButton size="sm" onClick={() => onInvite(person.profileId)}>
                        {t("social.action.invite")}
                      </ActionButton>
                    ) : undefined
                  }
                />
              </li>
            ))}
          </Surface>
        )}
      </section>

      <RecentPartnersRail social={social} {...(onInvite ? { onInvite } : {})} limit={4} />
    </div>
  );
}
