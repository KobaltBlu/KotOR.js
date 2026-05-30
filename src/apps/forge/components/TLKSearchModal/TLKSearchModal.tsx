import React, { useState, useEffect } from "react";
import * as KotOR from "@/apps/forge/KotOR";
import "@/apps/forge/components/TLKSearchModal/TLKSearchModal.scss";

export interface TLKSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (index: number) => void;
  currentResref?: number;
}

const RESULT_LIMIT = 100;

export const TLKSearchModal: React.FC<TLKSearchModalProps> = ({
  isOpen,
  onClose,
  onSelect,
  currentResref
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<KotOR.TLKSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [limitReached, setLimitReached] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
      setSearchResults([]);
      setHasSearched(false);
      setLimitReached(false);
    }
  }, [isOpen]);

  const handleSearch = () => {
    if (searchQuery.trim().length < 1) {
      return;
    }
    
    setIsSearching(true);
    setHasSearched(true);
    
    // setTimeout lets React paint the "Searching..." state before the synchronous scan
    setTimeout(() => {
      // Request one extra result to detect whether the limit was reached
      const results = KotOR.TLKManager.Search(searchQuery, { limit: RESULT_LIMIT + 1 });
      const hit = results.length > RESULT_LIMIT;
      setLimitReached(hit);
      setSearchResults(hit ? results.slice(0, RESULT_LIMIT) : results);
      setIsSearching(false);
    }, 10);
  };

  const handleSelectResult = (index: number) => {
    onSelect(index);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="tlk-search-modal-overlay" onClick={onClose}>
      <div className="tlk-search-modal" onClick={(e) => e.stopPropagation()}>
        <div className="tlk-search-modal-header">
          <h3>Search TLK Strings</h3>
          <button 
            type="button"
            onClick={onClose}
            className="tlk-search-modal-close"
            title="Close"
          >
            ×
          </button>
        </div>

        <div className="tlk-search-modal-body">
          <div className="tlk-search-controls">
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="tlk-search-input"
              placeholder="Search text or enter a string ID number..."
              autoFocus
            />
            <button 
              type="button"
              onClick={handleSearch}
              className="tlk-search-button"
              disabled={searchQuery.trim().length < 1 || isSearching}
            >
              {isSearching ? 'Searching...' : 'Search'}
            </button>
          </div>

          {currentResref !== undefined && currentResref > -1 && (
            <div className="tlk-current-selection">
              <strong>Current Selection:</strong> [{currentResref}] 
              {KotOR.TLKManager.TLKStrings[currentResref] && (
                <span> {KotOR.TLKManager.TLKStrings[currentResref].Value}</span>
              )}
            </div>
          )}

          <div className="tlk-search-results-container">
            {isSearching && (
              <div className="tlk-search-loading">
                <div className="tlk-search-spinner"></div>
                <p>Searching TLK strings...</p>
              </div>
            )}

            {!isSearching && hasSearched && searchResults.length === 0 && (
              <div className="tlk-search-no-results">
                <i className="fa-solid fa-search"></i>
                <p>No results found for "{searchQuery}"</p>
                <small>Try a different search term</small>
              </div>
            )}

            {!isSearching && !hasSearched && (
              <div className="tlk-search-empty-state">
                <i className="fa-solid fa-magnifying-glass"></i>
                <p>Enter a search term or string ID to find TLK strings</p>
                <small>Searching across all {KotOR.TLKManager.TLKStrings.length.toLocaleString()} strings — search is case-insensitive</small>
              </div>
            )}

            {!isSearching && searchResults.length > 0 && (
              <>
                <div className="tlk-search-results-header">
                  {limitReached
                    ? `Showing first ${RESULT_LIMIT} results — refine your search to narrow down`
                    : `Found ${searchResults.length} result${searchResults.length !== 1 ? 's' : ''}`
                  }
                </div>
                <div className="tlk-search-results-list">
                  {searchResults.map((result) => (
                    <div 
                      key={result.index}
                      className={`tlk-search-result-item ${result.index === currentResref ? 'active' : ''}`}
                      onClick={() => handleSelectResult(result.index)}
                    >
                      <span className="tlk-result-index">[{result.index}]</span>
                      <span className="tlk-result-text">{result.text}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        <div className="tlk-search-modal-footer">
          <button 
            type="button"
            onClick={onClose}
            className="tlk-cancel-button"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

