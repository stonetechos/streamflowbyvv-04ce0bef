# CI Failure Review — "Missing Lovable API key"

Review only. No files, secrets, or workflows were changed.

## Missing variable

- `LOVABLE_API_KEY` — the only variable whose absence aborts application startup.

## Where it is read

| Variable | Source file | Read timing | Present? |
| --- | --- | --- | --- |
| `LOVABLE_API_KEY` | `src/routes/lovable/email/auth/webhook.ts:20` (`process.env["LOVABLE_API_KEY"]!` passed to `createAuthEmailHandler` at **module scope**) | Import time — throws before any request | Absent in repo, absent in GitHub Actions |
| `LOVABLE_API_KEY` | `src/routes/lovable/email/auth/preview.ts:69` | Inside handler — harmless in CI | Absent in CI |
| `LOVABLE_SEND_URL` | `src/routes/lovable/email/auth/webhook.ts:23` | Module scope, optional (`undefined` allowed) | Absent, not required |
| `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` | `src/integrations/supabase/auth-middleware.ts`, `src/config/server-env.server.ts` | Inside handlers, optional in schema | Present in `.env` (tracked) |
| `SUPABASE_SERVICE_ROLE_KEY` | `src/integrations/supabase/client.server.ts`, `server-client.server.ts` | Inside handlers | Absent — not needed for boot |
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID` | `.env`, `src/config/env.ts` (all optional with defaults) | Build/import time | Present in tracked `.env` |
| `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET` | `src/config/server-env.server.ts` | Lazy, optional | Absent — not needed for boot |

## Root cause

`createAuthEmailHandler` (`node_modules/@lovable.dev/email-js/dist/index.js:192`) throws `Missing Lovable API key` immediately when `apiKey` is falsy. The call sits at module top level in the webhook route, so the whole SSR route graph fails to evaluate as soon as the app boots.

Expected source of the value: **Node `process.env` on the server** (`vite.config.ts` also copies non-`VITE_` `.env` values into `process.env`). It is **not** a Vite client variable.

Where it exists today:
- Lovable project secrets — injected into preview/published runtimes only.
- Local dev — only if the developer's untracked env provides it; the tracked `.env` does **not** contain it.
- Repository configuration — **absent** (`.env` has 6 Supabase vars only).
- GitHub Actions — **absent**; no workflow sets `env:` or references `secrets.LOVABLE_API_KEY`.

Only the workflow that boots the app fails: `.github/workflows/playwright.yml`, whose Playwright `webServer` runs `bun run dev`. `format`, `lint`, `typecheck`, `architecture`, `certification-guard` and `docs-validate` never evaluate the route.

## Required env vars for startup

Hard requirement: `LOVABLE_API_KEY` (non-empty string).
Everything else is lazy/optional and does not block boot.

## Smallest action to make GitHub Actions boot

Add a repository secret `LOVABLE_API_KEY` and expose it to the Playwright job only:

```yaml
# .github/workflows/playwright.yml -> jobs.playwright.env
LOVABLE_API_KEY: ${{ secrets.LOVABLE_API_KEY }}
```

CI never receives a real signed webhook, so the value only needs to be non-empty for the boot guard; using the real project key is unnecessary and avoidable in CI.

Not proposed here (and not done): moving the handler construction inside the request handler, which would remove the boot-time dependency entirely — that is a code change requiring its own sprint authorization.
