/**
 * Infrastructure layer entry point — Sprint 1.1, hardened in Sprint 1.3.
 *
 * The only layer allowed to know a vendor exists (Foundation §2). Server-only
 * modules (`*.server.ts`) are deliberately absent from this barrel so they
 * cannot be pulled into a client bundle through it.
 *
 * Sprint 1.3 §6: the Supabase adapter is NOT re-exported here. Generated
 * schema types and driver clients would otherwise escape Infrastructure
 * through the barrel. Consumers use `./persistence`; adapter-internal code
 * imports `./supabase/*` directly.
 */
export * from "./ai";
export * from "./http";
export * from "./persistence";
export * from "./storage";
export * from "./voice";
