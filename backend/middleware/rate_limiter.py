import time
from collections import defaultdict
from fastapi import Request, Response
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

class RateLimiterMiddleware(BaseHTTPMiddleware):
    def __init__(self, app):
        super().__init__(app)
        # Store for rate limiting: ip -> list of timestamps
        self.global_history = defaultdict(list)
        self.transaction_history = defaultdict(list)
        
        self.GLOBAL_LIMIT = 100  # requests per minute
        self.TRANSACTION_LIMIT = 20  # POST requests per minute
        self.WINDOW_SIZE = 60  # seconds

    def _clean_and_check(self, history: list, limit: int, current_time: float) -> bool:
        """
        Cleans up timestamps older than WINDOW_SIZE and checks if request exceeds limit.
        Returns True if allowed, False if rate limited.
        """
        # Remove timestamps older than window size
        while history and current_time - history[0] > self.WINDOW_SIZE:
            history.pop(0)
        
        if len(history) >= limit:
            return False
        
        # Record new timestamp
        history.append(current_time)
        return True

    async def dispatch(self, request: Request, call_next):
        client_ip = request.client.host if request.client else "unknown"
        current_time = time.time()

        # 1. Global limit check
        global_allowed = self._clean_and_check(
            self.global_history[client_ip], 
            self.GLOBAL_LIMIT, 
            current_time
        )
        if not global_allowed:
            return JSONResponse(
                status_code=429,
                content={"detail": "Global rate limit exceeded. Max 100 requests per minute."}
            )

        # 2. Transaction limit check (only on POST /transaction)
        if request.method == "POST" and request.url.path.endswith("/transaction"):
            tx_allowed = self._clean_and_check(
                self.transaction_history[client_ip], 
                self.TRANSACTION_LIMIT, 
                current_time
            )
            if not tx_allowed:
                return JSONResponse(
                    status_code=429,
                    content={"detail": "Transaction rate limit exceeded. Max 20 transactions per minute."}
                )

        response = await call_next(request)
        return response
