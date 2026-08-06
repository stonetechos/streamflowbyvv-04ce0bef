/**
 * Theater feature surface — Sprint H1.
 * Presentation imports this barrel and nothing deeper.
 */
export { Theater, type TheaterProps } from "./theater";
export { ChatPanel, type ChatPanelProps } from "./components/chat-panel";
export {
  ManualCoordination,
  type ManualCoordinationProps,
  type RoomEventEntry,
} from "./components/manual-coordination";
export { ParticipantRail, type ParticipantRailProps } from "./components/participant-rail";
export { RoomDrawer, type RoomDrawerProps } from "./components/room-drawer";
export { HostTransport, type HostTransportProps } from "./components/host-transport";
export { SourcePicker, type SourcePickerProps } from "./components/source-picker";
export { SyncBadge, type SyncBadgeProps } from "./components/sync-badge";
export { WatchStage, type WatchStageProps } from "./components/watch-stage";
export {
  useRoomChat,
  type ChatLine,
  type RoomChatModel,
  type RoomEventLine,
} from "./use-room-chat";
export { useRoomRuntime, type RoomRuntimeModel } from "./use-room-runtime";
export { createRuntimeTelemetry, type RuntimeMetrics } from "./runtime-telemetry";
export { useWatchSource, type WatchSourceModel } from "./use-watch-source";
export { useWatchSync, type WatchSyncModel } from "./use-watch-sync";
export { useDirectPlayer, type DirectPlayerHandle } from "./use-direct-player";
