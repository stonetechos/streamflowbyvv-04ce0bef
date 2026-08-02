/**
 * Po Tool Registry — Sprint 1.0 §8, per ADR-001 §9 and
 * `docs/api/po-tool-registry.md`.
 *
 * Ships EMPTY on purpose. Po can only ever call a registered tool, so an empty
 * registry means Po is structurally incapable of acting — the correct state
 * before any domain service exists.
 */
import type { PoToolDescriptor } from "./po.types";

const tools = new Map<string, PoToolDescriptor<never, unknown>>();

export function registerPoTool<TInput, TOutput>(
  tool: PoToolDescriptor<TInput, TOutput>,
): void {
  if (tools.has(tool.name)) {
    throw new Error(`Po tool already registered: ${tool.name}`);
  }
  tools.set(tool.name, tool as unknown as PoToolDescriptor<never, unknown>);
}

export function getPoTool(name: string): PoToolDescriptor<never, unknown> | undefined {
  return tools.get(name);
}

export function listPoTools(): readonly PoToolDescriptor<never, unknown>[] {
  return Array.from(tools.values());
}

export function isPoToolRegistered(name: string): boolean {
  return tools.has(name);
}

/** Test-support only. */
export function resetPoToolRegistry(): void {
  tools.clear();
}
