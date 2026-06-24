import asyncio
import re
import uuid
from fastapi import APIRouter, HTTPException
from backend.models import TransactionCreate
from backend.services.transaction_service import process_transaction

router = APIRouter()

@router.post(
    "/test/concurrent",
    summary="Simulate concurrent transaction submissions for testing database locks and idempotency"
)
async def test_concurrent(user_id: str, count: int = 10, amount: float = 10.0, use_same_key: bool = False):
    """
    Fires N concurrent transaction requests for a given user.
    If 'use_same_key' is True, all requests share the same idempotency key.
    Otherwise, they use unique keys.
    """
    if count < 1 or count > 50:
        raise HTTPException(
            status_code=400,
            detail="Concurrency count must be between 1 and 50 to prevent Denial of Service."
        )
    if not re.match(r"^[a-zA-Z0-9_]{3,50}$", user_id):
        raise HTTPException(
            status_code=400,
            detail="Invalid User ID format. Must be 3-50 alphanumeric characters or underscores."
        )
    shared_key = f"test-concurrent-shared-{uuid.uuid4().hex[:8]}"
    
    async def task(index: int):
        key = shared_key if use_same_key else f"test-concurrent-unique-{uuid.uuid4().hex[:8]}-{index}"
        payload = TransactionCreate(
            userId=user_id,
            amount=amount,
            currency="USD"
        )
        try:
            res = await process_transaction(key, payload)
            return {
                "index": index,
                "key": key,
                "status_code": res["status_code"],
                "is_replay": res.get("is_replay", False),
                "error": None
            }
        except Exception as e:
            return {
                "index": index,
                "key": key,
                "status_code": getattr(e, "status_code", 500),
                "is_replay": False,
                "error": str(e)
            }

    # Gather tasks concurrently
    tasks = [task(i) for i in range(count)]
    results = await asyncio.gather(*tasks)

    # Summarize results
    summary = {
        "total_requests": count,
        "success_201": sum(1 for r in results if r["status_code"] == 201),
        "replay_200": sum(1 for r in results if r["status_code"] == 200),
        "conflict_409": sum(1 for r in results if r["status_code"] == 409),
        "failed_500": sum(1 for r in results if r["status_code"] == 500),
        "results": results
    }
    
    return summary
