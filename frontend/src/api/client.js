const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export async function postTransaction(payload, idempotencyKey) {
  const response = await fetch(`${BASE_URL}/transaction`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Idempotency-Key': idempotencyKey,
    },
    body: JSON.stringify(payload),
  });
  
  const data = await response.json();
  return {
    status: response.status,
    ok: response.ok,
    data,
  };
}

export async function fetchSummary(userId) {
  const response = await fetch(`${BASE_URL}/summary/${userId}`);
  const data = await response.json();
  return {
    status: response.status,
    ok: response.ok,
    data,
  };
}

export async function fetchRanking() {
  const response = await fetch(`${BASE_URL}/ranking`);
  const data = await response.json();
  return {
    status: response.status,
    ok: response.ok,
    data,
  };
}

export async function runConcurrentTest(userId, count, amount, useSameKey) {
  const response = await fetch(
    `${BASE_URL}/test/concurrent?user_id=${userId}&count=${count}&amount=${amount}&use_same_key=${useSameKey}`,
    {
      method: 'POST',
    }
  );
  const data = await response.json();
  return {
    status: response.status,
    ok: response.ok,
    data,
  };
}
