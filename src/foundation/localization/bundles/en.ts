/**
 * English (`en`) string bundle — Foundation §17 launch locale.
 *
 * Sprint 1.0 ships only the keys the application shell renders. Feature sprints
 * add their own keys with their module (Foundation §13); this file is never a
 * dumping ground for strings a future sprint might need.
 *
 * Plural keys use the CLDR category suffix (`_one`, `_other`).
 */
import type { LocaleBundle } from "../localization.types";

export const enBundle: LocaleBundle = {
  locale: "en",
  version: "1.0.0",
  strings: {
    "common.app.name": "StreamFlow",
    "common.app.tagline": "Watch together, in sync.",
    "common.action.retry": "Try again",
    "common.action.go_home": "Go home",
    "common.action.dismiss": "Dismiss",
    "common.state.loading": "Loading",

    "settings.language.label": "Language",
    "settings.appearance.theme.label": "Theme",
    "settings.appearance.theme.system": "System",
    "settings.appearance.theme.light": "Light",
    "settings.appearance.theme.dark": "Dark",

    "error.sys.unexpected.title": "Something went wrong",
    "error.sys.unexpected": "We hit an unexpected problem. Nothing you did caused it.",
    "error.sys.route_not_found.title": "Page not found",
    "error.sys.route_not_found": "That page doesn't exist, or it has moved.",
    "error.sys.config_invalid.title": "Configuration problem",
    "error.sys.config_invalid": "StreamFlow could not start because its configuration is invalid.",
    "error.net.timeout": "That request took too long. Check your connection and try again.",
    "error.net.offline": "You appear to be offline. StreamFlow will reconnect automatically.",
    "error.net.cancelled": "That request was cancelled.",
    "error.net.unreachable": "We couldn't reach StreamFlow. Check your connection and try again.",
    "error.net.bad_response": "We received an unexpected response. Please try again.",
    "error.net.server_error": "StreamFlow is having trouble right now. Please try again shortly.",
    // Sprint 1.6 — shared domain error taxonomy (Foundation §16.1).
    "error.sys.invalid_input": "That request wasn't valid, so nothing was changed.",
    "error.sys.service_unavailable": "That part of StreamFlow isn't ready yet. Please try again.",
    "error.sys.rate_limited": "You've done that a few too many times. Please wait a moment.",
    "error.room.capacity_exceeded": "This room is full.",
    "error.room.invalid_transition": "This room can't move to that state.",
    "error.room.not_active": "This room isn't active right now.",
    "error.invite.expired": "This invite has expired.",
    "error.invite.not_pending": "This invite has already been answered.",
    "error.sync.countdown_out_of_range": "Choose a countdown between 3 and 60 seconds.",
    "error.sync.resync_required": "Your clocks are too far apart. Re-sync before starting.",
    "error.voice.session_not_active": "Voice chat isn't active in this room.",
    "error.provider.capability_unsupported": "This service doesn't support that action.",
    "error.compliance.action_blocked": "StreamFlow can't do that with this service.",
    "error.net.request_failed": "That request didn't go through. Please try again.",
    "error.sys.persistence_unavailable": "StreamFlow can't reach your data right now. Please try again shortly.",
    "error.sys.persistence_failed": "We couldn't complete that. Please try again.",
    "error.sys.not_found": "We couldn't find what you were looking for.",
    "error.sys.conflict": "That has already been changed somewhere else. Refresh and try again.",
    "error.sys.permission_denied": "You don't have access to that.",
    "error.sys.constraint_violation": "Those details couldn't be saved. Check them and try again.",
    "error.action.retry": "Try again",
    "error.action.go_home": "Go home",
    "error.reference.label": "Reference code",

    "error.auth.provider_unavailable.title": "Sign-in isn't available yet",
    "error.auth.provider_unavailable":
      "StreamFlow's authentication architecture is in place, but no identity provider is connected yet.",
    "error.auth.invalid_credentials.title": "Those details didn't match",
    "error.auth.invalid_credentials": "Check your email and password, then try again.",
    "error.auth.email_not_verified.title": "Verify your email",
    "error.auth.email_not_verified": "Confirm your email address to finish signing in.",
    "error.auth.session_expired.title": "You've been signed out",
    "error.auth.session_expired": "Your session expired. Sign in again to continue.",
    "error.auth.session_missing.title": "Sign in to continue",
    "error.auth.session_missing": "That page needs a signed-in account.",
    "error.auth.account_suspended.title": "Account suspended",
    "error.auth.account_suspended": "This account can't be used right now. Contact support.",
    "error.auth.permission_denied.title": "You don't have access",
    "error.auth.permission_denied": "Your account doesn't have permission to open this page.",
    "error.auth.rate_limited.title": "Too many attempts",
    "error.auth.rate_limited": "Wait a moment before trying again.",
    "error.auth.sign_out_failed.title": "Sign-out didn't finish",
    "error.auth.sign_out_failed": "We couldn't sign you out. Please try again.",

    "auth.sign_in.title": "Sign in to StreamFlow",
    "auth.sign_in.subtitle": "Watch together, in sync, with your own accounts.",
    "auth.sign_out.title": "Sign out",
    "auth.sign_out.subtitle": "You'll be returned to the home page.",
    "auth.account.title": "Your account",
    "auth.account.subtitle": "Profile and preferences arrive in a later sprint.",
    "auth.action.sign_in": "Sign in",
    "auth.action.sign_out": "Sign out",
    "auth.action.reset_password": "Reset your password",
    "auth.action.resend_verification": "Resend the verification email",
    "auth.state.checking_session": "Checking your session",
    "auth.state.redirecting": "Taking you to sign in",
    "auth.status.session": "Session state",
    "auth.status.adapter": "Identity adapter",

    "a11y.skip_to_content": "Skip to main content",
    "a11y.main_content.label": "Main content",
    "a11y.loading.announcement": "Loading, please wait",
    "a11y.error.announcement": "An error occurred",
  },
};
