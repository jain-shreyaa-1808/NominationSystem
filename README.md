# 🏆 Nomination System

A full-stack corporate awards nomination platform built with the MERN stack. Enables a structured, multi-level nomination workflow — from team managers up through senior managers to a director — with AI-powered recommendations and strict data privacy between levels.

---

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Features](#features)
- [Roles & Workflow](#roles--workflow)
- [Data Privacy](#data-privacy)
- [Project Structure](#project-structure)
- [Local Setup](#local-setup)
- [Environment Variables](#environment-variables)
- [AI Recommendations](#ai-recommendations)
- [API Reference](#api-reference)
- [Deployment (Render.com)](#deployment-rendercom)

---

## Overview

The system manages a corporate awards cycle across multiple organisational levels:

```
Managers (×5 per tower)
    ↓  each nominates 6 people (1 per award category)
Senior Manager
    ↓  reviews pool of 30 nominations, selects 1 per category
Director
    ↓  reviews all senior manager selections, takes final action
```

Each level only sees what they need — no nomination names or data flow downward, only a green "Action Taken" status indicator.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Database | MongoDB Atlas (Mongoose 7) |
| Backend | Node.js + Express.js |
| Frontend | React 18 (Create React App) |
| Auth | JWT (8h expiry, auto-logout on expiry) |
| AI | Groq API — Llama 3.1 8B (free tier) |
| Hosting | Render.com (single service, full-stack) |

---

## Features

### Core
- Role-based access control (Admin, Manager, Senior Manager, Director)
- Multi-tower support with multiple directors (each for a technology group)
- Managers can save drafts and submit when ready
- Green / grey status indicators at every level
- Full pipeline visibility per role — no cross-level data leakage

### AI Recommendations (Senior Manager & Director)
- Click **✨ AI Recommend** in the Pool tab to get AI-powered candidate recommendations per category
- AI cites specific nomination remarks and compares candidates
- Built-in **chat interface** — ask follow-up questions like *"Why not Alice?"* or *"How does Bob compare to Carol?"*
- Powered by Groq's free API (1,500 req/day, no credit card needed)

### Admin
- Full user management (create, edit, deactivate, delete)
- Assign roles, towers, workgroups, shifts, reporting chains
- Manage award categories
- Full status overview across all managers, senior managers, and directors

### Security
- Passwords hashed with bcrypt
- JWT tokens expire after 8 hours — user is automatically logged out
- Admin never sets or sees user passwords — users activate their own accounts

---

## Roles & Workflow

### 👤 Admin
1. Log in at `/login` with seeded credentials
2. Go to **Users** tab → create accounts (email + role only, no password)
3. Assign each manager a **Reporting Manager** (their senior manager)
4. Assign each senior manager a **Reporting Director**
5. Assign directors a **Technology Group**
6. Go to **Categories** tab to manage award categories
7. Monitor progress in **Status Overview** tab

### 👤 Manager
1. Receives email from admin that their account is created
2. Goes to `/signup`, enters their email, sets a password
3. Logs in → sees the **Nominations** tab with 6 award categories
4. Fills in one nominee per category (name, designation, remarks/reason)
5. Can **Save Draft** at any time and return later
6. Clicks **Submit Nominations** when done — cannot edit after submission
7. **Status** tab shows the pipeline: My Submission → Senior Manager Review → Director Action

### 👤 Senior Manager
1. Logs in → **Team** tab shows which managers have submitted (green = done, grey = pending)
2. **Pool** tab shows all submitted nominations grouped by category
   - Click **✨ AI Recommend** for AI analysis and chat
3. **My Selections** tab → pick 1 nominee per category from the pool
4. Click **Submit to Director** — cannot edit after submission
5. **Status** tab shows: My Submission → Director Action

### 👤 Director
1. Logs in → **Overview** tab shows senior manager submission statuses
2. **All Managers** tab shows individual manager submission statuses
3. **Pool** tab shows all senior manager selections (only from SMs reporting to this director)
   - Click **✨ AI Recommend** for AI analysis and chat
4. **Finalize** tab → review and make final selections
5. Click **Mark Action Complete** — triggers "Action Taken" status visible to all levels below

---

## Data Privacy

| What flows downward | What does NOT flow downward |
|--------------------|-----------------------------|
| ✅ "Action Taken" status (yes/no) | ❌ Nominee names chosen at any level |
| | ❌ Which nominations were forwarded |
| | ❌ Which candidates the director selected |

This is enforced at the API level — senior manager and director routes never include nomination content in responses to lower roles.

---

## Project Structure

```
Nominationsystem/
├── render.yaml                   # Render.com deployment config
├── package.json                  # Root scripts (build + start for production)
├── .gitignore
│
├── backend/
│   ├── server.js                 # Express app + MongoDB connect + static serving
│   ├── seed.js                   # Seeds categories + admin account
│   ├── .env                      # Environment variables (never commit this)
│   │
│   ├── models/
│   │   ├── User.js               # Roles, reporting chain, bcrypt password
│   │   ├── Category.js           # Award categories
│   │   ├── Nomination.js         # Manager nominations (draft/submitted)
│   │   ├── SeniorSelection.js    # Senior manager selections
│   │   └── DirectorAction.js     # Director final action
│   │
│   ├── routes/
│   │   ├── auth.js               # signup, login, change-password, /me
│   │   ├── admin.js              # User CRUD, categories, status overview
│   │   ├── manager.js            # Nominations CRUD + pipeline status
│   │   ├── seniorManager.js      # Pool, selections, status
│   │   ├── director.js           # Pool, action, finalize
│   │   └── ai.js                 # Groq AI recommend + chat
│   │
│   └── middleware/
│       └── auth.js               # JWT protect + role authorize
│
└── frontend/
    └── src/
        ├── App.js                # Routes + ProtectedRoute + RoleRedirect
        ├── context/
        │   └── AuthContext.js    # Auth state, login/signup/logout, axios interceptor
        ├── components/
        │   ├── Navbar.js         # Role badge + Change Password modal
        │   └── AiRecommendPanel.js  # AI recommendations + chat UI
        └── pages/
            ├── Login.js
            ├── Signup.js
            ├── AdminDashboard.js
            ├── ManagerDashboard.js
            ├── SeniorManagerDashboard.js
            └── DirectorDashboard.js
```

---

## Local Setup

### Prerequisites
- Node.js ≥ 18
- A [MongoDB Atlas](https://cloud.mongodb.com) free cluster (or local MongoDB)
- A free [Groq API key](https://console.groq.com) for AI features

### 1. Clone the repo
```bash
git clone https://github.com/jain-shreyaa-1808/NominationSystem.git
cd NominationSystem
```

### 2. Configure environment
```bash
cd backend
cp .env.example .env   # or create .env manually
```

Edit `backend/.env`:
```env
PORT=8000
MONGO_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/nomination
JWT_SECRET=any_long_random_string_here
GROQ_API_KEY=your_groq_key_here
MONGO_TLS_ALLOW_INVALID_CERT=false
```

### 3. Install dependencies
```bash
# From repo root:
cd backend && npm install
cd ../frontend && npm install
```

### 4. Seed the database
```bash
cd backend
npm run seed
```

This creates:
- 6 default award categories
- Admin account: `admin@company.com` / `Admin@123`

### 5. Run locally (two terminals)

**Terminal 1 — Backend:**
```bash
cd backend
npm run dev
# Running at http://localhost:8000
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm start
# Running at http://localhost:3000
```

### 6. First login
1. Open [http://localhost:3000](http://localhost:3000)
2. Login: `admin@company.com` / `Admin@123`
3. Create users in the Admin Dashboard

### Setting up sample users

Create these users in the Admin Dashboard → Users → Add User:

| Name | Email | Role | Tower | Workgroup | Shift | Reports To |
|------|-------|------|-------|-----------|-------|------------|
| Brahadesh | brahadesh@co.com | Director | — | — | — | Tech Group: Enterprise |
| Ishant | ishant@co.com | Senior Manager | Tower4 | — | — | Director: Brahadesh |
| Ramya | ramya@co.com | Manager | Tower4 | Wireless | 1 | SM: Ishant |
| Apoorva | apoorva@co.com | Manager | Tower4 | Wireless | 2 | SM: Ishant |
| Arindam | arindam@co.com | Manager | Tower4 | CATC | 1 | SM: Ishant |
| Meenakshi | meenakshi@co.com | Manager | Tower4 | CATC | 2 | SM: Ishant |
| Karthikeyan | karthik@co.com | Manager | Tower4 | IoT | 1 | SM: Ishant |

Each user must then go to `/signup`, enter their email, and set their own password before they can log in.

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `MONGO_URI` | ✅ | MongoDB Atlas connection string |
| `JWT_SECRET` | ✅ | Secret for signing JWT tokens (any long random string) |
| `PORT` | ✅ | Server port (use `8000` locally, Render sets this automatically) |
| `GROQ_API_KEY` | ⚠️ | Free key from [console.groq.com](https://console.groq.com) — AI features disabled without it |
| `MONGO_TLS_ALLOW_INVALID_CERT` | ❌ | Set `true` only on corporate laptops with TLS inspection |
| `NODE_ENV` | ❌ | Set to `production` on Render — enables static file serving |

---

## AI Recommendations

The AI feature is available to **Senior Managers** and **Directors** in their Pool tab.

### How it works
1. Click **✨ AI Recommend** — sends the full nominee pool to Groq's Llama 3.1 model
2. The AI analyses all nominees per category and recommends one winner, explaining:
   - What specifically the nominee achieved (references their nomination remarks)
   - Why that fits the award category
   - Why they stand out compared to the other nominees
3. A **💬 Chat** box appears below — ask follow-up questions in plain English

### Example chat questions
- *"Why wasn't Alice chosen for Star Performer?"*
- *"How does Bob compare to Carol for Innovation Champion?"*
- *"Is there anyone stronger for Customer Excellence?"*

### Getting a free Groq API key
1. Go to [console.groq.com](https://console.groq.com)
2. Sign up (free, no credit card)
3. Create an API key
4. Add it to `backend/.env` as `GROQ_API_KEY=...`

Free tier: **14,400 requests/day**, **30 requests/minute**

---

## API Reference

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/signup` | Activate account with email + password |
| `POST` | `/api/auth/login` | Login, returns JWT |
| `POST` | `/api/auth/change-password` | Change own password (protected) |
| `GET` | `/api/auth/me` | Get current user (protected) |

### Admin (requires admin JWT)
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/admin/users` | List all non-admin users |
| `POST` | `/api/admin/users` | Create user |
| `PUT` | `/api/admin/users/:id` | Update user |
| `DELETE` | `/api/admin/users/:id` | Delete user |
| `GET` | `/api/admin/senior-managers` | List senior managers (for dropdowns) |
| `GET` | `/api/admin/directors` | List directors (for dropdowns) |
| `GET` | `/api/admin/categories` | List categories |
| `POST` | `/api/admin/categories` | Create category |
| `DELETE` | `/api/admin/categories/:id` | Delete category |
| `GET` | `/api/admin/status` | Full pipeline status overview |

### Manager (requires manager JWT)
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/manager/categories` | Get award categories |
| `GET` | `/api/manager/nominations` | Get my nominations |
| `POST` | `/api/manager/nominations` | Save (draft) or submit nominations |
| `GET` | `/api/manager/status` | My pipeline status |

### Senior Manager (requires senior_manager JWT)
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/senior/managers` | My team's submission statuses |
| `GET` | `/api/senior/pool` | All submitted nominations from my team |
| `GET` | `/api/senior/selections` | My current selections |
| `POST` | `/api/senior/selections` | Save or submit selections |
| `GET` | `/api/senior/status` | My pipeline status |

### Director (requires director JWT)
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/director/senior-managers` | My SMs' submission statuses |
| `GET` | `/api/director/managers-status` | All managers' statuses |
| `GET` | `/api/director/pool` | All SM selections for my group |
| `GET` | `/api/director/action` | My current action |
| `POST` | `/api/director/action` | Save or complete action |

### AI (requires any valid JWT)
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/ai/recommend` | Get AI recommendations for a pool |
| `POST` | `/api/ai/chat` | Chat with AI about recommendations |

---

## Deployment (Render.com)

The project is configured for one-service deployment: the backend builds the React app and serves it as static files.

### Steps

**1. Push to GitHub**
```bash
git add .
git commit -m "ready for deployment"
git push origin main
```

**2. Create a Web Service on Render**
- Go to [render.com](https://render.com) → New → Web Service
- Connect your GitHub repo
- Render will auto-detect `render.yaml` — settings are pre-configured

If setting up manually:
| Setting | Value |
|---------|-------|
| Build Command | `npm install --prefix backend && npm install --prefix frontend && npm run build --prefix frontend` |
| Start Command | `node backend/server.js` |
| Node Version | 18 or higher |

**3. Set environment variables** in the Render dashboard (Environment tab):

| Key | Value |
|-----|-------|
| `NODE_ENV` | `production` |
| `MONGO_URI` | Your Atlas connection string |
| `JWT_SECRET` | A long random string |
| `GROQ_API_KEY` | Your Groq API key |
| `MONGO_TLS_ALLOW_INVALID_CERT` | `false` |

**4. Deploy** — Render builds and gives you a live URL like `https://nomination-system.onrender.com`

> **Note:** The free tier spins down after 15 minutes of inactivity. The first request after idle takes ~30 seconds to wake up. This is normal for the free plan.

### MongoDB Atlas network access
Make sure your Atlas cluster allows connections from anywhere (`0.0.0.0/0`) or from Render's IP ranges, otherwise the backend will fail to connect.

In Atlas → Network Access → Add IP Address → Allow Access from Anywhere.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `EADDRINUSE: port 8000` | Run `lsof -ti :8000 \| xargs kill -9` then restart |
| MongoDB connection timeout | Check Atlas IP whitelist and MONGO_URI in `.env` |
| "Account not yet activated" on login | User needs to go to `/signup` first to set their password |
| AI returns error | Check `GROQ_API_KEY` is set in `.env` and is valid (console.groq.com) |
| Render deploy fails | Check build logs — usually a missing env variable |

---

## License

Internal use only — not for public distribution.
