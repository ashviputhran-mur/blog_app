import React, { useState } from 'react';
import { loginUser, registerUser, saveAuthSession } from '../services/api';

export default function AuthPortal({ onLoginSuccess, onCancel, initialTab = 'login' }) {
  const [activeTab, setActiveTab] = useState(initialTab); // 'login' | 'register'
  
  // Login Form State
  const [loginIdentifier, setLoginIdentifier] = useState('admin');
  const [loginPassword, setLoginPassword] = useState('admin123');
  
  // Register Form State
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  function handleTabChange(tab) {
    setActiveTab(tab);
    setError('');
    setSuccessMsg('');
  }

  function fillDemoAdmin() {
    setLoginIdentifier('admin');
    setLoginPassword('admin123');
    setError('');
  }

  async function handleLoginSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!loginIdentifier.trim() || !loginPassword.trim()) {
      setError('Please enter your username/email and password.');
      return;
    }

    try {
      setLoading(true);
      const res = await loginUser(loginIdentifier.trim(), loginPassword);
      saveAuthSession(res.token, res.user);
      onLoginSuccess(res.user);
    } catch (err) {
      setError(err.message || 'Authentication failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  }

  async function handleRegisterSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!regUsername.trim() || !regPassword.trim()) {
      setError('Username and password are required.');
      return;
    }

    if (regUsername.trim().length < 3) {
      setError('Username must be at least 3 characters long.');
      return;
    }

    if (regPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    try {
      setLoading(true);
      const res = await registerUser({
        username: regUsername.trim(),
        email: regEmail.trim() || undefined,
        password: regPassword
      });

      saveAuthSession(res.token, res.user);
      setSuccessMsg('Account registered successfully! Redirecting...');
      setTimeout(() => {
        onLoginSuccess(res.user);
      }, 600);
    } catch (err) {
      setError(err.message || 'Registration failed. Please try a different username/email.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: '480px', margin: '3rem auto', padding: '0 1rem' }}>
      <div className="comment-form-card" style={{ padding: '2.5rem', boxShadow: 'var(--shadow-lg)' }}>
        
        {/* Header Icon & Brand */}
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <div 
            className="brand-icon" 
            style={{ margin: '0 auto 1rem', width: '48px', height: '48px', fontSize: '1.5rem' }}
          >
            {activeTab === 'login' ? '🔐' : '✨'}
          </div>
          <h2 style={{ fontSize: '1.75rem', marginBottom: '0.4rem', fontWeight: '800' }}>
            {activeTab === 'login' ? 'Welcome Back' : 'Join CHRONICLE'}
          </h2>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            {activeTab === 'login' 
              ? 'Sign in to write articles, edit your posts, or access moderation tools.' 
              : 'Create an author account to publish articles and engage in discussions.'}
          </p>
        </div>

        {/* Tab Toggle Switch */}
        <div style={{
          display: 'flex',
          background: 'var(--bg-tertiary)',
          borderRadius: 'var(--radius-md)',
          padding: '0.35rem',
          marginBottom: '1.75rem',
          border: '1px solid var(--border-color)'
        }}>
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => handleTabChange('login')}
            style={{
              flex: 1,
              borderRadius: 'var(--radius-sm)',
              background: activeTab === 'login' ? 'var(--primary)' : 'transparent',
              color: activeTab === 'login' ? '#ffffff' : 'var(--text-secondary)',
              boxShadow: activeTab === 'login' ? 'var(--shadow-sm)' : 'none',
              fontWeight: '600'
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => handleTabChange('register')}
            style={{
              flex: 1,
              borderRadius: 'var(--radius-sm)',
              background: activeTab === 'register' ? 'var(--primary)' : 'transparent',
              color: activeTab === 'register' ? '#ffffff' : 'var(--text-secondary)',
              boxShadow: activeTab === 'register' ? 'var(--shadow-sm)' : 'none',
              fontWeight: '600'
            }}
          >
            Register Account
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div style={{
            padding: '0.85rem 1rem',
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 'var(--radius-md)',
            color: '#f87171',
            fontSize: '0.9rem',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* Success Alert */}
        {successMsg && (
          <div style={{
            padding: '0.85rem 1rem',
            background: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: 'var(--radius-md)',
            color: '#34d399',
            fontSize: '0.9rem',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <span>✅</span>
            <span>{successMsg}</span>
          </div>
        )}

        {/* Sign In Form */}
        {activeTab === 'login' && (
          <form onSubmit={handleLoginSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="login-identifier">
                Username or Email
              </label>
              <input 
                id="login-identifier"
                type="text"
                className="form-input"
                value={loginIdentifier}
                onChange={(e) => setLoginIdentifier(e.target.value)}
                placeholder="e.g. admin or author@chronicle.local"
                autoComplete="username"
                required
              />
            </div>

            <div className="form-group" style={{ marginBottom: '1.25rem' }}>
              <label className="form-label" htmlFor="login-password">
                Password
              </label>
              <input 
                id="login-password"
                type="password"
                className="form-input"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                required
              />
            </div>

            {/* Quick Demo Pre-fill Card */}
            <div style={{
              background: 'rgba(99, 102, 241, 0.08)',
              border: '1px solid rgba(99, 102, 241, 0.2)',
              borderRadius: 'var(--radius-sm)',
              padding: '0.75rem',
              marginBottom: '1.5rem',
              fontSize: '0.8rem',
              color: '#a5b4fc',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                💡 <strong>Demo Admin:</strong> <code>admin</code> / <code>admin123</code>
              </div>
              <button 
                type="button" 
                className="btn btn-sm btn-secondary"
                onClick={fillDemoAdmin}
                style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}
              >
                Auto-Fill
              </button>
            </div>

            <button 
              type="submit" 
              className="btn btn-primary"
              style={{ width: '100%', marginBottom: '1rem' }}
              disabled={loading}
            >
              {loading ? 'Authenticating...' : 'Sign In'}
            </button>
          </form>
        )}

        {/* Register Form */}
        {activeTab === 'register' && (
          <form onSubmit={handleRegisterSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="reg-username">
                Choose Username <span style={{ color: 'var(--accent)' }}>*</span>
              </label>
              <input 
                id="reg-username"
                type="text"
                className="form-input"
                value={regUsername}
                onChange={(e) => setRegUsername(e.target.value)}
                placeholder="e.g. alex_writer"
                autoComplete="username"
                required
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Minimum 3 characters, alphanumeric or underscores.
              </span>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="reg-email">
                Email Address (Optional)
              </label>
              <input 
                id="reg-email"
                type="email"
                className="form-input"
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                placeholder="e.g. alex@example.com"
                autoComplete="email"
              />
            </div>

            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label className="form-label" htmlFor="reg-password">
                Password <span style={{ color: 'var(--accent)' }}>*</span>
              </label>
              <input 
                id="reg-password"
                type="password"
                className="form-input"
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                autoComplete="new-password"
                required
              />
            </div>

            <button 
              type="submit" 
              className="btn btn-primary"
              style={{ width: '100%', marginBottom: '1rem' }}
              disabled={loading}
            >
              {loading ? 'Creating Account...' : 'Create Author Account'}
            </button>
          </form>
        )}

        {/* Return Button */}
        <button 
          type="button" 
          className="btn btn-secondary" 
          style={{ width: '100%' }}
          onClick={onCancel}
        >
          Cancel & Return to Public Blog
        </button>
      </div>
    </div>
  );
}
