import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { apiFetch } from '../api/client';
import { ResourceCard } from '../components/ResourceCard';
import { StatusMessage } from '../components/StatusMessage';

export const ResourceList = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const initialSearch = searchParams.get('search') || '';
  const initialCategory = searchParams.get('category') || '';

  const [search, setSearch] = useState(initialSearch);
  const [category, setCategory] = useState(initialCategory);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ totalPages: 1, totalItems: 0 });

  // Update internal states when URL search params change
  useEffect(() => {
    const urlCategory = searchParams.get('category') || '';
    const urlSearch = searchParams.get('search') || '';
    setCategory(urlCategory);
    setSearch(urlSearch);
  }, [searchParams]);

  const fetchResources = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page, limit: 6 });
      if (search.trim()) params.append('search', search.trim());
      if (category) params.append('category', category);

      const res = await apiFetch(`/api/resources?${params.toString()}`);
      setResources(res.data);
      setPagination(res.pagination);
    } catch (err) {
      setError(err.message || 'Failed to load resource catalogue.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResources();
  }, [page, category, searchParams]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchResources();
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h2>Campus Resource Catalogue</h2>
        <p>Browse and reserve campus study rooms, equipment, labs, and sports facilities.</p>
      </div>

      <div className="filter-bar">
        <form onSubmit={handleSearchSubmit} className="search-form">
          <input
            type="text"
            placeholder="Search by resource name or location..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="search-input"
          />
          <button type="submit" className="btn-search">Search</button>
        </form>

        <div className="category-filter">
          <select
            value={category}
            onChange={(e) => {
              const val = e.target.value;
              setCategory(val);
              setPage(1);
              const newParams = new URLSearchParams(searchParams);
              if (val) newParams.set('category', val);
              else newParams.delete('category');
              setSearchParams(newParams);
            }}
          >
            <option value="">All Categories</option>
            <option value="Study Room">Study Room</option>
            <option value="Equipment">Equipment</option>
            <option value="Laboratory">Laboratory</option>
            <option value="Sports">Sports</option>
          </select>
        </div>
      </div>

      <StatusMessage type="error" message={error} onDismiss={() => setError(null)} />

      {loading ? (
        <div className="loading-state">Loading catalogue...</div>
      ) : resources.length === 0 ? (
        <div className="empty-state">No active resources found matching your search.</div>
      ) : (
        <>
          <div className="resources-grid">
            {resources.map((r) => (
              <ResourceCard key={r.id} resource={r} />
            ))}
          </div>

          <div className="pagination">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="btn-pagination"
            >
              &larr; Previous
            </button>
            <span className="page-info">
              Page {page} of {pagination.totalPages} ({pagination.totalItems} items)
            </span>
            <button
              disabled={page >= pagination.totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="btn-pagination"
            >
              Next &rarr;
            </button>
          </div>
        </>
      )}
    </div>
  );
};
