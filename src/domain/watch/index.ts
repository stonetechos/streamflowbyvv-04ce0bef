/**
 * Watch-party domain surface — Sprint H1.
 *
 * Binds the two Sprint H1 services. Idempotent, and safe to call before a
 * backend exists: each service reports itself unavailable instead of throwing.
 */
import { bindService, isServiceBound } from "@/domain/service-registry";

import {
  createWatchChatService,
  resolveWatchChatDependencies,
  WATCH_CHAT_SERVICE,
} from "./watch-chat-service";
import {
  createWatchSourceService,
  resolveWatchSourceDependencies,
  WATCH_SOURCE_SERVICE,
} from "./watch-source-service";
import {
  createWatchSyncService,
  resolveWatchSyncDependencies,
  WATCH_SYNC_SERVICE,
} from "./watch-sync-service";

export function registerWatchServices(): void {
  if (!isServiceBound(WATCH_CHAT_SERVICE)) {
    bindService(WATCH_CHAT_SERVICE, () => createWatchChatService(resolveWatchChatDependencies()));
  }
  if (!isServiceBound(WATCH_SYNC_SERVICE)) {
    bindService(WATCH_SYNC_SERVICE, () => createWatchSyncService(resolveWatchSyncDependencies()));
  }
  if (!isServiceBound(WATCH_SOURCE_SERVICE)) {
    bindService(WATCH_SOURCE_SERVICE, () =>
      createWatchSourceService(resolveWatchSourceDependencies()),
    );
  }
}

export {
  CHAT_MESSAGE_MAX_LENGTH,
  WATCH_CHAT_SERVICE,
  createWatchChatService,
  type ChatRejection,
  type WatchChatService,
} from "./watch-chat-service";
export {
  DRIFT_HARD_MS,
  DRIFT_SYNCED_MS,
  WATCH_SYNC_SERVICE,
  createWatchSyncService,
  type WatchIntent,
  type WatchPhase,
  type WatchState,
  type WatchSyncService,
  type WatchVerdict,
} from "./watch-sync-service";
export {
  WATCH_SOURCE_METADATA_KEY,
  parseWatchSource,
  readWatchSource,
  watchSourceCapability,
  type PlaybackControlMode,
  type WatchSource,
  type WatchSourceCapability,
} from "./watch-source";
export {
  WATCH_SOURCE_SERVICE,
  createWatchSourceService,
  type WatchSourceService,
} from "./watch-source-service";
