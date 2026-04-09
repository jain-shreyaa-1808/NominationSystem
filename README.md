# Nomination System — MERN Stack

A full-stack nomination management system for corporate award cycles.

---

## Tech Stack
- **MongoDB** — Database
- **Express.js** — Backend API
- **React.js** — Frontend (Create React App)
- **Node.js** — Runtime

---

## Project Structure

```
Nominationsystem/
├── backend/
│   ├── models/           User, Category, Nomination, SeniorSelection, DirectorAction
│   ├── routes/           auth, admin, manager, seniorManager, director
│   ├── middleware/       auth.js (JWT + role check)
│   ├── server.js
│   ├── seed.js           Creates default categories + admin account
│   └── .env.example
└── frontend/
    └── src/
        ├── pages/        Login, Signup, AdminDashboard, ManagerDashboard,
        │                 SeniorManagerDashboard, DirectorDashboard
        ├── components/   Navbar
        └── context/      AuthContext (JWT + axios defaults)
```

---

## Step-by-Step Setup

### 1. Prerequisites
- Node.js ≥ 18
- MongoDB running locally (`mongod`) or MongoDB Atlas URI

### 2. Clone / Open the project
```bash
cd /path/to/Nominationsystem
```

### 3. Setup Backend
```bash
cd backend
npm install

# Copy env file and edit it
cp .env.example .env
# Edit .env:
#   MONGO_URI=mongodb://localhost:27017/nominationsystem
#   JWT_SECRET=changeme_secret_key_123
#   PORT=5000
```

### 4. Seed the database
```bash
# Still inside backend/
npm run seed
```
This creates:
- 6 award categories
- Admin account: `admin@company.com` / `Admin@123`

### 5. Setup Frontend
```bash
cd ../frontend
npm install
```

### 6. Run (two terminals)

**Terminal 1 — Backend:**
```bash
cd backend
npm run dev        # or: npm start
# Server at http://localhost:5000
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm start
# App at http://localhost:3000
```

---

## First Login & Configuration

1. Open http://localhost:3000
2. Login as **admin@xxy.com** / **Admin112**
3. Go to **Admin Dashboard → Users**
4. Create users:

## Role-Based Flows

### Manager Flow
1. Login → See nomination form (6 categories)
2. Enter 1 nominee name per category
3. Save draft anytime, then Submit
4. Status pipeline shows: My Status → Reporting Manager → Director

### Senior Manager (Ishant) Flow
1. Login → See which managers have submitted (green/grey)
2. Pool tab → View all submitted nominations grouped by category
3. Selections tab → Pick 1 nominee per category
4. Submit to Director

### Director (Brahadesh) Flow
1. Login → Overview of all statuses across towers
2. Pool tab → See all Senior Manager selections
3. Finalize tab → Make final selections & click "Mark Action Complete"
4. This triggers "Action Taken" status visible to all levels (no data shared downward)

### Admin Flow
1. Manage users (CRUD with role assignment)
2. Manage categories
3. View full status overview at all levels

---

## Data Privacy Rules (as implemented)
- Managers **cannot** see which names senior manager chose
- Senior Managers **cannot** see which names director chose
- Only **"Action Taken"** status flows downward — no nomination data

---

## API Endpoints

| Method | Path | Role | Description |
|--------|------|------|-------------|
| POST | /api/auth/login | All | Login |
| POST | /api/auth/signup | All | Self-register |
| GET | /api/admin/users | Admin | List all users |
| POST | /api/admin/users | Admin | Create user |
| PUT | /api/admin/users/:id | Admin | Update user |
| DELETE | /api/admin/users/:id | Admin | Delete user |
| GET | /api/admin/status | Admin | Full status overview |
| GET | /api/manager/categories | Manager | Get categories |
| POST | /api/manager/nominations | Manager | Save/submit nominations |
| GET | /api/manager/status | Manager | Pipeline status |
| GET | /api/senior/managers | Senior Mgr | My team status |
| GET | /api/senior/pool | Senior Mgr | All nominations pool |
| POST | /api/senior/selections | Senior Mgr | Save/submit selections |
| GET | /api/director/senior-managers | Director | SM status |
| GET | /api/director/pool | Director | All SM selections |
| POST | /api/director/action | Director | Save/complete action |

---

## Production Deployment

### Backend (e.g. Render / Railway)
1. Set environment variables: `MONGO_URI`, `JWT_SECRET`, `PORT`
2. Run `npm start` from `backend/`

### Frontend (e.g. Vercel / Netlify)
1. Build: `npm run build` from `frontend/`
2. Set env var: `REACT_APP_API_URL=https://your-backend-url.com/api`
3. Update `frontend/src/context/AuthContext.js` line:
   ```js
   export const API_BASE = process.env.REACT_APP_API_URL || '/api';
   ```

### Full-stack on one server
Add to `backend/server.js`:
```js
const path = require('path');
// After routes:
app.use(express.static(path.join(__dirname, '../frontend/build')));
app.get('*', (req, res) =>
  res.sendFile(path.join(__dirname, '../frontend/build/index.html'))
);
```
Then `npm run build:frontend` and deploy only the backend.
