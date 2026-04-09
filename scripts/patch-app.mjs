import { readFileSync, writeFileSync } from 'fs';

const path = 'C:/Users/SLAVI/OneDrive/Desktop/TCG Probabilities Calculator/tcg-probabilities-calculator/src/App.jsx';
let c = readFileSync(path, 'utf8');

const marker = '    runAutoCalculate(finalCombos, cardCounts, uniqueCards, newDeckSize);\n  };\n';

const handler = `
  // Called when a DuelingBook replay is uploaded from ComboSequenceDisplay (FDGG-26)
  const handleSequenceCorrected = async (parsedLog) => {
    if (!sequenceDisplay) return;

    setIsValidatingLog(true);
    try {
      const mapping = await LogSequenceMappingService.mapAndValidate({
        parsedLog,
        sequence:       sequenceDisplay.sequence,
        deckCardCounts: ydkCardCounts,
      });

      // Annotate the displayed sequence with log-validation results
      setSequenceDisplay(prev => prev ? { ...prev, logMapping: mapping } : null);

      // Derive combo entries from legal/ambiguous hand-card steps
      const logCombos = mapping.mappedSteps
        .filter(ms => ms.verdict !== 'unmatched' && ms.verdict !== 'illegal' && ms.cardName)
        .map(ms => {
          const step = sequenceDisplay.sequence.steps[ms.stepIndex];
          const hasHandCard = step?.cards.some(c => c.fromZone === 'hand');
          if (!hasHandCard) return null;
          const count = ydkCardCounts[ms.cardName] ?? 0;
          return {
            id:    crypto.randomUUID(),
            name:  \`\${sequenceDisplay.sequence.name} — Step \${ms.stepIndex + 1} (log)\`,
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

`;

if (!c.includes(marker)) {
  console.error('marker not found');
  process.exit(1);
}
c = c.replace(marker, marker + handler);
writeFileSync(path, c);
console.log('done');
