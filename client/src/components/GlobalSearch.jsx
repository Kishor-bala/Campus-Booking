import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../api/client';

export const GlobalSearch = ({ isOpen, onOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else if (onOpen) onOpen();
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, onOpen]);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await apiFetch(`/api/resources?search=${encodeURIComponent(query.trim())}&limit=5`);
        setResults(res.data);
      } catch (err) {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="global-search-modal" onClick={(e) => e.stopPropagation()}>
        <div className="search-header">
          <span className="search-icon">🔍</span>
          <input
            ref={inputRef}
            type="text"
            placeholder="Search study rooms, lab workstations, projectors, sports courts..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="search-modal-input"
          />
          <button onClick={onClose} className="btn-close-modal">ESC</button>
        </div>

        <div className="search-results-body">
          {loading ? (
            <div className="search-loading">Searching campus inventory...</div>
          ) : results.length > 0 ? (
            <div className="results-list">
              {results.map((r) => (
                <div
                  key={r.id}
                  className="search-result-item"
                  onClick={() => {
                    navigate(`/resources/${r.id}`);
                    onClose();
                  }}
                >
                  <div className="item-main">
                    <span className="item-title">{r.name}</span>
                    <span className="item-meta">📍 {r.location} &bull; Capacity: {r.capacity}</span>
                  </div>
                  <span className="category-badge">{r.category}</span>
                </div>
              ))}
            </div>
          ) : query.trim() ? (
            <div className="search-empty">No resources matching "{query}"</div>
          ) : (
            <div className="search-suggestions">
              <span className="suggestion-title">Suggested Searches:</span>
              <div className="suggestion-chips">
                <button onClick={() => setQuery('Study Room')} className="chip">Study Room</button>
                <button onClick={() => setQuery('Projector')} className="chip">Projector</button>
                <button onClick={() => setQuery('Badminton')} className="chip">Badminton</button>
                <button onClick={() => setQuery('AI Workstation')} className="chip">AI Workstation</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
