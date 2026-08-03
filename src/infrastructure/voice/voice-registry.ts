/**
 * Voice transport registry — Sprint 1.1 §5.
 *
 * Ships EMPTY. The LiveKit adapter is implemented in the voice sprint; until
 * then `resolveVoiceAdapter()` returns null and callers degrade to text.
 */
import type { VoiceAdapter } from "./voice-adapter";

type VoiceAdapterFactory = () => VoiceAdapter;

const factories = new Map<string, VoiceAdapterFactory>();

export function registerVoiceAdapter(providerId: string, factory: VoiceAdapterFactory): void {
  if (factories.has(providerId)) {
    throw new Error(`Voice adapter already registered: ${providerId}`);
  }
  factories.set(providerId, factory);
}

export function resolveVoiceAdapter(providerId?: string): VoiceAdapter | null {
  const factory = providerId ? factories.get(providerId) : Array.from(factories.values())[0];
  return factory ? factory() : null;
}

export function isVoiceAvailable(): boolean {
  return factories.size > 0;
}

/** Test-support only. */
export function resetVoiceRegistry(): void {
  factories.clear();
}
