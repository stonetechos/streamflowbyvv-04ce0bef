/**
 * Shared realtime channel registry — QA fix.
 *
 * The publisher and the subscriber both talk about the same aggregate, so they
 * name the same topic. Opening that topic twice on one Supabase client leaves
 * the second channel unjoined: the lobby then publishes fine but never hears
 * anybody else, which is how a host could stay on "invite your friends" while
 * a guest was already sitting in the room.
 *
 * One reference-counted channel per topic per client fixes it. The registry
 * owns the socket lifetime only; it decides nothing about the payloads.
 */
import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";

import { logger } from "@/foundation/logging";

const MODULE = "events.realtime.channels";

interface Entry {
  readonly channel: RealtimeChannel;
  readonly joined: Promise<void>;
  refCount: number;
}

const entries = new Map<string, Entry>();

export function channelName(aggregateType: string, aggregateId: string): string {
  return `sf:${aggregateType}:${aggregateId}`;
}

export interface ChannelLease {
  readonly channel: RealtimeChannel;
  /** Resolves once the socket has joined (or the attempt has settled). */
  readonly joined: Promise<void>;
  release(client: SupabaseClient, name: string): void;
}

/**
 * Returns the shared channel for `name`, creating and joining it on first use.
 * `configure` runs before the join so listeners are bound from the start; on a
 * cached channel it still runs, because supabase-js consults bindings at
 * message time.
 */
export function acquireChannel(
  client: SupabaseClient,
  name: string,
  configure?: (channel: RealtimeChannel) => void,
): ChannelLease {
  const existing = entries.get(name);
  if (existing) {
    existing.refCount += 1;
    configure?.(existing.channel);
    return { channel: existing.channel, joined: existing.joined, release };
  }

  const channel = client.channel(name, {
    config: { broadcast: { ack: false, self: false } },
  });
  configure?.(channel);

  const joined = new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, 5000);
    channel.subscribe((status) => {
      if (status === "SUBSCRIBED" || status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        clearTimeout(timer);
        resolve();
      }
    });
  });

  entries.set(name, { channel, joined, refCount: 1 });
  return { channel, joined, release };
}

function release(client: SupabaseClient, name: string): void {
  const entry = entries.get(name);
  if (!entry) return;
  entry.refCount -= 1;
  if (entry.refCount > 0) return;
  entries.delete(name);
  void client
    .removeChannel(entry.channel)
    .catch((error: unknown) =>
      logger.warn("Realtime channel release failed", { module: MODULE, error }),
    );
}
