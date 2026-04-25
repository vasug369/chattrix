# Chattrix

A social media platform with microblogging + real-time messaging, built with React 19 and Node.js/Express 5.

---

## Tech Stack

| Layer       | Technology |
|------------|------------|
| Frontend   | React 19, Vite 6, Tailwind CSS v4, React Router v7, Axios, Socket.io-client |
| Backend    | Node.js, Express 5, Mongoose 8, JWT, Socket.io, Cloudinary, Nodemailer |
| Database   | MongoDB Atlas |
| Deployment | Frontend: Vercel · Backend: Render |

---

## Project Structure

```
chattrix/
├── backend/               # Express API + Socket.io server
│   ├── src/
│   │   ├── server.js      # Entry point, HTTP + Socket.io
│   │   ├── app.js         # Express app, routes
│   │   ├── config/        # DB, Cloudinary, Nodemailer
│   │   ├── models/        # Mongoose schemas
│   │   ├── controllers/   # Request handlers
│   │   ├── services/      # Business logic
│   │   ├── middlewares/    # Auth middleware
│   │   └── routes/        # Route definitions
│   ├── .env
│   └── package.json
├── frontend/              # React SPA
│   ├── src/
│   │   ├── main.jsx       # React root
│   │   ├── App.jsx        # Router
│   │   ├── index.css      # Design system
│   │   └── components/    # All page components
│   ├── .env / .env.local
│   └── package.json
├── docs/                  # Static build (old deployment)
├── backend-context.md     # Backend architecture docs
├── frontend-context.md    # Frontend architecture docs
└── PRD.md                 # Product requirements
```

---

## Quick Start

### Prerequisites
- Node.js 18+
- MongoDB Atlas cluster (or local MongoDB)
- Cloudinary account (for image uploads)

### Backend Setup

```bash
cd backend
cp .env.sample .env
# Edit .env with your actual credentials (see Environment Variables below)
npm install
npm run dev        # Starts with nodemon on port 3000
```

### Frontend Setup

```bash
cd frontend
# Edit .env to point to your backend
npm install
npm run dev        # Starts Vite dev server on port 5173
```

---

## Environment Variables

### Backend (`backend/.env`)

```env
PORT=3000

# MongoDB Atlas
DB_Host=<atlas_username>
DB_Pass=<atlas_password>
DB_Name=chattrix

# JWT
JWT_SECRET=<your_jwt_secret>
JWT_REFRESH_SECRET=<your_refresh_secret>    # ⚠️ REQUIRED but missing from current .env
NODE_ENV=development

# Email (Nodemailer)
SMTP_USER=<smtp_user>
SMTP_PASS=<smtp_password>
SMTP_PORT=587
SENDER_EMAIL=<your_email>

# Cloudinary (currently hardcoded as fallback — should be in .env)
CLOUDINARY_CLOUD_NAME=<cloud_name>
CLOUDINARY_API_KEY=<api_key>
CLOUDINARY_API_SECRET=<api_secret>
```

### Frontend (`frontend/.env`)

```env
VITE_API_BASE_URL=http://localhost:3000
```

> ⚠️ **Known issue**: `VITE_API_BASE_URL` is defined but not used by any component. All components hardcode their base URL.

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

## Known Issues

See `backend-context.md` and `frontend-context.md` for detailed issue lists. Critical items:

1. **Auth controller double-response bug** — services send responses directly, then controllers try to send again
2. **`JWT_REFRESH_SECRET` missing from `.env`** — refresh token operations fail
3. **All frontend routes unprotected** — `ProtectedRoute` is commented out
4. **Hardcoded base URLs in every component** — `VITE_API_BASE_URL` env var is unused
5. **Credentials in source code** — Cloudinary keys and Mailtrap credentials hardcoded

---

## Documentation

| Document | Purpose |
|----------|---------|
| [backend-context.md](./backend-context.md) | Backend architecture, schemas, API endpoints, auth flow |
| [frontend-context.md](./frontend-context.md) | Frontend architecture, design system, component patterns |
| [PRD.md](./PRD.md) | Product requirements, feature status, acceptance criteria |
| [BRD.md](./BRD.md) | Business model, revenue tiers, projections, implementation phases |
