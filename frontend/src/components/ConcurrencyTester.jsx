import React, { useState } from 'react';
import { runConcurrentTest } from '../api/client';

export default function ConcurrencyTester({ onTestCompleted, activeUserId }) {
  const [loading, setLoading] = useState(false);
  const [log, setLog] = useState([]);
  const [summary, setSummary] = useState(null);

  const startTest = async (useSameKey) => {
    setLoading(true);
    setLog([]);
    setSummary(null);

    const testUser = activeUserId || 'user_concurrent_test';
    
    // Call server-side concurrency simulator endpoint
    const res = await runConcurrentTest(testUser, 10, 15.00, useSameKey);
    setLoading(false);

    if (res.ok) {
      const data = res.data;
      setSummary({
        totalRequests: data.total_requests,
        success201: data.success_201,
        replay200: data.replay_200,
        conflict409: data.conflict_409,
        failed500: data.failed_500,
      });
      setLog(data.results);
      onTestCompleted(testUser);
    } else {
      setSummary({
        error: res.data?.detail || 'Failed to execute concurrency test.'
      });
    }
  };

  return (
    <div className="glass-panel animate-fade-in" style={{ height: '100%' }}>
      <h2 style={{ fontSize: '1rem', marginBottom: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
        Concurrency & Idempotency Lab
      </h2>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem', lineHeight: '1.4' }}>
        Stress-test database race condition handling and key deduplication in real time.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
        <button
          className="btn btn-secondary"
          onClick={() => startTest(false)}
          disabled={loading}
          style={{ fontSize: '0.85rem', padding: '0.85rem 0.5rem' }}
        >
          10x Concurrent Writes
          <div style={{ fontSize: '0.7rem', fontWeight: 400, opacity: 0.8, marginTop: '2px' }}>
            Unique keys (Lock test)
          </div>
        </button>

        <button
          className="btn btn-secondary"
          onClick={() => startTest(true)}
          disabled={loading}
          style={{ fontSize: '0.85rem', padding: '0.85rem 0.5rem' }}
        >
          10x Concurrent Replays
          <div style={{ fontSize: '0.7rem', fontWeight: 400, opacity: 0.8, marginTop: '2px' }}>
            Shared key (Deduplication)
          </div>
        </button>
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--accent-blue)' }}>
          <div className="glow-pulse" style={{ fontSize: '1.1rem', fontWeight: 600 }}>
            Executing concurrent requests on database...
          </div>
        </div>
      )}

      {summary && !loading && (
        <div className="animate-fade-in">
          {summary.error ? (
            <div style={{ color: 'var(--accent-rose)', border: '1px solid rgba(244, 63, 94, 0.2)', padding: '1rem', borderRadius: '8px', background: 'rgba(244, 63, 94, 0.05)' }}>
              {summary.error}
            </div>
          ) : (
            <div>
              <div 
                style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(4, 1fr)', 
                  gap: '0.5rem', 
                  marginBottom: '1rem',
                  textAlign: 'center' 
                }}
              >
                <div style={{ background: 'rgba(30, 41, 59, 0.5)', padding: '0.5rem', borderRadius: '6px' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>TOTAL</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>{summary.totalRequests}</div>
                </div>
                <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '0.5rem', borderRadius: '6px', border: '1px solid rgba(16, 185, 129, 0.15)' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--accent-emerald)' }}>201 OK</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent-emerald)' }}>{summary.success201}</div>
                </div>
                <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '0.5rem', borderRadius: '6px', border: '1px solid rgba(59, 130, 246, 0.15)' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--accent-blue)' }}>200 REP</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent-blue)' }}>{summary.replay200}</div>
                </div>
                <div style={{ background: 'rgba(244, 63, 94, 0.1)', padding: '0.5rem', borderRadius: '6px', border: '1px solid rgba(244, 63, 94, 0.15)' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--accent-rose)' }}>FAILED</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent-rose)' }}>
                    {summary.conflict409 + summary.failed500}
                  </div>
                </div>
              </div>

              {log.length > 0 && (
                <div 
                  style={{ 
                    maxHeight: '130px', 
                    overflowY: 'auto', 
                    fontSize: '0.75rem', 
                    background: 'rgba(15, 23, 42, 0.6)', 
                    border: '1px solid var(--border-glass)', 
                    borderRadius: '8px', 
                    padding: '0.5rem' 
                  }}
                >
                  {log.map((item) => (
                    <div 
                      key={item.index} 
                      style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        padding: '0.25rem 0.4rem', 
                        borderBottom: '1px solid rgba(255, 255, 255, 0.03)',
                        alignItems: 'center'
                      }}
                    >
                      <span style={{ color: 'var(--text-secondary)' }}>Req #{item.index + 1}</span>
                      <span style={{ fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                        {item.key.substring(0, 18)}...
                      </span>
                      <span 
                        style={{ 
                          fontWeight: 600, 
                          color: item.status_code === 201 
                            ? 'var(--accent-emerald)' 
                            : item.status_code === 200 
                            ? 'var(--accent-blue)' 
                            : 'var(--accent-rose)' 
                        }}
                      >
                        {item.status_code}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
