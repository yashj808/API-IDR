import React, { useState, useEffect } from 'react';
import { fetchSummary } from '../api/client';

export default function UserSummary({ userId }) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!userId) return;

    let isMounted = true;
    const loadSummary = async () => {
      setLoading(true);
      setNotFound(false);
      const res = await fetchSummary(userId);
      
      if (!isMounted) return;
      setLoading(false);
      
      if (res.ok) {
        setData(res.data);
      } else if (res.status === 404) {
        setData(null);
        setNotFound(true);
      } else {
        setData(null);
      }
    };

    loadSummary();
    
    // Polling setup for active user summary updates
    const interval = setInterval(loadSummary, 4000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [userId]);

  if (!userId) {
    return (
      <div className="glass-panel" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '180px' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Select or enter a User ID to inspect metrics.</p>
      </div>
    );
  }

  return (
    <div className="glass-panel animate-fade-in" style={{ height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <h2 style={{ fontWeight: 700 }} className="text-glow">🔍 User Summary</h2>
        <span 
          style={{ 
            background: 'rgba(59, 130, 246, 0.1)', 
            border: '1px solid rgba(59, 130, 246, 0.2)',
            padding: '0.2rem 0.6rem', 
            borderRadius: '12px',
            fontSize: '0.75rem',
            color: 'var(--accent-blue)',
            fontWeight: 600,
            fontFamily: 'monospace'
          }}
        >
          {userId}
        </span>
      </div>

      {loading && !data && (
        <div style={{ padding: '2rem 0', textAlign: 'center', color: 'var(--text-secondary)' }}>
          <div className="glow-pulse" style={{ fontWeight: 500 }}>Fetching live summary...</div>
        </div>
      )}

      {notFound && (
        <div style={{ padding: '2rem 1rem', textAlign: 'center', borderRadius: '8px', background: 'rgba(30, 41, 59, 0.4)', border: '1px solid var(--border-glass)' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '0.25rem' }}>No activity found</p>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Submit a transaction for this user to initialize metrics.</p>
        </div>
      )}

      {data && (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
            <div style={{ background: 'rgba(30, 41, 59, 0.3)', border: '1px solid var(--border-glass)', padding: '0.85rem', borderRadius: '10px' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Volume</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.1rem' }}>
                ${data.totalVolume.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
            </div>
            
            <div style={{ background: 'rgba(30, 41, 59, 0.3)', border: '1px solid var(--border-glass)', padding: '0.85rem', borderRadius: '10px' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Transactions</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.1rem' }}>
                {data.transactionCount}
              </div>
            </div>
          </div>

          <div style={{ background: 'rgba(30, 41, 59, 0.3)', border: '1px solid var(--border-glass)', padding: '0.85rem', borderRadius: '10px' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Average Size</div>
            <div style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--accent-emerald)', marginTop: '0.1rem' }}>
              ${data.averageAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            <span>Auto-refreshing (4s)</span>
            <span>Last update: {new Date(data.lastUpdated).toLocaleTimeString()}</span>
          </div>
        </div>
      )}
    </div>
  );
}
