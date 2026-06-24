import aiosqlite
import os

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "db.sqlite")

async def get_db():
    """
    Returns an active database connection with WAL mode configured.
    """
    conn = await aiosqlite.connect(DB_PATH)
    # Enable WAL mode and set busy_timeout
    await conn.execute("PRAGMA journal_mode = WAL;")
    await conn.execute("PRAGMA busy_timeout = 5000;")
    conn.row_factory = aiosqlite.Row
    return conn

async def init_db():
    """
    Initializes the database schema.
    """
    db = await get_db()
    try:
        # Create idempotency keys table
        await db.execute("""
            CREATE TABLE IF NOT EXISTS idempotency_keys (
                key TEXT PRIMARY KEY,
                request_hash TEXT NOT NULL,
                response_status INTEGER NOT NULL,
                response_body TEXT NOT NULL,
                created_at TEXT DEFAULT (datetime('now'))
            );
        """)

        # Create transactions table
        await db.execute("""
            CREATE TABLE IF NOT EXISTS transactions (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                amount REAL NOT NULL,
                currency TEXT NOT NULL,
                idempotency_key TEXT UNIQUE,
                created_at TEXT DEFAULT (datetime('now'))
            );
        """)

        # Create user summaries table
        await db.execute("""
            CREATE TABLE IF NOT EXISTS user_summaries (
                user_id TEXT PRIMARY KEY,
                total_volume REAL DEFAULT 0.0,
                total_volume_usd REAL DEFAULT 0.0,
                transaction_count INTEGER DEFAULT 0,
                currency TEXT DEFAULT 'USD',
                updated_at TEXT DEFAULT (datetime('now'))
            );
        """)

        # Create indexes
        await db.execute("CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id);")
        await db.execute("CREATE INDEX IF NOT EXISTS idx_summaries_volume ON user_summaries(total_volume_usd DESC);")
        
        await db.commit()

        # Schema migration fallback for existing databases
        try:
            await db.execute("ALTER TABLE user_summaries ADD COLUMN currency TEXT DEFAULT 'USD';")
            await db.commit()
        except Exception:
            pass

        try:
            await db.execute("ALTER TABLE user_summaries ADD COLUMN total_volume_usd REAL DEFAULT 0.0;")
            await db.commit()
        except Exception:
            pass

        try:
            await db.execute("UPDATE user_summaries SET total_volume_usd = total_volume WHERE total_volume_usd IS NULL OR total_volume_usd = 0.0;")
            await db.commit()
        except Exception:
            pass
    finally:
        await db.close()
