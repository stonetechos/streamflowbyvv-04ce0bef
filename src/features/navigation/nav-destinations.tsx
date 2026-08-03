/**
 * Navigation model — Milestone E.
 *
 * One declaration of the application's primary destinations, shared by the
 * desktop header, the tablet rail and the mobile bottom bar. Adding a
 * destination is a one-line change here, and every form factor agrees.
 *
 * Pure data plus pure SVG marks: no service, no state, no policy.
 */
import type { ReactNode } from "react";

export interface NavDestination {
  readonly id: string;
  /** Typed TanStack route path. */
  readonly to: "/home" | "/people" | "/invites" | "/settings" | "/account";
  readonly labelKey: string;
  readonly icon: ReactNode;
  /** Only match this exact path when highlighting. */
  readonly exact?: boolean;
}

const iconClass = "size-5 shrink-0";

function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={iconClass}>
      <path
        d="M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5h-5v5H5a1 1 0 0 1-1-1z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function InviteIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={iconClass}>
      <rect x="3" y="5" width="18" height="14" rx="2.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="m4 8 8 5 8-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function PeopleIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={iconClass}>
      <circle cx="9.5" cy="8.5" r="3.2" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M3.4 19.2c.9-3 3.2-4.5 6.1-4.5s5.2 1.5 6.1 4.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M16.2 6.1a3 3 0 0 1 0 5.6m1.1 3.2c2 .5 3.4 1.9 4.1 4.1"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={iconClass}>
      <circle cx="12" cy="12" r="3.2" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M12 3v2.2M12 18.8V21M21 12h-2.2M5.2 12H3m14.4-6.4-1.6 1.6M8.2 15.8l-1.6 1.6m0-11.8 1.6 1.6m7.6 7.6 1.6 1.6"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

export const NAV_DESTINATIONS: readonly NavDestination[] = Object.freeze([
  { id: "home", to: "/home", labelKey: "nav.home", icon: <HomeIcon />, exact: true },
  { id: "people", to: "/people", labelKey: "nav.people", icon: <PeopleIcon /> },
  { id: "invites", to: "/invites", labelKey: "nav.invites", icon: <InviteIcon /> },
  { id: "settings", to: "/settings", labelKey: "nav.settings", icon: <SettingsIcon /> },
]);
