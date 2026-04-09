import React, { useState, useEffect, useRef } from 'react';
import { AnimatePresence } from 'framer-motion';

// Custom Hooks
import useCombos from './hooks/useCombos';
import useDeckConfig from './hooks/useDeckConfig';
import useCalculations from './hooks/useCalculations';
import useCardSearch from './hooks/useCardSearch';
import useShareableUrl from './hooks/useShareableUrl';
import useYdkImport from './hooks/useYdkImport';
import useToast from './hooks/useToast';
import useOpeningHand from './hooks/useOpeningHand';
import useErrors from './hooks/useErrors';
import useComboHandlers from './hooks/useComboHandlers';

// Service imports
import ProbabilityService from './services/ProbabilityService';
import URLService from './services/URLService';
import CardDatabaseService from './services/CardDatabaseService';
import TitleGeneratorService from './services/TitleGeneratorService';
import YdkParser from './services/YdkParser';

// Component imports
import ResultsDisplay from './features/calculator/ResultsDisplay';
import DeckConfigInputs from './features/calculator/DeckConfigInputs';
import ComboForm from './features/combo/ComboForm';
import DeckImageSection from './features/deck-builder/DeckImageSection';
import Icon from './components/Icon';
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import { Button, Tooltip } from './components/ui';

// Constants imports
import { DEFAULT_DECK_SIZE, DEFAULT_HAND_SIZE, TYPOGRAPHY } from './constants/config';

// Utility imports
import { createCombo } from './utils/comboFactory';

// Additional service imports
import OpeningHandService from './services/OpeningHandService';

// Additional component imports
import SearchableCardInput from './features/shared/SearchableCardInput';
import { Toast } from './components/ui';

