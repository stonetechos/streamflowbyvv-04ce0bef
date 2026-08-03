/**
 * Primary navigation — Milestone E.
 *
 * Desktop and tablet: a horizontal bar inside the application header, with the
 * signed-in person's mark and a theme toggle on the right. On phones the same
 * destinations move to the bottom bar, so this component simply steps aside.
 *
 * Presentation only: it reads the session to know whether to render, and
 * navigates. It decides nothing.
 */
import { Link } from "@tanstack/react-router";

import { Avatar } from "@/design-system/components";
import { useAuth } from "@/features/auth";
import { NotificationBadge, useNotifications } from "@/features/notifications";
import { useTranslation } from "@/foundation/localization";
import { useTheme } from "@/foundation/theme";
import { cn } from "@/lib/utils";

import { NAV_DESTINATIONS } from "../nav-destinations";

export function AppNav() {
  const { t } = useTranslation();
  const auth = useAuth();
  const { resolvedTheme, setTheme } = useTheme();
  const badges = useNotifications();

  const brand = (
    <Link to="/" className="text-sm font-semibold tracking-tight">
      {t("common.app.name")}
    </Link>
  );

  if (!auth.isAuthenticated) {
    return (
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-2 px-4">
        {brand}
        <div className="flex items-center gap-2">
          <Link
            to="/auth/sign-in"
            className="inline-flex min-h-11 items-center rounded-xl px-4 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            {t("nav.sign_in")}
          </Link>
          <Link
            to="/auth/sign-up"
            className="inline-flex min-h-11 items-center rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground shadow-e1 transition-colors hover:bg-primary/90"
          >
            {t("nav.get_started")}
          </Link>
        </div>
      </div>
    );
  }

  const name = auth.session?.identity.displayName ?? "";

  return (
    <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-2 px-4">
      {brand}
      <div className="flex items-center gap-1 sm:gap-2">
        <nav aria-label={t("nav.primary")} className="hidden md:block">
          <ul className="flex items-center gap-1">
            {NAV_DESTINATIONS.filter((item) => item.id !== "account").map((item) => (
              <li key={item.id}>
                <Link
                  to={item.to}
                  activeOptions={{ exact: item.exact ?? false }}
                  className={cn(
                    "inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-medium",
                    "text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
                    "data-[status=active]:bg-accent data-[status=active]:text-accent-foreground",
                  )}
                >
                  {item.icon}
                  <span>{t(item.labelKey)}</span>
                  {item.badge ? (
                    <NotificationBadge
                      count={badges[item.badge]}
                      label={t("nav.badge.unread", {
                        count: String(badges[item.badge]),
                        destination: t(item.labelKey),
                      })}
                    />
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <button
          type="button"
          onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
          aria-label={t("nav.toggle_theme")}
          className="inline-flex size-11 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="size-5">
            {resolvedTheme === "dark" ? (
              <path
                d="M20 13.4A8.2 8.2 0 0 1 10.6 4a8.4 8.4 0 1 0 9.4 9.4z"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinejoin="round"
              />
            ) : (
              <>
                <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.6" />
                <path
                  d="M12 2.8V5m0 14v2.2M21.2 12H19M5 12H2.8m14.8-6.4-1.5 1.5M7.7 16.3l-1.5 1.5m0-12.2 1.5 1.5m8.6 8.6 1.5 1.5"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              </>
            )}
          </svg>
        </button>

        <Link
          to="/account"
          aria-label={t("nav.account")}
          className="inline-flex min-h-11 items-center rounded-xl px-1 transition-opacity hover:opacity-85"
        >
          <Avatar name={name} size="sm" />
        </Link>
      </div>
    </div>
  );
}
