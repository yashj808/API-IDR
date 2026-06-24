import hashlib
import json
import uuid
from datetime import datetime, timezone
from fastapi import HTTPException
from backend.database import get_db
from backend.models import TransactionCreate

def generate_request_hash(payload: TransactionCreate) -> str:
    """
    Generates a deterministic SHA-256 hash of the transaction creation payload.
    """
    # Exclude None or non-serializable fields if any, but since it's Pydantic model:
    data_dict = payload.model_dump()
    serialized = json.dumps(data_dict, sort_keys=True)
    return hashlib.sha256(serialized.encode("utf-8")).hexdigest()

async def process_transaction(idempotency_key: str, payload: TransactionCreate) -> dict:
    """
    Processes the transaction inside a BEGIN IMMEDIATE transaction block.
    Ensures absolute idempotency and concurrency safety.
    Returns a dict containing response details (status_code and body).
    """
    request_hash = generate_request_hash(payload)
    user_id = payload.userId
    amount = payload.amount
    currency = payload.currency

    # Connect to the DB
    db = await get_db()
    try:
        # Start a serialized write transaction
        await db.execute("BEGIN IMMEDIATE TRANSACTION;")

        # 1. Check if the idempotency key already exists
        async with db.execute(
            "SELECT request_hash, response_status, response_body FROM idempotency_keys WHERE key = ?",
            (idempotency_key,)
        ) as cursor:
            row = await cursor.fetchone()

        if row is not None:
            # Key found. Check if the payload matches
            cached_hash = row["request_hash"]
            cached_status = row["response_status"]
            cached_body = json.loads(row["response_body"])

            # Rollback since we did not make any writes
            await db.execute("ROLLBACK;")

            if cached_hash == request_hash:
                # Same payload, return cached response (representing 200 OK replay)
                return {
                    "status_code": cached_status,
                    "is_replay": True,
                    "body": cached_body
                }
            else:
                # Same key, DIFFERENT payload -> 409 Conflict
                raise HTTPException(
                    status_code=409,
                    detail="Conflict: Idempotency Key is already in use with a different request payload."
                )

        # 2. Key does not exist. Process transaction.
        tx_id = f"tx_{uuid.uuid4().hex[:12]}"
        now_str = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")

        # Upsert user summary
        # Get existing summary
        async with db.execute(
            "SELECT total_volume, transaction_count FROM user_summaries WHERE user_id = ?",
            (user_id,)
        ) as cursor:
            summary = await cursor.fetchone()

        if summary is not None:
            new_volume = summary["total_volume"] + amount
            new_count = summary["transaction_count"] + 1
            await db.execute(
                "UPDATE user_summaries SET total_volume = ?, transaction_count = ?, currency = ?, updated_at = ? WHERE user_id = ?",
                (new_volume, new_count, currency, now_str, user_id)
            )
        else:
            await db.execute(
                "INSERT INTO user_summaries (user_id, total_volume, transaction_count, currency, updated_at) VALUES (?, ?, ?, ?, ?)",
                (user_id, amount, 1, currency, now_str)
            )

        # Record the transaction
        await db.execute(
            "INSERT INTO transactions (id, user_id, amount, currency, idempotency_key, created_at) VALUES (?, ?, ?, ?, ?, ?)",
            (tx_id, user_id, amount, currency, idempotency_key, now_str)
        )

        # Build response body
        response_body = {
            "transactionId": tx_id,
            "userId": user_id,
            "amount": amount,
            "currency": currency,
            "status": "success",
            "timestamp": now_str
        }

        # Cache the response inside idempotency store
        await db.execute(
            "INSERT INTO idempotency_keys (key, request_hash, response_status, response_body, created_at) VALUES (?, ?, ?, ?, ?)",
            (idempotency_key, request_hash, 201, json.dumps(response_body), now_str)
        )

        # Commit all changes atomically
        await db.commit()

        return {
            "status_code": 201,
            "is_replay": False,
            "body": response_body
        }

    except HTTPException:
        # Re-raise HTTP exceptions as is
        raise
    except Exception as e:
        # Rollback on database or other errors
        try:
            await db.execute("ROLLBACK;")
        except Exception:
            pass
        raise HTTPException(
            status_code=500,
            detail=f"Internal Database Error: {str(e)}"
        )
    finally:
        await db.close()
