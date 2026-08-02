# StreamFlow — Object Storage Design v1.0

**Status:** Frozen (v1.0). Normative companion to Foundation Specification v1.0 §10.6.
**Scope:** Object storage buckets, paths, limits, and access rules for Version 1.0. Documentation only — no code, no SQL, no bucket provisioning.

---

## 1. Principles

1. Storage is Infrastructure. No Domain service holds a bucket name; a `StorageGateway` interface is implemented once per vendor.
2. Only a URL or an object key is ever persisted in the domain schema — never binary data and never a signed URL.
3. Public read is granted only where the content is already public by product design.
4. No user-supplied path is ever trusted. Keys are derived from the profile UUID and a server-generated object id.
5. Portability: bucket layout and path grammar must be reproducible on any S3-compatible store.

---

## 2. Buckets

| Bucket | Contents | Read access | Write access |
|---|---|---|---|
| `avatars` | Profile avatar images | Public read | Owner only, own prefix |
| `provider-assets` | Provider logos and badges used in the capability matrix | Public read | Admin only |

No other bucket exists in v1. Voice audio, media, captions, and Po transcripts are never stored as objects.

---

## 3. Path grammar

```text
avatars/{profile_id}/{object_id}.{ext}
provider-assets/{provider_key}/{asset_name}.{ext}
```

`profile_id` is the UUID, never the display code. `object_id` is server-generated per upload, so a replacement never overwrites in place and cached URLs stay valid until the old object is swept.

---

## 4. Limits and validation

| Rule | Value |
|---|---|
| Avatar max file size | 2 MB |
| Avatar accepted types | `image/png`, `image/jpeg`, `image/webp` |
| Avatar max dimensions | 1024 × 1024 px, resized on upload |
| Provider asset max size | 512 KB |
| Uploads per profile | 10 per hour (Foundation §19 pattern) |

Content type is validated from the file's actual bytes, not from the client-declared type or the extension. A failed validation returns `SF-SYS-INVALID-UPLOAD`.

---

## 5. Lifecycle

- Replacing an avatar writes a new object and updates `profiles.avatar_url`; the previous object is swept after 7 days.
- Profile erasure deletes every object under `avatars/{profile_id}/` in the same operation that anonymizes the profile.
- Orphan sweep: objects with no referencing row are removed after 30 days.

---

## 6. Prohibitions

No media file of any kind is uploaded, cached, or served. No provider artwork is copied from a provider — `provider-assets` holds only assets StreamFlow is licensed or permitted to use. No voice audio is ever written to storage.
