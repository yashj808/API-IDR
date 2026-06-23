import math
from typing import List, Dict, Any
from backend.database import get_db

def calculate_score(total_volume: float, transaction_count: int) -> float:
    """
    Computes a multi-factor score:
    Score = (0.6 * VolumeScore) + (0.4 * ConsistencyScore)
    - VolumeScore = log10(1 + volume) * 10
    - ConsistencyScore = min(count, 100)
    """
    if total_volume < 0:
        total_volume = 0.0
    volume_score = math.log10(1.0 + total_volume) * 10.0
    consistency_score = float(min(transaction_count, 100))
    score = (0.6 * volume_score) + (0.4 * consistency_score)
    return round(score, 2)

async def get_global_rankings() -> List[Dict[str, Any]]:
    """
    Fetches all user summaries, computes their scores, and ranks them.
    """
    db = await get_db()
    try:
        async with db.execute("SELECT user_id, total_volume, transaction_count FROM user_summaries") as cursor:
            rows = await cursor.fetchall()
    finally:
        await db.close()
            
    rankings = []
    for row in rows:
        user_id = row["user_id"]
        volume = row["total_volume"]
        count = row["transaction_count"]
        score = calculate_score(volume, count)
        rankings.append({
            "userId": user_id,
            "totalVolume": volume,
            "transactionCount": count,
            "score": score
        })
    
    # Sort by score descending, secondary sort by totalVolume descending, then transactionCount descending
    rankings.sort(key=lambda x: (-x["score"], -x["totalVolume"], -x["transactionCount"]))
    
    # Add rank number
    for i, item in enumerate(rankings):
        item["rank"] = i