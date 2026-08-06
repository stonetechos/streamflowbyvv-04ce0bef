# ADR-016 — Authentication and Identity Ownership

**Status:** Accepted. **Date:** 2026-08-06.
**Type:** Ownership / boundary decision.
**Extends:** Foundation Specification v1.0 §Layering, Architecture Constitution v2.0.0 §C (Engine Architecture Pack).
**Does not modify:** any frozen document. Resolves M0 finding GAP-AUTH-OWNERSHIP ("authentication has no named owning engine").

---

## 1. Context

The Constitution names thirteen engines plus the cross-cutting Experience subsystem. None of them
is named as the owner of authentication, session lifecycle, or identity provisioning. In the
implementation, authentication logic is spread across:

- `src/routes/auth*.tsx` and `src/routes/auth.callback.tsx` (presentation + callback trace),
- `src/features/auth/**` (sign-in, sign-up, continuation, pending destination),
- `src/infrastructure/supabase/**` (vendor client, session storage),
- database triggers (`provision_profile_for_auth_user`, `allocate_profile_handle`).

Because no engine owns it, three failure classes recurred: profile rows missing after sign-up,
deep-link intent lost across the auth boundary, and duplicate consumption of callback tokens.
Each was fixed locally rather than at an owner boundary.

## 2. Decision

**Authentication is not a new engine. It is a Platform Foundation capability with one named owner:
the Identity Boundary.**

The Identity Boundary is defined as:

| Concern | Owner | Layer |
| --- | --- | --- |
| Credential exchange, session issue/refresh/revoke | Identity Boundary | Infrastructure |
| Auth-user → profile provisioning | Identity Boundary | Infrastructure (DB trigger) |
| `current_profile_id()` resolution for authorization predicates | Identity Boundary | Infrastructure (SECURITY DEFINER) |
| Post-auth destination and intent continuation | Identity Boundary | Feature |
| Sign-in / sign-up / callback surfaces, error copy | Experience subsystem | Presentation |
| Role and capability checks (`has_role`, `is_room_controller`) | Room Engine and Moderation Engine, reading the boundary | Domain |

Rules that follow from this decision:

1. **One session source.** No engine may read the vendor session directly. Engines receive an
   already-resolved `profileId`. Any code outside `src/infrastructure/supabase/**` that calls
   `auth.getSession()` is a boundary violation.
2. **Identity is never client-asserted.** Every authorization predicate resolves identity
   server-side via `current_profile_id()`. A caller-supplied profile id is input, never authority.
   Verified by `CERT-AUTHZ-01..07`.
3. **Provisioning is server-side and idempotent.** Profile creation happens in a database trigger,
   not in application code after sign-in, so an interrupted client cannot produce a session
   without a profile.
4. **Continuation state is durable and single-use.** Deep-link and invite intent survives the auth
   round trip in explicit storage, is claimed exactly once, and is cleared on claim.
5. **No engine owns "user".** The Community Engine owns social graph, the Room Engine owns
   membership; neither owns identity.

## 3. Consequences

- The Constitution's engine list is unchanged; Platform Foundation gains one named boundary.
- Authorization certification rows (`AUTHZ-*`) become the Identity Boundary's Definition of Done,
  and they are the boundary's only accepted evidence.
- Future auth methods (SSO, passkeys, native shells) change the Infrastructure implementation only;
  no engine signature changes.

## 4. Rejected alternatives

| Alternative | Why rejected |
| --- | --- |
| Create a 14th "Auth Engine" | Authentication carries no domain state or business authority; an engine would be a naming exercise and would invite domain logic into a vendor-coupled area. |
| Give ownership to the Community Engine | Conflates identity with social graph; a suspended social profile must not imply a revoked session. |
| Leave ownership implicit | Is the status quo that produced the three recurring failure classes above. |
