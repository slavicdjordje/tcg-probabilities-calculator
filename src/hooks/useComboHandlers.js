import { useState } from 'react';
import { createCombo } from '../utils/comboFactory';

/**
 * Encapsulates all combo manipulation state and handlers.
 * Owns editingComboId / tempComboName locally.
 *
 * @param {{ combos, setCombos, handSize, errors, setErrors }} params
 */
const useComboHandlers = ({ combos, setCombos, handSize, errors, setErrors }) => {
  const [editingComboId, setEditingComboId] = useState(null);
  const [tempComboName, setTempComboName] = useState('');

  const addCombo = () => {
    if (combos.length < 10) {
      const newId = Math.max(...combos.map(c => c.id)) + 1;
      setCombos([...combos, createCombo(newId, combos.length)]);
    }
  };

  const removeCombo = (id) => {
    const newCombos = combos.filter(combo => combo.id !== id);
    const updatedCombos = newCombos.map((combo, index) => ({
      ...combo,
      name: combo.name.startsWith('Combo ') ? `Combo ${index + 1}` : combo.name
    }));
    setCombos(updatedCombos);
  };

  const updateCombo = (id, cardIndex, field, value) => {
    setCombos(prevCombos => prevCombos.map(combo => {
      if (combo.id !== id) return combo;

      const updatedCombo = { ...combo };
      updatedCombo.cards = [...combo.cards];
      const currentCard = combo.cards[cardIndex];

      if (field === 'starterCard' && typeof value === 'object') {
        updatedCombo.cards[cardIndex] = {
          ...combo.cards[cardIndex],
          starterCard: value.starterCard,
          cardId: value.cardId,
          isCustom: value.isCustom
        };

        if (value.startersInDeck !== undefined) {
          updatedCombo.cards[cardIndex].startersInDeck = value.startersInDeck;
          updatedCombo.cards[cardIndex].maxCopiesInHand = value.startersInDeck;
          setErrors(prev => {
            const newErrors = { ...prev };
            delete newErrors[`combo-${id}-card-${cardIndex}-maxCopiesInHand`];
            return newErrors;
          });
        }
        if (value.maxCopiesInHand !== undefined) {
          updatedCombo.cards[cardIndex].maxCopiesInHand = value.maxCopiesInHand;
        }
      } else {
        updatedCombo.cards[cardIndex] = { ...combo.cards[cardIndex], [field]: value };
      }

      const card = updatedCombo.cards[cardIndex];

      if (field === 'startersInDeck') {
        if (currentCard.maxCopiesInHand === currentCard.startersInDeck) {
          card.maxCopiesInHand = value;
          setErrors(prev => {
            const newErrors = { ...prev };
            delete newErrors[`combo-${id}-card-${cardIndex}-maxCopiesInHand`];
            return newErrors;
          });
        } else if (value < currentCard.maxCopiesInHand) {
          card.maxCopiesInHand = value;
          setErrors(prev => {
            const newErrors = { ...prev };
            delete newErrors[`combo-${id}-card-${cardIndex}-maxCopiesInHand`];
            return newErrors;
          });
        }
      }

      if (field === 'maxCopiesInHand' && value < currentCard.minCopiesInHand) {
        if (currentCard.minCopiesInHand === currentCard.maxCopiesInHand) {
          card.minCopiesInHand = value;
          setErrors(prev => {
            const newErrors = { ...prev };
            delete newErrors[`combo-${id}-card-${cardIndex}-minCopiesInHand`];
            return newErrors;
          });
        }
      }

      if (field === 'minCopiesInHand' && value > currentCard.maxCopiesInHand) {
        card.maxCopiesInHand = value;
      }

      return updatedCombo;
    }));
  };

  const updateComboProperty = (id, field, value) => {
    setCombos(combos.map(combo => {
      if (combo.id !== id) return combo;
      return { ...combo, [field]: value };
    }));
  };

  const validateAndUpdateCombo = (id, cardIndex, field, value) => {
    const combo = combos.find(c => c.id === id);
    if (!combo) return;

    const currentCard = combo.cards[cardIndex];
    const fieldPrefix = `combo-${id}-card-${cardIndex}-${field}`;

    if (field === 'maxCopiesInHand' && value > currentCard.startersInDeck) {
      setErrors(prev => ({
        ...prev,
        [fieldPrefix]: "Can't be more than Copies in deck"
      }));
      return;
    }

    if (field === 'minCopiesInHand' && value > currentCard.maxCopiesInHand) {
      setErrors(prev => ({
        ...prev,
        [fieldPrefix]: "Can't be more than Max in hand"
      }));
      return;
    }

    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[fieldPrefix];
      return newErrors;
    });

    updateCombo(id, cardIndex, field, value);
  };

  const addCard = (comboId) => {
    setCombos(combos.map(combo => {
      if (combo.id !== comboId) return combo;
      return {
        ...combo,
        cards: [
          ...combo.cards,
          {
            starterCard: '',
            cardId: null,
            isCustom: false,
            startersInDeck: 3,
            minCopiesInHand: 1,
            maxCopiesInHand: 3,
            logicOperator: 'AND'
          }
        ]
      };
    }));
  };

  const removeSecondCard = (comboId) => {
    setCombos(combos.map(combo => {
      if (combo.id !== comboId) return combo;
      return { ...combo, cards: [combo.cards[0]] };
    }));
  };

  const removeCard = (comboId, cardIndex) => {
    setCombos(combos.map(combo => {
      if (combo.id !== comboId) return combo;
      const newCards = combo.cards.filter((_, index) => index !== cardIndex);
      if (newCards.length === 0) {
        return {
          ...combo,
          cards: [{
            starterCard: '',
            cardId: null,
            isCustom: false,
            startersInDeck: 3,
            minCopiesInHand: 1,
            maxCopiesInHand: 3,
            logicOperator: 'AND'
          }]
        };
      }
      return { ...combo, cards: newCards };
    }));
  };

  const canAddCard = (combo) => {
    if (!combo || !combo.cards) return false;
    const currentMinSum = combo.cards.reduce((sum, card) => sum + (card.minCopiesInHand || 0), 0);
    return currentMinSum + 1 <= handSize;
  };

  const getHighestMinInHandSum = () => {
    if (!combos || combos.length === 0) return 1;
    const sums = combos.map(combo =>
      combo.cards.reduce((sum, card) => sum + (card.minCopiesInHand || 0), 0)
    );
    return Math.max(1, ...sums);
  };

  const startEditingComboName = (combo) => {
    setEditingComboId(combo.id);
    setTempComboName(combo.name);
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[`combo-${combo.id}-name`];
      return newErrors;
    });
  };

  const handleComboNameChange = (e) => {
    const value = e.target.value;
    if (value.length > 50) return;
    const isValid = /^[a-zA-Z0-9 ]*$/.test(value);
    if (!isValid && value !== '') {
      setErrors(prev => ({
        ...prev,
        [`combo-${editingComboId}-name`]: 'Only alphanumeric characters allowed'
      }));
    } else {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[`combo-${editingComboId}-name`];
        return newErrors;
      });
    }
    setTempComboName(value);
  };

  const saveComboName = () => {
    if (!editingComboId) return;
    const comboIndex = combos.findIndex(c => c.id === editingComboId);
    let finalName = tempComboName.trim();
    if (finalName === '') finalName = `Combo ${comboIndex + 1}`;

    const isDuplicate = combos.some(combo =>
      combo.id !== editingComboId && combo.name === finalName
    );
    if (isDuplicate) {
      setErrors(prev => ({
        ...prev,
        [`combo-${editingComboId}-name`]: 'Combo name must be unique'
      }));
      return;
    }

    const isValid = /^[a-zA-Z0-9 ]*$/.test(finalName);
    if (isValid) {
      updateComboProperty(editingComboId, 'name', finalName);
      setEditingComboId(null);
      setTempComboName('');
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[`combo-${editingComboId}-name`];
        return newErrors;
      });
    }
  };

  const handleComboNameKeyDown = (e) => {
    if (e.key === 'Enter') saveComboName();
  };

  return {
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
  };
};

export default useComboHandlers;
