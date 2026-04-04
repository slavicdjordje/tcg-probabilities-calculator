import { ENGINE_DATABASE } from '../data/engineDatabase.js';

/**
 * ComboRecognitionService
 *
 * Identifies known engines in an uploaded deck and builds pre-populated
 * combo objects ready to be set as React state.
 */
const ComboRecognitionService = {
  /**
   * Check which engines from the database are present in the deck.
   * An engine matches if at least one of its identifierCards is in ydkCardCounts.
   *
   * @param {Object} ydkCardCounts - { cardName: count } from parsed YDK
   * @returns {Array} matched engine objects from ENGINE_DATABASE
   */
  recognizeEngines(ydkCardCounts) {
    if (!ydkCardCounts || Object.keys(ydkCardCounts).length === 0) return [];

    return ENGINE_DATABASE.filter(engine =>
      engine.identifierCards.some(cardName => ydkCardCounts[cardName] !== undefined)
    );
  },

  /**
   * Build combo state objects from matched engines.
   * Cards not present in the deck are skipped (partial match support).
   * maxCopiesInHand is set to the card's count in the deck.
   *
   * @param {Array} matchedEngines - result of recognizeEngines()
   * @param {Object} ydkCardCounts - { cardName: count }
   * @param {Array} ydkCards - [{ name, id, isCustom }] from parsed YDK
   * @returns {Array} combo objects compatible with app state shape
   */
  buildCombos(matchedEngines, ydkCardCounts, ydkCards) {
    const cardIdMap = {};
    if (ydkCards) {
      ydkCards.forEach(card => { cardIdMap[card.name] = card.id; });
    }

    const combos = [];

    for (const engine of matchedEngines) {
      for (const template of engine.comboTemplates) {
        const presentCards = template.cards.filter(
          card => ydkCardCounts[card.name] !== undefined
        );

        if (presentCards.length === 0) continue;

        const comboCards = presentCards.map((card) => {
          const deckCount = ydkCardCounts[card.name];
          return {
            starterCard: card.name,
            cardId: cardIdMap[card.name] || null,
            isCustom: false,
            startersInDeck: deckCount,
            minCopiesInHand: card.minInHand,
            maxCopiesInHand: deckCount,
            logicOperator: 'AND',
          };
        });

        combos.push({
          id: crypto.randomUUID(),
          name: template.name,
          cards: comboCards,
        });
      }
    }

    return combos;
  },
};

export default ComboRecognitionService;
