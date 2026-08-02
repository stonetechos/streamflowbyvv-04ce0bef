/**
 * Protected-route architecture — Sprint 1.4 §7.
 *
 * A single guard component, used by the `_authenticated` layout route. It
 * renders a verdict computed by the Feature layer from Domain state; it never
 * computes authorization itself and never reads a role from storage (ADR-009).
 *
 * Guarding happens in the layout, not in each page, so no protected content is
 * ever mounted before the session is settled.
 */
import { useNavigate } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import { AUTH_ERRORS, type AppRole, type Permission } from "@/domain/auth";
import { ErrorState, LoadingState } from "@/app-shell";
import { useTranslation } from "@/foundation/localization";

import { useAuth } from "./auth-provider";

export interface RequireAuthProps {
  children: ReactNode;
  /** Platform roles that may enter. Omitted means "any signed-in profile". */
  roles?: readonly AppRole[];
  /** Permission that must be held. Evaluated after `roles`. */
  permission?: Permission;
  /** Where unauthenticated visitors are sent. */
  redirectTo?: string;
}

export function RequireAuth({
  children,
  roles,
  permission,
  redirectTo = "/auth",
}: RequireAuthProps) {
  const auth = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const shouldRedirect = auth.isSettled && !auth.isAuthenticated;

  useEffect(() => {
    if (!shouldRedirect) return;
    void navigate({ to: redirectTo, replace: true });
  }, [navigate, redirectTo, shouldRedirect]);

  if (!auth.isSettled) {
    return <LoadingState label={t("auth.state.checking_session")} />;
  }

  if (!auth.isAuthenticated) {
    return <LoadingState label={t("auth.state.redirecting")} />;
  }

  const roleAllowed = !roles || roles.some((role) => auth.hasRole(role));
  const permissionAllowed = !permission || auth.can(permission);

  if (!roleAllowed || !permissionAllowed) {
    return (
      <ErrorState
        code={AUTH_ERRORS.PERMISSION_DENIED.code}
        messageKey={AUTH_ERRORS.PERMISSION_DENIED.messageKey}
        onGoHome={() => void navigate({ to: "/" })}
      />
    );
  }

  return <>{children}</>;
}
