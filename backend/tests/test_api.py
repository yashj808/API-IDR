import uuid
import pytest
from fastapi.testclient import TestClient
from backend.main import app

@pytest.fixture(scope="module")
def client():
    # Using 'with' statement triggers the lifespan context (init_db)
    with TestClient(app) as c:
        yield c

def test_root_endpoint(client):
    response = client.get("/")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"

def test_transaction_creation_and_idempotency(client):
    user_id = f"test_user_{uuid.uuid4().hex[:6]}"
    idempotency_key = f"key_{uuid.uuid4().hex}"
    
    payload = {
        "userId": user_id,
        "amount": 100.50,
        "currency": "USD"
    }
    
    # 1. Success creation (201)
    res1 = client.post(
        "/transaction",
        json=payload,
        headers={"Idempotency-Key": idempotency_key}
    )
    assert res1.status_code == 201
    data1 = res1.json()
    assert data1["userId"] == user_id
    assert data1["amount"] == 100.50
    assert data1["currency"] == "USD"
    assert "transactionId" in data1
    
    # 2. Replay with same key and same body (200 OK, returning cached body)
    res2 = client.post(
        "/transaction",
        json=payload,
        headers={"Idempotency-Key": idempotency_key}
    )
    assert res2.status_code == 200
    data2 = res2.json()
    assert data2["transactionId"] == data1["transactionId"]
    assert data2["userId"] == user_id
    
    # 3. Replay with same key but DIFFERENT body (409 Conflict)
    payload_mismatch = {
        "userId": user_id,
        "amount": 200.00,
        "currency": "USD"
    }
    res3 = client.post(
        "/transaction",
        json=payload_mismatch,
        headers={"Idempotency-Key": idempotency_key}
    )
    assert res3.status_code == 409
    assert "Conflict" in res3.json()["detail"]

def test_transaction_validation_errors(client):
    idempotency_key = f"key_{uuid.uuid4().hex}"
    
    # Negative amount
    res = client.post(
        "/transaction",
        json={"userId": "valid_user", "amount": -10.00, "currency": "USD"},
        headers={"Idempotency-Key": idempotency_key}
    )
    assert res.status_code == 422 # Pydantic validation error
    
    # More than 2 decimal places
    res2 = client.post(
        "/transaction",
        json={"userId": "valid_user", "amount": 10.123, "currency": "USD"},
        headers={"Idempotency-Key": idempotency_key}
    )
    assert res2.status_code == 422
    
    # Unsupported currency
    res3 = client.post(
        "/transaction",
        json={"userId": "valid_user", "amount": 10.00, "currency": "CAD"},
        headers={"Idempotency-Key": idempotency_key}
    )
    assert res3.status_code == 422
    
    # Invalid username format
    res4 = client.post(
        "/transaction",
        json={"userId": "invalid user!", "amount": 10.00, "currency": "USD"},
        headers={"Idempotency-Key": idempotency_key}
    )
    assert res4.status_code == 422
    
    # Missing header
    res5 = client.post(
        "/transaction",
        json={"userId": "valid_user", "amount": 10.00, "currency": "USD"}
    )
    assert res5.status_code == 400
    assert "required" in res5.json()["detail"]

def test_user_summary_endpoint(client):
    user_id = f"test_summary_{uuid.uuid4().hex[:6]}"
    
    # 1. Non-existent user (404)
    res_404 = client.get(f"/summary/{user_id}")
    assert res_404.status_code == 404
    
    # 2. Add two transactions
    client.post(
        "/transaction",
        json={"userId": user_id, "amount": 50.00, "currency": "EUR"},
        headers={"Idempotency-Key": f"tx_sum_1_{uuid.uuid4().hex}"}
    )
    client.post(
        "/transaction",
        json={"userId": user_id, "amount": 150.00, "currency": "EUR"},
        headers={"Idempotency-Key": f"tx_sum_2_{uuid.uuid4().hex}"}
    )
    
    # 3. Retrieve summary (200 OK)
    res = client.get(f"/summary/{user_id}")
    assert res.status_code == 200
    data = res.json()
    assert data["userId"] == user_id
    assert data["totalVolume"] == 200.00
    assert data["transactionCount"] == 2
    assert data["averageAmount"] == 100.00
    assert "lastUpdated" in data

