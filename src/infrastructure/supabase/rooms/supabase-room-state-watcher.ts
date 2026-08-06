/**
 * RoomStateWatcher adapter — Sprint H1.
 *
 * A room-scoped notice whenever the authoritative playback row changes. The
 * payload is discarded on purpose: the Domain re-reads through
 * `RoomStateRepository` so a stale or partial row can never become state.
 */
import type {
  RoomMessageUnsubscribe,
  RoomStateWatcher,
} from "@/repository/rooms/watch-repository.types";

import type { DataConnection } from "../connection";

export function createSupabaseRoomStateWatcher(connection: DataConnection): RoomStateWatcher {
  return {
    async subscribe(roomId, listener): Promise<RoomMessageUnsubscribe> {
      if (!connection.isAvailable()) return () => {};
      const channel = connection
        .client()
        .channel(`room-state:${roomId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "room_state",
            filter: `room_id=eq.${roomId}`,
          },
          () => listener(),
        );

      await new Promise<void>((resolve) => {
        channel.subscribe(() => resolve());
        setTimeout(resolve, 2_000);
      });

      return () => {
        void connection.client().removeChannel(channel);
      };
    },
  };
}
