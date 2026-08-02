/**
 * Infrastructure layer entry point — Sprint 1.1.
 *
 * The only layer allowed to know a vendor exists (Foundation §2). Server-only
 * modules (`*.server.ts`) are deliberately absent from this barrel so they
 * cannot be pulled into a client bundle through it.
 */
export * from "./ai";
export * from "./http";
export * from "./storage";
export * from "./supabase";
export * from "./voice";
