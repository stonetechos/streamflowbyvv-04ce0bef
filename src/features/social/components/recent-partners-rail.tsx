/**
 * Recent partners rail — Milestone F.0.
 *
 * The people this profile has actually watched with, newest first, straight
 * from the existing projection. Reaching for a familiar face is the fastest
 * path back into a room, so this rail sits high on Home.
 */
import { ActionButton, EmptyState, SectionHeader, Surface } from "@/design-system/components";
import { useTranslation } from "@/foundation/localization";
import type { RecentPartnerView } from "@/domain";

import type { SocialModel } from "../use-social";
import { FriendActions } from "./friend-actions";
import { PersonRow } from "./person-row";

export interface RecentPartnersRailProps {
  readonly social: SocialModel;
  /** Offer a one-tap invite when the caller has a room to invite into. */
  onInvite?: (profileId: string) => void;
  readonly limit?: number;
}

function formatMeta(partner: RecentPartnerView, t: (key: string, vars?: Record<string, string | number>) => string) {
  return t("social.partners.meta", { count: partner.sessionCount });
}

export function RecentPartnersRail({ social, onInvite, limit = 6 }: RecentPartnersRailProps) {
  const { t } = useTranslation();
  const partners = social.overview.recentPartners.slice(0, limit);

  return (
    <section className="space-y-4" aria-labelledby="recent-partners-heading">
      <SectionHeader
        as="h3"
        title={t("social.partners.title")}
        description={t("social.partners.description")}
      />
      {partners.length === 0 ? (
        <EmptyState
          title={t("social.partners.empty.title")}
          description={t("social.partners.empty.description")}
        />
      ) : (
        <Surface padding="none" as="ul" className="divide-y divide-border overflow-hidden">
          {partners.map((partner) => (
            <li key={partner.profileId}>
              <PersonRow
                profileId={partner.profileId}
                displayName={partner.displayName}
                handle={partner.handle}
                code={partner.code}
                avatarPreset={partner.avatarPreset}
                meta={formatMeta(partner, t)}
                actions={
                  <div className="flex items-center gap-2">
                    {onInvite ? (
                      <ActionButton size="sm" onClick={() => onInvite(partner.profileId)}>
                        {t("social.action.invite")}
                      </ActionButton>
                    ) : null}
                    {partner.isFriend ? null : (
                      <FriendActions
                        compact
                        relationship={social.relationshipWith(partner.profileId)}
                        busy={social.pendingProfileId === partner.profileId}
                        onSendRequest={() => void social.sendRequest(partner.profileId)}
                        onAccept={(id) => void social.acceptRequest(id, partner.profileId)}
                        onDecline={(id) => void social.declineRequest(id, partner.profileId)}
                        onCancel={(id) => void social.cancelRequest(id, partner.profileId)}
                        onUnblock={() => void social.unblockProfile(partner.profileId)}
                      />
                    )}
                  </div>
                }
              />
            </li>
          ))}
        </Surface>
      )}
    </section>
  );
}
