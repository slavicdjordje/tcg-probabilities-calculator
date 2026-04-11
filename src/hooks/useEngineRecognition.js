import { useState } from 'react';
import ComboSequenceStorageService from '../services/ComboSequenceStorageService';
import DeltaAnalysisService from '../services/DeltaAnalysisService';
import LogSequenceMappingService from '../services/LogSequenceMappingService';
import AIComboGenerationService from '../services/AIComboGenerationService';
import ArchetypeRecognitionService from '../services/ArchetypeRecognitionService';
import PromotionService from '../services/PromotionService';
import UnknownDeckStorageService from '../services/UnknownDeckStorageService';
import UserFeedbackStorageService from '../services/UserFeedbackStorageService';
import ProbabilityService from '../services/ProbabilityService';
import TitleGeneratorService from '../services/TitleGeneratorService';
import { createCombo } from '../utils/comboFactory';

/**
 * Encapsulates engine recognition, AI combo generation, piece-group confirmation,
 * partial-match modal, combo sequence display, DuelingBook log validation,
 * unknown-deck prompt, and archetype result state.
 */
const useEngineRecognition = ({
  cardDatabase,
  deckZones,
  ydkCardCounts,
  ydkCards,
  deckSize,
  handSize,
  setCombos,
  setResults,
  setDashboardValues,
  setGeneratedTitle,
  setDeckSize,
  showToast,
  scrollToCalculationDashboard,
  runAutoCalculate,
}) => {
  const [pieceGroupModal, setPieceGroupModal] = useState(null);
  const [partialMatchModal, setPartialMatchModal] = useState(null);
  const [unknownDeckPrompt, setUnknownDeckPrompt] = useState(null);
  const [sequenceDisplay, setSequenceDisplay] = useState(null);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [aiProbResults, setAiProbResults] = useState(null);
  const [isValidatingLog, setIsValidatingLog] = useState(false);
  const [archetypeResult, setArchetypeResult] = useState(null);
  const getMissingSequenceCards = (delta) => {
    const seen = new Set();
    const missing = [];
    for (const step of delta.annotatedSteps) {
      for (const card of step.annotatedCards) {
        if (!card.inDeck && !seen.has(card.name)) {
          seen.add(card.name);
          missing.push({ name: card.name, stepIndex: step.index });
        }
      }
    }
    return missing;
  };

  const handleEnginesRecognized = async (recognizedCombos, cardCounts, uniqueCards, newDeckSize) => {
    setSequenceDisplay(null);
    setPartialMatchModal(null);
    const promotedArchetypes = PromotionService.getPromotedArchetypes();
    const archetypeHit = ArchetypeRecognitionService.recognize(cardCounts, uniqueCards, promotedArchetypes);

    let matchedSequence = null;
    if (archetypeHit.type === 'single' || archetypeHit.type === 'hybrid') {
      const archetypeId = archetypeHit.archetype.id;
      const parents = archetypeHit.archetype.parents ?? [];
      const idsToFetch = [archetypeId, ...parents];
      const sequencesByArchetype = idsToFetch.flatMap(id => ComboSequenceStorageService.getByArchetype(id));
      matchedSequence = sequencesByArchetype[0] ?? null;
    }

    if (!matchedSequence) {
      const allSequences = ComboSequenceStorageService.getAll();
      const scored = allSequences.map(seq => {
        const matchCount = new Set(
          seq.steps.flatMap(step => step.cards.map(c => c.name))
            .filter(name => Object.prototype.hasOwnProperty.call(cardCounts, name))
        ).size;
        return { seq, matchCount };
      }).sort((a, b) => b.matchCount - a.matchCount);
      matchedSequence = scored[0]?.matchCount > 0 ? scored[0].seq : null;
    }

    if (matchedSequence) {
      setPieceGroupModal({
        sequence: matchedSequence,
        cardCounts,
        uniqueCards,
        newDeckSize,
        recognizedCombos,
      });
    } else {
      runAutoCalculate(recognizedCombos, cardCounts, uniqueCards, newDeckSize);
    }
  };

  const handleDeckReady = (cardCounts, uniqueCards, deckSizeVal, hadEngineMatch) => {
    setSequenceDisplay(null);
    setPartialMatchModal(null);
    setAiAnalysis(null);
    setAiProbResults(null);

    const promotedArchetypes = PromotionService.getPromotedArchetypes();
    setArchetypeResult(
      ArchetypeRecognitionService.recognize(cardCounts, uniqueCards, promotedArchetypes)
    );

    // AIComboGenerationService populates the combo builder for unknown decks.
    if (!hadEngineMatch) {
      AIComboGenerationService.generateCombos({
        deckCardCounts: cardCounts,
        cardDatabase,
        ydkCards:       uniqueCards,
      })
        .then(result => {
          setAiAnalysis({ isLoading: false, result, error: null });
          setCombos(result.appCombos.length > 0 ? result.appCombos : [createCombo(1, 0)]);

          if (result.appCombos.length > 0) {
            const calculatedResults = ProbabilityService.calculateMultipleCombos(
              result.appCombos, deckSizeVal, handSize, uniqueCards, cardCounts
            );
            setAiProbResults(calculatedResults.individual ?? null);
            setResults(calculatedResults);
            setDashboardValues({ deckSize: deckSizeVal, handSize, combos: result.appCombos.map(c => ({ ...c })) });
            const title = TitleGeneratorService.generateFunTitle(result.appCombos, deckSizeVal, calculatedResults.individual);
            setGeneratedTitle(title);
            setTimeout(() => scrollToCalculationDashboard(), 800);
          }
        })
        .catch(err => {
          console.warn('AIComboGenerationService failed:', err);
        });
    }

  };

  const handleUnknownDeck = ({ cardCounts, archetypeScores, cardCount }) => {
    const deckHash = UnknownDeckStorageService.hashDeck(cardCounts);
    UnknownDeckStorageService.save({ deckHash, archetypeScores, cardCount });
    setUnknownDeckPrompt({ deckHash, archetypeScores });
  };

  const handleSequenceConfirmShow = () => {
    if (!pieceGroupModal) return;
    const { sequence, cardCounts, uniqueCards, newDeckSize, recognizedCombos } = pieceGroupModal;
    setPieceGroupModal(null);
    setCombos(recognizedCombos);

    const extraDeckNames = (deckZones?.extra ?? []).map(c => c.name);
    const delta = DeltaAnalysisService.computeDelta({
      sequence,
      deckCardCounts: cardCounts,
      extraDeckNames,
      confirmedGroups: [],
    });

    const missingCards = getMissingSequenceCards(delta);
    if (missingCards.length > 0) {
      setPartialMatchModal({ sequence, delta, missingCards });
    } else {
      setSequenceDisplay({ sequence, delta });
    }

    runAutoCalculate(recognizedCombos, cardCounts, uniqueCards, newDeckSize);
  };

  const handleSequenceCorrected = async (parsedLog) => {
    if (!sequenceDisplay) return;

    setIsValidatingLog(true);
    try {
      const mapping = await LogSequenceMappingService.mapAndValidate({
        parsedLog,
        sequence:       sequenceDisplay.sequence,
        deckCardCounts: ydkCardCounts,
      });

      setSequenceDisplay(prev => prev ? { ...prev, logMapping: mapping } : null);

      const submitResult = UserFeedbackStorageService.submit({
        deckCardCounts:          ydkCardCounts,
        archetypeResult,
        mappedSteps:             mapping.mappedSteps,
        validatedActionSequence: mapping.mappedSteps
          .filter(s => s.matchedAction != null)
          .map(s => s.matchedAction),
        sequenceId: sequenceDisplay.sequence.id,
      });

      const promotionResult = PromotionService.evaluate({
        submitResult,
        mappedSteps: mapping.mappedSteps,
      });

      if (promotionResult.outcome === 'promoted' && promotionResult.type === 'new-archetype') {
        showToast(`New archetype "${promotionResult.archetype.name}" validated by the community!`);
      } else if (promotionResult.outcome === 'promoted' && promotionResult.type === 'variant') {
        showToast('Sequence validated — promoted as a new community variant!');
      } else if (promotionResult.outcome === 'threshold-not-met') {
        showToast(
          `Contribution saved (${promotionResult.agreementCount}/${promotionResult.threshold} agreements needed)`
        );
      } else if (promotionResult.outcome === 'already-promoted') {
        showToast('This sequence is already validated');
      }

      const logCombos = mapping.mappedSteps
        .filter(ms => ms.verdict !== 'unmatched' && ms.verdict !== 'illegal' && ms.cardName)
        .map(ms => {
          const step = sequenceDisplay.sequence.steps[ms.stepIndex];
          const hasHandCard = step?.cards.some(c => c.fromZone === 'hand');
          if (!hasHandCard) return null;
          const count = ydkCardCounts[ms.cardName] ?? 0;
          return {
            id:    crypto.randomUUID(),
            name:  `${sequenceDisplay.sequence.name} — Step ${ms.stepIndex + 1} (log)`,
            cards: [{
              starterCard:     ms.cardName,
              cardId:          null,
              isCustom:        false,
              startersInDeck:  count,
              minCopiesInHand: 1,
              maxCopiesInHand: count,
              logicOperator:   'AND',
            }],
          };
        })
        .filter(Boolean);

      if (logCombos.length > 0) {
        const uniqueCards = Object.keys(ydkCardCounts).length;
        const calculatedResults = ProbabilityService.calculateMultipleCombos(
          logCombos, deckSize, handSize, uniqueCards, ydkCardCounts
        );
        setResults(calculatedResults);
        setDashboardValues({ deckSize, handSize, combos: logCombos });
        const title = TitleGeneratorService.generateFunTitle(logCombos, deckSize, calculatedResults.individual);
        setGeneratedTitle(title);
        setTimeout(() => scrollToCalculationDashboard(), 400);
      }
    } catch (err) {
      console.warn('FDGG-26: Log sequence mapping failed', err);
    } finally {
      setIsValidatingLog(false);
    }
  };

  return {
    // state
    pieceGroupModal,
    setPieceGroupModal,
    partialMatchModal,
    setPartialMatchModal,
    unknownDeckPrompt,
    setUnknownDeckPrompt,
    sequenceDisplay,
    setSequenceDisplay,
    aiAnalysis,
    setAiAnalysis,
    aiProbResults,
    setAiProbResults,
    isValidatingLog,
    archetypeResult,
    // handlers
    handleEnginesRecognized,
    handleDeckReady,
    handleUnknownDeck,
    handleSequenceConfirmShow,
    handleSequenceCorrected,
    getMissingSequenceCards,
  };
};

export default useEngineRecognition;
