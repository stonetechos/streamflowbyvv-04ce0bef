/**
 * Po Prompt Library — Sprint 1.0 §8, per ADR-001 §8.
 *
 * Ships EMPTY. Prompts are versioned, reviewable data; no prompt text may be
 * written inline at a call site.
 */
import type { PoPromptDescriptor } from "./po.types";

const prompts = new Map<string, PoPromptDescriptor>();

export function registerPoPrompt(prompt: PoPromptDescriptor): void {
  const id = `${prompt.id}@${prompt.version}`;
  if (prompts.has(id)) {
    throw new Error(`Po prompt already registered: ${id}`);
  }
  prompts.set(id, prompt);
}

export function getPoPrompt(id: string, version: string): PoPromptDescriptor | undefined {
  return prompts.get(`${id}@${version}`);
}

export function listPoPrompts(): readonly PoPromptDescriptor[] {
  return Array.from(prompts.values());
}

/** Test-support only. */
export function resetPoPromptLibrary(): void {
  prompts.clear();
}
