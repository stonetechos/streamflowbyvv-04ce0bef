import { createFileRoute, Outlet } from "@tanstack/react-router";

import { RequireAuth } from "@/features/auth";

/**
 * Protected subtree — Sprint 1.4 §7.
 *
 * Pathless layout: every route beneath it is guarded once, here. The gate is
 * client-resolved because session resolution belongs to the identity adapter,
 * which does not exist yet; a server-side gate arrives with that adapter.
 */
export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  return (
    <RequireAuth>
      <Outlet />
    </RequireAuth>
  );
}
