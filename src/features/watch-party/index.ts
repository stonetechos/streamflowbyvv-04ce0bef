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
