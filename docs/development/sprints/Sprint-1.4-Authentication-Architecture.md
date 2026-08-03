# Sprint 1.4 — Authentication Architecture (Backend-Agnostic)

**Status:** Complete. **Mode:** Build. **Preceded by:** Sprint 1.3 — Persistence Decoupling.
**Traceability:** Foundation §2, §3, §5, §7, §10, §13, §16, §17; ADR-009; MVP §3; Build Rules §1, §18, §21, §25.

---

## 1. Objective

Build the authentication _architecture_ only. No identity provider is connected. Supabase Auth, OAuth, and secrets are explicitly out of scope. The module must compile, typecheck, build and run with **zero** authentication implementations bound — and must say so honestly rather than pretending to sign anyone in.

---

## 2. Layer map

| Layer          | Files                                                                                                                  | Vendor-aware |
| -------------- | ---------------------------------------------------------------------------------------------------------------------- | ------------ |
| Presentation   | `src/routes/auth.tsx`, `auth.index.tsx`, `auth.sign-out.tsx`, `_authenticated.tsx`, `_authenticated.account.tsx`       | No           |
| Feature        | `src/features/auth/` — provider, state machine, route guard, feature flag                                              | No           |
| Domain         | `src/domain/auth/` — models, errors, authorization model, SessionService, AuthorizationService, PermissionService      | No           |
| Repository     | `src/repository/auth/` — `AuthRepository`, `SessionRepository`, `RoleRepository`, `AuthIdentityRepository` + DI tokens | No           |
| Infrastructure | _none this sprint_ — deliberately empty                                                                                | —            |

The Infrastructure row being empty is the point: the module is complete without it.

---

## 3. Domain models (§1)

`AuthMethod` is `email_password | email_magic_link` — the only v1 methods (MVP §3). `SessionStatus` includes `unknown` as the honest pre-resolution state, so the UI never renders "signed out" before it knows. `AuthSession` is **token-free**: access and refresh material never leave the adapter and are never cached (Foundation §10.1, §18 "Never cached"). `AuthIdentity` carries `subjectId` → `profileId`, which is the single point of auth-provider coupling (`profiles.auth_user_id`, Database Spec §2).

---

## 4. Error taxonomy (§9)

Nine `SF-AUTH-*` codes, each with `messageKey`, `severity`, `retryable` and an optional `recoveryActionKey` (Foundation §16.1). Every `messageKey` resolves 1:1 under `error.auth.*` in **both** launch bundles from this commit — localization is never retrofitted (Foundation §16.2, §17).

`SF-AUTH-PROVIDER-UNAVAILABLE` is the default verdict of this sprint, not an error condition to be fixed later.

---

## 5. Authorization (ADR-009)

Roles live only in `user_roles`, read through `RoleRepository`, which an adapter will back with the security-definer role-check function. The rules enforced here:

- No role is ever stored on a profile, in localStorage, or in a session claim.
- `AuthorizationService` answers role questions; `PermissionService` derives permissions from `ROLE_PERMISSIONS` — data, not conditionals.
- Client-side permission checks hide controls only. They are a convenience, never the enforcement point; the database remains the authority.
- Room roles (`host`, `co_host`, `guest`) are membership attributes and are deliberately absent from `AppRole`.

---

## 6. Session state machine (§8)

`src/features/auth/auth-state.ts` is a pure reducer — no I/O, no React, no vendor — so the legal transitions can be reasoned about in isolation. `AuthProvider` owns the effects: resolve once on mount, then follow provider-driven changes through `onSessionChanged`, unsubscribing on unmount. Roles are re-resolved whenever the session identity changes and cleared on sign-out.

---

## 7. Protected routes (§7)

`RequireAuth` guards the pathless `_authenticated` layout, so the guard runs once and no protected page mounts before the session settles. Unsettled state renders a loading surface, never a redirect — redirecting on `unknown` would sign users out on every refresh. Denial renders `ErrorState` with `SF-AUTH-PERMISSION-DENIED`, never a blank page.

The layout is `ssr: false` because session resolution belongs to an adapter that does not exist yet; a server-side gate arrives with that adapter.

---

## 8. Dependency injection (§12)

`src/domain/service-registry.ts` mirrors the repository registry: token → lazy factory → memoized instance. `registerAuthServices()` is idempotent. Services resolve their repositories **lazily**, which is what allows the whole module to exist with nothing bound: an unbound adapter yields `SF-AUTH-PROVIDER-UNAVAILABLE` instead of a crash at import time.

---

## 9. Feature flag

`auth.core`, registered `off` (Foundation §7). The architecture ships; the capability does not.

---

## 10. Scope discipline (Build Rules §1)

**Not built, deliberately:** any identity provider binding, OAuth, sign-up/sign-in forms that submit, password reset UI, profile management, session persistence, and Po involvement (Po remains non-operational).

The sign-in page has no form. A form that cannot authenticate would be a lie in the UI.

---

## 11. Verification

- `bun run arch:check` — passed; no vendor leakage outside Infrastructure.
- `tsgo --noEmit` — passed.
- `bun run build` — passed.
- `/auth` renders and reports adapter status; `/account` is guarded.

---

## 12. Next sprint entry conditions

Sprint 1.5 binds a real identity adapter in Infrastructure: implement the four repository contracts, bind them at the composition root, flip `auth.core`, and replace the placeholder sign-in surface with a real form. No file outside `src/infrastructure/` and the two placeholder routes should need to change — that is the test of this sprint's correctness.
