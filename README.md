# Chattrix

A social media platform with microblogging + real-time messaging, built with React 19 and Node.js/Express 5.

---

## Tech Stack

| Layer       | Technology |
|------------|------------|
| Frontend   | React 19, Vite 6, Tailwind CSS v4, React Router v7, Axios, Socket.io-client |
| Backend    | Node.js, Express 5, Mongoose 8, JWT, Socket.io, Cloudinary v2, Nodemailer, Helmet, express-rate-limit, express-validator |
| Database   | MongoDB (Atlas in production, local `mongod` for development) |
| Deployment | Frontend: Vercel · Backend: Render |

---

## Project Structure

```
chattrix/
├── backend/               # Express API + Socket.io server
│   ├── src/
│   │   ├── server.js      # Entry point, HTTP + Socket.io
│   │   ├── app.js         # Express app, middleware, route mounting
│   │   ├── config/        # DB, Cloudinary, Nodemailer, CORS
│   │   ├── models/        # Mongoose schemas (User, Post, Conversation, Message, Notification)
│   │   ├── controllers/   # Request handlers
│   │   ├── services/      # Business logic (never touches `res` — returns plain result objects)
│   │   ├── middlewares/   # Auth, validation, rate limiting, error handling
│   │   ├── routes/        # Route definitions
│   │   └── utils/         # OTP generation, cookie option helpers
│   ├── .env
│   └── package.json
├── frontend/              # React SPA
│   ├── src/
│   │   ├── main.jsx
│   │   ├── App.jsx        # Router + route definitions
│   │   ├── api/axios.js   # Centralized API client (VITE_API_BASE_URL)
│   │   ├── context/       # AuthContext, ToastContext
│   │   ├── index.css      # Design system
│   │   └── components/
│   │       ├── layout/AppLayout.jsx  # Shared header/sidebar for all authenticated pages
│   │       └── ...                   # Page components
│   ├── .env / .env.production
│   └── package.json
├── backend-context.md     # Backend architecture docs
├── frontend-context.md    # Frontend architecture docs
├── PRD.md                 # Product requirements — what's built, what's next
└── BRD.md                 # Business model, revenue tiers, monetization roadmap
```

---

## Quick Start (local development)

### Prerequisites
- Node.js 18+
- A local MongoDB instance (`mongod` running on `27017`) — recommended for dev so you never touch production data
- A Cloudinary account (free tier is fine) for image uploads
- An SMTP provider (e.g. Brevo free tier) for verification/reset emails — optional for dev; OTPs are stored in the DB regardless of whether the email sends

### Backend Setup

```bash
cd backend
cp .env.sample .env
# Edit .env — at minimum set MONGO_URI, JWT_SECRET, JWT_REFRESH_SECRET
npm install
npm run dev        # nodemon, http://localhost:3000
```

### Frontend Setup

```bash
cd frontend
npm install
npm run dev        # Vite dev server, http://localhost:5173
```

`frontend/.env` points local dev at `http://localhost:3000`. `frontend/.env.production` points production builds at the deployed Render backend — Vite picks the right one automatically based on `npm run dev` vs `npm run build`.

---

## Environment Variables

### Backend (`backend/.env`)

```env
PORT=3000
NODE_ENV=development

MONGO_URI=mongodb://127.0.0.1:27017/chattrix_dev

JWT_SECRET=<random-string>
JWT_REFRESH_SECRET=<random-string>

SMTP_HOST=smtp-relay.brevo.com
SMTP_USER=<smtp_user>
SMTP_PASS=<smtp_password>
SMTP_PORT=587
SENDER_EMAIL=<your_email>

CLOUDINARY_CLOUD_NAME=<cloud_name>
CLOUDINARY_API_KEY=<api_key>
CLOUDINARY_API_SECRET=<api_secret>

CORS_ORIGINS=http://localhost:5173,https://your-frontend.vercel.app
```

In production, set `MONGO_URI` to your Atlas connection string and `NODE_ENV=production` (this also switches cookies to `sameSite: 'None'; secure: true`, required for the cross-site Vercel↔Render setup).

### Frontend

| File | Purpose |
|------|---------|
| `frontend/.env` | Used by `npm run dev` — points at local backend |
| `frontend/.env.production` | Used by `npm run build` — points at the deployed backend |

---

## Available Scripts

### Backend
| Command | Description |
|---------|-------------|
| `npm run dev` | Start with nodemon (auto-reload) |
| `npm start` | Production start |

### Frontend
| Command | Description |
|---------|-------------|
| `npm run dev` | Vite dev server (port 5173) |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |
| `npm run lint` | ESLint |

---

## Testing locally

1. Start `mongod` locally and point `MONGO_URI` at it — this keeps test data completely separate from production.
2. Start backend (`npm run dev`) and frontend (`npm run dev`).
3. Register a user through the UI. Since email delivery is optional in dev, verification/reset OTPs can be read directly from Mongo:
   ```bash
   mongosh chattrix_dev --eval "db.users.findOne({email:'you@example.com'}, {verifyOtp:1, resetOtp:1})"
   ```

---

## Documentation

| Document | Purpose |
|----------|---------|
| [backend-context.md](./backend-context.md) | Backend architecture, schemas, API endpoints, auth flow |
| [frontend-context.md](./frontend-context.md) | Frontend architecture, design system, component patterns |
| [PRD.md](./PRD.md) | Product requirements, feature status, acceptance criteria |
| [BRD.md](./BRD.md) | Business model, revenue tiers, projections, implementation phases |
