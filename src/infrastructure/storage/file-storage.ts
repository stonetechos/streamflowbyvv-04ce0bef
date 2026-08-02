/**
 * File storage abstraction — Sprint 1.1 §6, Storage Design v1.0.
 *
 * Object storage is expressed as buckets, paths, and signed URLs — concepts
 * every provider shares — so the storage vendor is replaceable. No bucket is
 * created and no upload is performed in Sprint 1.1.
 */

/** Logical buckets defined by Storage Design v1.0 §3. */
export type StorageBucket = "avatars" | "room-assets" | "exports";

export interface StorageObjectRef {
  readonly bucket: StorageBucket;
  /** Path within the bucket, following the grammar in Storage Design §4. */
  readonly path: string;
}

export interface StorageObject extends StorageObjectRef {
  readonly sizeBytes: number;
  readonly contentType: string;
  readonly updatedAt: string;
}

export interface UploadRequest extends StorageObjectRef {
  readonly data: Blob | ArrayBuffer;
  readonly contentType: string;
  /** Replace an existing object at the same path. */
  readonly upsert?: boolean;
  /** Cache-Control max-age, in seconds. */
  readonly cacheSeconds?: number;
}

export interface SignedUrlRequest extends StorageObjectRef {
  readonly expiresInSeconds: number;
}

/**
 * Private buckets are the default; a public URL is only valid for buckets that
 * Storage Design marks public.
 */
export interface FileStorage {
  upload(request: UploadRequest): Promise<StorageObject>;
  remove(ref: StorageObjectRef): Promise<void>;
  exists(ref: StorageObjectRef): Promise<boolean>;
  createSignedUrl(request: SignedUrlRequest): Promise<string>;
  getPublicUrl(ref: StorageObjectRef): string | null;
}
