/**
 * Avatar storage abstraction — Sprint 1.1 §6, Storage Design v1.0 §5.
 *
 * Narrower than `FileStorage` on purpose: avatars have fixed constraints
 * (size, type, deterministic path), and encoding them here prevents each caller
 * from re-deriving them. Validation is pure and vendor-free; the upload itself
 * delegates to `FileStorage`.
 */
import type { EntityId } from "@/repository";

import type { FileStorage, StorageObjectRef } from "./file-storage";

export const AVATAR_CONSTRAINTS = Object.freeze({
  maxBytes: 2 * 1024 * 1024,
  allowedTypes: ["image/jpeg", "image/png", "image/webp"] as const,
  bucket: "avatars" as const,
});

export type AvatarValidationFailure = "too_large" | "unsupported_type";

export interface AvatarValidationResult {
  readonly valid: boolean;
  readonly failure?: AvatarValidationFailure;
}

export function validateAvatar(sizeBytes: number, contentType: string): AvatarValidationResult {
  if (sizeBytes > AVATAR_CONSTRAINTS.maxBytes) {
    return { valid: false, failure: "too_large" };
  }
  if (!AVATAR_CONSTRAINTS.allowedTypes.includes(contentType as never)) {
    return { valid: false, failure: "unsupported_type" };
  }
  return { valid: true };
}

/** Deterministic path so a re-upload overwrites rather than accumulates. */
export function avatarPath(userId: EntityId, extension: string): StorageObjectRef {
  return {
    bucket: AVATAR_CONSTRAINTS.bucket,
    path: `${userId}/avatar.${extension.replace(/^\./, "")}`,
  };
}

export interface AvatarStorage {
  /** Rejects invalid input before any network call. */
  upload(userId: EntityId, file: Blob, contentType: string): Promise<string>;
  remove(userId: EntityId, extension: string): Promise<void>;
}

export function createAvatarStorage(files: FileStorage): AvatarStorage {
  return {
    async upload(userId, file, contentType) {
      const validation = validateAvatar(file.size, contentType);
      if (!validation.valid) {
        throw new Error(`Invalid avatar: ${validation.failure}`);
      }
      const extension = contentType.split("/")[1] ?? "png";
      const ref = avatarPath(userId, extension);
      const object = await files.upload({
        ...ref,
        data: file,
        contentType,
        upsert: true,
      });
      return (
        files.getPublicUrl(object) ?? files.createSignedUrl({ ...ref, expiresInSeconds: 3600 })
      );
    },
    remove: (userId, extension) => files.remove(avatarPath(userId, extension)),
  };
}
