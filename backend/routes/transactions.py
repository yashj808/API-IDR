from fastapi import APIRouter, Header, HTTPException, Response, status
from fastapi.responses import JSONResponse
from backend.models import TransactionCreate, TransactionResponse
from backend.services.transaction_service import process_transaction

router = APIRouter()

@router.post(
    "/transaction",
    response_model=TransactionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Submit a new financial transaction with idempotency checks"
)
async def create_transaction(
    payload: TransactionCreate,
    idempotency_key: str = Header(None, alias="Idempotency-Key")
):
    """
    Submits a transaction.
    Requires a unique 'Idempotency-Key' in headers.
    """
    if not idempotency_key:
        raise HTTPException(
            status_code=400,
            detail="Header 'Idempotency-Key' is required for transaction submission."
        )
    
    # Check if header is empty or white-spaced
    clean_key = idempotency_key.strip()
    if not clean_key:
        raise HTTPException(
            status_code=400,
            detail="Header 'Idempotency-Key' cannot be empty."
        )
        
    if len(clean_key) > 128:
        raise HTTPException(
            status_code=400,
            detail="Header 'Idempotency-Key' must be at most 128 characters."
        )

    result = await process_transaction(clean_key, payload)
    
    if result.get("is_replay"):
        # The key was already processed successfully with the same body; return 200 OK
        return JSONResponse(status_code=200, content=result["body"])
    
    # Otherwise it was newly created; return 201 Created
    return JSONResponse(status_code=201, content=result["body"])
