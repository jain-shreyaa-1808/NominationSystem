# Nomination System — Complete Developer Guide

> Written for a beginner developer. Every file, every concept, every line of logic is explained here.

---

## Table of Contents

1. [What is This Project?](#1-what-is-this-project)
2. [Tech Stack — What Each Technology Does](#2-tech-stack)
3. [Folder Structure](#3-folder-structure)
4. [How to Run the Project](#4-how-to-run)
5. [Backend Deep Dive](#5-backend)
   - [server.js](#51-serverjs)
   - [Models](#52-models)
   - [Middleware](#53-middleware)
   - [Routes](#54-routes)
   - [Email Service](#55-email-service)
   - [Reminder Cron Job](#56-reminder-cron-job)
6. [Frontend Deep Dive](#6-frontend)
   - [index.js — Entry Point](#61-indexjs)
   - [App.jsx — Router](#62-appjsx)
   - [AuthContext.jsx — Global Auth State](#63-authcontextjsx)
   - [Navbar.jsx](#64-navbarjsx)
   - [Login.jsx & Signup.jsx](#65-loginsx--signupjsx)
   - [AdminDashboard.jsx](#66-admindashboardjsx)
   - [ManagerDashboard.jsx](#67-managerdashboardjsx)
   - [SeniorManagerDashboard.jsx](#68-seniormanagerdashboardjsx)
   - [DirectorDashboard.jsx](#69-directordashboardjsx)
   - [AiRecommendPanel.jsx](#610-airecommendpaneljsx)
7. [How Data Flows Through the App](#7-data-flow)
8. [Key Concepts Explained](#8-key-concepts)
9. [Email Reminder System](#9-email-reminder-system)
10. [Security & Privacy Rules](#10-security--privacy-rules)
11. [Deployment](#11-deployment)
12. [Common Questions & Troubleshooting](#12-troubleshooting)

---

## 1. What is This Project?

This is a **Corporate Awards Nomination System** built for a company (Tower 4). The process works like this:

```
Manager → nominates 6 people (one per award category)
           ↓
Senior Manager → sees all nominations from their team,
                 picks ONE winner per category
                 ↓
Director → sees all senior manager picks across towers,
           makes the final decision
```

Each level can only see what they need to see. A manager **never** sees who the senior manager picked. A senior manager **never** sees who the director picked. This is the **data privacy rule** baked into the code.

---

## 2. Tech Stack

| Technology | What it does | Analogy |
|---|---|---|
| **MongoDB** | Database — stores all data | A giant filing cabinet |
| **Mongoose** | Makes MongoDB easier to use from Node.js | A translator between your code and the filing cabinet |
| **Express.js** | Web server framework for Node.js | The post office — receives requests, sends responses |
| **React** | UI framework for the browser | The visual face of the app |
| **Node.js** | JavaScript runtime on the server | The engine that runs the backend code |
| **JWT (JSON Web Token)** | Proves who you are after login | Your ID badge after security checks you in |
| **bcryptjs** | Hashes (scrambles) passwords | A one-way lock — you can lock it but can't unlock it |
| **axios** | Makes HTTP requests from React to the backend | A messenger that carries data between frontend and backend |
| **react-router-dom** | Handles different pages/URLs in React | A traffic controller for the browser |
| **node-cron** | Runs code on a schedule (like a timer) | An alarm clock for code |
| **nodemailer** | Sends emails from Node.js | The postal service for the app |
| **Groq SDK** | AI API for nominee recommendations | An AI assistant you can ask questions |

---

## 3. Folder Structure

```
Nominationsystem/
├── backend/                    ← Server-side code (Node.js + Express)
│   ├── .env                    ← Secret config (not in git)
│   ├── .env.example            ← Template showing what .env needs
│   ├── server.js               ← App entry point — starts everything
│   ├── seed.js                 ← One-time script to set up initial data
│   ├── package.json            ← Lists all backend dependencies
│   ├── models/                 ← MongoDB data shapes (schemas)
│   │   ├── User.js
│   │   ├── Category.js
│   │   ├── Nomination.js
│   │   ├── SeniorSelection.js
│   │   ├── DirectorAction.js
│   │   └── Deadline.js         ← NEW: stores submission deadlines per role
│   ├── middleware/
│   │   └── auth.js             ← Checks JWT token on every protected request
│   ├── routes/                 ← API endpoints grouped by role
│   │   ├── auth.js             ← /api/auth/* (login, signup, change-password)
│   │   ├── admin.js            ← /api/admin/* (users, categories, deadlines, status)
│   │   ├── manager.js          ← /api/manager/*
│   │   ├── seniorManager.js    ← /api/senior/*
│   │   ├── director.js         ← /api/director/*
│   │   └── ai.js               ← /api/ai/* (AI recommendations, chat)
│   ├── services/
│   │   └── emailService.js     ← NEW: sends HTML reminder emails via SMTP
│   └── jobs/
│       └── reminderJob.js      ← NEW: cron job that runs daily at 8 AM
│
└── frontend/                   ← Client-side code (React)
    ├── package.json
    ├── public/
    │   └── index.html          ← The single HTML file React renders into
    └── src/
        ├── index.js            ← React entry point
        ├── index.css           ← All global styles
        ├── App.jsx             ← Routing logic — which page for which URL
        ├── context/
        │   └── AuthContext.jsx ← Global login/logout state
        ├── components/
        │   ├── Navbar.jsx      ← Top navigation bar
        │   └── AiRecommendPanel.jsx ← AI recommendation UI
        └── pages/
            ├── Login.jsx
            ├── Signup.jsx
            ├── AdminDashboard.jsx
            ├── ManagerDashboard.jsx
            ├── SeniorManagerDashboard.jsx
            └── DirectorDashboard.jsx
```

---

## 4. How to Run

### Prerequisites
- Node.js installed
- MongoDB Atlas account (or local MongoDB)
- Copy `backend/.env.example` → `backend/.env` and fill in your values

### Step 1 — Set up the database

```bash
cd backend
npm install
npm run seed
```

The seed script creates:
- 6 default award categories
- 1 admin user: `admin@company.com` / `Admin@123`

### Step 2 — Start the backend

```bash
cd backend
npm run dev   # starts with nodemon (auto-restart on file change)
# API now available at http://localhost:8000
```

### Step 3 — Start the frontend

```bash
cd frontend
npm install
npm start
# UI now available at http://localhost:3000
```

The frontend has `"proxy": "http://localhost:8000"` in its `package.json`, which means any `/api/...` request from the browser is automatically forwarded to the backend. You don't need two browser tabs.

---

## 5. Backend

### 5.1 `server.js`

This is the **entry point** — the first file that runs when you start the backend.

```js
dotenv.config();  // Loads .env file so process.env.MONGO_URI etc. work
```

`dotenv` reads your `.env` file and makes all the key=value pairs available as `process.env.KEY`. This keeps secrets (passwords, API keys) out of the code.

```js
const app = express();
app.use(cors({ origin: 'http://localhost:3000' }));  // Allow requests from the React app
app.use(express.json());  // Parse incoming JSON request bodies
```

`cors` stands for **Cross-Origin Resource Sharing**. Browsers block JavaScript on `localhost:3000` from talking to `localhost:8000` by default (different ports = different "origins"). CORS middleware tells the browser it's allowed.

`express.json()` is a **middleware** that reads the raw HTTP request body and converts the JSON text into a JavaScript object, available as `req.body`.

```js
app.use('/api/auth',     require('./routes/auth'));
app.use('/api/admin',    require('./routes/admin'));
// ... etc
```

This **mounts** routes. Any request that starts with `/api/admin/` is handled by `routes/admin.js`. Think of it as saying "anything going to the admin department goes through this door."

```js
mongoose.connect(process.env.MONGO_URI, mongoOptions)
  .then(() => {
    startReminderJob();   // Start the daily 8 AM email reminder
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
```

The app only starts listening for requests **after** MongoDB is connected. If the database connection fails, the server shuts down (`process.exit(1)`). The reminder job is also started here.

---

### 5.2 Models

Models define the **shape of data** stored in MongoDB. Think of each model as a table definition in a spreadsheet — it says what columns exist and what type of data goes in each column.

#### `models/User.js`

```js
const userSchema = new mongoose.Schema({
  name:     { type: String, required: true, trim: true },
  email:    { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, default: '' },
  passwordSet: { type: Boolean, default: false },
  role: {
    type: String,
    enum: ['admin', 'manager', 'senior_manager', 'director'],
    default: 'manager',
  },
  workgroup: String,
  shift: Number,
  tower: String,
  reportingManager: { type: ObjectId, ref: 'User' },  // links to another User
  reportingDirector: { type: ObjectId, ref: 'User' },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });
```

Key things to understand:

- **`unique: true`** on email means MongoDB will reject two users with the same email — like a PRIMARY KEY in SQL.
- **`enum`** means the field can only hold one of the listed values. If you try to set `role: 'superstar'`, MongoDB rejects it.
- **`ref: 'User'`** creates a **relationship** — `reportingManager` stores just an ID (like a foreign key), but Mongoose can "populate" it to fetch the full user object. This is how `manager.reportingManager.name` works in the code.
- **`{ timestamps: true }`** automatically adds `createdAt` and `updatedAt` fields.

```js
userSchema.pre('save', async function () {
  if (!this.isModified('password') || !this.password) return;
  this.password = await bcrypt.hash(this.password, 10);
});
```

This is a **Mongoose middleware hook**. "Pre save" means "run this code before saving to the database." Here, it hashes the password with bcrypt before storing it. The `10` is the "salt rounds" — how many times the hashing algorithm loops. More rounds = harder to brute-force but slower.

`this` refers to the document being saved. `this.isModified('password')` returns true only when the password field actually changed — so if you save a user's name, the password doesn't get re-hashed unnecessarily.

```js
userSchema.methods.matchPassword = async function (entered) {
  return bcrypt.compare(entered, this.password);
};
```

This adds a custom method to every User document. `bcrypt.compare` takes the plain-text password the user typed and compares it to the stored hash. It returns `true` if they match. You can never un-hash a bcrypt hash — `compare` re-hashes the input the same way and checks if the result matches.

#### `models/Category.js`

Simple model with just `name`, `description`, and `order` (display order). The 6 award categories (Star Performer, Innovation Champion, etc.) are stored here.

#### `models/Nomination.js`

```js
const nominationSchema = new mongoose.Schema({
  manager: { type: ObjectId, ref: 'User', unique: true },  // one record per manager
  nominations: [nominationEntrySchema],  // array of { category, nomineeName, ... }
  status: { type: String, enum: ['draft', 'submitted'], default: 'draft' },
  submittedAt: Date,
});
```

Each manager has **one** Nomination document (enforced by `unique: true` on `manager`). That document contains an array of entries — one per category. Status is either `draft` (saved but not final) or `submitted` (locked, can't change).

#### `models/SeniorSelection.js`

Same pattern as Nomination but for senior managers. One document per senior manager, with an array of selections (one per category).

#### `models/DirectorAction.js`

One document per director. Stores their internal selections and a status of `pending` or `completed`. These selections are **never exposed** to lower roles.

#### `models/Deadline.js` (NEW)

```js
const deadlineSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ['manager', 'senior_manager', 'director'],
    unique: true,  // one deadline per role
  },
  deadline: { type: Date, required: true },
  note: { type: String, default: '' },
});
```

Stores when each role needs to complete their submission. Admin sets this via the Deadlines tab. The reminder cron job reads this to know when to send emails.

---

### 5.3 Middleware

#### `middleware/auth.js`

This file exports two functions used to protect API routes.

**`protect`** — verifies the JWT token:

```js
const protect = async (req, res, next) => {
  let token;
  // JWT tokens are sent in the "Authorization" header as "Bearer <token>"
  if (req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }
  if (!token) return res.status(401).json({ message: 'Not authorized, no token' });

  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  req.user = await User.findById(decoded.id);
  next(); // pass control to the next middleware/route handler
};
```

`next()` is Express's way of saying "I'm done, pass the request to whoever is next in the chain." If you forget to call `next()`, the request just hangs.

`jwt.verify` decodes the token and checks its signature using `JWT_SECRET`. If someone tampers with the token, verification fails and we return 401 (Unauthorized).

After `protect` runs, `req.user` contains the logged-in user object — so route handlers can use `req.user._id` to know who is making the request.

**`authorize`** — checks the user's role:

```js
const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role))
    return res.status(403).json({ message: `Access denied for role: ${req.user.role}` });
  next();
};
```

`authorize('admin')` returns a new function. That function checks if the logged-in user's role is in the allowed list. 403 = Forbidden (you're authenticated but don't have permission).

This is used at the top of each route file:
```js
router.use(protect, authorize('manager'));
// All routes below this line require: valid JWT + role === 'manager'
```

---

### 5.4 Routes

All routes follow the REST pattern:
- `GET` = read data
- `POST` = create data
- `PUT` = update/replace data
- `DELETE` = remove data

#### `routes/auth.js`

| Endpoint | What it does |
|---|---|
| `POST /api/auth/signup` | User sets their password for the first time |
| `POST /api/auth/login` | Returns a JWT token on success |
| `POST /api/auth/change-password` | Changes password (requires login) |
| `GET /api/auth/me` | Returns current user info |

**Login flow in detail:**

```js
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });          // find user by email
  if (!user) return res.status(401)...                 // not found
  const match = await user.matchPassword(password);    // check password hash
  if (!match) return res.status(401)...                // wrong password

  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '8h' });
  res.json({ token, ...userFields });                  // send token back
});
```

The **JWT token** is a signed string containing `{ id: user._id }`. It expires in 8 hours. The frontend stores this token in `localStorage` and sends it with every subsequent request.

#### `routes/admin.js`

All routes here require `role === 'admin'`.

| Endpoint | What it does |
|---|---|
| `GET /api/admin/users` | All non-admin users |
| `POST /api/admin/users` | Create user (admin sets email+role, user sets password later) |
| `PUT /api/admin/users/:id` | Update user |
| `DELETE /api/admin/users/:id` | Delete user |
| `GET /api/admin/categories` | All award categories |
| `POST /api/admin/categories` | Add category |
| `DELETE /api/admin/categories/:id` | Delete category |
| `GET /api/admin/status` | Submission status of all users |
| `GET /api/admin/deadlines` | All configured deadlines |
| `PUT /api/admin/deadlines/:role` | Set/update deadline for a role |
| `DELETE /api/admin/deadlines/:role` | Remove a deadline |
| `POST /api/admin/deadlines/test-reminders` | Trigger reminder check manually |

The status endpoint is particularly interesting:

```js
router.get('/status', async (req, res) => {
  const managers = await User.find({ role: 'manager' });
  const nominations = await Nomination.find();

  const managerStatus = managers.map((m) => {
    const nom = nominations.find((n) => n.manager.toString() === m._id.toString());
    return {
      ...m._doc,
      status: nom ? nom.status : 'not_started',  // no nomination record = not started
    };
  });
  // ... repeat for senior managers and directors
});
```

It finds all users of each role, then for each user looks up whether they have a submission record. If no record exists, the status is `not_started`.

#### `routes/manager.js`

All routes require `role === 'manager'`.

| Endpoint | What it does |
|---|---|
| `GET /api/manager/categories` | Award categories to fill in |
| `GET /api/manager/nominations` | Manager's own current nominations |
| `POST /api/manager/nominations` | Save draft or submit |
| `GET /api/manager/status` | Pipeline status (my step + senior manager + director) |

The POST endpoint handles both saving a draft and final submission:

```js
router.post('/nominations', async (req, res) => {
  const { nominations, action } = req.body; // action = 'save' or 'submit'
  const isSubmit = action === 'submit';

  if (existing && existing.status === 'submitted') {
    return res.status(400).json({ message: 'Already submitted, cannot change' });
  }

  // If submitting, validate all fields are filled
  if (isSubmit) {
    if (nominations.length !== categories.length) return error;
    for (const n of nominations) {
      if (!n.nomineeName) return error;
    }
  }

  // Upsert (update if exists, create if not)
  if (existing) {
    existing.nominations = nominations;
    existing.status = isSubmit ? 'submitted' : 'draft';
    await existing.save();
  } else {
    await Nomination.create({ manager: req.user._id, nominations, status });
  }
});
```

#### `routes/seniorManager.js`

| Endpoint | What it does |
|---|---|
| `GET /api/senior/managers` | All managers reporting to this senior manager + their submission status |
| `GET /api/senior/pool` | All submitted nominations from their team, grouped by category |
| `GET /api/senior/selections` | Senior manager's current selections |
| `POST /api/senior/selections` | Save or submit selections |
| `GET /api/senior/status` | My status + director's status |

The `/pool` endpoint aggregates all nominations from the senior manager's team and groups them by category. This is what the senior manager sees when they decide who to forward.

#### `routes/director.js`

| Endpoint | What it does |
|---|---|
| `GET /api/director/senior-managers` | SMs reporting to this director + status |
| `GET /api/director/managers-status` | All managers across all towers |
| `GET /api/director/pool` | Selections from SMs under this director |
| `GET /api/director/action` | Director's current action/selections |
| `POST /api/director/action` | Save selections or mark action complete |

The privacy rule: when a director marks "complete", that status flows down (`directorStatus = 'completed'`), but **which nominees they picked** stays private in the `DirectorAction` document.

#### `routes/ai.js`

| Endpoint | What it does |
|---|---|
| `POST /api/ai/recommend` | Sends the nomination pool to Groq AI, returns ranked recommendations |
| `POST /api/ai/chat` | Conversational AI to answer follow-up questions |

Uses the free **Groq API** (LLaMA model). The prompt carefully instructs the AI to compare nominees and explain its reasoning. Requires `GROQ_API_KEY` in `.env`.

---

### 5.5 Email Service

**`services/emailService.js`**

This file has one exported function: `sendDeadlineReminder`.

```js
function getTransporter() {
  if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    return null;  // Email not configured — silently skip
  }
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT || '587', 10),
    secure: process.env.EMAIL_PORT === '465',  // SSL for 465, STARTTLS for 587
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
  });
}
```

A **transporter** is nodemailer's SMTP connection object. `createTransport` opens a connection to your mail server. If email isn't configured, the function returns `null` and emails are silently skipped (the server still works).

```js
async function sendDeadlineReminder({ to, name, roleLabel, deadline, type }) {
  const transporter = getTransporter();
  if (!transporter) { console.warn('Email not configured'); return; }

  const subject = isToday
    ? `URGENT: Nomination deadline is TODAY`
    : `Reminder: Nomination deadline in 2 days`;

  await transporter.sendMail({
    from: `"Nomination System" <${process.env.EMAIL_FROM}>`,
    to,
    subject,
    html: /* full HTML email template */,
  });
}
```

The email is a **professionally designed HTML email** with:
- A header with the Nomination System logo
- A colored urgency banner (red for today, yellow for 2 days)
- A deadline box showing the exact date
- A call-to-action button linking to the app
- A professional footer

---

### 5.6 Reminder Cron Job

**`jobs/reminderJob.js`**

A **cron job** is code that runs automatically on a schedule (like a scheduled task or alarm).

```js
cron.schedule('0 8 * * *', async () => {
  await runReminderCheck();
});
```

The schedule string `'0 8 * * *'` uses **cron syntax**:
```
┌─── minute (0-59)
│ ┌─── hour (0-23)
│ │ ┌─── day of month (1-31)
│ │ │ ┌─── month (1-12)
│ │ │ │ ┌─── day of week (0-7, 0=Sunday)
│ │ │ │ │
0 8 * * *   = "at 0 minutes past 8 AM, every day of every month"
```

**The reminder check logic:**

```js
async function runReminderCheck() {
  const deadlines = await Deadline.find();  // Get all configured deadlines
  const today = new Date();

  for (const dl of deadlines) {
    const diff = diffDays(today, dl.deadline);  // How many days until deadline?
    const isToday = isSameDay(today, dl.deadline);

    if (diff !== 2 && !isToday) continue;  // Not a reminder day — skip

    // Get all active users with this role who haven't submitted yet
    const allUsers = await User.find({ role: dl.role, isActive: true });
    const pendingUsers = await getPendingUsers(dl.role, allUsers);

    for (const user of pendingUsers) {
      await sendDeadlineReminder({ to: user.email, name: user.name, ... });
    }
  }
}
```

**`getPendingUsers`** checks each role differently:
- **Manager**: Has no `Nomination` record, OR has a `Nomination` with `status !== 'submitted'`
- **Senior Manager**: Has no `SeniorSelection`, or status not `submitted`
- **Director**: Has no `DirectorAction`, or status not `completed`

This ensures only users who **actually still need to submit** receive the reminder — not those who already did.

---

## 6. Frontend

### 6.1 `index.js`

```js
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

This is the **React entry point**. It finds the `<div id="root">` in `public/index.html` and renders the entire React app into it. `StrictMode` makes React log extra warnings during development to help catch bugs early. It has no effect in production.

---

### 6.2 `App.jsx`

This file sets up **React Router** — the system that maps URLs to React components (pages).

```jsx
function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;           // not logged in
  if (!allowedRoles.includes(user.role)) return <Navigate to="/" replace />;  // wrong role
  return children;  // authorized — render the page
}
```

`ProtectedRoute` is a **wrapper component**. Any page wrapped with it is protected. If you try to go to `/admin` without being logged in, you're redirected to `/login`.

```jsx
function RoleRedirect() {
  // After login, redirect to the correct dashboard based on role
  const map = {
    admin: '/admin',
    manager: '/manager',
    senior_manager: '/senior-manager',
    director: '/director',
  };
  return <Navigate to={map[user.role] || '/login'} replace />;
}
```

```jsx
<Routes>
  <Route path="/login" element={<Login />} />
  <Route path="/" element={<RoleRedirect />} />
  <Route path="/admin" element={
    <ProtectedRoute allowedRoles={['admin']}>
      <AdminDashboard />
    </ProtectedRoute>
  } />
  {/* ... */}
</Routes>
```

`<Routes>` renders only the first `<Route>` that matches the current URL. `element` is what gets rendered. `path="*"` is a catch-all (any unmatched URL).

---

### 6.3 `context/AuthContext.jsx`

React **Context** is a way to share data across the entire app without passing it through every component as props. Think of it as a global variable, but done properly in React.

```jsx
const AuthContext = createContext();  // Create the "channel"

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);   // null = not logged in
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // On app load, check localStorage for a saved token
    const token = localStorage.getItem('nom_token');
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setUser(JSON.parse(localStorage.getItem('nom_user')));
    }
    setLoading(false);

    // Set up interceptor: auto-logout if any request returns 401
    const interceptor = axios.interceptors.response.use(
      (res) => res,
      (error) => {
        if (error.response?.status === 401) logout();
        return Promise.reject(error);
      }
    );
    return () => axios.interceptors.response.eject(interceptor);
  }, []);

  const login = async (email, password) => {
    const res = await axios.post('/api/auth/login', { email, password });
    const { token, ...userData } = res.data;
    localStorage.setItem('nom_token', token);
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    setUser(userData);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout }}>
      {children}  {/* Wrap the entire app */}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);  // Custom hook to read the context
```

**How the token is sent:** After login, `axios.defaults.headers.common['Authorization']` is set. This means **every** axios request from that point on automatically includes `Authorization: Bearer <token>` in its headers. The backend's `protect` middleware reads this header to verify the user.

**The interceptor** monitors all axios responses. If any response has a 401 status code (token expired or invalid), it auto-logs out the user. This prevents the case where someone's token expires mid-session and they see confusing errors.

---

### 6.4 `components/Navbar.jsx`

Displayed at the top of every page after login. Shows the user's name and role, with two buttons:
- **Change Password**: Opens a modal with a form to change password.
- **Logout**: Calls `logout()` from context, which clears localStorage and resets state.

```jsx
const handleChangePassword = async (e) => {
  e.preventDefault();  // Prevent the default form submit (page reload)
  if (newPassword !== confirmPassword) { setError('Passwords do not match'); return; }

  await axios.post('/api/auth/change-password', { currentPassword, newPassword });
  setSuccess('Password changed!');
  setTimeout(() => setShowModal(false), 1500);  // Close modal after 1.5s
};
```

---

### 6.5 `pages/Login.jsx` & `pages/Signup.jsx`

Both pages are simple forms. The key pattern used everywhere:

```jsx
const [email, setEmail] = useState('');     // Controlled input state
const [loading, setLoading] = useState(false);
const [error, setError] = useState('');

const handleSubmit = async (e) => {
  e.preventDefault();  // Stop form from reloading the page
  setLoading(true);
  setError('');
  try {
    const user = await login(email, password);  // from AuthContext
    navigate(ROLE_PATHS[user.role]);             // redirect to dashboard
  } catch (err) {
    setError(err.response?.data?.message || 'Login failed');
  } finally {
    setLoading(false);  // Always runs, even on error
  }
};
```

**Controlled inputs** means React owns the input value via state. `value={email}` + `onChange={(e) => setEmail(e.target.value)}` keeps state in sync with what the user types.

**Signup flow:** The admin creates a user account with just name + email. The user then goes to `/signup`, enters their email (must match what admin created), and sets a password. The backend checks `user.passwordSet === false` before allowing signup.

---

### 6.6 `pages/AdminDashboard.jsx`

The most feature-rich page. Has 4 tabs:

#### Users Tab
- Lists all non-admin users in a table
- "Add User" / "Edit" opens a modal form
- The form changes fields based on selected role:
  - Manager: workgroup, shift, reporting manager (senior manager dropdown)
  - Senior Manager: reporting director (director dropdown)
  - Director: technology group

```jsx
const f = (k) => (e) => setFormData({ ...formData, [k]: e.target.value });
// Shorthand: f('name') returns a change handler that updates formData.name
// Usage: <input onChange={f('name')} />
```

#### Categories Tab
- Shows existing categories
- Form to add new categories
- Delete button per category

#### Deadlines Tab (NEW)
- One card per role (Manager, Senior Manager, Director)
- Admin sets a deadline date via a date picker
- Shows current deadline and whether it's active/expired
- "Test Reminders Now" button triggers the reminder check immediately (for testing)

```jsx
const handleSaveDeadline = async (e, role) => {
  e.preventDefault();
  await axios.put(`/api/admin/deadlines/${role}`, deadlineForm[role]);
  // PUT = update if exists, create if doesn't (upsert on the backend)
};
```

#### Status Tab
- Read-only overview of all submissions
- Three grids: Managers, Senior Managers, Directors
- Each card shows name, status (color-coded), when submitted

---

### 6.7 `pages/ManagerDashboard.jsx`

The manager's main page. Three sections:

**Pipeline Status** — shows where the submission stands in the 3-step process:
```
[My Nominations] → [Reporting Manager] → [Director]
```
Each step is color-coded green (done) or grey (pending).

**Nomination Form** — a grid with one row per award category. Manager fills in:
- Nominee Name (required for submit)
- Designation (optional)
- Brief reason/remarks (optional)

```jsx
const [nominations, setNominations] = useState({});
// Object keyed by category ID: { 'cat123': { nomineeName, nomineeDesignation, remarks } }

const setField = (catId, field, value) => {
  setNominations((prev) => ({
    ...prev,
    [catId]: { ...prev[catId], [field]: value },
  }));
};
// Spreads the previous state, updates only the specific field for the specific category
```

**Save vs Submit:**
- Save = stores as draft, can be edited again
- Submit = locked forever, goes to the senior manager's pool

After submission, the form becomes a read-only view of what was submitted.

---

### 6.8 `pages/SeniorManagerDashboard.jsx`

Three tabs:

**My Team** — cards showing each reporting manager's submission status (submitted / draft / not started).

**Nominations Pool** — all submitted nominations from the team, grouped by category. Shows nominee name, designation, who nominated them, and their reason. Also has the **AI Recommend** button.

**My Selections** — where the senior manager picks one nominee per category:

```jsx
const pickNominee = (catId, nomineeName, managerName) => {
  if (isAlreadySubmitted) return;  // Lock after submission
  setSelections((prev) => ({
    ...prev,
    [catId]: { nomineeName, fromManager: managerName },
  }));
};
```

Clicking a nominee card marks them as selected (highlighted in blue). The senior manager then saves a draft or submits to the director.

---

### 6.9 `pages/DirectorDashboard.jsx`

Three tabs:

**Overview** — shows status of all senior managers AND all managers (grouped by tower). Director gets the broadest view.

**Nominations Pool** — selections forwarded by senior managers. Each item shows the nominee name and which senior manager forwarded it. Also has AI Recommend.

**Finalize** — director picks one nominee per category from the pool, then clicks "Mark Action as Complete." After marking complete:
- All senior managers and managers see "Director Action Taken" in their dashboards
- The actual names selected are **never sent down** — only the status changes

```jsx
// Privacy rule enforced in the backend:
// GET /api/director/action returns the full selections to the director.
// GET /api/senior/status returns only directorStatus: 'completed'|'pending' — no names.
// GET /api/manager/status returns only directorStatus: 'completed'|'pending' — no names.
```

---

### 6.10 `components/AiRecommendPanel.jsx`

Used inside both SeniorManagerDashboard and DirectorDashboard.

**How it works:**
1. User clicks "AI Recommend" button
2. The component sends the entire pool (all nominees + reasons) to `/api/ai/recommend`
3. The backend sends a detailed prompt to Groq's LLaMA AI
4. AI returns structured JSON with one recommendation per category, including reasoning and confidence level
5. Results are displayed as cards colored by confidence (green=high, yellow=medium, grey=low)

**AI Chat:**
After recommendations appear, a chat interface opens. Users can ask:
- "Why not Alice for Star Performer?"
- "How does Bob compare to Carol?"
- "Who should I pick if I want to prioritize customer focus?"

The chat sends conversation history + pool data + previous recommendations to `/api/ai/chat`, which gives context-aware responses.

```jsx
const sendMessage = async (e) => {
  const userMsg = { role: 'user', content: input };
  const updatedMessages = [...messages, userMsg];
  setMessages(updatedMessages);  // Show user's message immediately

  const res = await axios.post('/api/ai/chat', {
    pool,
    recommendations: aiRecs,
    messages: updatedMessages,  // Send full conversation history
  });
  setMessages((prev) => [...prev, { role: 'assistant', content: res.data.reply }]);
};
```

---

## 7. Data Flow

Here's how data moves through the entire system for a nomination:

```
1. Admin creates user: POST /api/admin/users
   → User document created in MongoDB (no password yet)

2. User signs up: POST /api/auth/signup
   → Password hashed and saved. passwordSet = true.

3. User logs in: POST /api/auth/login
   → JWT token returned. Frontend stores in localStorage.
   → All future requests include Authorization: Bearer <token>

4. Manager fills nominations: POST /api/manager/nominations { action: 'save' }
   → Nomination document created/updated in MongoDB with status='draft'

5. Manager submits: POST /api/manager/nominations { action: 'submit' }
   → Nomination.status = 'submitted'. Locked. Cannot change.

6. Senior Manager views pool: GET /api/senior/pool
   → Backend finds all submitted Nominations from managers under this SM
   → Groups them by category. Returns the pool.

7. Senior Manager submits selections: POST /api/senior/selections { action: 'submit' }
   → SeniorSelection document created with status='submitted'
   → Now visible in director's pool.

8. Director views pool: GET /api/director/pool
   → Backend finds submitted SeniorSelections from SMs under this director
   → Returns pool grouped by category.

9. Director completes action: POST /api/director/action { action: 'complete' }
   → DirectorAction.status = 'completed'
   → Manager's status check returns directorStatus: 'completed' (no names shared)

10. Daily at 8 AM — Reminder job:
    → Reads Deadline documents
    → Finds users who haven't submitted yet
    → Sends HTML reminder emails via SMTP
```

---

## 8. Key Concepts

### What is JSX?

JSX is a syntax extension for JavaScript that looks like HTML but is actually JavaScript. React uses it to describe what the UI should look like.

```jsx
// JSX
const element = <h1 className="title">Hello, {user.name}!</h1>;

// What it compiles to (regular JavaScript)
const element = React.createElement('h1', { className: 'title' }, 'Hello, ' + user.name + '!');
```

You always need `import React from 'react'` at the top (or in newer setups, React 17+ handles this automatically). Files that contain JSX should be named `.jsx` to make it clear they contain UI code.

**Why .jsx instead of .js?**
It's a professional convention that helps:
- IDEs give better syntax highlighting and autocomplete
- Code editors can apply JSX-specific formatting rules
- Other developers immediately know "this file contains React components"
- Linters and build tools can apply component-specific rules

### What is State in React?

State is **data that changes over time** and triggers a re-render when it changes.

```jsx
const [count, setCount] = useState(0);
// count = current value
// setCount = function to update it
// 0 = initial value

// To change state:
setCount(count + 1);  // React re-renders the component with count = 1
```

### What is a Hook?

Hooks are functions that start with `use` and let you use React features in functional components.

| Hook | What it does |
|---|---|
| `useState` | Store and update data |
| `useEffect` | Run code after render (API calls, subscriptions) |
| `useCallback` | Memoize a function so it doesn't re-create every render |
| `useContext` | Read from a React Context |
| `useRef` | Store a reference (like a DOM element) that doesn't trigger re-renders |

### What is `useEffect`?

```jsx
useEffect(() => {
  // This code runs after the component renders
  fetchData();

  return () => {
    // Cleanup function — runs when component unmounts
    cancelRequest();
  };
}, [dependency1, dependency2]);
// The dependency array: re-run effect when these values change
// Empty [] = run once on mount only
```

### What is `async/await`?

JavaScript is **asynchronous** — it doesn't wait for slow operations (like network requests). `async/await` is syntactic sugar to write asynchronous code that looks synchronous.

```js
// Without async/await (callback hell)
axios.get('/api/data').then((res) => {
  const data = res.data;
  doSomething(data);
}).catch((err) => handleError(err));

// With async/await (much cleaner)
try {
  const res = await axios.get('/api/data');  // wait here
  const data = res.data;
  doSomething(data);
} catch (err) {
  handleError(err);
}
```

### What is MongoDB's ObjectId?

Every document in MongoDB gets a unique `_id` of type `ObjectId` — a 24-character hex string like `507f1f77bcf86cd799439011`. When you see `n.manager.toString()`, it's converting the ObjectId object to a plain string for comparison, because `ObjectId === ObjectId` doesn't work by value, only by reference.

### What is `populate`?

```js
const nomination = await Nomination.findById(id)
  .populate('manager', 'name email');
// Without populate: nomination.manager = ObjectId('507f...')
// With populate:    nomination.manager = { _id: '507f...', name: 'John', email: 'john@...' }
```

`populate` replaces a stored ID with the actual document it refers to. You specify which fields to include (here: `name email`) to avoid sending unnecessary data.

---

## 9. Email Reminder System

### How to Enable Emails

Add these to `backend/.env`:

```env
EMAIL_HOST=smtp.company.com      # Your SMTP server hostname
EMAIL_PORT=587                   # 587 for TLS, 465 for SSL
EMAIL_USER=nominations@company.com
EMAIL_PASS=your_password
EMAIL_FROM=nominations@company.com
APP_URL=https://your-app.com     # Used in the "Open System" button
```

If these are not set, the server runs normally but emails are skipped with a console warning.

### Testing Without Real SMTP

For development/testing, you can use:
- **Mailtrap** (mailtrap.io) — catches emails in a test inbox, never delivers to real addresses
- **Gmail** with an App Password (Google → Account → Security → App Passwords)
- **Ethereal** — generates a free test account at ethereal.email

### How Reminders Are Triggered

1. **Automatically**: Every day at 8 AM server time, the cron job runs and checks all deadlines.
2. **Manually**: Admin can click "Test Reminders Now" in the Deadlines tab. This runs the same check immediately (useful for testing).

### Who Gets Emails

Only users who **have not yet submitted** and whose deadline is today or in 2 days. Users who already submitted are skipped.

### Email Schedule Example

| Deadline Set For | Reminder on | Reminder on |
|---|---|---|
| April 14 | April 12 (2 days before) | April 14 (day of) |
| May 1 | April 29 (2 days before) | May 1 (day of) |

---

## 10. Security & Privacy Rules

### Authentication
- Passwords are **bcrypt-hashed** before storage. Even if the database is stolen, passwords cannot be recovered.
- JWT tokens expire after **8 hours**. Users need to log in again after that.
- The `protect` middleware validates every API request. No route can be called without a valid token.

### Authorization
- The `authorize` middleware checks the user's role. A manager cannot call admin endpoints even with a valid token.
- Each route fetches data **scoped to the logged-in user**: `req.user._id`. A manager can only see their own nominations.

### Data Privacy Rules
- **Managers** see: their own nominations + pipeline status (submitted/pending only, no names)
- **Senior Managers** see: their team's nominations (names + reasons) + their own selections
- **Directors** see: senior manager selections (names, no original nomination reasons) + their own choices
- **Nobody below director** sees the director's final nominees
- **Admin** sees submission statuses but not nomination content (the status route doesn't return nominee names)

---

## 11. Deployment

The app is configured for **Render** (see `render.yaml`).

In production:
- Frontend is built (`npm run build`) into static files
- Backend serves those static files from `frontend/build/`
- One server, one URL, no CORS needed

To build manually:
```bash
cd frontend && npm run build
cd ../backend && NODE_ENV=production node server.js
```

---

## 12. Troubleshooting

**"Cannot connect to MongoDB"**
- Check `MONGO_URI` in `.env`
- If on a corporate network with TLS issues, set `MONGO_TLS_ALLOW_INVALID_CERT=true`

**"No account found for this email"** (on signup)
- Admin must create the user first via the Users tab

**"Password already set"** (on signup)
- The user already activated their account. Go to Login instead.

**Email reminders not working**
- Check that `EMAIL_HOST`, `EMAIL_USER`, `EMAIL_PASS` are set in `.env`
- Check server logs for any SMTP error messages
- Use the "Test Reminders Now" button to trigger immediately
- Verify the deadline is for today or 2 days from now to receive an email

**AI recommendations not working**
- Get a free API key at console.groq.com
- Add `GROQ_API_KEY=...` to `backend/.env`
- Restart the backend

**Frontend shows blank page after build**
- Make sure `"proxy": "http://localhost:8000"` is in `frontend/package.json` for dev
- In production, backend serves the build folder — make sure `npm run build` ran successfully

**"jwt malformed" or "invalid token" error**
- Token in localStorage may be corrupted. Open browser DevTools → Application → Local Storage → delete `nom_token` and `nom_user`, then log in again.
