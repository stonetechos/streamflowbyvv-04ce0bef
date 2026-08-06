/**
 * RoomChatRepository adapter — Sprint H1.
 *
 * Durable room chat plus its live arrivals. RLS decides visibility: a caller
 * only ever reads rooms they are a member of, and may only write as themself.
 */
import { REPOSITORY_ERRORS, RepositoryError } from "@/repository";
import type {
  RoomChatRepository,
  RoomMessage,
  RoomMessageDraft,
} from "@/repository/rooms/watch-repository.types";
import type { EntityId } from "@/repository/repository.types";

import type { DataConnection } from "../connection";
import { runQuery } from "../query-wrapper";

const AGGREGATE = "room_messages";
const COLUMNS = "id, room_id, profile_id, body, metadata, created_at";

interface RoomMessageRow {
  readonly id: string;
  readonly room_id: string;
  readonly profile_id: string;
  readonly body: string;
  readonly metadata: unknown;
  readonly created_at: string;
}

function toMessage(row: RoomMessageRow): RoomMessage {
  return {
    id: row.id,
    roomId: row.room_id,
    profileId: row.profile_id,
    body: row.body,
    metadata:
      row.metadata !== null && typeof row.metadata === "object" && !Array.isArray(row.metadata)
        ? (row.metadata as Readonly<Record<string, unknown>>)
        : {},
    createdAt: row.created_at,
  };
}

export function createSupabaseRoomChatRepository(connection: DataConnection): RoomChatRepository {
  const context = (operation: string, entityId?: string) => ({
    aggregate: AGGREGATE,
    operation,
    ...(entityId ? { entityId } : {}),
  });

  function requireAvailable(operation: string): void {
    if (!connection.isAvailable()) {
      throw new RepositoryError(REPOSITORY_ERRORS.UNAVAILABLE, context(operation));
    }
  }

  return {
    async listRecent(roomId: EntityId, limit: number): Promise<readonly RoomMessage[]> {
      requireAvailable("listRecent");
      const rows = await runQuery<RoomMessageRow[]>(
        connection
          .client()
          .from("room_messages")
          .select(COLUMNS)
          .eq("room_id", roomId)
          .order("created_at", { ascending: false })
          .limit(Math.max(1, Math.min(limit, 200))),
        context("listRecent", roomId),
      );
      return rows.map(toMessage).reverse();
    },

    async send(draft: RoomMessageDraft): Promise<RoomMessage> {
      requireAvailable("send");
      const row = await runQuery<RoomMessageRow>(
        connection
          .client()
          .from("room_messages")
          .insert({
            room_id: draft.roomId,
            profile_id: draft.profileId,
            body: draft.body,
            metadata: (draft.metadata ?? {}) as never,
          })
          .select(COLUMNS)
          .single(),
        context("send", draft.roomId),
      );
      return toMessage(row);
    },

    async subscribe(roomId, listener) {
      if (!connection.isAvailable()) return () => {};
      const channel = connection
        .client()
        .channel(`room-chat:${roomId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "room_messages",
            filter: `room_id=eq.${roomId}`,
          },
          (payload) => {
            const row = payload.new as RoomMessageRow | null;
            if (row?.id) listener(toMessage(row));
          },
        );

      await new Promise<void>((resolve) => {
        channel.subscribe(() => resolve());
        // Never block the caller on a transport that stays silent.
        setTimeout(resolve, 2_000);
      });

      return () => {
        void connection.client().removeChannel(channel);
      };
    },
  };
}
