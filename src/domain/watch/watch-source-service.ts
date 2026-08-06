/**
 * Watch source service — Sprint H1.
 *
 * Who may decide what the room is watching, and where that decision lives.
 * The host alone may set it; it is stored on the room aggregate's metadata so
 * a late joiner reads the same answer as everyone else.
 */
import { domainError } from "@/domain/errors/domain-errors";
import { createServiceToken } from "@/domain/service-registry";
import {
  ROOM_REPOSITORY,
  isRepositoryBound,
  resolveRepository,
  type EntityId,
  type RoomRepository,
} from "@/repository";

import {
  WATCH_SOURCE_METADATA_KEY,
  parseWatchSource,
  readWatchSource,
  type WatchSource,
} from "./watch-source";

export interface WatchSourceService {
  isAvailable(): boolean;
  read(roomId: EntityId): Promise<WatchSource | null>;
  /** Host-only. Rejects anything the parser cannot interpret. */
  set(roomId: EntityId, actorProfileId: string, input: string): Promise<WatchSource>;
  clear(roomId: EntityId, actorProfileId: string): Promise<void>;
}

export interface WatchSourceDependencies {
  readonly rooms: RoomRepository | null;
}

export function resolveWatchSourceDependencies(): WatchSourceDependencies {
  return {
    rooms: isRepositoryBound(ROOM_REPOSITORY) ? resolveRepository(ROOM_REPOSITORY) : null,
  };
}

export function createWatchSourceService(deps: WatchSourceDependencies): WatchSourceService {
  const { rooms } = deps;

  async function loadOwned(roomId: EntityId, actorProfileId: string, operation: string) {
    if (!rooms) throw domainError("SERVICE_UNAVAILABLE", { operation });
    const room = await rooms.findById(roomId);
    if (!room) throw domainError("ROOM_NOT_FOUND", { operation, aggregateId: roomId });
    if (room.hostProfileId !== actorProfileId) {
      throw domainError("ROOM_FORBIDDEN", { operation, aggregateId: roomId });
    }
    return { store: rooms, room };
  }

  return {
    isAvailable: () => rooms !== null,

    async read(roomId) {
      if (!rooms) return null;
      const room = await rooms.findById(roomId);
      return room ? readWatchSource(room.metadata) : null;
    },

    async set(roomId, actorProfileId, input) {
      const operation = "WatchSourceService.set";
      const source = parseWatchSource(input);
      if (!source) throw domainError("VALIDATION_FAILED", { operation, aggregateId: roomId });
      const { store, room } = await loadOwned(roomId, actorProfileId, operation);
      await store.update(roomId, {
        metadata: {
          ...room.metadata,
          [WATCH_SOURCE_METADATA_KEY]: source.kind === "youtube" ? source.url : (source.url ?? ""),
        },
      });
      return source;
    },

    async clear(roomId, actorProfileId) {
      const operation = "WatchSourceService.clear";
      const { store, room } = await loadOwned(roomId, actorProfileId, operation);
      const next = { ...room.metadata };
      delete next[WATCH_SOURCE_METADATA_KEY];
      await store.update(roomId, { metadata: next });
    },
  };
}

export const WATCH_SOURCE_SERVICE = createServiceToken<WatchSourceService>("WatchSourceService");
