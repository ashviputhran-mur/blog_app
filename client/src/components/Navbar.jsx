import React, { useState, useEffect } from 'react';

export default function Navbar({ currentView, navigateTo, currentUser, onLogout, onOpenWrite }) {
  const [apiConnected, setApiConnected] = useState(false);

  useEffect(() => {
    // Ping backend API via middleware to verify connection
    fetch('/api/health')
      .then(res => res.json())
      .then(data => {
        if (data.status === 'connected') {
          setApiConnected(true);
        }
      })
      .catch(() => setApiConnected(false));
  }, []);

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <div className="nav-brand" onClick={() => navigateTo('feed')} role="button" tabIndex={0}>
          <div className="brand-icon">C</div>
          <div>
            <div className="brand-title">CHRONICLE</div>
          </div>
          <span className="brand-badge">Editorial</span>
        </div>

        <div className="nav-actions">
          {/* Live Full-Stack Middleware Status Badge */}
          <div 
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.25rem 0.65rem',
              borderRadius: 'var(--radius-full)',
              background: apiConnected ? 'rgba(234, 179, 8, 0.15)' : 'rgba(239, 68, 68, 0.12)',
              border: `1px solid ${apiConnected ? 'rgba(234, 179, 8, 0.35)' : 'rgba(239, 68, 68, 0.3)'}`,
              fontSize: '0.75rem',
              fontWeight: '600',
              color: apiConnected ? '#facc15' : '#f87171'
            }}
            title={apiConnected ? 'Connected to Express Backend & SQLite Database via Vite Middleware Proxy' : 'Connecting to API...'}
          >
            <span style={{
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              backgroundColor: apiConnected ? '#facc15' : '#ef4444',
              display: 'inline-block',
              boxShadow: apiConnected ? '0 0 8px #facc15' : 'none'
            }}></span>
            <span>{apiConnected ? 'Full-Stack Connected' : 'Connecting...'}</span>
          </div>

          <button 
            className={`btn btn-sm ${currentView === 'feed' ? 'btn-secondary' : 'btn-secondary'}`}
            onClick={() => navigateTo('feed')}
            style={currentView === 'feed' ? { borderColor: 'var(--primary)', color: 'var(--primary)' } : {}}
          >
            Articles
          </button>

          {currentUser ? (
            <>
              {/* Write New Post Button */}
              <button 
                className="btn btn-sm btn-primary"
                onClick={onOpenWrite}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                title="Compose and publish an article"
              >
                <span>✍️</span>
                <span>Write</span>
              </button>

              {/* Author Studio / My Posts */}
              <button 
                className={`btn btn-sm ${currentView === 'my-posts' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => navigateTo('my-posts')}
              >
                My Studio
              </button>

              {/* Admin Dashboard if Admin role */}
              {currentUser.role === 'admin' && (
                <button 
                  className={`btn btn-sm ${currentView === 'admin-dashboard' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => navigateTo('admin-dashboard')}
                >
                  Dashboard
                </button>
              )}

              {/* User Identity Chip */}
              <div 
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  fontSize: '0.8rem',
                  padding: '0.25rem 0.65rem',
                  borderRadius: 'var(--radius-full)',
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)'
                }}
                title={`Signed in as ${currentUser.username} (${currentUser.role})`}
              >
                <span>{currentUser.role === 'admin' ? '👑' : '👤'}</span>
                <span style={{ fontWeight: '600' }}>{currentUser.username}</span>
              </div>

              {/* Sign Out */}
              <button 
                className="btn btn-sm btn-danger"
                onClick={onLogout}
              >
                Sign Out
              </button>
            </>
          ) : (
            <button 
              className={`btn btn-sm ${currentView === 'auth' || currentView === 'admin-login' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => navigateTo('auth')}
            >
              Sign In / Register
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
