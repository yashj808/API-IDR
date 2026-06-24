import React, { useState, useEffect } from 'react';
import { fetchSummary } from '../api/client';

export default function UserSummary({ userId }) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!userId) {
      setData(null);
      setNotFound(false);
      return;
    }

    let isMounted = true;

    const loadSummary = async (showLoadingState = true) => {
      if (showLoadingState) {
        setLoading(true);
      }
      const res = await fetchSummary(userId);
      
      if (!isMounted) return;
      setLoading(false);
      
      if (res.ok) {
        setData(res.data);
        setNotFound(false);
      } else if (res.status === 404) {
        setData(null);
        setNotFound(true);
      } else {
        setData(null);
        setNotFound(false);
      }
    };

    // When the userId prop changes, clear current data immediately so we don't show old metrics
    setData(null);
    setNotFound(false);
    loadSummary(true);
    
    // Set up background polling updates (don't show full loading overlay on background refreshes)
    const interval = setInterval(() => {
      loadSummary(false);
    }, 4000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [userId]);

  if (!userId) {
    return (
      <div className="glass-panel" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '178px' }}>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Select a User ID to inspect stats.</p>
      </div>
    );
  }

  // Determine displays to avoid structural jumps
  const totalVolumeStr = data ? `$${data.totalVolume.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : (loading ? '...' : '$0.00');
  const countStr = data ? data.transactionCount : (loading ? '...' : '0');
  const averageStr = data ? `$${data.averageAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : (loading ? '...' : '$0.00');
  const timestampStr = data ? new Date(data.lastUpdated).toLocaleTimeString() : null;

  return (
    <div className="glass-panel" style={{ height: '178px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
      {/* Title Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>User Summary</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span 
            style={{ 
              background: 'rgba(37, 99, 235, 0.1)', 
              border: '1px solid rgba(37, 99, 235, 0.2)',
              padding: '0.15rem 0.5rem', 
              borderRadius: '4px',
              fontSize: '0.75rem',
              color: '#60a5fa',
              fontWeight: 600,
              fontFamily: 'monospace'
            }}
          >
            {userId}
          </span>
          {loading && (
            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }} className="glow-pulse">
              Syncing...
            </span>
          )}
        </div>
      </div>

      {/* Metrics Row (Fixed Structure) */}
      <div 
        style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(3, 1fr)', 
          gap: '0.75rem', 
          margin: '0.75rem 0',
          opacity: loading ? 0.6 : 1,
          transition: 'opacity 0.15s ease'
        }}
      >
        <div style={{ background: '#090d16', border: '1px solid var(--border-color)', padding: '0.65rem', borderRadius: '6px' }}>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>Total Volume</div>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.15rem', textOverflow: 'ellipsis', overflow: 'hidden' }}>
            {totalVolumeStr}
          </div>
        </div>
        
        <div style={{ background: '#090d16', border: '1px solid var(--border-color)', padding: '0.65rem', borderRadius: '6px' }}>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>Transactions</div>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.15rem' }}>
            {countStr}
          </div>
        </div>

        <div style={{ background: '#090d16', border: '1px solid var(--border-color)', padding: '0.65rem', borderRadius: '6px' }}>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>Average Size</div>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent-emerald)', marginTop: '0.15rem', textOverflow: 'ellipsis', overflow: 'hidden' }}>
            {averageStr}
          </div>
        </div>
      </div>

      {/* Footer Info Row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
        {notFound ? (
          <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>No transaction activity recorded yet.</span>
        ) : (
          <span>{timestampStr ? `Auto-updating • Updated ${timestampStr}` : 'Waiting for connection...'}</span>
        )}
      </div>
    </div>
  );
}
