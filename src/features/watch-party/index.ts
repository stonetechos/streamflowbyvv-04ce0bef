/**
 * Watch Party feature surface — Milestone G.
 * Presentation imports this barrel and nothing deeper.
 */
export { WatchPartyScreen, type WatchPartyScreenProps } from "./components/watch-party-screen";
export {
  SharedElapsedTimer,
  type SharedElapsedTimerProps,
} from "./components/shared-elapsed-timer";
export { WatchPartyStatus, type WatchPartyStatusProps } from "./components/watch-party-status";
export { useElapsedTime, formatElapsed, type ElapsedTime } from "./use-elapsed-time";
export { WatchPartyHud, type WatchPartyHudProps } from "./components/watch-party-hud";
export { CatchUpSheet, parseClockInput, type CatchUpSheetProps } from "./components/catch-up-sheet";
export {
  ReactionLayer,
  useReactionBursts,
  WATCH_PARTY_REACTIONS,
  type WatchPartyReaction,
} from "./components/reaction-burst";
