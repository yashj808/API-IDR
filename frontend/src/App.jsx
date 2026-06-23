import React, { useState } from 'react';
import TransactionForm from './components/TransactionForm';
import ConcurrencyTester from './components/ConcurrencyTester';
import UserSummary from './components/UserSummary';
import Leaderboard from './components/Leaderboard';

function App() {
  const [activeUserId, setActiveUserId] = useState('user_1');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleTransactionSuccess = (userId) => {
    setActiveUserId(userId);
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleSelectUser = (userId) => {
    setActiveUserId(userId);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <header 
        style={{ 
          padding: '1.75rem 2rem', 
          borderBottom: '1px solid var(--border-glass)',
          background: 'rgba(8, 12, 22, 0.4)',
          backdropFilter: 'blur(10px)'
        }}
      >
        <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 className="gradient-text text-glow" style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '0.25rem' }}>
              ⚡ Antigravity Financial Ledger
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
              Idempotent & Concurrency-Safe Transaction Engine
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.8rem' }}>
            <span style={{ fontSize: '0.75rem', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.25)', color: 'var(--accent-emerald)', padding: '0.35rem 0.75rem', borderRadius: '12px', fontWeight: 600 }}>
              ● Engine Live
            </span>
            <span style={{ fontSize: '0.75rem', background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.25)', color: 'var(--accent-blue)', padding: '0.35rem 0.75rem', borderRadius: '12px', fontWeight: 600 }}>
              SQLite WAL Active
            </span>
          </div>
        </div>
      </header>

      {/* Main Grid */}
      <main 
        style={{ 
          flex: 1, 
          maxWidth: '1400px', 
          width: '100%', 
          margin: '0 auto', 
          padding: '2rem',
          display: 'grid',
          gridTemplateColumns: 'repeat(12, 1fr)',
          gap: '2rem'
        }}
      >
        {/* Left Hand Simulation Controls (5 Columns) */}
        <section 
          style={{ 
            gridColumn: 'span 5',
            display: 'flex',
            flexDirection: 'column',
            gap: '2rem'
          }}
          className="sidebar"
        >
          <TransactionForm 
            onTransactionSuccess={handleTransactionSuccess} 
            activeUserId={activeUserId}
            setActiveUserId={setActiveUserId}
          />
          
          <ConcurrencyTester 
            onTestCompleted={handleTransactionSuccess}
            activeUserId={activeUserId}
          />
        </section>

        {/* Right Hand Live Monitoring Cards (7 Columns) */}
        <section 
          style={{ 
            gridColumn: 'span 7',
            display: 'flex',
            flexDirection: 'column',
            gap: '2rem'
          }}
          className="monitor"
        >
          <UserSummary userId={activeUserId} />
          
          <Leaderboard 
            onSelectUser={handleSelectUser} 
            refreshTrigger={refreshTrigger}
          />
        </section>
      </main>

      {/* Footer */}
      <footer 
        style={{ 
          padding: '1.5rem', 
          borderTop: '1px solid var(--border-glass)',
          textAlign: 'center',
          fontSize: '0.8rem',
          color: 'var(--text-muted)'
        }}
      >
        Antigravity Financial API Dashboard • High-Performance Systems Assignment
      </footer>
    </div>
  );
}

export default App;
