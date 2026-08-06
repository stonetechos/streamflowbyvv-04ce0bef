/**
 * Notifications provider — RC2 Blocker 2.
 *
 * Holds one live badge reading for the whole signed-in session so the header,
 * the bottom bar and any screen agree on the same numbers instead of each
 * counting for itself.
 */
import { createContext, useContext, type ReactNode } from "react";

import { useAuth } from "@/features/auth";

import {
  EMPTY_BADGES,
  useNotificationBadges,
  type NotificationBadges,
} from "./use-notification-badges";

const FALLBACK: NotificationBadges = {
  ...EMPTY_BADGES,
  refresh: () => undefined,
  markInvitesSeen: () => undefined,
};

const NotificationContext = createContext<NotificationBadges>(FALLBACK);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const badges = useNotificationBadges(auth.session?.identity?.profileId ?? null);
  return <NotificationContext.Provider value={badges}>{children}</NotificationContext.Provider>;
}

export function useNotifications(): NotificationBadges {
  return useContext(NotificationContext);
}
