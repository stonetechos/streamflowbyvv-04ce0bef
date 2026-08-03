/**
 * Supabase profile directory adapter — Milestone F.0.
 *
 * User search reads the same `profiles` table as everything else, through the
 * `profiles_select_others` policy: soft-deleted people and anyone on either
 * side of a block are filtered by the store, never by this adapter, so a
 * client cannot widen the result set.
 */
import type { DirectoryProfileRecord, EntityId, ProfileDirectoryRepository } from "@/repository";

import type { DataConnection } from "../connection";
import { runMaybe, runQuery } from "../query-wrapper";
import { requireAvailable } from "../rooms/room-query-support";
import {
  DIRECTORY_COLUMNS,
  escapeSearchTerm,
  toDirectoryRecord,
  type DirectoryRow,
} from "./social-mapper";

const AGGREGATE = "profile_directory";

export function createSupabaseProfileDirectoryRepository(
  connection: DataConnection,
): ProfileDirectoryRepository {
  const context = (operation: string, entityId?: string) => ({
    aggregate: AGGREGATE,
    operation,
    ...(entityId ? { entityId } : {}),
  });

  return {
    async search(term: string, limit: number): Promise<readonly DirectoryProfileRecord[]> {
      requireAvailable(connection, context("search"));
      const safe = escapeSearchTerm(term);
      if (safe.length === 0) return [];

      const rows = await runQuery<DirectoryRow[]>(
        connection
          .client()
          .from("profiles")
          .select(DIRECTORY_COLUMNS)
          .is("deleted_at", null)
          .or(`display_name.ilike.%${safe}%,handle.ilike.%${safe}%,code.ilike.%${safe}%`)
          .order("display_name", { ascending: true })
          .limit(limit),
        context("search"),
      );
      return rows.map(toDirectoryRecord);
    },

    async findById(profileId: EntityId): Promise<DirectoryProfileRecord | null> {
      requireAvailable(connection, context("findById", profileId));
      const row = await runMaybe<DirectoryRow | null>(
        connection
          .client()
          .from("profiles")
          .select(DIRECTORY_COLUMNS)
          .eq("id", profileId)
          .is("deleted_at", null)
          .maybeSingle(),
        context("findById", profileId),
      );
      return row ? toDirectoryRecord(row) : null;
    },

    async findManyByIds(profileIds: readonly EntityId[]): Promise<readonly DirectoryProfileRecord[]> {
      if (profileIds.length === 0) return [];
      requireAvailable(connection, context("findManyByIds"));
      const rows = await runQuery<DirectoryRow[]>(
        connection
          .client()
          .from("profiles")
          .select(DIRECTORY_COLUMNS)
          .in("id", [...profileIds])
          .is("deleted_at", null),
        context("findManyByIds"),
      );
      return rows.map(toDirectoryRecord);
    },
  };
}
