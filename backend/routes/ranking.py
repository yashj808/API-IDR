from fastapi import APIRouter
from backend.models import LeaderboardResponse
from backend.services.ranking_service import get_global_rankings

router = APIRouter()

@router.get(
    "/ranking",
    response_model=LeaderboardResponse,
    summary="Retrieve global leaderboard ranked by multi-factor scoring"
)
async def get_ranking():
    """
    Returns the global leaderboard of users based on total volume and transaction frequency consistency.
    """
    rankings = await get_global_rankings()
    return {"rankings": rankings}
