/**
 * Bottom navigation — Milestone E.
 *
 * The phone's primary navigation. Fixed to the bottom edge inside the thumb
 * arc, safe-area aware, 56px targets, and hidden entirely from `md` up where
 * the header bar takes over. Rendered only for signed-in people.
 */
import { Link } from "@tanstack/react-router";

import { useAuth } from "@/features/auth";
import { NotificationBadge, useNotifications } from "@/features/notifications";
import { useTranslation } from "@/foundation/localization";
import { cn } from "@/lib/utils";

import { NAV_DESTINATIONS } from "../nav-destinations";

export function BottomNav() {
  const { t } = useTranslation();
  const auth = useAuth();
  const badges = useNotifications();

  if (!auth.isAuthenticated) return null;

  return (
    <nav
      aria-label={t("nav.primary")}
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 md:hidden",
        "border-t border-border/70 bg-surface/85 backdrop-blur-xl supports-[backdrop-filter]:bg-surface/70",
      )}
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="mx-auto flex max-w-lg items-stretch justify-around px-2">
        {NAV_DESTINATIONS.map((item) => (
          <li key={item.id} className="flex-1">
            <Link
              to={item.to}
              activeOptions={{ exact: item.exact ?? false }}
              className={cn(
                "flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl px-1 py-2",
                "text-[0.6875rem] font-medium text-muted-foreground transition-colors",
                "data-[status=active]:text-primary",
              )}
            >
              <span className="relative inline-flex">
                {item.icon}
                {item.badge ? (
                  <NotificationBadge
                    count={badges[item.badge]}
                    label={t("nav.badge.unread", {
                      count: String(badges[item.badge]),
                      destination: t(item.labelKey),
                    })}
                    className="absolute -right-2 -top-1"
                  />
                ) : null}
              </span>
              <span>{t(item.labelKey)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
