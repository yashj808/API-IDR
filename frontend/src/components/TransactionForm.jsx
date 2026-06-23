import React, { useState, useEffect } from 'react';
import { postTransaction } from '../api/client';

export default function TransactionForm({ onTransactionSuccess, activeUserId, setActiveUserId }) {
  const [userId, setUserId] = useState(activeUserId || 'user_1');
  const [amount, setAmount] = useState('150.00');
  const [currency, setCurrency] = useState('USD');
  const [idempotencyKey, setIdempotencyKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  // Sync active user ID
  useEffect(() => {
    if (activeUserId) {
      setUserId(activeUserId);
    }
  }, [activeUserId]);

  const generateUUID = () => {
    if (typeof window !== 'undefined' && window.crypto && window.crypto.randomUUID) {
      return window.crypto.randomUUID();
    }
    // Fallback simple UUID generator
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  };

  const refreshKey = () => {
    setIdempotencyKey(generateUUID());
    setResult(null);
  };

  useEffect(() => {
    refreshKey();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    // Validate fields
    if (!userId.match(/^[a-zA-Z0-9_]{3,50}$/)) {
      setResult({
        ok: false,
        message: 'Invalid User ID. Must be 3-50 alphanumeric characters or underscores.',
      });
      setLoading(false);
      return;
    }

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      setResult({
        ok: false,
        message: 'Amount must be a strictly positive number.',
      });
      setLoading(false);
      return;
    }

    const payload = {
      userId,
      amount: numericAmount,
      currency,
    };

    const res = await postTransaction(payload, idempotencyKey);
    setLoading(false);
    setResult(res);

    if (res.ok) {
      // Trigger update of user summaries and rankings
      setActiveUserId(userId);
      onTransactionSuccess(userId);
      // Auto-generate next key to avoid accidental duplicates unless desired
      setIdempotencyKey(generateUUID());
    }
  };

  return (
    <div className="glass-panel animate-fade-in" style={{ height: '100%' }}>
      <h2 style={{ marginBottom: '1.5rem', fontWeight: 700 }} className="text-glow">
        💳 Transaction Simulator
      </h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label">User ID</label>
          <input
            type="text"
            className="form-input"
            value={userId}
            onChange={(e) => {
              setUserId(e.target.value);
              setActiveUserId(e.target.value);
            }}
            placeholder="e.g. user_abc123"
            required
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
          <div className="form-group">
            <label className="form-label">Amount</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              max="999999999.99"
              className="form-input"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="150.00"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Currency</label>
            <select
              className="form-select"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
            >
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="GBP">GBP</option>
              <option value="INR">INR</option>
              <option value="JPY">JPY</option>
            </select>
          </div>
        </div>

        <div className="form-group" style={{ position: 'relative' }}>
          <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Idempotency Key</span>
            <button
              type="button"
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--accent-blue)',
                cursor: 'pointer',
                fontSize: '0.75rem',
                fontWeight: 600,
                textTransform: 'uppercase',
              }}
              onClick={refreshKey}
            >
              🔄 Regenerate
            </button>
          </label>
          <input
            type="text"
            className="form-input"
            value={idempotencyKey}
            onChange={(e) => setIdempotencyKey(e.target.value)}
            style={{ fontSize: '0.8rem', fontFamily: 'monospace', opacity: 0.85 }}
            required
          />
        </div>

        <button
          type="submit"
          className="btn"
          disabled={loading}
          style={{ width: '100%', marginTop: '0.5rem' }}
        >
          {loading ? 'Processing...' : '⚡ Submit Transaction'}
        </button>
      </form>

      {result && (
        <div
          className="animate-fade-in"
          style={{
            marginTop: '1.25rem',
            padding: '0.85rem',
            borderRadius: '8px',
            background: result.ok
              ? 'rgba(16, 185, 129, 0.1)'
              : 'rgba(244, 63, 94, 0.1)',
            border: `1px solid ${
              result.ok ? 'rgba(16, 185, 129, 0.25)' : 'rgba(244, 63, 94, 0.25)'
            }`,
            fontSize: '0.875rem',
          }}
        >
          <div style={{ fontWeight: 600, color: result.ok ? 'var(--accent-emerald)' : 'var(--accent-rose)', marginBottom: '0.25rem' }}>
            {result.ok 
              ? (result.status === 200 ? '✅ 200 OK (Idempotent Replay)' : '🎉 201 Created (Success)') 
              : `❌ Error (${result.status})`
            }
          </div>
          <div style={{ color: 'var(--text-primary)', wordBreak: 'break-all', fontFamily: 'monospace', fontSize: '0.8rem' }}>
            {result.ok ? (
              <pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>
                {JSON.stringify(result.data, null, 2)}
              </pre>
            ) : (
              result.data?.detail || result.message || 'An unknown error occurred.'
            )}
          </div>
        </div>
      )}
    </div>
  );
}
