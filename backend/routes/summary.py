from fastapi import APIRouter, HTTPException
import re
from backend.database import get_db
from backend.models import UserSummaryResponse

router = APIRouter()

@router.get(
    "/summary/{userId}",
    response_model=UserSummaryResponse,
    summary="Retrieve near-real-time summary of a specific user"
)
async def get_summary(userId: str):
    """
    Retrieves summary for the specified userId.
    """
    if not re.match(r"^[a-zA-Z0-9_]{3,50}$", userId):
        raise HTTPException(
            status_code=400,
            detail="Invalid User ID format. Must be 3-50 alphanumeric characters or underscores."
        )
    db = await get_db()
    try:
        async with db.execute(
            "SELECT total_volume, transaction_count, currency, updated_at FROM user_summaries WHERE user_id = ?",
            (userId,)
        ) as cursor:
            row = await cursor.fetchone()
            
        if row is None:
            raise HTTPException(
                status_code=404,
                detail=f"Summary not found for user: {userId}"
            )
            
        total_volume = row["total_volume"]
        count = row["transaction_count"]
        average = total_volume / count if count > 0 else 0.0
        
        return {
            "userId": userId,
            "totalVolume": round(total_volume, 2),
            "transactionCount": count,
            "averageAmount": round(average, 2),
            "currency": row["currency"] or "USD",
            "lastUpdated": row["updated_at"]
        }
    finally:
        await db.close()
