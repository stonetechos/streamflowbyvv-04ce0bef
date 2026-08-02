/**
 * Code allocator adapter — Sprint 1.8.
 *
 * Delegates to the store's serialized allocator (Database Spec §3.11). The
 * Domain never formats or increments a code itself, so two concurrent room
 * creations can never collide.
 */
import { REPOSITORY_ERRORS, RepositoryError } from "@/repository";
import type { CodeAllocator, CodePrefix } from "@/repository/rooms/room-support.types";

import type { DataConnection } from "../connection";
import { toRepositoryError } from "../error-mapping";
import { requireAvailable } from "./room-query-support";

const ALLOCATE_CODE_FUNCTION = "allocate_code";

export function createSupabaseCodeAllocator(connection: DataConnection): CodeAllocator {
  return {
    async allocate(prefix: CodePrefix): Promise<string> {
      const context = { aggregate: "code_sequence", operation: "allocate", entityId: prefix };
      requireAvailable(connection, context);

      // The generated schema types do not describe database functions; the cast
      // is confined to this adapter and never leaves Infrastructure.
      const rpc = connection.client().rpc as unknown as (
        name: string,
        args: Record<string, unknown>,
      ) => PromiseLike<{ data: unknown; error: { message: string } | null }>;

      const { data, error } = await rpc(ALLOCATE_CODE_FUNCTION, { _prefix: prefix });
      if (error) {
        throw toRepositoryError(error as never, context);
      }
      if (typeof data !== "string" || data.length === 0) {
        throw new RepositoryError(REPOSITORY_ERRORS.QUERY_FAILED, context);
      }
      return data;
    },
  };
}
