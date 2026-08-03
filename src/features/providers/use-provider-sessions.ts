/**
 * Provider sessions hook — Sprint K.1.
 *
 * Each provider owns an independent session. This hook joins two sources and
 * decides nothing itself:
 *
 *  - the adjudicated catalog (Domain) says what a provider is and whether it
 *    may be used at all;
 *  - a device-local connection record says whether this person has already
 *    signed in with that provider and when they last used it.
 *
 * The record is a boolean and two timestamps. StreamFlow never stores an OTT
 * username, password, cookie, or token, and never authenticates on the
 * member's behalf — connecting simply means "I signed in there myself".
 */
import { useCallback, useMemo, useState } from "react";

import {
  deriveProviderSession,
  type ProviderConnectionRecord,
  type ProviderSession,
} from "@/domain";
import { readLocalJson, writeLocalJson } from "@/foundation/preferences";

const STORAGE_KEY = "provider-connections";

type ConnectionMap = Readonly<Record<string, ProviderConnectionRecord>>;

function readConnections(scope: string | null): ConnectionMap {
  return readLocalJson<ConnectionMap>(STORAGE_KEY, scope) ?? {};
}

export interface ProviderSessionsModel {
  /** Sessions keyed by provider key. */
  readonly sessions: ReadonlyMap<string, ProviderSession>;
  session(providerKey: string): ProviderSession | null;
  /** Records that the member confirmed signing in with this provider. */
  connect(providerKey: string): void;
  /** Forgets the connection. Nothing sensitive was ever stored. */
  disconnect(providerKey: string): void;
}

export interface ProviderSessionSource {
  readonly key: string;
  readonly providerId: string | null;
  readonly name: string;
  readonly isSelectable: boolean;
  readonly supportsDeepLink: boolean;
}

/**
 * @param profileId scopes the records to the signed-in person on this device.
 * @param sources one entry per provider the shelf knows about.
 */
export function useProviderSessions(
  profileId: string | null,
  sources: readonly ProviderSessionSource[],
): ProviderSessionsModel {
  const [connections, setConnections] = useState<ConnectionMap>(() => readConnections(profileId));

  const sessions = useMemo(() => {
    const map = new Map<string, ProviderSession>();
    for (const source of sources) {
      map.set(
        source.key,
        deriveProviderSession({
          providerKey: source.key,
          providerId: source.providerId,
          displayName: source.name,
          isSelectable: source.isSelectable,
          supportsDeepLink: source.supportsDeepLink,
          connection: connections[source.key] ?? null,
        }),
      );
    }
    return map;
  }, [connections, sources]);

  const connect = useCallback(
    (providerKey: string) => {
      setConnections((current) => {
        const now = new Date().toISOString();
        const existing = current[providerKey];
        const next: ConnectionMap = {
          ...current,
          [providerKey]: {
            providerKey,
            connectedAt: existing?.connectedAt ?? now,
            lastUsedAt: now,
          },
        };
        writeLocalJson(STORAGE_KEY, next, profileId);
        return next;
      });
    },
    [profileId],
  );

  const disconnect = useCallback(
    (providerKey: string) => {
      setConnections((current) => {
        const next = { ...current };
        delete next[providerKey];
        writeLocalJson(STORAGE_KEY, next, profileId);
        return next;
      });
    },
    [profileId],
  );

  const session = useCallback(
    (providerKey: string) => sessions.get(providerKey) ?? null,
    [sessions],
  );

  return { sessions, session, connect, disconnect };
}
