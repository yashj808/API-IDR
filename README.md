# Antigravity Financial Ledger ⚡

A real-time, high-performance financial transaction processor featuring strict idempotency guarantees, concurrent-safe SQLite WAL transaction serializations, and a hybrid multi-factor leaderboard ranking dashboard.

---

## 🏗️ Project Architecture & Stack

```
f:\API_IDR\
├── backend/                  # FastAPI Application
│   ├── main.py               # App entrypoint, CORS & middleware configuration
│   ├── database.py           # SQLite WAL connection initialization & schema setup
│   ├── models.py             # Strict Pydantic input/output schemas
│   ├── middleware/
│   │   └── rate_limiter.py   # In-memory sliding window rate limiting
│   ├── routes/
│   │   ├── transactions.py   # POST /transaction handler
│   │   ├── summary.py        # GET /summary/{userId} handler
│   │   ├── ranking.py        # GET /ranking leaderboard handler
│   │   └── testing.py        # /test/concurrent simulation endpoint
│   ├── services/
│   │   ├── transaction_service.py  # Business logic & atomic database updates
│   │   └── ranking_service.py      # Log-volume & consistency score calculation
│   └── tests/
│       └── test_api.py       # Integration tests (pytest)
└── frontend/                 # React SPA (Vite)
    ├── src/
    │   ├── App.jsx           # Main Dashboard Shell
    │   ├── index.css         # Premium Glassmorphism Design System CSS
    │   ├── api/client.js     # Fetch API routing calls
    │   └── components/       # Dashboard interactive panels
```

---

## ⚡ Core Technical Design Decisions

### 1. Concurrency Safety (SQLite in WAL Mode + `BEGIN IMMEDIATE`)
- Rather than loading heavy ORM wrappers, the service uses `aiosqlite` with parameterized raw SQL.
- SQLite's **Write-Ahead Logging (WAL)** mode is enabled, allowing concurrent reads while writes are active.
- To prevent database lock contention and race conditions when multiple transactions hit the same user at once, the backend executes a `BEGIN IMMEDIATE TRANSACTION;` block. SQLite serializes all active write transactions instantly, throwing exceptions back to secondary requests only if database lock times exceed the `busy_timeout` threshold (5 seconds).

### 2. Multi-Factor Leaderboard Scoring
The ranking algorithm balances transaction volume against submission consistency to avoid simple ranking spams:
$$\text{Score} = (0.6 \times \text{VolumeScore}) + (0.4 \times \text{ConsistencyScore})$$
- **VolumeScore:** Calculated as $\log_{10}(1 + \text{Total Volume}) \times 10$. Logarithmic scaling minimizes the gap between standard users and ultra-high-volume outliers.
- **ConsistencyScore:** Set directly as $\min(\text{Transaction Count}, 100)$. Caps consistency points at 100 unique submissions, penalizing micro-transactions automated by bots.

### 3. Strict Idempotency with Mismatch Detection
- Every transaction request must contain a unique `Idempotency-Key` UUID.
- The request payload is hashed (SHA-256) and verified on subsequent requests.
  - If a request is received with a duplicate key and matching body, the engine returns the cached response with a `200 OK` status.
  - If a request is received with a duplicate key but a *mismatched* body, the engine returns a `409 Conflict` error to prevent replays.

### 4. Sliding-Window Rate Limiting
- The backend incorporates an IP-based sliding window rate limiter:
  - **Global Route Limit:** Max 100 requests/minute.
  - **Transaction Submission Limit:** Max 20 requests/minute (applied strictly to `POST /transaction`).

---

## 🚀 Quick Start Guide

### Step 1: Run the Backend

1. Navigate to the root directory and ensure Python 3.12 is installed.
2. Initialize and activate the virtual environment:
   ```powershell
   python -m venv .venv
   .venv\Scripts\Activate.ps1
   ```
3. Install dependencies:
   ```bash
   pip install -r backend/requirements.txt
   ```
4. Run the FastAPI development server:
   ```bash
   uvicorn backend.main:app --reload --port 8000
   ```
   - OpenAPI docs will be available at: [http://localhost:8000/docs](http://localhost:8000/docs)

### Step 2: Run the Frontend

1. Open a new terminal and navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install npm packages:
   ```bash
   npm install
   ```
3. Start the Vite React development server:
   ```bash
   npm run dev
   ```
   - Open your browser to the local dev URL (usually [http://localhost:5173](http://localhost:5173)) to interact with the dashboard.

---

## 🧪 Running Automated Tests

Run the integration tests using the virtual environment's pytest runner. From the root directory:
```bash
.venv\Scripts\python -m pytest backend/tests/ -v
```

Tests verify:
- ✅ Successful transaction postings & database updates.
- ✅ Strict idempotency cache hits (returns 200 OK).
- ✅ Payload mismatch key conflicts (returns 409 Conflict).
- ✅ Pydantic schema validation constraints.
- ✅ Concurrency safety checks.

---

## 🌐 Deployment Guidelines

### Backend (Render)
1. Set up a Web Service pointing to the backend subfolder.
2. Specify the Build Command: `pip install -r backend/requirements.txt`
3. Specify the Start Command: `uvicorn backend.main:app --host 0.0.0.0 --port $PORT`
4. Attach an ephemeral or persistent disk volume for `backend/db.sqlite` if permanent storage is desired across container spin-downs.

### Frontend (Vercel)
1. Set up a Vercel project pointing to the frontend subfolder.
2. Add an environment variable: `VITE_API_URL` set to the live URL of your Render backend.
3. Vercel will auto-detect Vite settings and deploy the static build.
