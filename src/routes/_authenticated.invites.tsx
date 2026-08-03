import { createFileRoute } from "@tanstack/react-router";

import { SectionHeader } from "@/design-system/components";
import { useAuth } from "@/features/auth";
import { useHome } from "@/features/home";
import { InviteCard, InviteHistoryList } from "@/features/invitations";
import { PoCompanion } from "@/features/po";
import { EmptyState } from "@/design-system/components";
import { useTranslation } from "@/foundation/localization";

/**
 * Invitations — Milestone E.
 *
 * Pending invitations with their two answers, and the record of the ones
 * already answered. Acceptance is `RoomFlowService`'s decision; this screen
 * only asks for it.
 */
export const Route = createFileRoute("/_authenticated/invites")({
  head: () => ({
    meta: [
      { title: "Invitations — StreamFlow" },
      {
        name: "description",
        content: "Watch party invitations waiting for your answer, and the ones you've answered.",
      },
      { property: "og:title", content: "Invitations — StreamFlow" },
      {
        property: "og:description",
        content: "Accept or decline invitations to synchronized watch parties.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: InvitesRoute,
});

function InvitesRoute() {
  const { t } = useTranslation();
  const auth = useAuth();
  const home = useHome(auth.session?.identity.profileId ?? null);
  const pending = home.snapshot.pendingInvites;
  const answered = home.snapshot.answeredInvites;

  return (
    <div className="mx-auto w-full max-w-4xl space-y-8 px-4 py-8 pb-28 sm:px-6 md:pb-12">
      <SectionHeader title={t("invites.title")} description={t("invites.description")} />

      {pending.length === 0 ? (
        <EmptyState
          title={t("invites.empty.title")}
          description={t("invites.empty.description")}
          illustration={<PoCompanion mood="waiting" className="h-24 w-36" />}
        />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {pending.map((summary) => (
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
      )}

      <section className="space-y-4" aria-labelledby="invite-history-heading">
        <SectionHeader
          as="h2"
          title={t("invite.history.title")}
          description={t("invite.history.description")}
        />
        <InviteHistoryList entries={answered} />
      </section>
    </div>
  );
}