export default function TCGCalculator() {
  // Custom Hooks
  const { deckSize, handSize, setDeckSize, setHandSize } = useDeckConfig();
  const { combos, setCombos } = useCombos(createCombo(1, 0));
  const { results, setResults } = useCalculations();
  const { cardDatabase, setCardDatabase } = useCardSearch();
  const [toastMessage, setToastMessage] = useState('');
  const { openingHand, setOpeningHand, isRefreshing, setIsRefreshing } = useOpeningHand();
  const { errors, setErrors } = useErrors();
  const [isCalculating, setIsCalculating] = useState(false);
  const [isComboDrawerOpen, setIsComboDrawerOpen] = useState(true);

  // Auto-close the combo drawer when engine recognition populates multiple combos
  useEffect(() => {
    if (combos.length > 1) {
      setIsComboDrawerOpen(false);
    }
  }, [combos.length]);

  // YDK Import hook
  const {
    uploadedYdkFile,
    setUploadedYdkFile,
    ydkCards,
    setYdkCards,
    ydkCardCounts,
    setYdkCardCounts,
    originalYdkCardCounts,
    setOriginalYdkCardCounts,
    testHandFromDecklist,
    setTestHandFromDecklist,
    initialDeckZones,
    setInitialDeckZones,
    deckZones,
    setDeckZones,
    updateDeckZones,
    clearYdkImport
  } = useYdkImport();

  // Shareable URL hook
  const { shareableUrl, setShareableUrl, showCopiedMessage, setShowCopiedMessage } = useShareableUrl();

  // State that doesn't have hooks (keep as-is)
  const [dashboardValues, setDashboardValues] = useState({
    deckSize: DEFAULT_DECK_SIZE,
    handSize: DEFAULT_HAND_SIZE,
    combos: []
  });
  const [isRestoringFromURL, setIsRestoringFromURL] = useState(false);
  const [generatedTitle, setGeneratedTitle] = useState('');
  const [staticCardDatabase, setStaticCardDatabase] = useState({});

  const refreshDebounceRef = useRef(null);
  const calculationDashboardRef = useRef(null);

  // Combo handlers hook
  const {
    editingComboId,
    tempComboName,
    addCombo,
    removeCombo,
    addCard,
    removeSecondCard,
    removeCard,
    canAddCard,
    getHighestMinInHandSum,
    updateCombo,
    updateComboProperty,
    validateAndUpdateCombo,
    startEditingComboName,
    handleComboNameChange,
    saveComboName,
    handleComboNameKeyDown,
  } = useComboHandlers({ combos, setCombos, handSize, errors, setErrors });

  // Sync deckZones when initialDeckZones changes (from YDK upload)
  useEffect(() => {
    if (initialDeckZones) {
      setDeckZones(initialDeckZones);
    } else if (initialDeckZones === null) {
      // Clear deck zones when YDK is removed
      setDeckZones({
        main: [],
        extra: [],
        side: []
      });
    }
  }, [initialDeckZones]);

  // Scroll to Calculation Dashboard function
  // Uses a manual rAF loop to bypass prefers-reduced-motion suppression in
  // Chrome/Edge and Tailwind's preflight override of scroll-behavior: smooth.
  const scrollToCalculationDashboard = () => {
    if (!calculationDashboardRef.current) return;

    const targetTop =
      calculationDashboardRef.current.getBoundingClientRect().top +
      window.scrollY - 16;

    const startTop = window.scrollY;
    const distance = targetTop - startTop;
    if (Math.abs(distance) < 1) return;

    const duration = 600;
    let startTime = null;

    const easeInOutCubic = (t) =>
      t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

    const step = (timestamp) => {
      if (startTime === null) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / duration, 1);
      window.scrollTo(0, startTop + distance * easeInOutCubic(progress));
      if (progress < 1) requestAnimationFrame(step);
    };

    requestAnimationFrame(step);
  };

  const showToast = (message) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(''), 2000); // Hide after 2 seconds
  };

  // Shared auto-calculate logic (used as fallback and after confirmation)
  const runAutoCalculate = (combosToCalc, cardCounts, uniqueCards, newDeckSize) => {
    setTimeout(() => {
      const calculatedResults = ProbabilityService.calculateMultipleCombos(
        combosToCalc, newDeckSize, handSize, uniqueCards, cardCounts
      );
      setResults(calculatedResults);
      setDashboardValues({
        deckSize: newDeckSize,
        handSize,
        combos: combosToCalc.map(c => ({ ...c })),
      });
      const title = TitleGeneratorService.generateFunTitle(
        combosToCalc, newDeckSize, calculatedResults.individual
      );
      setGeneratedTitle(title);
      setTimeout(() => scrollToCalculationDashboard(), 800);
    }, 100);
  };

  // Engine recognition — simple inline handlers (combo sequences feature not included in this build)
  const handleEnginesRecognized = (recognizedCombos, cardCounts, uniqueCards, newDeckSize) => {
    setCombos(recognizedCombos);
    setDeckSize(newDeckSize);
    runAutoCalculate(recognizedCombos, cardCounts, uniqueCards, newDeckSize);
  };
  const handleDeckReady = () => {};
  const handleUnknownDeck = () => {};

  // Restore calculation from URL on mount
  useEffect(() => {
    const restoreFromURL = () => {
      const urlData = URLService.decodeCalculation();
      if (urlData) {
        setIsRestoringFromURL(true);
        setDeckSize(urlData.deckSize);
        setHandSize(urlData.handSize);
        setCombos(urlData.combos);
        
        // Restore YDK file if present
        if (urlData.ydkFile && staticCardDatabase && Object.keys(staticCardDatabase).length > 0) {
          try {
            const parseResult = YdkParser.parseYdkFile(urlData.ydkFile.content, staticCardDatabase);

            // Get unique card names (remove duplicates)
            const uniqueCards = [];
            const seenNames = new Set();

            parseResult.cards.forEach(card => {
              if (!seenNames.has(card.name)) {
                seenNames.add(card.name);
                uniqueCards.push({
                  name: card.name,
                  id: card.id,
                  isCustom: false
                });
              }
            });

            // Update deck size to match YDK file main deck card count
            const mainDeckCardCount = parseResult.cards.length;
            setDeckSize(mainDeckCardCount);

            setUploadedYdkFile(urlData.ydkFile);
            setYdkCards(uniqueCards);
            setYdkCardCounts(parseResult.cardCounts);

            // Show error only for truly unmatched cards
            if (parseResult.unmatchedIds.length > 0) {
              alert("Some cards from your YDK file weren't matched");
            }
          } catch (error) {
            console.error('Failed to restore YDK file from URL:', error);
          }
        }

        // Restore deck zones if present
        if (urlData.deckZones) {
          setDeckZones(urlData.deckZones);
          setInitialDeckZones(urlData.deckZones);
        }
        
        setTimeout(() => {
          const calculatedResults = ProbabilityService.calculateMultipleCombos(urlData.combos, urlData.deckSize, urlData.handSize, ydkCards, ydkCardCounts);
          setResults(calculatedResults);
          setDashboardValues({
            deckSize: urlData.deckSize,
            handSize: urlData.handSize,
            combos: urlData.combos.map(c => ({ ...c }))
          });
          setIsRestoringFromURL(false);
          
          // Auto-scroll to Calculation Dashboard
          setTimeout(() => scrollToCalculationDashboard(), 800);
        }, 100);
      }
    };

    restoreFromURL();
  }, [staticCardDatabase]);
  
  // Load card database on mount
  useEffect(() => {
    const loadCardDatabase = async () => {
      const cached = CardDatabaseService.loadFromCache();
      if (cached) {
        setCardDatabase(cached);
        window.cardDatabase = cached;
        return;
      }

      const cards = await CardDatabaseService.fetchCards();
      if (cards.length > 0) {
        setCardDatabase(cards);
        window.cardDatabase = cards;
        CardDatabaseService.saveToCache(cards);
      }
    };
    
    loadCardDatabase();
  }, []);

  // Load static card database for YDK parsing
  useEffect(() => {
    const loadStaticDatabase = async () => {
      const database = await YdkParser.loadStaticCardDatabase();
      setStaticCardDatabase(database);
    };
    
    loadStaticDatabase();
  }, []);

  const typography = {
    ...TYPOGRAPHY,
    h1: { ...TYPOGRAPHY.h1, color: 'var(--text-main)' },
    h2: { ...TYPOGRAPHY.h2, color: 'var(--text-main)' },
    h3: { ...TYPOGRAPHY.h3, color: 'var(--text-main)' },
    h4: { ...TYPOGRAPHY.h3, color: 'var(--text-main)' },
    body: { ...TYPOGRAPHY.body, color: 'var(--text-secondary)' }
  };

  const validate = () => {
    const newErrors = {};
    
    if (deckSize < 1) newErrors.deckSize = 'Please enter valid value';
    
    if (deckSize < handSize) newErrors.deckSize = "Can't be lower than Hand size";
    
    combos.forEach((combo, index) => {
      combo.cards.forEach((card, cardIndex) => {
        const cardPrefix = `combo-${combo.id}-card-${cardIndex}`;
        
        if (card.startersInDeck < 0) newErrors[`${cardPrefix}-startersInDeck`] = 'Please enter valid value';
        if (card.minCopiesInHand < 0) newErrors[`${cardPrefix}-minCopiesInHand`] = 'Please enter valid value';
        if (card.maxCopiesInHand < 0) newErrors[`${cardPrefix}-maxCopiesInHand`] = 'Please enter valid value';
        if (card.starterCard.length > 50) newErrors[`${cardPrefix}-starterCard`] = 'Please enter valid value';
        
        // AC03: Min in hand must be <= Max in hand
        if (card.minCopiesInHand > card.maxCopiesInHand) newErrors[`${cardPrefix}-minCopiesInHand`] = 'Can\'t be more than Max in hand';
        
        if (card.minCopiesInHand > handSize) newErrors[`${cardPrefix}-minCopiesInHand`] = 'Please enter valid value';
        if (card.maxCopiesInHand > handSize) newErrors[`${cardPrefix}-maxCopiesInHand`] = 'Please enter valid value';
        
        // AC02: Max in hand must be <= Copies in deck
        if (card.maxCopiesInHand > card.startersInDeck) newErrors[`${cardPrefix}-maxCopiesInHand`] = 'Can\'t be more than Copies in deck';
        if (card.minCopiesInHand > card.startersInDeck) newErrors[`${cardPrefix}-minCopiesInHand`] = 'Please enter valid value';
        if (card.startersInDeck > deckSize) newErrors[`${cardPrefix}-startersInDeck`] = 'Please enter valid value';
      });
      
      const totalCards = combo.cards.reduce((sum, card) => sum + card.startersInDeck, 0);
      if (totalCards > deckSize) {
        combo.cards.forEach((card, cardIndex) => {
          newErrors[`combo-${combo.id}-card-${cardIndex}-startersInDeck`] = 'Total cards in combo exceed deck size';
        });
      }
    });
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const allFieldsFilled = combos.every(combo => 
    combo.cards.every(card => card.starterCard.trim() !== '')
  );

  const hasValidationErrors = Object.keys(errors).length > 0 || deckSize < handSize;

  const generateOpeningHand = () => {
    let hand;

    // AC#3: Use YDK cards when toggle is ON and YDK cards are available
    if (testHandFromDecklist && ydkCards && ydkCards.length > 0 && ydkCardCounts && Object.keys(ydkCardCounts).length > 0) {
      hand = OpeningHandService.generateHandFromYdkCards(ydkCards, ydkCardCounts, handSize);
    } else {
      hand = OpeningHandService.generateProbabilisticHand(combos, deckSize, handSize);
    }

    setOpeningHand(hand);
  };

  const refreshOpeningHand = () => {
    if (isRefreshing) return;
    
    // Clear any existing debounce timer
    if (refreshDebounceRef.current) {
      clearTimeout(refreshDebounceRef.current);
    }
    
    setIsRefreshing(true);
    
    // Debounce with 100ms delay to prevent spam clicking
    refreshDebounceRef.current = setTimeout(() => {
      generateOpeningHand();
      setIsRefreshing(false);
      refreshDebounceRef.current = null;
    }, 100);
  };

  // Sync YDK deck zones and card counts from combo definitions
  const syncYdkFromCombos = () => {
    // Collect cards from combos that need count adjustments
    const cardCountsFromCombos = {};

    combos.forEach(combo => {
      combo.cards.forEach(card => {
        if (card.starterCard && card.starterCard.trim()) {
          const cardName = card.starterCard;
          const count = card.startersInDeck || 0;

          // Use the highest count if card appears in multiple combos
          if (!cardCountsFromCombos[cardName] || cardCountsFromCombos[cardName].count < count) {
            cardCountsFromCombos[cardName] = {
              count,
              cardId: card.cardId,
              isCustom: card.isCustom
            };
          }
        }
      });
    });

    // Update existing deck by adjusting card counts
    setDeckZones(prev => {
      const currentMainDeck = [...(prev.main || [])];
      const updatedMainDeck = [];
      const processedCards = new Set();

      // First, process cards that are in combos
      Object.entries(cardCountsFromCombos).forEach(([cardName, data]) => {
        // Skip custom cards - they should not be added to deck zones
        if (data.isCustom) {
          return;
        }

        const existingCards = currentMainDeck.filter(c =>
          c.name.toLowerCase() === cardName.toLowerCase()
        );
        const currentCount = existingCards.length;
        const targetCount = data.count;

        processedCards.add(cardName.toLowerCase());

        if (targetCount > 0) {
          // Add or keep the required number of copies
          for (let i = 0; i < targetCount; i++) {
            if (i < existingCards.length) {
              // Keep existing card
              updatedMainDeck.push(existingCards[i]);
            } else {
              // Add new copy
              updatedMainDeck.push({
                id: `main_${data.cardId || 'custom'}_${Date.now()}_${Math.random()}_${i}`,
                cardId: data.cardId,
                name: cardName,
                isCustom: data.isCustom || false,
                zone: 'main'
              });
            }
          }
        }
        // If targetCount is 0, card is removed (not added to updatedMainDeck)
      });

      // Keep cards that are NOT in combos unchanged
      currentMainDeck.forEach(card => {
        if (!processedCards.has(card.name.toLowerCase())) {
          updatedMainDeck.push(card);
        }
      });

      return {
        main: updatedMainDeck,
        extra: prev.extra || [],
        side: prev.side || []
      };
    });

    // Update ydkCardCounts
    setYdkCardCounts(prev => {
      const newCardCounts = { ...prev };

      Object.entries(cardCountsFromCombos).forEach(([cardName, data]) => {
        if (data.count > 0) {
          newCardCounts[cardName] = data.count;
        } else {
          // Remove card from counts if set to 0
          delete newCardCounts[cardName];
        }
      });

      return newCardCounts;
    });

  };

  const runCalculation = () => {
    // Check if all fields are filled before proceeding
    if (!allFieldsFilled) return;

    if (!validate()) return;

    // Set loading state immediately for instant UI feedback
    setIsCalculating(true);

    // Sync YDK display with combo definitions
    syncYdkFromCombos();

    setDashboardValues({
      deckSize,
      handSize,
      combos: combos.map(c => ({ ...c }))
    });

    // Defer heavy calculation to next tick to unblock UI thread
    setTimeout(() => {
      try {
        const calculatedResults = ProbabilityService.calculateMultipleCombos(combos, deckSize, handSize, ydkCards, ydkCardCounts);
        setResults(calculatedResults);

        // Generate shareable URL
        URLService.updateURL(deckSize, handSize, combos, uploadedYdkFile, testHandFromDecklist, deckZones);
        const url = window.location.href;
        setShareableUrl(url);

        // Generate title using individual results for compatibility
        const title = TitleGeneratorService.generateFunTitle(combos, deckSize, calculatedResults.individual);
        setGeneratedTitle(title);

        // Auto-scroll to Calculation Dashboard
        setTimeout(() => scrollToCalculationDashboard(), 800);
      } finally {
        // Clear loading state
        setIsCalculating(false);
      }
    }, 0);
  };

  const clearPreviousCalculationData = (newDeckSize = null) => {
    // Clear calculation-related state when new YDK is loaded
    setCombos([createCombo(1, 0)]);
    setResults({ individual: [], combined: null });
    setErrors({});
    setDashboardValues({
      deckSize: newDeckSize || deckSize,
      handSize: handSize,
      combos: []
    });
    setGeneratedTitle('');
    setShareableUrl('');
    setOpeningHand([]);
    setAiAnalysis(null);
    setAiProbResults(null);
    ProbabilityService.clearCache();

    window.history.replaceState(null, '', window.location.pathname);
  };

  const handleReset = () => {
    // Restore original YDK deck if one was uploaded
    if (initialDeckZones) {
      setDeckZones(initialDeckZones);
      setYdkCardCounts(originalYdkCardCounts);
    }

    setDeckSize(40);
    setHandSize(5);
    setCombos([createCombo(1, 0)]);
    setResults({ individual: [], combined: null });
    setErrors({});
    setDashboardValues({
      deckSize: 40,
      handSize: 5,
      combos: []
    });
    setGeneratedTitle('');
    setShareableUrl('');
    setOpeningHand([]);
    ProbabilityService.clearCache();

    window.history.replaceState(null, '', window.location.pathname);
  };

  const handleCopyLink = () => {
    if (!toastMessage) { // Prevent multiple toasts
      navigator.clipboard.writeText(shareableUrl);
      showToast('Link copied!');
    }
  };

  useEffect(() => {
    ProbabilityService.clearCache();
  }, [deckSize, handSize]);

  useEffect(() => {
    if (results?.individual?.length > 0) validate();
  }, [deckSize, handSize, combos]);

  useEffect(() => {
    generateOpeningHand();
  }, [deckSize, handSize, combos, testHandFromDecklist, ydkCards, ydkCardCounts]);

  // AC#5 & AC#6: Auto-disable toggle when non-decklist cards are used
  useEffect(() => {
    if (!ydkCards || ydkCards.length === 0) return;

    // Check if any combo cards are not from the YDK decklist
    const hasNonDecklistCards = combos.some(combo => 
      combo.cards.some(card => {
        if (!card.starterCard.trim()) return false; // Skip empty card names
        
        // Check if this card name exists in the YDK cards
        const cardExistsInYdk = ydkCards.some(ydkCard => 
          ydkCard.name.toLowerCase() === card.starterCard.toLowerCase()
        );
        
        return !cardExistsInYdk;
      })
    );

    // AC#5: Turn toggle OFF if non-decklist cards are found
    if (hasNonDecklistCards && testHandFromDecklist) {
      setTestHandFromDecklist(false);
    }
  }, [combos, ydkCards, testHandFromDecklist]);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (refreshDebounceRef.current) {
        clearTimeout(refreshDebounceRef.current);
      }
    };
  }, []);

  return (
    <div className="min-h-screen p-4" style={{ backgroundColor: 'var(--bg-main)', fontFamily: 'Geist, sans-serif' }}>
      <style>
        {`
          input[type="number"]::-webkit-outer-spin-button,
          input[type="number"]::-webkit-inner-spin-button {
            -webkit-appearance: none;
            margin: 0;
          }
          input[type="number"] {
            -moz-appearance: textfield;
          }
          
          input:focus {
            outline: none;
            box-shadow: 0 0 0 2px var(--bg-action-secondary);
          }
          
          /* AC #6: Hover state transition animation */
          .hover\\:opacity-80,
          button:hover,
          label:hover,
          [role="button"]:hover,
          .cursor-pointer:hover {
            transition: opacity 150ms ease;
          }
        `}
      </style>
      {isRestoringFromURL && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{backgroundColor: 'var(--bg-main)', opacity: 0.8}}>
          <div className="p-0 rounded-lg" style={{backgroundColor: 'var(--bg-secondary)', color: 'var(--text-main)'}}>
            <p style={typography.body}>Loading shared calculation...</p>
          </div>
        </div>
      )}
      <div className="w-full mx-auto" style={{ maxWidth: '520px' }}>
        <Header typography={typography} />

        <div className="p-0" style={{ margin: 0, paddingBottom: '16px' }}>
          <div className="mb-6" style={{
            padding: '16px',
            border: '1px solid var(--border-main)',
            borderRadius: '16px',
            backgroundColor: 'var(--bg-secondary)'
          }}>
            <div className="mb-3 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
              <h2 style={{...typography.h2, color: 'var(--text-main)', margin: 0}}>How to use the app?</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ ...typography.body, color: 'var(--text-main)' }}>Need help?</span>
                <a
                  href="https://www.loom.com/share/7900e94d94534a3ab2751a58e6712a12"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="enhanced-button"
                  style={{
                    width: 'auto',
                    paddingLeft: '12px',
                    paddingRight: '12px',
                    textDecoration: 'none'
                  }}
                >
                  <Icon name="video" ariaLabel="Watch video" size={14} className="button-icon" style={{ color: '#141414' }} />
                  <span className="button-text">Watch video</span>
                </a>
              </div>
            </div>
            <ol style={{
              ...typography.body,
              color: 'var(--text-secondary)',
              paddingLeft: '20px',
              marginBottom: 0,
              listStyleType: 'decimal',
              listStylePosition: 'outside'
            }}>
              <li style={{marginBottom: '4px', display: 'list-item'}}>Upload a decklist via YDK</li>
              <li style={{marginBottom: '4px', display: 'list-item'}}>Click on a card from your Main deck</li>
              <li style={{marginBottom: '4px', display: 'list-item'}}>Select a Combo to add that card to (e.g. Combo 1)</li>
              <li style={{marginBottom: '4px', display: 'list-item'}}>[Repeat for other cards]</li>
              <li style={{marginBottom: '4px', display: 'list-item'}}>Click on "Calculate" when you finish combo definition</li>
              <li style={{marginBottom: '4px', display: 'list-item'}}>Get results</li>
            </ol>
          </div>

          <h2 className="mb-4" style={{...typography.h2, color: 'var(--text-main)'}}>Upload a decklist</h2>

          <DeckConfigInputs
            uploadedYdkFile={uploadedYdkFile}
            setUploadedYdkFile={setUploadedYdkFile}
            ydkCards={ydkCards}
            setYdkCards={setYdkCards}
            ydkCardCounts={ydkCardCounts}
            setYdkCardCounts={setYdkCardCounts}
            deckSize={deckSize}
            setDeckSize={setDeckSize}
            cardDatabase={cardDatabase}
            staticCardDatabase={staticCardDatabase}
            clearPreviousCalculationData={clearPreviousCalculationData}
            combos={combos}
            setCombos={setCombos}
            showToast={showToast}
            setInitialDeckZones={setInitialDeckZones}
            deckZones={deckZones}
            setDeckZones={setDeckZones}
            handSize={handSize}
            setHandSize={setHandSize}
            errors={errors}
            minHandSize={getHighestMinInHandSum()}
            DeckImageSection={DeckImageSection}
            initialDeckZones={initialDeckZones}
            typography={typography}
            onEnginesRecognized={handleEnginesRecognized}
            onDeckReady={handleDeckReady}
            onUnknownDeck={handleUnknownDeck}
          />

          {/* Defined combos — collapses to a drawer when more than 1 combo is defined */}
          {combos.length <= 1 ? (
            <>
              <h2 className="mb-4" style={{...typography.h2, color: 'var(--text-main)'}}>Defined combos</h2>

              {combos.map((combo, index) => (
                <ComboForm
                  key={combo.id}
                  combo={combo}
                  index={index}
                  editingComboId={editingComboId}
                  tempComboName={tempComboName}
                  handleComboNameChange={handleComboNameChange}
                  saveComboName={saveComboName}
                  handleComboNameKeyDown={handleComboNameKeyDown}
                  startEditingComboName={startEditingComboName}
                  removeCombo={removeCombo}
                  updateCombo={updateCombo}
                  validateAndUpdateCombo={validateAndUpdateCombo}
                  removeCard={removeCard}
                  addCard={addCard}
                  canAddCard={canAddCard}
                  errors={errors}
                  typography={typography}
                  SearchableCardInput={SearchableCardInput}
                  cardDatabase={cardDatabase}
                  ydkCards={ydkCards}
                  ydkCardCounts={ydkCardCounts}
                />
              ))}

              {combos.length < 10 && (
                <div>
                  <hr className="my-4" style={{ borderColor: 'var(--border-secondary)', borderTop: '1px solid var(--border-secondary)' }} />
                  <div className="flex items-center">
                    <Button
                      onClick={addCombo}
                      className="enhanced-button enhanced-button-add"
                    >
                      <Icon name="rows-plus-bottom" ariaLabel="Add combo" size={14} className="button-icon" style={{ color: '#141414' }} />
                      <span className="button-text">Add combo</span>
                    </Button>
                    <Tooltip text="Test multiple combo lines to see your deck's overall consistency options" />
                  </div>
                </div>
              )}
            </>
          ) : (
            <div style={{ border: '1px solid var(--border-secondary)', borderRadius: '16px', marginBottom: '8px', overflow: 'hidden' }}>
              {/* Drawer header — always visible */}
              <button
                onClick={() => setIsComboDrawerOpen(prev => !prev)}
                className="w-full flex items-center justify-between hover:opacity-80 transition-opacity"
                style={{
                  background: 'none',
                  border: 'none',
                  padding: '14px 16px',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <div className="flex items-center" style={{ gap: '10px' }}>
                  <span style={{...typography.h2, color: 'var(--text-main)'}}>Defined combos</span>
                  <span style={{
                    ...typography.body,
                    fontSize: '12px',
                    color: 'var(--text-secondary)',
                    backgroundColor: 'var(--bg-secondary)',
                    border: '1px solid var(--border-secondary)',
                    borderRadius: '999px',
                    padding: '2px 10px',
                  }}>
                    {combos.length} combos
                  </span>
                </div>
                <Icon
                  name={isComboDrawerOpen ? 'caret-up' : 'caret-down'}
                  ariaLabel={isComboDrawerOpen ? 'Collapse combos' : 'Expand combos'}
                  size={16}
                  style={{ color: 'var(--text-secondary)', flexShrink: 0 }}
                />
              </button>

              {/* Drawer content */}
              {isComboDrawerOpen && (
                <div style={{ borderTop: '1px solid var(--border-secondary)', padding: '0 16px 16px' }}>
                  {combos.map((combo, index) => (
                    <ComboForm
                      key={combo.id}
                      combo={combo}
                      index={index}
                      editingComboId={editingComboId}
                      tempComboName={tempComboName}
                      handleComboNameChange={handleComboNameChange}
                      saveComboName={saveComboName}
                      handleComboNameKeyDown={handleComboNameKeyDown}
                      startEditingComboName={startEditingComboName}
                      removeCombo={removeCombo}
                      updateCombo={updateCombo}
                      validateAndUpdateCombo={validateAndUpdateCombo}
                      removeCard={removeCard}
                      addCard={addCard}
                      canAddCard={canAddCard}
                      errors={errors}
                      typography={typography}
                      SearchableCardInput={SearchableCardInput}
                      cardDatabase={cardDatabase}
                      ydkCards={ydkCards}
                      ydkCardCounts={ydkCardCounts}
                    />
                  ))}

                  {combos.length < 10 && (
                    <div>
                      <hr className="my-4" style={{ borderColor: 'var(--border-secondary)', borderTop: '1px solid var(--border-secondary)' }} />
                      <div className="flex items-center">
                        <Button
                          onClick={addCombo}
                          className="enhanced-button enhanced-button-add"
                        >
                          <Icon name="rows-plus-bottom" ariaLabel="Add combo" size={14} className="button-icon" style={{ color: '#141414' }} />
                          <span className="button-text">Add combo</span>
                        </Button>
                        <Tooltip text="Test multiple combo lines to see your deck's overall consistency options" />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <hr style={{ margin: '24px 0', border: 'none', borderTop: '1px solid var(--border-secondary)' }} />

          <div className="flex space-x-4 mt-6">
            <Button
              onClick={runCalculation}
              disabled={isCalculating}
              className="enhanced-button"
              style={{ flex: 1, minWidth: '150px' }}
            >
              <Icon name="calculator" ariaLabel="Calculate" size={14} className="button-icon" style={{ color: '#141414' }} />
              <span className="button-text" style={{ minWidth: '90px', display: 'inline-block', textAlign: 'center' }}>
                {isCalculating ? 'Calculating...' : 'Calculate'}
              </span>
            </Button>
            <Button
              onClick={handleReset}
              variant="secondary"
              className="enhanced-button enhanced-button-reset"
              style={{ width: '140px', color: 'white' }}
            >
              <Icon name="arrow-counter-clockwise" ariaLabel="Reset" size={14} className="button-icon" style={{ color: 'white' }} />
              <span className="button-text" style={{ color: 'white' }}>Reset</span>
            </Button>
          </div>
        </div>

        <div ref={calculationDashboardRef}>
          <ResultsDisplay
            results={results}
            dashboardValues={dashboardValues}
            openingHand={openingHand}
            isRefreshing={isRefreshing}
            refreshOpeningHand={refreshOpeningHand}
            generatedTitle={generatedTitle}
            shareableUrl={shareableUrl}
            handleCopyLink={handleCopyLink}
            showToast={showToast}
            typography={typography}
            testHandFromDecklist={testHandFromDecklist}
            setTestHandFromDecklist={setTestHandFromDecklist}
            ydkCards={ydkCards}
            ydkCardCounts={ydkCardCounts}
            deckSize={deckSize}
            handSize={handSize}
            combos={combos}
          />
        </div>

{/*
        <section className="px-0 mb-8">
          <div className="flex items-center mb-4" style={{ gap: '8px' }}>
            <Icon name="star-four" ariaLabel="Top decks" size={16} />
            <h2 style={{...typography.h2, color: 'var(--text-main)'}}>Top Decks</h2>
          </div>

          <div className="space-y-3">
            {topDecks.map((deck, index) => (
              <div
                key={index}
                className="cursor-pointer hover:opacity-80 transition-opacity p-4 rounded-lg border"
                style={{
                  backgroundColor: 'var(--bg-secondary)',
                  borderColor: 'var(--border-secondary)'
                }}
                onClick={() => handleTopDeckClick(deck.link, deck.title)}
              >
                <h3 style={{...typography.h3, color: 'var(--text-main)', marginBottom: '8px'}}>
                  {deck.title}
                </h3>
                <p style={{...typography.body, color: 'var(--text-secondary)'}}>
                  {deck.description}
                </p>
              </div>
            ))}
          </div>
        </section>
*/}

        <div className="p-0" style={{ marginTop: 'var(--spacing-lg)' }}>
          <h2 className="mb-3" style={typography.h2}>Understanding Your Probability Results</h2>
          
          <h3 className="font-semibold mb-2" style={typography.h3}>Why do I see slight variations in percentages?</h3>
          <p className="mb-3" style={{ ...typography.body, color: 'var(--text-secondary)' }}>
            You might notice that running the same deck configuration multiple times can show minor differences in probabilities (like 47.3% vs 47.5%). This is completely normal and expected!
          </p>
          
          <h3 className="font-semibold mb-2" style={typography.h3}>The Monte Carlo Method</h3>
          <p className="mb-2" style={{ ...typography.body, color: 'var(--text-secondary)' }}>
            FirstDrawGG uses Monte Carlo simulation - the same proven method used by financial analysts, game developers, and engineers worldwide. Think of it like shuffling and drawing from your deck 100,000 times to see what actually happens, rather than just calculating theoretical odds.
          </p>
          
          <p className="mb-2" style={{ ...typography.body, color: 'var(--text-secondary)' }}>Here's how it works:</p>
          <ul className="list-disc pl-5 space-y-1 mb-3" style={{ ...typography.body, color: 'var(--text-secondary)' }}>
            <li>We simulate <span className="font-semibold">100,000 test hands</span> for each calculation</li>
            <li>Each simulation randomly shuffles your deck and draws cards</li>
            <li>The results show you what percentage of those hands met your criteria</li>
            <li>Just like real shuffling, each set of 100,000 tests will be slightly different</li>
          </ul>
          
          <h3 className="font-semibold mb-2" style={typography.h3}>Why This Matters for Deck Building</h3>
          <p className="mb-3" style={{ ...typography.body, color: 'var(--text-secondary)' }}>
            These small variations (typically less than 0.5%) are actually a strength, not a weakness. They reflect the real randomness you'll experience at tournaments. A combo showing 43.2% one time and 43.5% another time tells you it's consistently in that 43-44% range - exactly the confidence level you need for competitive decisions.
          </p>
          
          <h3 className="font-semibold mb-2" style={typography.h3}>The Bottom Line</h3>
          <p className="mb-3" style={{ ...typography.body, color: 'var(--text-secondary)' }}>
            With 100,000 simulations per calculation, our results are statistically robust. Whether you're optimizing your competitive deck's hand trap ratios or testing that spicy rogue combo, you can trust these probabilities to guide your deck building decisions. The minor variations you see are proof the system is working correctly, not a flaw.
          </p>
          
          <p className="italic" style={{ ...typography.body, color: 'var(--text-secondary)' }}>
            Remember: In Yu-Gi-Oh!, understanding whether your combo is at 43% or 83% is what separates consistent decks from inconsistent ones. Happy deck building!
          </p>
        </div>

        <Footer typography={typography} />

        {/* Toast notification */}
        <AnimatePresence>
          {toastMessage && (
            <Toast
              key={toastMessage}
              message={toastMessage}
              onClose={() => setToastMessage('')}
            />
          )}
        </AnimatePresence>
      </div>

    </div>
  );
};