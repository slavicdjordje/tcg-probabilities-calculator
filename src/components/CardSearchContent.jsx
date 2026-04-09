import React from 'react';
import Icon from './Icon';
import { Button } from './ui';
import { TYPOGRAPHY } from '../constants/config';

/**
 * Shared inner content for CardSearchDrawer and CardSearchModal.
 *
 * Renders: search input, search hint, loading state, error state,
 * default empty state, no-results state, results count + fuzzy message.
 * The actual results list is passed as `children`.
 *
 * Props:
 *   searchQuery, isSearching, slowConnectionWarning, error,
 *   searchResults, fuzzyMatchMessage, searchInputRef,
 *   handleSearchInput, clearSearch, cancelSearch, performSearch,
 *   inputStyle, inputClassName   — callers control input presentation
 *   children                    — results UI (horizontal scroll or grid)
 */
const CardSearchContent = ({
  searchQuery,
  isSearching,
  slowConnectionWarning,
  error,
  searchResults,
  fuzzyMatchMessage,
  searchInputRef,
  handleSearchInput,
  clearSearch,
  cancelSearch,
  performSearch,
  inputStyle = {},
  inputClassName = '',
  children,
}) => {
  return (
    <>
      {/* Search input */}
      <div className="relative mb-4">
        <input
          ref={searchInputRef}
          type="text"
          value={searchQuery}
          onChange={handleSearchInput}
          placeholder="Search cards by name"
          className={`w-full px-3 border ${inputClassName}`}
          style={{
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border-main)',
            color: 'var(--text-main)',
            outline: 'none',
            fontSize: 'var(--font-body-size)',
            lineHeight: 'var(--font-body-line-height)',
            fontFamily: 'Geist, sans-serif',
            ...inputStyle,
          }}
          onFocus={(e) => { e.target.style.border = '1px solid var(--border-action)'; }}
          onBlur={(e)  => { e.target.style.border = '1px solid var(--border-main)'; }}
          maxLength={50}
          aria-label="Search Yu-Gi-Oh cards"
          role="searchbox"
          autoComplete="off"
        />
        {searchQuery && (
          <button
            onClick={clearSearch}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 hover:opacity-80"
            aria-label="Clear search"
            type="button"
          >
            <Icon name="x" size={20} />
          </button>
        )}
      </div>

      {/* Search hint */}
      {searchQuery.length === 1 && (
        <p
          className="text-sm mb-4"
          style={{ ...TYPOGRAPHY.caption, color: 'var(--text-secondary)' }}
          role="status"
          aria-live="polite"
        >
          Type at least 2 characters to search
        </p>
      )}

      {/* Loading */}
      {isSearching && (
        <div className="flex flex-col items-center py-8 space-y-4">
          <div className="flex items-center space-x-3">
            <div
              className="animate-spin rounded-full h-8 w-8 border-b-2"
              style={{ borderColor: 'var(--text-main)' }}
            />
            <span style={{ ...TYPOGRAPHY.body, color: 'var(--text-main)' }}>
              Searching cards...
            </span>
          </div>
          {slowConnectionWarning && (
            <div className="text-center space-y-3">
              <p style={{ ...TYPOGRAPHY.body, color: 'var(--text-secondary)' }}>
                Taking longer than usual...
              </p>
              <Button onClick={cancelSearch} variant="secondary" size="medium">
                Cancel
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <div
          className="mb-6 p-4 rounded-lg"
          style={{
            backgroundColor: 'var(--bg-error)',
            color: 'var(--text-error)',
            border: '1px solid var(--border-error)',
          }}
        >
          <p style={TYPOGRAPHY.body}>{error}</p>
          <Button
            onClick={() => performSearch(searchQuery)}
            variant="primary"
            size="small"
            style={{ marginTop: '8px' }}
          >
            Retry
          </Button>
        </div>
      )}

      {/* Default empty state */}
      {!searchQuery && searchResults.length === 0 && !isSearching && (
        <div className="text-center py-6">
          <h3 className="mb-2" style={{ ...TYPOGRAPHY.h3, color: 'var(--text-main)' }}>
            Search for cards to add to your deck
          </h3>
          <p style={{ ...TYPOGRAPHY.body, color: 'var(--text-secondary)' }}>
            Search cards
          </p>
        </div>
      )}

      {/* No results */}
      {searchQuery && searchResults.length === 0 && !isSearching && !error && (
        <div className="text-center py-12">
          <h3 className="mb-4" style={{ ...TYPOGRAPHY.h3, color: 'var(--text-main)' }}>
            No cards found matching your search
          </h3>
          <div className="space-y-2" style={{ color: 'var(--text-secondary)' }}>
            <p style={TYPOGRAPHY.body}>Check your spelling</p>
            <p style={TYPOGRAPHY.body}>Search for partial card names</p>
          </div>
        </div>
      )}

      {/* Results header + fuzzy message */}
      {searchResults.length > 0 && (
        <div className="mb-4 space-y-2">
          <p style={{ ...TYPOGRAPHY.body, color: 'var(--text-secondary)' }}>
            Showing {searchResults.length} results
          </p>
          {fuzzyMatchMessage && (
            <div
              className="flex items-center gap-2 p-2 rounded"
              style={{
                backgroundColor: 'var(--bg-secondary)',
                border: '1px solid var(--border-main)',
              }}
            >
              <Icon name="info" size={16} />
              <p style={{ ...TYPOGRAPHY.caption, color: 'var(--text-main)' }}>
                {fuzzyMatchMessage}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Results — supplied by caller */}
      {children}
    </>
  );
};

export default CardSearchContent;
