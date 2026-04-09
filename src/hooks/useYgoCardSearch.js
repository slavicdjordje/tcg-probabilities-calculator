import { useState, useEffect, useRef } from 'react';

/**
 * Shared search logic for CardSearchDrawer and CardSearchModal.
 * Encapsulates all state, refs, cache utilities, fuzzy scoring,
 * debounced search, auto-focus, and keyboard navigation.
 *
 * @param {boolean} isOpen - Whether the containing panel is open (drives auto-focus)
 */
const useYgoCardSearch = ({ isOpen }) => {
  // ── Search state ────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedCard, setSelectedCard] = useState(null);
  const [showCardModal, setShowCardModal] = useState(false);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [error, setError] = useState('');
  const [slowConnectionWarning, setSlowConnectionWarning] = useState(false);
  const [abortController, setAbortController] = useState(null);
  const [fuzzyMatchMessage, setFuzzyMatchMessage] = useState('');

  // ── Refs ────────────────────────────────────────────────────────
  const searchCacheRef = useRef(new Map());
  const maxCacheSize = 50;
  const searchInputRef = useRef(null);
  const debounceTimerRef = useRef(null);

  // ── Auto-focus on open ──────────────────────────────────────────
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  // ── Cache utilities ─────────────────────────────────────────────
  const getCacheKey = (query) => query.toLowerCase();

  const getCachedResults = (cacheKey) => searchCacheRef.current.get(cacheKey);

  const setCachedResults = (cacheKey, results) => {
    const cache = searchCacheRef.current;
    if (cache.size >= maxCacheSize) {
      cache.delete(cache.keys().next().value);
    }
    cache.set(cacheKey, { results, timestamp: Date.now() });
  };

  const isCacheValid = (cachedData) => {
    const cacheTimeout = 5 * 60 * 1000; // 5 minutes
    return Date.now() - cachedData.timestamp < cacheTimeout;
  };

  // ── Fuzzy scoring ───────────────────────────────────────────────
  const levenshteinDistance = (str1, str2) => {
    const matrix = [];
    for (let i = 0; i <= str2.length; i++) matrix[i] = [i];
    for (let j = 0; j <= str1.length; j++) matrix[0][j] = j;
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    return matrix[str2.length][str1.length];
  };

  const calculateFuzzyScore = (str1, str2) => {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    if (longer.length === 0) return 1.0;
    return (longer.length - levenshteinDistance(longer, shorter)) / longer.length;
  };

  const normalizeSearchTerm = (term) =>
    term.toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim();

  const calculateRelevanceScore = (card, query) => {
    const cardName = card.name.toLowerCase();
    const cardDesc = (card.desc || '').toLowerCase();
    const cardType = card.type.toLowerCase();
    let score = 0;

    if (cardName === query)             score += 1000;
    else if (cardName.startsWith(query)) score += 800;
    else if (cardName.includes(query))   score += 600;
    else {
      const fuzzyScore = calculateFuzzyScore(cardName, query);
      if (fuzzyScore > 0.7) score += 400 + (fuzzyScore * 100);
    }

    if (cardDesc.includes(query)) score += 200;
    if (cardType.includes(query)) score += 100;
    if (cardName.length < 20)     score += 50;

    const normalizedQuery = normalizeSearchTerm(query);
    const normalizedName  = normalizeSearchTerm(cardName);
    if (normalizedName.includes(normalizedQuery)) score += 300;

    return score;
  };

  // ── Core search ─────────────────────────────────────────────────
  const performSearch = async (query, signal) => {
    try {
      const cacheKey = getCacheKey(query);
      const cachedData = getCachedResults(cacheKey);

      if (cachedData && isCacheValid(cachedData)) {
        setSearchResults(cachedData.results);
        setIsSearching(false);
        return;
      }

      const apiUrl = `https://db.ygoprodeck.com/api/v7/cardinfo.php?fname=${encodeURIComponent(query)}&num=50&offset=0`;
      const response = await fetch(apiUrl, { signal });

      if (!response.ok) throw new Error('Search failed');

      const data = await response.json();
      const query_lower = query.toLowerCase();

      let results = (data.data || [])
        .map(card => ({ ...card, relevanceScore: calculateRelevanceScore(card, query_lower) }))
        .sort((a, b) =>
          b.relevanceScore !== a.relevanceScore
            ? b.relevanceScore - a.relevanceScore
            : a.name.localeCompare(b.name)
        );

      const hasExactMatches = results.some(card => card.name.toLowerCase().includes(query_lower));
      if (!hasExactMatches && results.length > 0) {
        const best = results[0];
        if (best.relevanceScore >= 400 && best.relevanceScore < 600) {
          setFuzzyMatchMessage(`Showing results for '${best.name}'`);
        }
      } else {
        setFuzzyMatchMessage('');
      }

      results = results.slice(0, 20);
      setCachedResults(cacheKey, results);
      setSearchResults(results);
      setIsSearching(false);

    } catch (err) {
      console.error('Search error:', err);
      if (err.name !== 'AbortError') {
        setError('Unable to search cards. Please try again.');
      }
      setIsSearching(false);
    }
  };

  // ── Debounced search effect ──────────────────────────────────────
  useEffect(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

    if (searchQuery.length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    setError('');
    setSlowConnectionWarning(false);

    const controller = new AbortController();
    setAbortController(controller);

    const slowConnectionTimer = setTimeout(() => setSlowConnectionWarning(true), 2000);

    debounceTimerRef.current = setTimeout(async () => {
      try {
        await performSearch(searchQuery, controller.signal);
        clearTimeout(slowConnectionTimer);
        setSlowConnectionWarning(false);
      } catch (err) {
        clearTimeout(slowConnectionTimer);
        setSlowConnectionWarning(false);
        if (err.name !== 'AbortError') {
          setError('Unable to search cards. Please try again.');
        }
        setIsSearching(false);
      }
    }, 300);

    return () => { if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current); };
  }, [searchQuery]);

  // ── Keyboard navigation for card detail ─────────────────────────
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!showCardModal) return;
      switch (e.key) {
        case 'Escape':    closeCardModal(); break;
        case 'ArrowLeft': e.preventDefault(); navigateCard('prev'); break;
        case 'ArrowRight':e.preventDefault(); navigateCard('next'); break;
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showCardModal, currentCardIndex, searchResults]);

  // ── Interaction handlers ─────────────────────────────────────────
  const handleSearchInput = (e) => {
    if (e.target.value.length <= 50) setSearchQuery(e.target.value);
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    if (searchInputRef.current) searchInputRef.current.focus();
  };

  const cancelSearch = () => {
    if (abortController) { abortController.abort(); setAbortController(null); }
    setIsSearching(false);
    setSlowConnectionWarning(false);
    setError('');
  };

  const openCardModal = (card, index) => {
    setSelectedCard(card);
    setCurrentCardIndex(index);
    setShowCardModal(true);
  };

  const closeCardModal = () => {
    setShowCardModal(false);
    setSelectedCard(null);
  };

  const navigateCard = (direction) => {
    const newIndex = direction === 'next'
      ? Math.min(currentCardIndex + 1, searchResults.length - 1)
      : Math.max(currentCardIndex - 1, 0);
    if (newIndex !== currentCardIndex) {
      setSelectedCard(searchResults[newIndex]);
      setCurrentCardIndex(newIndex);
    }
  };

  return {
    // state
    searchQuery,
    searchResults,
    isSearching,
    selectedCard, setSelectedCard,
    showCardModal, setShowCardModal,
    currentCardIndex, setCurrentCardIndex,
    error, setError,
    slowConnectionWarning,
    fuzzyMatchMessage,
    abortController,
    // refs
    searchInputRef,
    // handlers
    handleSearchInput,
    clearSearch,
    cancelSearch,
    openCardModal,
    closeCardModal,
    navigateCard,
    performSearch,
  };
};

export default useYgoCardSearch;