def test_ranking_and_concurrency(client):
    user_id = f"test_concurrent_{uuid.uuid4().hex[:6]}"
    
    # Simulates 10 concurrent requests on server side
    res = client.post(f"/test/concurrent?user_id={user_id}&count=10&amount=12.50&use_same_key=false")
    assert res.status_code == 200
    data = res.json()
    assert data["total_requests"] == 10
    assert data["success_201"] == 10
    
    # Verify totals are updated correctly
    res_summary = client.get(f"/summary/{user_id}")
    assert res_summary.status_code == 200
    summary_data = res_summary.json()
    assert summary_data["totalVolume"] == 125.00  # 10 * 12.50
    assert summary_data["transactionCount"] == 10
    
    # Retrieve rankings and verify user is included
    res_rank = client.get("/ranking")
    assert res_rank.status_code == 200
    rank_data = res_rank.json()
    assert "rankings" in rank_data
    # Assert at least our user is present
    user_ids = [r["userId"] for r in rank_data["rankings"]]
    assert user_id in user_ids

def test_ranking_currency_conversions(client):
    user_gbp = f"gbp_user_{uuid.uuid4().hex[:4]}"
    user_jpy = f"jpy_user_{uuid.uuid4().hex[:4]}"

    # Submit GBP 100.00 for user_gbp -> USD value is 127.00
    res_gbp = client.post(
        "/transaction",
        json={"userId": user_gbp, "amount": 100.00, "currency": "GBP"},
        headers={"Idempotency-Key": f"key_gbp_{uuid.uuid4().hex}"}
    )
    assert res_gbp.status_code == 201

    # Submit JPY 10000.00 for user_jpy -> USD value is 63.00
    res_jpy = client.post(
        "/transaction",
        json={"userId": user_jpy, "amount": 10000.00, "currency": "JPY"},
        headers={"Idempotency-Key": f"key_jpy_{uuid.uuid4().hex}"}
    )
    assert res_jpy.status_code == 201

    # Fetch global rankings
    res = client.get("/ranking")
    assert res.status_code == 200
    rankings = res.json()["rankings"]

    # Filter out other users from rankings list to focus on these two
    filtered = [r for r in rankings if r["userId"] in (user_gbp, user_jpy)]
    assert len(filtered) == 2

    # Since user_gbp volume in USD is 127.00 and user_jpy is 63.00,
    # user_gbp must rank HIGHER than user_jpy (lower index in sorted list)
    index_gbp = next(i for i, r in enumerate(filtered) if r["userId"] == user_gbp)
    index_jpy = next(i for i, r in enumerate(filtered) if r["userId"] == user_jpy)
    
    assert index_gbp < index_jpy

def test_input_validation_hardening(client):
    # 1. Invalid User ID in GET /summary/{userId} (returns 400 Bad Request)
    res_summary_bad = client.get("/summary/invalid-user-name!")
    assert res_summary_bad.status_code == 400
    assert "Invalid User ID format" in res_summary_bad.json()["detail"]

    # 2. Too short User ID in GET /summary/{userId}
    res_summary_short = client.get("/summary/us")
    assert res_summary_short.status_code == 400

    # 3. Invalid User ID in POST /test/concurrent
    res_test_bad_user = client.post("/test/concurrent?user_id=bad-user-name!&count=5")
    assert res_test_bad_user.status_code == 400

    # 4. Out of range count (>50) in POST /test/concurrent
    res_test_large_count = client.post("/test/concurrent?user_id=valid_user&count=100")
    assert res_test_large_count.status_code == 400
    assert "between 1 and 50" in res_test_large_count.json()["detail"]

    # 5. Out of range count (<1) in POST /test/concurrent
    res_test_zero_count = client.post("/test/concurrent?user_id=valid_user&count=0")
    assert res_test_zero_count.status_code == 400
