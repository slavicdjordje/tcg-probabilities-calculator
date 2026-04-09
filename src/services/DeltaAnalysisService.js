/**
 * DeltaAnalysisService
 *
 * Compares a combo sequence's reference deck cards against the cards present in
 * an uploaded deck, producing annotated steps for display in ComboSequenceDisplay.
 *
 * ── Input ─────────────────────────────────────────────────────────────────────
 *   sequence        – combo sequence from COMBO_SEQUENCE_DATABASE
 *   deckCardCounts  – { cardName: count } from the uploaded YDK
 *   confirmedGroups – output of PieceGroupConfirmationModal (may be null)
 *     Array<{
 *       stepIndex:     number,
 *       referenceCard: StepCard,
 *       qualified:     Array<{ name: string, count: number, reason: string }>,
 *     }>
 *
 * ── Output ────────────────────────────────────────────────────────────────────
 *   {
 *     isExactMatch:    boolean,           // true when every reference card is present
 *     substitutionCount: number,          // steps that required a substitution
 *     annotatedSteps:  AnnotatedStep[],
 *     annotatedEndboard: AnnotatedEndboard,
 *   }
 *
 * ── AnnotatedStep ─────────────────────────────────────────────────────────────
 *   {
 *     ...step,                            // all original Step fields
 *     annotatedCards: AnnotatedStepCard[], // per-card in/out-of-deck status
 *     substitutions:  Substitution[],     // reference→deck swaps for hand cards
 *     chokePoint:     ChokePoint | null,  // choke point that fires AFTER this step
 *   }
 *
 * ── AnnotatedStepCard ─────────────────────────────────────────────────────────
 *   { ...StepCard, inDeck: boolean }
 *
 * ── Substitution ──────────────────────────────────────────────────────────────
 *   { referenceCard: StepCard, substitutes: Array<{ name, count, reason }> }
 *
 * ── AnnotatedEndboard ─────────────────────────────────────────────────────────
 *   {
 *     field: Array<{ name: string, inDeck: boolean }>,
 *     gy:    Array<{ name: string, inDeck: boolean }>,
 *     hand:  Array<{ name: string, inDeck: boolean }>,
 *     notes: string,
 *   }
 */

const DeltaAnalysisService = {
  /**
   * @param {object} options
   * @param {object}  options.sequence
   * @param {object}  options.deckCardCounts
   * @param {Array|null} options.confirmedGroups
   * @returns {object}
   */
  computeDelta({ sequence, deckCardCounts, extraDeckNames = [], confirmedGroups }) {
    const extraSet = new Set(extraDeckNames);
    const inDeck = (name) =>
      (Object.prototype.hasOwnProperty.call(deckCardCounts, name) && deckCardCounts[name] > 0) ||
      extraSet.has(name);

    // Build a fast lookup: stepIndex → confirmed qualified cards
    const groupByStep = new Map();
    if (Array.isArray(confirmedGroups)) {
      for (const group of confirmedGroups) {
        groupByStep.set(group.stepIndex, group);
      }
    }

    // Build choke-point lookup: afterStepIndex → ChokePoint
    const chokeByStep = new Map();
    for (const cp of (sequence.chokePoints ?? [])) {
      chokeByStep.set(cp.afterStepIndex, cp);
    }

    let substitutionCount = 0;

    const annotatedSteps = sequence.steps.map((step) => {
      const annotatedCards = step.cards.map((card) => ({
        ...card,
        inDeck: inDeck(card.name),
      }));

      const substitutions = [];
      const group = groupByStep.get(step.index);

      if (group) {
        const refCard = group.referenceCard;
        const refInDeck = inDeck(refCard.name);

        if (!refInDeck) {
          // Reference card is absent — find non-reference substitutes
          const substitutes = group.qualified.filter(
            (c) => c.name !== refCard.name,
          );
          substitutions.push({ referenceCard: refCard, substitutes });
          if (substitutes.length > 0) substitutionCount++;
        }
      }

      return {
        ...step,
        annotatedCards,
        substitutions,
        chokePoint: chokeByStep.get(step.index) ?? null,
      };
    });

    // Annotate endboard cards
    const annotateList = (names) =>
      (names ?? []).map((name) => ({ name, inDeck: inDeck(name) }));

    const annotatedEndboard = {
      field: annotateList(sequence.endboard?.field),
      gy:    annotateList(sequence.endboard?.gy),
      hand:  annotateList(sequence.endboard?.hand),
      notes: sequence.endboard?.notes ?? '',
    };

    const isExactMatch = substitutionCount === 0;

    return {
      isExactMatch,
      substitutionCount,
      annotatedSteps,
      annotatedEndboard,
    };
  },
};

export default DeltaAnalysisService;
