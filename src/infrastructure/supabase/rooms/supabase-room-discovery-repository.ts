/**
 * RoomDiscovery adapter — Sprint J.1.
 *
 * Calls two narrow database helpers, both `SECURITY DEFINER` and both limited
 * to a single joinable room:
 *
 * - `discover_room_by_code` — what a stranger may learn from a room code.
 * - `room_admission_row`    — the room record the domain needs to *decide*
 *                             admission, resolvable only by exact id.
 *
 * Neither helper lists rooms, and neither admits anyone. Row-level rules on
 * `rooms` are untouched: a non-member still cannot read or browse the table.
 */
import type {
  RoomAdmissionFacts,
  RoomAdmissionLookup,
  RoomDiscovery,
  RoomDiscoveryRepository,
} from "@/repository/rooms/room-discovery.types";
import { REPOSITORY_ERRORS, RepositoryError } from "@/repository";
import type { EntityCode, EntityId } from "@/repository/repository.types";
import type { Room } from "@/domain/rooms/room.types";
import type { RoomStatus } from "@/domain/shared/domain-enums";

import type { DataConnection } from "../connection";
import { toRepositoryError } from "../error-mapping";
import { requireAvailable } from "./room-query-support";
import { toRoom, type RoomRow } from "./room-mapper";

const AGGREGATE = "room";
const DISCOVER_FUNCTION = "discover_room_by_code";
const ADMISSION_FUNCTION = "room_admission_row";
const FACTS_FUNCTION = "room_admission_facts";

interface DiscoveryRow {
  readonly room_id: string;
  readonly room_name: string;
  readonly provider_id: string | null;
  readonly host_display_name: string | null;
  readonly member_count: number;
  readonly capacity: number;
  readonly status: string;
}

interface FactsRow extends DiscoveryRow {
  readonly is_deleted: boolean;
  readonly is_blocked: boolean;
  readonly viewer_state: string | null;
  readonly viewer_other_room_id: string | null;
}

/**
 * The generated schema types do not describe database functions, so the cast is
 * confined to this adapter. The call stays attached to the client — a detached
 * `rpc` reference loses `this`.
 */
interface RpcClient {
  rpc(
    name: string,
    args: Record<string, unknown>,
  ): PromiseLike<{ data: unknown; error: { message: string } | null }>;
}

export function createSupabaseRoomDiscoveryRepository(
  connection: DataConnection,
): RoomDiscoveryRepository {
  const context = (operation: string) => ({ aggregate: AGGREGATE, operation });

  const callRpc = async (
    fn: string,
    args: Record<string, unknown>,
    operation: string,
  ): Promise<unknown> => {
    requireAvailable(connection, context(operation));
    const client = connection.client() as unknown as RpcClient;
    const { data, error } = await client.rpc(fn, args);
    if (error) {
      throw toRepositoryError(error as never, context(operation));
    }
    if (data === undefined) {
      throw new RepositoryError(REPOSITORY_ERRORS.QUERY_FAILED, context(operation));
    }
    return Array.isArray(data) ? (data[0] ?? null) : data;
  };

  const toDiscovery = (row: DiscoveryRow): RoomDiscovery => ({
    roomId: row.room_id,
    name: row.room_name,
    providerId: row.provider_id,
    hostDisplayName: row.host_display_name,
    memberCount: Number(row.member_count ?? 0),
    capacity: Number(row.capacity ?? 0),
    status: row.status as RoomStatus,
  });

  return {
    async discoverByCode(code: EntityCode): Promise<RoomDiscovery | null> {
      const row = (await callRpc(
        DISCOVER_FUNCTION,
        { _code: code },
        "discoverByCode",
      )) as DiscoveryRow | null;
      return row ? toDiscovery(row) : null;
    },

    async findJoinableById(roomId: EntityId): Promise<Room | null> {
      const row = (await callRpc(
        ADMISSION_FUNCTION,
        { _room_id: roomId },
        "findJoinableById",
      )) as RoomRow | null;
      return row ? toRoom(row) : null;
    },

    async explain(input: RoomAdmissionLookup): Promise<RoomAdmissionFacts | null> {
      const row = (await callRpc(
        FACTS_FUNCTION,
        { _code: input.code ?? null, _room_id: input.roomId ?? null },
        "explain",
      )) as FactsRow | null;
      if (!row) return null;

      return {
        ...toDiscovery(row),
        isDeleted: Boolean(row.is_deleted),
        isBlocked: Boolean(row.is_blocked),
        viewerState: (row.viewer_state as RoomAdmissionFacts["viewerState"]) ?? null,
        viewerOtherRoomId: row.viewer_other_room_id,
      };
    },
  };
}
