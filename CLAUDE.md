# CLAUDE.md

Rules for any Claude session working in this repository. Humans follow the same rules in [CONTRIBUTING.md](CONTRIBUTING.md).

## What Chattrix is

- A community-first social app: a **chronological feed** of people you follow, plus **real-time direct messages**.
- Owner: Vasu Gupta. Personal project, not part of any other organisation's workspace or process.
- Stage: free-tier MVP live at `www.chattrix.online`, pre-launch. Current focus is launch readiness (safety, legal pages, CI), then communities.

## Product rules (never break these)

1. **Chronological, always.** No ranking, no "for you" feed, no engagement-based ordering.
2. **No ads, no third-party ad trackers, no data selling.**
3. **Never charge for talking to people.** Messaging, privacy controls and data export stay free. Paid tiers sell tools, not connections.
4. **Calm by design.** No streaks, no infinite pull, no dark patterns.
5. **Safe before big.** Moderation and privacy ship before growth features.

If a request conflicts with one of these, say so and stop before writing code.

## Private documents

- `PRD.md`, `BRD.md`, `*-context.md` and `Chattrix-*.pdf` sit in the repo folder but are **git-ignored and must never be committed**. The repository is public.
- Read them for product context. Never quote business numbers (pricing, revenue, projections) in committed files, commits or PRs.
- Never run `git add -A`, `git add .` or `git commit -a`. Stage by path, then read `git status --short`.

## Stack and layout

| Layer | Tech | Hosting |
|---|---|---|
| Frontend | React 19, Vite 6, Tailwind v4, React Router 7, Axios, Socket.io client | Vercel, `www.chattrix.online` |
| Backend | Node.js, Express 5 (ESM), Mongoose 8, Zod 4, Socket.io, JWT cookies | AWS EC2 with pm2, `api.chattrix.online` |
| Data | MongoDB Atlas · Cloudinary for images · Resend / Brevo / SMTP for mail | |
| Tests | Vitest + Supertest + mongodb-memory-server (backend only) | |

- `backend/src/`: `routes → middlewares → controllers → services → models`. Also `validation/` (Zod), `realtime/` (Socket.io), `config/`, `utils/`.
- `frontend/src/`: `App.jsx` (routes), `lib/api.js` (the only HTTP client), `context/` (Auth, Socket), `components/`, `components/ui/` (Glass primitives).

## Commands

```bash
# backend
cd backend && npm install
npm run dev                         # API on :3000
npm test                            # full suite
npx vitest run tests/posts.test.js  # one suite: the fast loop while working

# frontend
cd frontend && npm install
npm run dev                         # Vite on :5173
npm run lint
npm run build
```

Run the smallest check that proves a change. Run the whole backend suite before opening a PR.

## Backend rules

- **Routes** wire only: rate limiter, then `validate(schema)`, then a controller. Register literal paths before `/:id`.
- **Every endpoint has a Zod schema** in `validation/`. `validate` replaces `req.body` and `req.params` with parsed data; query values are read from `req.validatedQuery`. Use `.strict()` on objects that reach a Mongoose update.
- **Controllers** are wrapped in `asyncHandler`, read the request, call a service, and respond with `{ success: true, data }` (or `...result` for paginated lists).
- **Services** never touch `req` or `res`. They return values or throw `AppError` helpers (`badRequest`, `unauthorized`, `forbidden`, `notFound`, `conflict`).
- **Errors** reach the client only through `middlewares/errorHandler.js`. Never send raw Mongoose or stack messages.
- **Identity comes from the session** (`req.user._id`), never from the body, params or socket query.
- **Ownership is checked in the service** for every edit or delete.
- **Writes** use `writeLimiter`; auth endpoints use `authLimiter`; OTP endpoints use `otpLimiter`.
- **Lists are paginated** (`page`, `limit`, limit capped at 50).
- **Config** comes from `config/env.js`, which validates at boot. A new env var is added to `env.js` and `backend/.env.example` in the same change. No hardcoded fallbacks for credentials.
- **Sockets**: handlers import `realtime/socket.js`, never `server.js`. The handshake is authenticated by the session cookie.
- No `console.log` in new code.

## Frontend rules

- All HTTP goes through `src/lib/api.js`. No other axios instance, no hardcoded API URLs.
- Auth state comes from `AuthContext`; sockets from `SocketContext`.
- Logged-in pages sit behind `ProtectedRoute` in `App.jsx`. The server still checks access; the route guard is only for UX.
- Every data view shows **loading, empty and error** states. No `alert()`, `confirm()` or `prompt()`.
- Use the Aurora Glass tokens and utilities from `src/index.css` and `components/ui/Glass.jsx`. No one-off colours.
- Works at **360 px** width, is keyboard-navigable, and post images have alt text.
- Public build config goes in `frontend/.env.production`. Nothing secret ever goes in a `VITE_` variable, because it ships in the bundle.

## Security rules

- Access is decided on the server. Never trust the URL, the browser or a client-sent user id.
- Every new endpoint ships with tests for: success, validation failure (422), unauthenticated (401) and, where relevant, someone else's resource (403/404).
- Secrets live only in environment variables on the host. Never in code, `.env.example`, tests, logs or commit messages.
- Before committing, scan the diff for keys, tokens, emails and connection strings.
- New dependencies: prefer well-maintained packages; say why in the PR.
- Check changes against OWASP Top 10 (web and API).

## Git and PRs

- `main` is production: a push to `main` touching `backend/` deploys the API, and Vercel deploys the frontend.
- Branch from `main`: `feat/…`, `fix/…`, `perf/…`, `docs/…`, `chore/…`, `test/…`.
- Commit messages follow Conventional Commits: `feat: add block user endpoint`.
- One topic per PR. Fill in the PR template. The owner reviews and merges.
- Never force-push `main`. Never rewrite published history without the owner asking.
- Delete the branch after merge.

## Definition of done

A change is done when:

1. It works on desktop and at 360 px.
2. Backend tests cover success, validation failure and unauthorized access.
3. `npm test` (backend) and `npm run lint` + `npm run build` (frontend) pass.
4. No secrets, no `console.log`, no `alert()`.
5. README (API table, env vars, scripts) is updated in the same PR when behaviour changes.

## Writing style

- Brief, simple English. Bullets over paragraphs.
- Docs and comments describe the present. History belongs in commit messages and PR bodies.
- Explain *why* in comments only where the code cannot.

## Before risky actions, ask

Ask the owner first before you: delete data or branches, change production config or secrets, change hosting or DNS, rewrite git history, add a paid service, or change a product rule above.
