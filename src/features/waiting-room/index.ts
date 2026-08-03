/**
 * Waiting Room feature surface — Sprint 2.0.
 * Presentation imports this barrel and nothing deeper.
 */
export { WaitingRoom } from "./components/waiting-room";
export { WaitingRoomLayout } from "./components/waiting-room-layout";
export { RoomInfoCard } from "./components/room-info-card";
export { MemberList } from "./components/member-list";
export { MembershipActions } from "./components/membership-actions";
export { InviteSummary } from "./components/invite-summary";
export { RoomSetupCard, type RoomSetupCardProps } from "./components/room-setup-card";
export {
  CountdownDurationField,
  type CountdownDurationFieldProps,
} from "./components/countdown-duration-field";
export {
  useRoomSetup,
  type RoomSetupModel,
  type RoomSetupPendingAction,
  type UseRoomSetupInput,
} from "./use-room-setup";
export { CountdownPanel, type CountdownPanelProps } from "./components/countdown-panel";
export {
  useRoomCountdown,
  type CountdownPendingAction,
  type RoomCountdownModel,
  type UseRoomCountdownInput,
} from "./use-room-countdown";
export {
  PlaybackReadinessPanel,
  type PlaybackReadinessPanelProps,
} from "./components/playback-readiness-panel";
export {
  useRoomPlayback,
  type RoomPlaybackModel,
  type UseRoomPlaybackInput,
} from "./use-room-playback";
export { SyncHealthCard, type SyncHealthCardProps } from "./components/sync-health-card";
export {
  useRoomClockSync,
  SYNC_HEALTH_KEYS,
  type RoomClockSyncModel,
  type UseRoomClockSyncInput,
} from "./use-room-clock-sync";
export { PresenceIndicator } from "./components/presence-indicator";
export { useRoomPresence, type RoomPresenceModel } from "./use-room-presence";
export { useWaitingRoom, type WaitingRoomModel } from "./use-waiting-room";
export {
  memberLabel,
  readCountdownSeconds,
  minutesSince,
  toPresenceView,
  toMemberViews,
  toRoomSummary,
  toViewerView,
  toWaitingRoomError,
} from "./waiting-room-state";
export type {
  MemberPresenceView,
  MemberView,
  RoomSummaryView,
  ViewerView,
  WaitingRoomError,
  WaitingRoomPendingAction,
  WaitingRoomStatus,
} from "./waiting-room.types";
