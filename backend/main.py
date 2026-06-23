from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.database import init_db
from backend.middleware.rate_limiter import RateLimiterMiddleware
from backend.routes import transactions, summary, ranking, testing

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize database on startup
    await init_db()
    yield
    # Cleanup database/resources if needed on shutdown (sqlite connections are closed per request)

app = FastAPI(
    title="Financial Transaction API",
    description="A robust, secure, and concurrent-safe transaction processor with idempotency, user metrics, and global ranking.",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware configuration to allow React frontend calls
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for local testing and easy deployment
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory sliding window rate limiter middleware
app.add_middleware(RateLimiterMiddleware)

# Include routers
app.include_router(transactions.router, tags=["Transactions"])
app.include_router(summary.router, tags=["User Summaries"])
app.include_router(ranking.router, tags=["Global Leaderboard"])
app.include_router(testing.router, tags=["Testing & Simulation"])

@app.get("/", tags=["Root"])
def read_root():
    return {
        "message": "Welcome to the Financial Transaction API. Head to /docs for OpenAPI documentation.",
        "status": "healthy"
    }
