/**
 * Invite landing — Beta UX Overhaul.
 *
 * The one link a host shares. Opening it should end in the lobby, whatever
 * state the visitor arrives in: already signed in, signed out, or returning
 * from an email confirmation.
 *
 * The route decides nothing about admission. It remembers where the person was
 * going, waits for a session, and then asks the existing join path — the same
 * one the manual code entry uses — to let them in. Every refusal is the
 * domain's, rendered in plain language.
 */
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";

import { ErrorState, LoadingState } from "@/app-shell";
import { useAuth } from "@/features/auth";
import { useHome } from "@/features/home";
import { clearPendingInvite, rememberPendingInvite } from "@/features/invitations";
import { clearDestination, rememberCurrentDestination } from "@/features/auth";
import { refusalMessageKey } from "@/features/shared/refusal-message";
import { useTranslation } from "@/foundation/localization";

export const Route = createFileRoute("/join/$code")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Join a watch party — StreamFlow" },
      {
        name: "description",
        content: "You have been invited to watch something together, in sync, on StreamFlow.",
      },
      { property: "og:title", content: "Join a watch party — StreamFlow" },
      { property: "og:description", content: "Your friends are waiting in the room." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: JoinInvitePage,
});

function JoinInvitePage() {
  const { t } = useTranslation();
  const { code } = Route.useParams();
  const navigate = useNavigate();
  const auth = useAuth();
  const profileId = auth.session?.identity?.profileId ?? null;
  const home = useHome(profileId);
  const [failed, setFailed] = useState(false);
  const attempted = useRef(false);

  const normalizedCode = code.trim().toUpperCase();
  const joinByCode = home.joinByCode;

  // Remember the destination before anything can navigate away from it.
  useEffect(() => {
    rememberPendingInvite(normalizedCode);
    // The whole link is remembered, query included, so any token or content
    // reference travelling with the invitation survives authentication.
    rememberCurrentDestination();
  }, [normalizedCode]);

  // No session yet: send them to sign in. The continuation runs on return.
  useEffect(() => {
    if (!auth.isSettled || auth.isAuthenticated) return;
    void navigate({ to: "/auth", replace: true });
  }, [auth.isSettled, auth.isAuthenticated, navigate]);

  // Session in hand: walk straight into the room.
  useEffect(() => {
    if (!auth.isAuthenticated || !profileId || attempted.current) return;
    attempted.current = true;
    void (async () => {
      const roomId = await joinByCode(normalizedCode);
      clearPendingInvite();
      clearDestination();
      if (roomId) {
        void navigate({ to: "/rooms/$roomId", params: { roomId }, replace: true });
      } else {
        setFailed(true);
      }
    })();
  }, [auth.isAuthenticated, joinByCode, navigate, normalizedCode, profileId]);

  if (failed) {
    return (
      <ErrorState
        code="SF-ROOM-JOIN"
        messageKey={refusalMessageKey(home.error, "home.join.not_found")}
        onGoHome={() => void navigate({ to: "/home" })}
      />
    );
  }

  return <LoadingState label={t("invite.landing.joining")} />;
}
