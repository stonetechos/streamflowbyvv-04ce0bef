/**
 * Theater feature surface — Sprint H1.
 * Presentation imports this barrel and nothing deeper.
 */
export { Theater, type TheaterProps } from "./theater";
export { ChatPanel, type ChatPanelProps } from "./components/chat-panel";
export { HostTransport, type HostTransportProps } from "./components/host-transport";
export { SourcePicker, type SourcePickerProps } from "./components/source-picker";
export { SyncBadge, type SyncBadgeProps } from "./components/sync-badge";
export { WatchStage, type WatchStageProps } from "./components/watch-stage";
export { useRoomChat, type ChatLine, type RoomChatModel } from "./use-room-chat";
export { useWatchSource, type WatchSourceModel } from "./use-watch-source";
export { useWatchSync, type WatchSyncModel } from "./use-watch-sync";
export { useYouTubePlayer, type YouTubePlayerHandle } from "./use-youtube-player";
