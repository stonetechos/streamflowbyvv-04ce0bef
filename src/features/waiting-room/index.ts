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
export { useWaitingRoom, type WaitingRoomModel } from "./use-waiting-room";
export {
  memberLabel,
  toMemberViews,
  toRoomSummary,
  toViewerView,
  toWaitingRoomError,
} from "./waiting-room-state";
export type {
  MemberView,
  RoomSummaryView,
  ViewerView,
  WaitingRoomError,
  WaitingRoomPendingAction,
  WaitingRoomStatus,
} from "./waiting-room.types";
