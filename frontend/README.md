# Chattrix frontend

React 19 single-page app for Chattrix, built with Vite and deployed on Vercel at `www.chattrix.online`.

Setup, architecture and the API reference are in the [root README](../README.md). Code rules are in [CONTRIBUTING.md](../CONTRIBUTING.md).

## Run

```bash
cp .env.example .env
npm install
npm run dev        # http://localhost:5173, talks to the API on :3000
```

| Command | Does |
|---|---|
| `npm run dev` | Dev server with hot reload |
| `npm run lint` | ESLint |
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Serve the build locally |

## Layout

```
src/
├── App.jsx            # Routes and providers
├── main.jsx           # Entry point
├── index.css          # Aurora Glass design system
├── lib/api.js         # The only HTTP client
├── context/           # AuthContext, SocketContext
└── components/        # Pages and features
    └── ui/            # Glass primitives, Aurora background, Footer
```

## Environment

| Variable | Used for |
|---|---|
| `VITE_API_BASE_URL` | API origin. Empty in production, so requests go to `/api` on the same origin and `vercel.json` forwards them. |
| `VITE_SOCKET_URL` | Socket.io host. Points straight at the API, because Vercel rewrites do not proxy WebSockets. |
| `VITE_GOOGLE_CLIENT_ID` | Google sign-in. Leave empty to hide the button. |

- Local values go in `.env` (git-ignored).
- Production values go in the committed `.env.production`.
- Every `VITE_` value ships inside the public bundle, so never put a secret in one.

## Rules

- HTTP only through `src/lib/api.js`.
- Auth from `AuthContext`; sockets from `SocketContext`.
- Logged-in pages are wrapped in `ProtectedRoute`.
- Every data view has loading, empty and error states. No `alert()`.
- Use the Aurora Glass utilities and `components/ui/Glass.jsx`.
- Works at 360 px and with a keyboard.
