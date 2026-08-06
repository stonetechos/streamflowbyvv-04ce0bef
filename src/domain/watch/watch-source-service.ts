/**
 * Watch selection service — Sprint H1, extended in H2, generalized in H3.
 *
 * Who may decide what the room is watching, and where that decision lives.
 * The host alone may set it; it is stored on the room aggregate as a shared
 * `RoomMediaRef`, so a late joiner, a guest, and a reconnecting participant
 * all read exactly the same answer.
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
  EMPTY_WATCH_SELECTION,
  WATCH_MEDIA_METADATA_KEY,
  WATCH_SOURCE_METADATA_KEY,
  WATCH_TITLE_METADATA_KEY,
  mediaRefSelection,
  parseWatchSource,
  readWatchSelection,
  toRoomMediaRef,
  type RoomMediaRef,
  type WatchSelection,
} from "./watch-source";

const TITLE_MAX_LENGTH = 120;

export interface WatchSourceService {
  isAvailable(): boolean;
  read(roomId: EntityId): Promise<WatchSelection>;
  /** Host-only. Rejects anything the parser cannot interpret. */
  set(
    roomId: EntityId,
    actorProfileId: string,
    input: string,
    title?: string | null,
  ): Promise<WatchSelection>;
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
      if (!rooms) return EMPTY_WATCH_SELECTION;
      const room = await rooms.findById(roomId);
      return room ? readWatchSelection(room.metadata) : EMPTY_WATCH_SELECTION;
    },

    async set(roomId, actorProfileId, input, title) {
      const operation = "WatchSourceService.set";
      const source = parseWatchSource(input);
      if (!source) throw domainError("INVALID_INPUT", { operation, aggregateId: roomId });

      const cleanTitle = (title ?? "").trim().slice(0, TITLE_MAX_LENGTH);
      const { store, room } = await loadOwned(roomId, actorProfileId, operation);
      const selectedAt = new Date().toISOString();
      const ref: RoomMediaRef = toRoomMediaRef(
        source,
        cleanTitle.length > 0 ? cleanTitle : null,
        selectedAt,
        actorProfileId,
        Date.parse(selectedAt),
      );


      const metadata: Record<string, unknown> = {
        ...room.metadata,
        [WATCH_MEDIA_METADATA_KEY]: JSON.stringify(ref),
        // Legacy keys stay in step so older readers never disagree.
        [WATCH_SOURCE_METADATA_KEY]: source.url ?? "",
      };
      if (ref.title) metadata[WATCH_TITLE_METADATA_KEY] = ref.title;
      else delete metadata[WATCH_TITLE_METADATA_KEY];

      await store.update(roomId, { metadata });
      return mediaRefSelection(ref);
    },

    async clear(roomId, actorProfileId) {
      const operation = "WatchSourceService.clear";
      const { store, room } = await loadOwned(roomId, actorProfileId, operation);
      const next = { ...room.metadata };
      delete next[WATCH_MEDIA_METADATA_KEY];
      delete next[WATCH_SOURCE_METADATA_KEY];
      delete next[WATCH_TITLE_METADATA_KEY];
      await store.update(roomId, { metadata: next });
    },
  };
}

export const WATCH_SOURCE_SERVICE = createServiceToken<WatchSourceService>("WatchSourceService");
