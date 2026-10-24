import React from 'react';

export default function ControlsBar({
  searchQuery,
  onSearchChange,
  categories,
  selectedCategory,
  onSelectCategory,
  totalPostsCount
}) {
  return (
    <div className="controls-container">
      {/* Search Input */}
      <div className="search-bar-wrapper">
        <span className="search-icon">🔍</span>
        <input 
          type="text"
          className="search-input"
          placeholder="Search articles by title, topic, or keywords..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
        />
        {searchQuery && (
          <button 
            className="clear-search-btn"
            onClick={() => onSearchChange('')}
            title="Clear search"
          >
            ✕
          </button>
        )}
      </div>

      {/* Category Pills */}
      <div className="category-filter-pills">
        <button
          className={`filter-pill ${selectedCategory === 'All' ? 'active' : ''}`}
          onClick={() => onSelectCategory('All')}
        >
          <span>All Topics</span>
          <span className="filter-count">({totalPostsCount})</span>
        </button>

        {categories.map((cat) => (
          <button
            key={cat.category}
            className={`filter-pill ${selectedCategory === cat.category ? 'active' : ''}`}
            onClick={() => onSelectCategory(cat.category)}
          >
            <span>{cat.category}</span>
            <span className="filter-count">({cat.count})</span>
          </button>
        ))}
      </div>
    </div>
  );
}
