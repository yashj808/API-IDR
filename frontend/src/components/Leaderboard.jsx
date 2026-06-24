import React, { useState, useEffect } from 'react';
import { fetchRanking } from '../api/client';

export default function Leaderboard({ onSelectUser, refreshTrigger }) {
  const [loading, setLoading] = useState(false);
  const [rankings, setRankings] = useState([]);
  const [error, setError] = useState(null);

  const loadRanking = async () => {
    setLoading(true);
    setError(null);
    const res = await fetchRanking();
    setLoading(false);
    if (res.ok) {
      setRankings(res.data.rankings);
    } else {
      setError('Failed to fetch leaderboard data.');
    }
  };

  useEffect(() => {
    loadRanking();
    
    // Set up polling for rankings
    const interval = setInterval(loadRanking, 5000);
    return () => clearInterval(interval);
  }, [refreshTrigger]);

  const getRankBadge = (rank) => {
    switch (rank) {
      case 1: return '🥇';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return `#${rank}`;
    }
  };

  return (
    <div className="glass-panel animate-fade-in" style={{ height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
          Global Leaderboard
        </h2>
        <button 
          className="btn btn-secondary" 
          onClick={loadRanking}
          style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
          disabled={loading}
        >
          Refresh
        </button>
      </div>

      {error && (
        <div style={{ color: 'var(--accent-rose)', textAlign: 'center', padding: '1rem', border: '1px solid var(--border-glass)', borderRadius: '8px' }}>
          {error}
        </div>
      )}

      {loading && rankings.length === 0 && (
        <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-secondary)' }}>
          <div className="glow-pulse" style={{ fontWeight: 500 }}>Fetching rankings...</div>
        </div>
      )}

      {!loading && rankings.length === 0 && !error && (
        <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-muted)' }}>
          No data available. Try submitting some transactions to populate the leaderboard!
        </div>
      )}

      {rankings.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table 
            style={{ 
              width: '100%', 
              borderCollapse: 'collapse', 
              textAlign: 'left',
              fontSize: '0.9rem' 
            }}
          >
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-glass)', color: 'var(--text-secondary)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <th style={{ padding: '0.75rem 0.5rem' }}>Rank</th>
                <th style={{ padding: '0.75rem 0.5rem' }}>User</th>
                <th style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>Volume</th>
                <th style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>Tx Count</th>
                <th style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>Score</th>
              </tr>
            </thead>
            <tbody>
              {rankings.map((item) => (
                <tr 
                  key={item.userId}
                  onClick={() => onSelectUser(item.userId)}
                  style={{ 
                    borderBottom: '1px solid rgba(255,255,255,0.03)',
                    cursor: 'pointer',
                    transition: 'background 0.2s ease',
                  }}
                  className="leaderboard-row"
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <td style={{ padding: '0.85rem 0.5rem', fontWeight: 700, fontSize: '1.05rem' }}>
                    {getRankBadge(item.rank)}
                  </td>
                  <td style={{ padding: '0.85rem 0.5rem', fontWeight: 500 }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ color: 'var(--text-primary)' }}>{item.userId}</span>
                    </div>
                  </td>
                  <td style={{ padding: '0.85rem 0.5rem', textAlign: 'right', fontWeight: 600, fontFamily: 'monospace' }}>
                    ${item.totalVolume.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td style={{ padding: '0.85rem 0.5rem', textAlign: 'right', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                    {item.transactionCount}
                  </td>
                  <td style={{ padding: '0.85rem 0.5rem', textAlign: 'right' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.2rem' }}>
                      <span style={{ fontWeight: 700, color: 'var(--accent-blue)', fontFamily: 'monospace' }}>
                        {item.score}
                      </span>
                      {/* Micro scorebar visualization */}
                      <div 
                        style={{ 
                          width: '50px', 
                          height: '4px', 
                          background: 'rgba(255,255,255,0.05)', 
                          borderRadius: '2px',
                          overflow: 'hidden'
                        }}
                      >
                        <div 
                          style={{ 
                            width: `${Math.min(item.score, 100)}%`, 
                            height: '100%', 
                            background: 'var(--accent-blue)',
                            borderRadius: '2px' 
                          }}
                        />
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
