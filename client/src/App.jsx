import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import HomeFeed from './pages/HomeFeed';
import ArticleDetail from './pages/ArticleDetail';
import AuthPortal from './pages/AuthPortal';
import AdminDashboard from './pages/AdminDashboard';
import MyPosts from './pages/MyPosts';
import PostEditorModal from './components/PostEditorModal';
import { getCurrentUser, getAuthToken, clearAuthSession } from './services/api';

export default function App() {
  const [currentView, setCurrentView] = useState('feed'); // 'feed' | 'article' | 'auth' | 'my-posts' | 'admin-dashboard'
  const [selectedSlug, setSelectedSlug] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  // Global Post Editor Modal state (accessible from Navbar or My Studio)
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [postToEdit, setPostToEdit] = useState(null);
  const [feedRefreshKey, setFeedRefreshKey] = useState(0);

  // Check existing token and session on mount
  useEffect(() => {
    const token = getAuthToken();
    const user = getCurrentUser();
    if (token) {
      if (user) {
        setCurrentUser(user);
      } else {
        // Fallback for legacy admin token
        const adminToken = localStorage.getItem('chronicle_admin_token');
        if (adminToken) {
          setCurrentUser({ username: 'admin', role: 'admin' });
        }
      }
    }

    // Handle initial hash navigation
    parseHash();

    // Listen to browser hash changes (enables back/forward navigation)
    window.addEventListener('hashchange', parseHash);
    return () => window.removeEventListener('hashchange', parseHash);
  }, []);

  function parseHash() {
    const hash = window.location.hash.replace('#', '') || 'feed';
    if (hash.startsWith('article/')) {
      const slug = hash.replace('article/', '');
      setSelectedSlug(slug);
      setCurrentView('article');
    } else if (hash === 'admin-dashboard') {
      const user = getCurrentUser();
      const token = getAuthToken();
      if (token && (user?.role === 'admin' || localStorage.getItem('chronicle_admin_token'))) {
        setCurrentView('admin-dashboard');
      } else {
        window.location.hash = 'auth';
        setCurrentView('auth');
      }
    } else if (hash === 'my-posts') {
      const token = getAuthToken();
      if (token) {
        setCurrentView('my-posts');
      } else {
        window.location.hash = 'auth';
        setCurrentView('auth');
      }
    } else if (hash === 'auth' || hash === 'admin-login') {
      setCurrentView('auth');
    } else {
      setCurrentView('feed');
      setSelectedSlug(null);
    }
  }

  function navigateTo(view, slug = null) {
    if (view === 'article' && slug) {
      window.location.hash = `article/${slug}`;
      setSelectedSlug(slug);
      setCurrentView('article');
    } else if (view === 'admin-dashboard') {
      const user = getCurrentUser() || currentUser;
      if (!user || user.role !== 'admin') {
        window.location.hash = 'auth';
        setCurrentView('auth');
      } else {
        window.location.hash = 'admin-dashboard';
        setCurrentView('admin-dashboard');
      }
    } else if (view === 'my-posts') {
      if (!getAuthToken()) {
        window.location.hash = 'auth';
        setCurrentView('auth');
      } else {
        window.location.hash = 'my-posts';
        setCurrentView('my-posts');
      }
    } else if (view === 'auth' || view === 'admin-login') {
      window.location.hash = 'auth';
      setCurrentView('auth');
    } else {
      window.location.hash = 'feed';
      setSelectedSlug(null);
      setCurrentView('feed');
    }
  }

  function handleLoginSuccess(user) {
    setCurrentUser(user);
    if (user.role === 'admin') {
      navigateTo('admin-dashboard');
    } else {
      navigateTo('my-posts');
    }
  }

  function handleLogout() {
    clearAuthSession();
    setCurrentUser(null);
    navigateTo('feed');
  }

  function handleOpenWriteModal() {
    if (!currentUser) {
      navigateTo('auth');
      return;
    }
    setPostToEdit(null);
    setIsEditorOpen(true);
  }

  function handleOpenEditPost(post) {
    setPostToEdit(post);
    setIsEditorOpen(true);
  }

  function handleSavePostSuccess(savedPost, isEditing) {
    setIsEditorOpen(false);
    setPostToEdit(null);
    setFeedRefreshKey(k => k + 1);

    if (savedPost?.slug) {
      navigateTo('article', savedPost.slug);
    } else if (currentUser?.role === 'admin') {
      navigateTo('admin-dashboard');
    } else {
      navigateTo('my-posts');
    }
  }

  return (
    <div className="app-container">
      {/* Top Navbar with User Controls */}
      <Navbar 
        currentView={currentView}
        navigateTo={navigateTo}
        currentUser={currentUser}
        onLogout={handleLogout}
        onOpenWrite={handleOpenWriteModal}
      />

      {/* Main Dynamic View Area */}
      <main className="main-content">
        {currentView === 'feed' && (
          <HomeFeed 
            key={feedRefreshKey}
            onSelectPost={(slug) => navigateTo('article', slug)} 
          />
        )}

        {currentView === 'article' && (
          <ArticleDetail 
            slug={selectedSlug} 
            currentUser={currentUser}
            onBackToFeed={() => navigateTo('feed')} 
          />
        )}

        {currentView === 'auth' && (
          <AuthPortal 
            onLoginSuccess={handleLoginSuccess}
            onCancel={() => navigateTo('feed')}
          />
        )}

        {currentView === 'my-posts' && (
          <MyPosts 
            currentUser={currentUser}
            onSelectPost={(slug) => navigateTo('article', slug)}
            onOpenCreate={handleOpenWriteModal}
            onEditPost={handleOpenEditPost}
            onBackToFeed={() => navigateTo('feed')}
          />
        )}

        {currentView === 'admin-dashboard' && (
          <AdminDashboard 
            onSelectPost={(slug) => navigateTo('article', slug)}
            onBackToFeed={() => navigateTo('feed')}
          />
        )}
      </main>

      {/* Global Post Editor Modal */}
      <PostEditorModal 
        isOpen={isEditorOpen}
        onClose={() => { setIsEditorOpen(false); setPostToEdit(null); }}
        postToEdit={postToEdit}
        currentUser={currentUser}
        onSaveSuccess={handleSavePostSuccess}
      />

      {/* Editorial Footer */}
      <footer className="footer">
        <div className="footer-inner">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontWeight: '800', color: 'var(--text-primary)' }}>CHRONICLE</span>
            <span>— <span style={{ color: '#facc15', fontWeight: '700' }}>Full-Stack</span> Editorial Blog Platform</span>
          </div>
          <div>
            Built with Node.js, Express, React, and Vanilla CSS
          </div>
        </div>
      </footer>
    </div>
  );
}
