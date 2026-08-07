# StreamFlow by Vedora Vision

# StreamFlow by Vedora Vision — Foundation Architecture.

You are the lead software architect for StreamFlow by Vedora Vision.

IMPORTANT:

This task is PLAN MODE ONLY. Do NOT generate application code, React components, SQL migrations, backend logic, UI pages, or files. Produce architecture and implementation planning only.

Project objective:

Build a universal watch-together platform where two or more users can synchronize playback of supported streaming services while each user authenticates with and uses their own legitimate streaming account. The platform must never redistribute copyrighted content, bypass DRM, or circumvent subscription or regional restrictions. Where a provider does not support third-party synchronization, the architecture must clearly mark that limitation rather than invent unsupported capabilities.

Primary goals:

- Vendor-neutral architecture.

- Portable codebase that can be opened and continued in Lovable, Cursor, Claude Code, VS Code, or any standard React environment.

- User-owned Supabase project only.

- Database schema managed entirely through SQL migrations stored in the repository.

- React + TypeScript + Vite + Tailwind + shadcn/ui.

- Supabase Auth, PostgreSQL, Realtime and Storage.

- Capacitor compatibility for future Android and iOS apps.

- Vercel deployment.

- LiveKit planned for voice communication.

- Modular provider abstraction layer for future streaming-service integrations.

- No hidden Lovable-specific backend logic.

Deliver only:

1. Overall system architecture.

2. Folder structure.

3. Module breakdown.

4. Data model overview (high level only).

5. Authentication strategy.

6. Realtime synchronization architecture.

7. Voice architecture.

8. Provider abstraction design.

9. Security architecture.

10. Development roadmap divided into implementation phases.

11. Coding standards and repository conventions.

12. Risks, assumptions, and items requiring validation with streaming providers.

Constraints:

- Do not generate implementation code.

- Do not generate SQL.

- Do not create files.

- Do not build UI.

- Do not scaffold pages.

- Do not estimate features beyond the requested architecture.

- Keep the architecture clean, modular, portable, and easy to continue outside Lovable.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://streamflowbyvv.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/9fb64234-2e83-4a74-bb9c-83d15f6b5a75).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
