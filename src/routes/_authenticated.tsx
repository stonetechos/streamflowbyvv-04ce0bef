import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

import { RequireAuth, useAuth } from "@/features/auth";
import { readPendingInvite } from "@/features/invitations";

/**
 * Protected subtree — Sprint 1.4 §7.
 *
 * Pathless layout: every route beneath it is guarded once, here. The gate is
 * client-resolved because session resolution belongs to the identity adapter,
 * which does not exist yet; a server-side gate arrives with that adapter.
 *
 * Beta UX Overhaul: it also finishes an interrupted invitation. Someone who
 * opened an invite link while signed out lands here after signing in, and is
 * carried the rest of the way to the room instead of being left on Home.
 */
export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  component: AuthenticatedLayout,
});

function InviteContinuation() {
  const auth = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!auth.isAuthenticated) return;
    const code = readPendingInvite();
    if (!code) return;
    void navigate({ to: "/join/$code", params: { code }, replace: true });
  }, [auth.isAuthenticated, navigate]);

  return null;
}

function AuthenticatedLayout() {
  return (
    <RequireAuth>
      <InviteContinuation />
      <Outlet />
    </RequireAuth>
  );
}
