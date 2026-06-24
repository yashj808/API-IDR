from pydantic import BaseModel, Field, field_validator
from typing import List

SUPPORTED_CURRENCIES = {"USD", "EUR", "GBP", "INR", "JPY"}

class TransactionCreate(BaseModel):
    userId: str = Field(
        ...,
        min_length=3,
        max_length=50,
        pattern=r"^[a-zA-Z0-9_]+$",
        description="Alphanumeric plus underscores, between 3 and 50 characters"
    )
    amount: float = Field(
        ...,
        gt=0,
        le=999999999.99,
        description="Amount must be strictly positive and up to 999,999,999.99"
    )
    currency: str = Field(
        ...,
        description="Currency code: USD, EUR, GBP, INR, or JPY"
    )

    @field_validator("amount")
    @classmethod
    def validate_decimal_places(cls, v: float) -> float:
        # Check if it has at most 2 decimal places
        if round(v, 2) != v:
            raise ValueError("Amount must have at most 2 decimal places")
        return v

    @field_validator("currency")
    @classmethod
    def validate_currency(cls, v: str) -> str:
        v_upper = v.upper()
        if v_upper not in SUPPORTED_CURRENCIES:
            raise ValueError(f"Currency {v} is not supported. Supported: {list(SUPPORTED_CURRENCIES)}")
        return v_upper

class TransactionResponse(BaseModel):
    transactionId: str
    userId: str
    amount: float
    currency: str
    status: str
    timestamp: str

class UserSummaryResponse(BaseModel):
    userId: str
    totalVolume: float
    transactionCount: int
    averageAmount: float
    currency: str
    lastUpdated: str

class LeaderboardItem(BaseModel):
    rank: int
    userId: str
    totalVolume: float
    transactionCount: int
    currency: str
    score: float

class LeaderboardResponse(BaseModel):
    rankings: List[LeaderboardItem]
