import React, { useState, useEffect } from 'react';
import { fetchPosts, fetchCategories } from '../services/api';
import BlogCard from '../components/BlogCard';
import ControlsBar from '../components/ControlsBar';

export default function HomeFeed({ onSelectPost }) {
  const [posts, setPosts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);

  // Pagination / Batching state for 2,000 articles
  const [page, setPage] = useState(1);
  const [totalPosts, setTotalPosts] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  const BATCH_SIZE = 24;

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    // Reset to page 1 whenever search query or category changes
    setPage(1);
    loadInitialPosts();
  }, [searchQuery, selectedCategory]);

  async function loadCategories() {
    try {
      const data = await fetchCategories();
      setCategories(data);
    } catch (err) {
      console.error('Error fetching categories:', err);
    }
  }

  async function loadInitialPosts() {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchPosts(searchQuery, selectedCategory, 1, BATCH_SIZE);
      
      if (data && data.posts) {
        setPosts(data.posts);
        setTotalPosts(data.total || data.posts.length);
        setHasMore(data.hasMore);
      } else if (Array.isArray(data)) {
        setPosts(data);
        setTotalPosts(data.length);
        setHasMore(false);
      }
    } catch (err) {
      console.error('Error fetching initial posts:', err);
      setError('Unable to load articles. Please check server connection.');
    } finally {
      setLoading(false);
    }
  }

  async function handleLoadMore() {
    if (loadingMore || !hasMore) return;

    try {
      setLoadingMore(true);
      const nextPage = page + 1;
      const data = await fetchPosts(searchQuery, selectedCategory, nextPage, BATCH_SIZE);

      if (data && data.posts) {
        setPosts(prev => [...prev, ...data.posts]);
        setPage(nextPage);
        setHasMore(data.hasMore);
      }
    } catch (err) {
      console.error('Error loading more posts:', err);
    } finally {
      setLoadingMore(false);
    }
  }

  // Calculate total posts count across all categories or current total
  const totalCategoryCount = categories.reduce((acc, cat) => acc + (cat.count || 0), 0);
  const displayTotal = totalPosts || totalCategoryCount || posts.length;

  return (
    <div>
      {/* Editorial Hero */}
      <section className="hero-section">
        <div className="hero-tag">
          <span>✨</span> Comprehensive Archive of 2,000+ Technical Articles
        </div>
        <h1 className="hero-title serif-heading">
          Where Thoughtful Ideas <span>Take Shape.</span>
        </h1>
        <p className="hero-subtitle">
          Explore a rich archive of over 2,000 articles on software engineering, cloud architecture, design systems, and modern AI.
        </p>
      </section>

      {/* Search and Category Filter Controls */}
      <ControlsBar 
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        categories={categories}
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
        totalPostsCount={displayTotal}
      />

      {/* Articles Feed */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: '1.25rem' }}>Loading curated articles...</div>
        </div>
      ) : error ? (
        <div className="empty-state">
          <div className="empty-state-icon">⚠️</div>
          <h3 className="empty-state-title">Connection Error</h3>
          <p className="empty-state-desc">{error}</p>
          <button className="btn btn-primary" onClick={loadInitialPosts}>
            Retry Connection
          </button>
        </div>
      ) : posts.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🔍</div>
          <h3 className="empty-state-title">No matching articles found</h3>
          <p className="empty-state-desc">
            We couldn't find any articles matching your search query or selected topic.
          </p>
          <button 
            className="btn btn-secondary"
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory('All');
            }}
          >
            Clear Search & Filters
          </button>
        </div>
      ) : (
        <>
          <div className="posts-grid">
            {posts.map((post) => (
              <BlogCard 
                key={post.id} 
                post={post} 
                onSelectPost={onSelectPost} 
              />
            ))}
          </div>

          {/* Continuous Feed Pagination / Load More */}
          <div style={{ textAlign: 'center', margin: '3.5rem 0 1rem' }}>
            {hasMore ? (
              <button 
                className="btn btn-primary"
                onClick={handleLoadMore}
                disabled={loadingMore}
                style={{ padding: '0.85rem 2rem', fontSize: '1rem', borderRadius: 'var(--radius-full)' }}
              >
                {loadingMore ? 'Loading More Articles...' : `Load More Articles (Showing ${posts.length} of ${displayTotal.toLocaleString()})`}
              </button>
            ) : posts.length > 0 && (
              <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontStyle: 'italic' }}>
                🎉 You have viewed all {posts.length.toLocaleString()} matching articles in this catalog.
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
