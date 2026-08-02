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

    "a11y.skip_to_content": "Skip to main content",
    "a11y.main_content.label": "Main content",
    "a11y.loading.announcement": "Loading, please wait",
    "a11y.error.announcement": "An error occurred",
  },
};
