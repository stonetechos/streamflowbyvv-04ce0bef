/**
 * User search panel — Milestone F.0.
 *
 * Find someone by display name, handle, or profile code. Four states are all
 * spelled out — idle, loading, empty, failed — because a search that silently
 * shows nothing is indistinguishable from a broken one.
 *
 * Blocked people never appear: that exclusion is enforced in storage, so this
 * panel neither knows nor needs to know who is hidden.
 */
import { ActionButton, EmptyState, Surface, TextField } from "@/design-system/components";
import { PoCompanion } from "@/features/po";
import { useTranslation } from "@/foundation/localization";

import type { SocialModel } from "../use-social";
import type { UserSearchModel } from "../use-user-search";
import { FriendActions } from "./friend-actions";
import { PersonRow } from "./person-row";

export interface UserSearchPanelProps {
  readonly search: UserSearchModel;
  readonly social: SocialModel;
}

export function UserSearchPanel({ search, social }: UserSearchPanelProps) {
  const { t } = useTranslation();

  return (
    <section className="space-y-4" aria-labelledby="user-search-heading">
      <h2 id="user-search-heading" className="sr-only">
        {t("social.search.title")}
      </h2>

      <TextField
        label={t("social.search.label")}
        description={t("social.search.hint")}
        type="search"
        autoComplete="off"
        value={search.term}
        onChange={(event) => search.setTerm(event.target.value)}
      />

      {search.phase === "loading" ? (
        <p className="px-1 text-sm text-muted-foreground" role="status">
          {t("social.search.loading")}
        </p>
      ) : null}

      {search.phase === "error" ? (
        <EmptyState
          title={t("social.search.error.title")}
          description={t("social.search.error.description")}
          action={
            <ActionButton size="sm" tone="ghost" onClick={search.retry}>
              {t("common.action.retry")}
            </ActionButton>
          }
        />
      ) : null}

      {search.isEmpty ? (
        <EmptyState
          title={t("social.search.empty.title")}
          description={t("social.search.empty.description")}
          illustration={<PoCompanion mood="observing" className="h-20 w-32" />}
        />
      ) : null}

      {search.results.length > 0 ? (
        <Surface padding="none" as="ul" className="divide-y divide-border overflow-hidden">
          {search.results.map((person) => (
            <li key={person.id}>
              <PersonRow
                profileId={person.id}
                displayName={person.displayName}
                handle={person.handle}
                code={person.code}
                avatarPreset={person.avatarPreset}
                actions={
                  <FriendActions
                    compact
                    relationship={social.relationshipWith(person.id)}
                    busy={social.pendingProfileId === person.id}
                    onSendRequest={() => void social.sendRequest(person.id)}
                    onAccept={(id) => void social.acceptRequest(id, person.id)}
                    onDecline={(id) => void social.declineRequest(id, person.id)}
                    onCancel={(id) => void social.cancelRequest(id, person.id)}
                    onUnblock={() => void social.unblockProfile(person.id)}
                  />
                }
              />
            </li>
          ))}
        </Surface>
      ) : null}
    </section>
  );
}
