/**
 * Friends list, request queues and block list — Milestone F.0.
 *
 * Four lists that share one row component and one action cluster, so the same
 * person looks and behaves the same wherever they appear. Nothing here decides
 * what a person may do: every button is offered by `FriendActions` on the
 * strength of the relationship the Domain reported.
 */
import { ActionButton, EmptyState, SectionHeader, Surface } from "@/design-system/components";
import { PoCompanion } from "@/features/po";
import { useTranslation } from "@/foundation/localization";
import type { SocialPersonView } from "@/domain";

import type { SocialModel } from "../use-social";
import { FriendActions } from "./friend-actions";
import { PersonRow } from "./person-row";

interface ListProps {
  readonly title: string;
  readonly description: string;
  readonly people: readonly SocialPersonView[];
  readonly emptyTitle: string;
  readonly emptyDescription: string;
  readonly renderActions: (person: SocialPersonView) => React.ReactNode;
}

function PeopleList({
  title,
  description,
  people,
  emptyTitle,
  emptyDescription,
  renderActions,
}: ListProps) {
  return (
    <section className="space-y-4">
      <SectionHeader title={title} description={description} />
      {people.length === 0 ? (
        <EmptyState title={emptyTitle} description={emptyDescription} />
      ) : (
        <Surface padding="none" as="ul" className="divide-y divide-border overflow-hidden">
          {people.map((person) => (
            <li key={`${person.profileId}-${person.friendshipId ?? "none"}`}>
              <PersonRow
                profileId={person.profileId}
                displayName={person.displayName}
                handle={person.handle}
                code={person.code}
                avatarPreset={person.avatarPreset}
                actions={renderActions(person)}
              />
            </li>
          ))}
        </Surface>
      )}
    </section>
  );
}

export interface FriendListsProps {
  readonly social: SocialModel;
}

export function FriendLists({ social }: FriendListsProps) {
  const { t } = useTranslation();
  const { overview } = social;

  const actionsFor = (person: SocialPersonView) => (
    <FriendActions
      compact
      relationship={social.relationshipWith(person.profileId)}
      busy={social.pendingProfileId === person.profileId}
      onSendRequest={() => void social.sendRequest(person.profileId)}
      onAccept={(id) => void social.acceptRequest(id, person.profileId)}
      onDecline={(id) => void social.declineRequest(id, person.profileId)}
      onCancel={(id) => void social.cancelRequest(id, person.profileId)}
      onRemove={(id) => void social.removeFriend(id, person.profileId)}
      onUnblock={() => void social.unblockProfile(person.profileId)}
    />
  );

  return (
    <div className="space-y-10">
      {overview.incomingRequests.length > 0 ? (
        <PeopleList
          title={t("social.requests.incoming.title")}
          description={t("social.requests.incoming.description")}
          people={overview.incomingRequests}
          emptyTitle={t("social.requests.incoming.empty.title")}
          emptyDescription={t("social.requests.incoming.empty.description")}
          renderActions={actionsFor}
        />
      ) : null}

      <section className="space-y-4">
        <SectionHeader
          title={t("social.friends.title")}
          description={t("social.friends.description")}
          action={
            <ActionButton size="sm" tone="ghost" onClick={social.refresh}>
              {t("common.action.refresh")}
            </ActionButton>
          }
        />
        {overview.friends.length === 0 ? (
          <EmptyState
            title={t("social.friends.empty.title")}
            description={t("social.friends.empty.description")}
            illustration={<PoCompanion mood="calm" className="h-24 w-36" />}
          />
        ) : (
          <Surface padding="none" as="ul" className="divide-y divide-border overflow-hidden">
            {overview.friends.map((person) => (
              <li key={person.profileId}>
                <PersonRow
                  profileId={person.profileId}
                  displayName={person.displayName}
                  handle={person.handle}
                  code={person.code}
                  avatarPreset={person.avatarPreset}
                  actions={actionsFor(person)}
                />
              </li>
            ))}
          </Surface>
        )}
      </section>

      <PeopleList
        title={t("social.requests.outgoing.title")}
        description={t("social.requests.outgoing.description")}
        people={overview.outgoingRequests}
        emptyTitle={t("social.requests.outgoing.empty.title")}
        emptyDescription={t("social.requests.outgoing.empty.description")}
        renderActions={actionsFor}
      />

      {overview.blocked.length > 0 ? (
        <PeopleList
          title={t("social.blocked.title")}
          description={t("social.blocked.description")}
          people={overview.blocked}
          emptyTitle={t("social.blocked.empty.title")}
          emptyDescription={t("social.blocked.empty.description")}
          renderActions={(person) => (
            <ActionButton
              size="sm"
              tone="ghost"
              loading={social.pendingProfileId === person.profileId}
              onClick={() => void social.unblockProfile(person.profileId)}
            >
              {t("social.action.unblock")}
            </ActionButton>
          )}
        />
      ) : null}
    </div>
  );
}
