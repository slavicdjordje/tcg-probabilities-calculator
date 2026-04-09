/**
 * ComboSequenceDisplay
 *
 * Renders a matched combo sequence after deck recognition and piece-group
 * confirmation.  Displays:
 *
 *   • Sequence header  – name, exact-match / substitution badge
 *   • Ordered steps    – description, functional tags, card movements,
 *                        substitution annotations, choke-point warnings,
 *                        and optional log-validation annotations
 *   • Endboard         – field / GY / hand card lists with missing-card flags
 *   • Weakness profile – breaking categories and named counters
 *   • DuelingBook log  – upload trigger for sequence correction
 *
 * Props
 * -----
 *   sequence           {object}        Matched combo sequence from COMBO_SEQUENCE_DATABASE
 *   confirmedGroups    {Array|null}    Output of PieceGroupConfirmationModal.onConfirm
 *   deckCardCounts     {object}        { cardName: count } from uploaded YDK
 *   delta              {object}        Pre-computed result from DeltaAnalysisService
 *   logMapping         {object|null}   Output of LogSequenceMappingService.mapAndValidate
 *   isValidatingLog    {boolean}       True while log validation is in progress
 *   onClose            {function}      Called when user dismisses the panel
 *   onSequenceCorrected {function}     Called with parsedLog when a replay is uploaded
 */

import React, { useRef, useState } from 'react';
import LegalCheckService from '../../services/LegalCheckService.js';

// ── Palette ───────────────────────────────────────────────────────────────────

const C = {
  bg:       '#0a0a0a',
  border:   '#222',
  surface:  '#111',
  surface2: '#181818',
  text:     '#e5e7eb',
  muted:    '#6b7280',
  dim:      '#3f3f46',
  amber:    '#f59e0b',
  amberBg:  'rgba(245,158,11,0.08)',
  amberBdr: 'rgba(245,158,11,0.25)',
  red:      '#ef4444',
  redBg:    'rgba(239,68,68,0.08)',
  redBdr:   'rgba(239,68,68,0.25)',
  green:    '#4ade80',
  greenBg:  'rgba(74,222,128,0.08)',
  greenBdr: 'rgba(74,222,128,0.25)',
  blue:     '#60a5fa',
  blueBg:   'rgba(96,165,250,0.08)',
  blueBdr:  'rgba(96,165,250,0.25)',
};

const S = {
  panel: {
    backgroundColor: C.bg,
    border: `1px solid ${C.border}`,
    borderRadius: '12px',
    padding: '0',
    fontFamily: 'Geist, sans-serif',
    color: C.text,
    overflow: 'hidden',
  },
  panelHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 20px',
    borderBottom: `1px solid ${C.border}`,
    backgroundColor: C.surface,
  },
  panelTitle: { fontSize: '14px', fontWeight: 600, color: C.text },
  closeBtn: {
    background: 'none', border: 'none', cursor: 'pointer',
    color: C.muted, fontSize: '18px', lineHeight: 1, padding: '0 2px',
  },
  body: { padding: '20px' },

  // Badge
  badge: (color) => ({
    display: 'inline-flex', alignItems: 'center', gap: '5px',
    padding: '2px 10px', borderRadius: '999px',
    fontSize: '11px', fontWeight: 600,
    backgroundColor: color === 'green' ? C.greenBg
      : color === 'amber' ? C.amberBg : C.blueBg,
    color: color === 'green' ? C.green
      : color === 'amber' ? C.amber : C.blue,
    border: `1px solid ${color === 'green' ? C.greenBdr
      : color === 'amber' ? C.amberBdr : C.blueBdr}`,
  }),

  // Section
  section: { marginBottom: '24px' },
  sectionLabel: {
    fontSize: '11px', fontWeight: 600, color: C.muted,
    textTransform: 'uppercase', letterSpacing: '0.06em',
    marginBottom: '12px',
  },

  // Step
  stepRow: {
    display: 'flex', gap: '12px',
    marginBottom: '12px',
    paddingBottom: '12px',
    borderBottom: `1px solid ${C.border}`,
  },
  stepIndexBadge: {
    flexShrink: 0,
    width: '24px', height: '24px',
    borderRadius: '50%',
    backgroundColor: C.surface2,
    border: `1px solid ${C.dim}`,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '11px', fontWeight: 700, color: C.muted,
    marginTop: '1px',
  },
  stepBody: { flex: 1, minWidth: 0 },
  stepDesc: { fontSize: '13px', color: C.text, lineHeight: '1.5', marginBottom: '6px' },
  tagRow: { display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '8px' },
  tagPill: {
    padding: '1px 8px', borderRadius: '999px',
    fontSize: '10px', color: C.muted,
    backgroundColor: C.surface2,
    border: `1px solid ${C.border}`,
  },
  cardRow: { display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '6px' },
  cardChip: (inDeck) => ({
    display: 'inline-flex', alignItems: 'center', gap: '5px',
    padding: '2px 8px 2px 6px', borderRadius: '6px',
    fontSize: '11px',
    backgroundColor: inDeck ? C.surface2 : C.redBg,
    border: `1px solid ${inDeck ? C.dim : C.redBdr}`,
    color: inDeck ? '#d1d5db' : C.red,
  }),
  zoneDot: (zone) => ({
    width: '6px', height: '6px', borderRadius: '50%', flexShrink: 0,
    backgroundColor:
      zone === 'hand'     ? C.blue
      : zone === 'field'  ? C.green
      : zone === 'gy'     ? C.amber
      : zone === 'extra'  ? '#a78bfa'
      : zone === 'deck'   ? '#67e8f9'
      : C.muted,
  }),
  zoneArrow: { color: C.muted, fontSize: '10px', margin: '0 1px' },

  // Substitution annotation
  substitutionBox: {
    backgroundColor: C.amberBg,
    border: `1px solid ${C.amberBdr}`,
    borderRadius: '6px',
    padding: '8px 10px',
    marginTop: '6px',
  },
  substitutionLabel: { fontSize: '11px', fontWeight: 600, color: C.amber, marginBottom: '4px' },
  substitutionRef: { fontSize: '12px', color: '#9ca3af', marginBottom: '4px' },
  substituteSub: { display: 'flex', flexWrap: 'wrap', gap: '4px' },
  substituteChip: {
    display: 'inline-flex', alignItems: 'center',
    padding: '1px 8px', borderRadius: '999px',
    fontSize: '11px', color: C.amber,
    backgroundColor: 'rgba(245,158,11,0.12)',
    border: `1px solid ${C.amberBdr}`,
  },

  // Checkpoint — gate condition (shown before the step)
  gateBox: {
    backgroundColor: 'rgba(99,102,241,0.08)',
    border: '1px solid rgba(99,102,241,0.25)',
    borderRadius: '6px',
    padding: '7px 10px',
    marginBottom: '7px',
    display: 'flex', gap: '7px', alignItems: 'flex-start',
  },
  gateIcon: { fontSize: '12px', flexShrink: 0, marginTop: '1px' },
  gateTitle: { fontSize: '10px', fontWeight: 600, color: '#a5b4fc', marginBottom: '2px', letterSpacing: '0.03em' },
  gateDesc: { fontSize: '11px', color: '#c7d2fe', lineHeight: '1.5' },
  gateCards: { display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' },
  gateCardPill: {
    padding: '1px 7px', borderRadius: '999px',
    fontSize: '10px', color: '#a5b4fc',
    backgroundColor: 'rgba(99,102,241,0.1)',
    border: '1px solid rgba(99,102,241,0.2)',
  },

  // Checkpoint — consumed resource with downstream dependency
  resourceBox: {
    backgroundColor: 'rgba(20,184,166,0.07)',
    border: '1px solid rgba(20,184,166,0.2)',
    borderRadius: '6px',
    padding: '7px 10px',
    marginTop: '7px',
    display: 'flex', gap: '7px', alignItems: 'flex-start',
  },
  resourceIcon: { fontSize: '12px', flexShrink: 0, marginTop: '1px' },
  resourceTitle: { fontSize: '10px', fontWeight: 600, color: '#5eead4', marginBottom: '2px', letterSpacing: '0.03em' },
  resourceDesc: { fontSize: '11px', color: '#99f6e4', lineHeight: '1.5' },

  // Checkpoint — intermediate board state
  stateBox: {
    backgroundColor: 'rgba(148,163,184,0.05)',
    border: '1px solid rgba(148,163,184,0.15)',
    borderRadius: '6px',
    padding: '7px 10px',
    marginTop: '7px',
  },
  stateTitle: { fontSize: '10px', fontWeight: 600, color: '#94a3b8', marginBottom: '5px', letterSpacing: '0.03em' },
  stateZoneRow: { display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '4px', alignItems: 'center' },
  stateZoneLabel: { fontSize: '10px', color: '#64748b', minWidth: '34px' },
  stateCardPill: {
    padding: '1px 6px', borderRadius: '999px',
    fontSize: '10px', color: '#94a3b8',
    backgroundColor: 'rgba(148,163,184,0.08)',
    border: '1px solid rgba(148,163,184,0.15)',
  },
  stateEmpty: { fontSize: '10px', color: '#475569', fontStyle: 'italic' },

  // Choke point warning
  chokeBox: {
    backgroundColor: C.redBg,
    border: `1px solid ${C.redBdr}`,
    borderRadius: '6px',
    padding: '8px 10px',
    marginTop: '8px',
    display: 'flex', gap: '8px', alignItems: 'flex-start',
  },
  chokeIcon: { fontSize: '13px', flexShrink: 0, marginTop: '1px' },
  chokeContent: {},
  chokeTitle: { fontSize: '11px', fontWeight: 600, color: C.red, marginBottom: '3px' },
  chokeDesc: { fontSize: '11px', color: '#fca5a5', lineHeight: '1.5' },
  chokeCategories: { display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '5px' },
  chokeCatPill: {
    padding: '1px 7px', borderRadius: '999px',
    fontSize: '10px', color: '#f87171',
    backgroundColor: 'rgba(239,68,68,0.08)',
    border: '1px solid rgba(239,68,68,0.2)',
  },

  // Endboard
  endboardZone: { marginBottom: '14px' },
  endboardZoneLabel: { fontSize: '11px', fontWeight: 600, color: C.muted, marginBottom: '6px' },
  endboardCards: { display: 'flex', flexWrap: 'wrap', gap: '5px' },
  endboardChip: (inDeck) => ({
    display: 'inline-flex', alignItems: 'center', gap: '5px',
    padding: '3px 10px', borderRadius: '999px',
    fontSize: '12px',
    backgroundColor: inDeck ? C.surface2 : C.redBg,
    border: `1px solid ${inDeck ? C.dim : C.redBdr}`,
    color: inDeck ? '#d1d5db' : C.red,
  }),
  endboardNotes: {
    fontSize: '12px', color: C.muted, marginTop: '8px',
    lineHeight: '1.5', fontStyle: 'italic',
  },

  // Weakness
  weaknessGrid: { display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '10px' },
  weaknessCat: {
    padding: '3px 10px', borderRadius: '999px',
    fontSize: '11px', color: '#fca5a5',
    backgroundColor: C.redBg,
    border: `1px solid ${C.redBdr}`,
  },
  namedCounter: {
    padding: '3px 10px', borderRadius: '999px',
    fontSize: '11px', color: C.amber,
    backgroundColor: C.amberBg,
    border: `1px solid ${C.amberBdr}`,
  },
  weaknessNotes: { fontSize: '12px', color: C.muted, marginTop: '6px', lineHeight: '1.5', fontStyle: 'italic' },

  // Log annotation
  logBox: (verdict) => ({
    backgroundColor:
      verdict === 'legal'     ? C.greenBg
      : verdict === 'illegal' ? C.redBg
      : C.amberBg,
    border: `1px solid ${
      verdict === 'legal'     ? C.greenBdr
      : verdict === 'illegal' ? C.redBdr
      : C.amberBdr
    }`,
    borderRadius: '6px',
    padding: '7px 10px',
    marginTop: '6px',
  }),
  logBoxLabel: (verdict) => ({
    fontSize: '11px', fontWeight: 600, marginBottom: '3px',
    color:
      verdict === 'legal'     ? C.green
      : verdict === 'illegal' ? C.red
      : C.amber,
  }),
  logBoxAction: {
    fontSize: '11px', color: '#d1d5db', lineHeight: '1.5',
    fontFamily: 'monospace', marginBottom: '3px',
    wordBreak: 'break-word',
  },
  logBoxExplanation: { fontSize: '11px', color: '#9ca3af', lineHeight: '1.4' },
  logUnmatched: {
    fontSize: '11px', color: C.muted, marginTop: '5px',
    fontStyle: 'italic',
  },

  // Missing cards summary (FDGG-42)
  missingBanner: {
    backgroundColor: 'rgba(239,68,68,0.06)',
    border: `1px solid rgba(239,68,68,0.2)`,
    borderRadius: '8px',
    overflow: 'hidden',
  },
  missingBannerItem: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '7px 12px',
    borderBottom: '1px solid rgba(239,68,68,0.12)',
    fontSize: '12px',
    color: '#fca5a5',
  },
  missingBannerItemLast: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '7px 12px',
    fontSize: '12px',
    color: '#fca5a5',
  },
  missingStepBadge: {
    fontSize: '10px', color: '#f87171',
    fontFamily: 'Geist Mono, "Geist", monospace',
  },

  // DuelingBook upload
  dbSection: {
    borderTop: `1px solid ${C.border}`,
    paddingTop: '16px',
    marginTop: '4px',
  },
  dbLabel: { fontSize: '12px', color: C.muted, marginBottom: '10px' },
  dbBtn: {
    height: '32px', padding: '0 14px',
    borderRadius: '8px', border: `1px solid ${C.dim}`,
    backgroundColor: C.surface2, color: '#9ca3af',
    fontFamily: 'Geist, sans-serif', fontSize: '12px',
    cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px',
  },
  dbFeedback: { fontSize: '12px', color: C.green, marginTop: '8px' },
  dbError: { fontSize: '12px', color: C.red, marginTop: '8px' },
};

// ── Zone dot legend ───────────────────────────────────────────────────────────

function ZoneDot({ zone }) {
  return <span style={S.zoneDot(zone)} title={zone} />;
}

// ── Single step row ───────────────────────────────────────────────────────────

function CheckpointGate({ gate }) {
  if (!gate) return null;
  return (
    <div style={S.gateBox}>
      <span style={S.gateIcon}>🔒</span>
      <div>
        <div style={S.gateTitle}>Gate condition</div>
        <div style={S.gateDesc}>{gate.description}</div>
        {gate.cards.length > 0 && (
          <div style={S.gateCards}>
            {gate.cards.map(c => (
              <span key={c} style={S.gateCardPill}>{c}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CheckpointResource({ resource }) {
  if (!resource) return null;
  return (
    <div style={S.resourceBox}>
      <span style={S.resourceIcon}>🔗</span>
      <div>
        <div style={S.resourceTitle}>Consumed resource → {resource.toZone}</div>
        <div style={S.resourceDesc}>
          <strong style={{ color: '#5eead4' }}>{resource.card}</strong>
          {' — '}{resource.downstreamDependency}
        </div>
      </div>
    </div>
  );
}

function CheckpointState({ state }) {
  if (!state) return null;
  const zones = [
    { label: 'Field', key: 'field' },
    { label: 'GY', key: 'gy' },
    { label: 'Hand', key: 'hand' },
  ];
  return (
    <div style={S.stateBox}>
      <div style={S.stateTitle}>Board state after this step</div>
      {zones.map(({ label, key }) => (
        <div key={key} style={S.stateZoneRow}>
          <span style={S.stateZoneLabel}>{label}</span>
          {state[key].length > 0
            ? state[key].map(c => <span key={c} style={S.stateCardPill}>{c}</span>)
            : <span style={S.stateEmpty}>—</span>
          }
        </div>
      ))}
    </div>
  );
}

function StepItem({ annotatedStep, logStep }) {
  const { index, description, tags, annotatedCards, substitutions, chokePoint, checkpoint } = annotatedStep;

  return (
    <div style={S.stepRow}>
      <div style={S.stepIndexBadge}>{index + 1}</div>
      <div style={S.stepBody}>
        {checkpoint?.gateCondition && (
          <CheckpointGate gate={checkpoint.gateCondition} />
        )}
        <div style={S.stepDesc}>{description}</div>

        {tags.length > 0 && (
          <div style={S.tagRow}>
            {tags.map(t => <span key={t} style={S.tagPill}>{t}</span>)}
          </div>
        )}

        <div style={S.cardRow}>
          {annotatedCards.map((card, i) => (
            <span key={i} style={S.cardChip(card.inDeck)}>
              <ZoneDot zone={card.fromZone} />
              {card.name}
              {card.fromZone !== card.toZone && (
                <>
                  <span style={S.zoneArrow}>›</span>
                  <ZoneDot zone={card.toZone} />
                </>
              )}
              <span style={{ fontSize: '10px', color: card.inDeck ? '#6b7280' : '#f87171' }}>
                {' '}({card.role})
              </span>
            </span>
          ))}
        </div>

        {checkpoint?.consumedResource && (
          <CheckpointResource resource={checkpoint.consumedResource} />
        )}
        {checkpoint?.intermediateState && (
          <CheckpointState state={checkpoint.intermediateState} />
        )}

        {substitutions.map((sub, i) => (
          <div key={i} style={S.substitutionBox}>
            <div style={S.substitutionLabel}>Substitution</div>
            <div style={S.substitutionRef}>
              Reference: <strong style={{ color: '#9ca3af' }}>{sub.referenceCard.name}</strong> not in deck
            </div>
            {sub.substitutes.length > 0 ? (
              <>
                <div style={{ fontSize: '11px', color: C.muted, marginBottom: '4px' }}>
                  Your deck uses:
                </div>
                <div style={S.substituteSub}>
                  {sub.substitutes.map(s => (
                    <span key={s.name} style={S.substituteChip}>
                      {s.name}
                      {s.count > 0 && (
                        <span style={{ color: '#d97706', marginLeft: '4px' }}>×{s.count}</span>
                      )}
                    </span>
                  ))}
                </div>
                {sub.substitutes[0]?.reason && (
                  <div style={{ fontSize: '11px', color: '#92400e', marginTop: '4px', lineHeight: '1.4' }}>
                    {sub.substitutes[0].reason}
                  </div>
                )}
              </>
            ) : (
              <div style={{ fontSize: '11px', color: C.red }}>
                No suitable substitute found in your deck.
              </div>
            )}
          </div>
        ))}

        {chokePoint && (
          <div style={S.chokeBox}>
            <span style={S.chokeIcon}>⚡</span>
            <div style={S.chokeContent}>
              <div style={S.chokeTitle}>Choke Point — interrupt window opens here</div>
              <div style={S.chokeDesc}>{chokePoint.description}</div>
              {chokePoint.interruptCategories.length > 0 && (
                <div style={S.chokeCategories}>
                  {chokePoint.interruptCategories.map(cat => (
                    <span key={cat} style={S.chokeCatPill}>{cat}</span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {logStep && logStep.matchedAction && (
          <div style={S.logBox(logStep.verdict)}>
            <div style={S.logBoxLabel(logStep.verdict)}>
              Log — {logStep.verdict}
              {logStep.cardName && logStep.cardName !== description && (
                <span style={{ fontWeight: 400, marginLeft: '6px', color: '#9ca3af' }}>
                  ({logStep.cardName})
                </span>
              )}
            </div>
            <div style={S.logBoxAction}>{logStep.matchedAction}</div>
            {logStep.explanation && (
              <div style={S.logBoxExplanation}>{logStep.explanation}</div>
            )}
          </div>
        )}
        {logStep && !logStep.matchedAction && (
          <div style={S.logUnmatched}>Not found in log</div>
        )}
      </div>
    </div>
  );
}

// ── Endboard section ──────────────────────────────────────────────────────────

function EndboardSection({ annotatedEndboard }) {
  const { field, gy, hand, notes } = annotatedEndboard;

  const Zone = ({ label, cards }) => {
    if (!cards || cards.length === 0) return null;
    return (
      <div style={S.endboardZone}>
        <div style={S.endboardZoneLabel}>{label}</div>
        <div style={S.endboardCards}>
          {cards.map(({ name, inDeck }) => (
            <span key={name} style={S.endboardChip(inDeck)}>
              {name}
              {!inDeck && (
                <span style={{ fontSize: '10px', marginLeft: '3px' }} title="Not in your deck">⚠</span>
              )}
            </span>
          ))}
        </div>
      </div>
    );
  };

  return (
    <>
      <Zone label="Field" cards={field} />
      <Zone label="Graveyard" cards={gy} />
      <Zone label="Hand" cards={hand} />
      {notes && <div style={S.endboardNotes}>{notes}</div>}
    </>
  );
}

// ── Weakness section ──────────────────────────────────────────────────────────

function WeaknessSection({ weaknesses }) {
  if (!weaknesses) return null;
  const { breakingCategories = [], namedCounters = [], notes } = weaknesses;

  return (
    <>
      {breakingCategories.length > 0 && (
        <div style={S.weaknessGrid}>
          {breakingCategories.map(cat => (
            <span key={cat} style={S.weaknessCat}>{cat}</span>
          ))}
        </div>
      )}
      {namedCounters.length > 0 && (
        <div style={S.weaknessGrid}>
          {namedCounters.map(card => (
            <span key={card} style={S.namedCounter}>{card}</span>
          ))}
        </div>
      )}
      {notes && <div style={S.weaknessNotes}>{notes}</div>}
    </>
  );
}

// ── Card name extraction ──────────────────────────────────────────────────────

/**
 * Pull every quoted card name out of a DuelingBook action line.
 * DuelingBook wraps card names in double-quotes:
 *   PlayerName activated "Ash Blossom & Joyous Spring"'s effect.
 */
function extractCardNamesFromAction(action) {
  const names = [];
  const re = /"([^"]+)"/g;
  let m;
  while ((m = re.exec(action)) !== null) names.push(m[1]);
  return names;
}

// ── DuelingBook log upload ────────────────────────────────────────────────────

/**
 * DuelingBookUpload
 *
 * State machine:
 *   idle       → user clicks Upload, file is read and parsed
 *   checking   → LegalCheckService runs on every action in parallel
 *   allLegal   → all actions passed; onSequenceCorrected is called
 *   results    → one or more actions are illegal or ambiguous
 *   rechecking → user answered clarifying questions; re-running checks on
 *                the previously-ambiguous actions only
 *
 * Acceptance rules (per FDGG-25):
 *   • All legal/unambiguous → accept, call onSequenceCorrected
 *   • Any illegal           → show violations, block, prompt resubmission
 *   • Any ambiguous         → ask clarifying questions; accept only if the
 *                             re-check resolves every action as legal
 */
function DuelingBookUpload({ onSequenceCorrected }) {
  const fileInputRef = useRef(null);
  // 'idle' | 'checking' | 'allLegal' | 'results' | 'rechecking'
  const [phase, setPhase]               = useState('idle');
  const [fileError, setFileError]       = useState(null);
  const [parsedLog, setParsedLog]       = useState(null);
  const [legalResults, setLegalResults] = useState([]);
  // { [actionIndex]: string } — user answers to clarifying questions
  const [clarifications, setClarifications] = useState({});

  async function runChecks(parsed, clarificationMap, prevResults) {
    const isRecheck = Object.keys(clarificationMap).length > 0;
    setPhase(isRecheck ? 'rechecking' : 'checking');

    let results;

    if (isRecheck && prevResults.length > 0) {
      // Only re-check the previously-ambiguous actions that now have answers
      results = [...prevResults];
      await Promise.all(
        Object.entries(clarificationMap).map(async ([idxStr, clarification]) => {
          const i        = parseInt(idxStr, 10);
          const action   = parsed.actions[i];
          const cardNames = extractCardNamesFromAction(action);
          const claim    = `${action} (Clarification: ${clarification})`;
          try {
            const verdict = await LegalCheckService.check({
              cardNames: cardNames.length ? cardNames : [action],
              claim,
            });
            results[i] = { action, cardNames, ...verdict };
          } catch (err) {
            results[i] = {
              action, cardNames,
              verdict:            'ambiguous',
              explanation:        `Could not verify: ${err.message}`,
              clarifyingQuestion: 'Could you confirm this action is correct?',
            };
          }
        })
      );
    } else {
      // Initial pass — check every action in parallel
      results = await Promise.all(
        parsed.actions.map(async (action) => {
          const cardNames = extractCardNamesFromAction(action);
          if (cardNames.length === 0) {
            return { action, cardNames: [], verdict: 'legal', explanation: 'No card names detected in this action.' };
          }
          try {
            const verdict = await LegalCheckService.check({ cardNames, claim: action });
            return { action, cardNames, ...verdict };
          } catch (err) {
            return {
              action, cardNames,
              verdict:            'ambiguous',
              explanation:        `Could not verify: ${err.message}`,
              clarifyingQuestion: 'Could you confirm this action is correct?',
            };
          }
        })
      );
    }

    setLegalResults(results);

    const hasIllegal   = results.some(r => r.verdict === 'illegal');
    const hasAmbiguous = results.some(r => r.verdict === 'ambiguous');

    if (!hasIllegal && !hasAmbiguous) {
      setPhase('allLegal');
      onSequenceCorrected?.(parsed);
    } else {
      setPhase('results');
    }
  }

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileError(null);
    setLegalResults([]);
    setClarifications({});
    setParsedLog(null);

    const validExtensions = ['.yrpx', '.yrp', '.txt', '.log'];
    const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
    if (!validExtensions.includes(ext)) {
      setFileError(`Unsupported file type "${ext}". Expected .yrpx, .yrp, .txt, or .log.`);
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const raw    = ev.target.result;
      const parsed = parseDuelingBookLog(raw, file.name);
      if (!parsed) {
        setFileError('Could not parse replay. Make sure you exported it as a text replay from DuelingBook.');
        return;
      }
      setParsedLog(parsed);
      runChecks(parsed, {}, []);
    };
    reader.onerror = () => setFileError('Failed to read file.');
    reader.readAsText(file);
    // Allow the same file to be re-selected after a correction
    e.target.value = '';
  };

  const handleSubmitClarifications = () => {
    if (parsedLog) runChecks(parsedLog, clarifications, legalResults);
  };

  const isChecking = phase === 'checking' || phase === 'rechecking';

  const illegalResults = legalResults
    .map((r, i) => ({ ...r, index: i }))
    .filter(r => r.verdict === 'illegal');

  const ambiguousResults = legalResults
    .map((r, i) => ({ ...r, index: i }))
    .filter(r => r.verdict === 'ambiguous');

  const allClarificationsProvided = ambiguousResults.every(
    r => clarifications[r.index]?.trim()
  );

  return (
    <div style={S.dbSection}>
      <div style={S.dbLabel}>
        Upload a DuelingBook replay to refine or correct the sequence steps.
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept=".yrpx,.yrp,.txt,.log"
        style={{ display: 'none' }}
        onChange={handleFile}
      />

      <button
        style={{ ...S.dbBtn, opacity: isChecking ? 0.6 : 1, cursor: isChecking ? 'default' : 'pointer' }}
        onClick={() => !isChecking && fileInputRef.current?.click()}
        disabled={isChecking}
      >
        <span style={{ fontSize: '14px' }}>↑</span>
        {isChecking ? 'Checking…' : 'Upload replay'}
      </button>

      {fileError && <div style={S.dbError}>{fileError}</div>}

      {/* Checking progress */}
      {isChecking && (
        <div style={{ fontSize: '12px', color: C.muted, marginTop: '8px' }}>
          {phase === 'rechecking'
            ? 'Re-checking clarifications…'
            : `Checking ${parsedLog?.actions.length ?? '…'} action${parsedLog?.actions.length !== 1 ? 's' : ''} against rulings…`}
        </div>
      )}

      {/* ── All legal ────────────────────────────────────────────────────── */}
      {phase === 'allLegal' && (
        <div style={{ fontSize: '12px', color: C.green, marginTop: '8px' }}>
          All {legalResults.length} action{legalResults.length !== 1 ? 's' : ''} verified as legal. Replay accepted.
        </div>
      )}

      {/* ── Illegal actions – block + prompt resubmission ──────────────── */}
      {phase === 'results' && illegalResults.length > 0 && (
        <div style={{ marginTop: '12px' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: C.red, marginBottom: '8px' }}>
            {illegalResults.length} illegal action{illegalResults.length !== 1 ? 's' : ''} — replay not accepted.
          </div>

          {illegalResults.map((r) => (
            <div key={r.index} style={{
              backgroundColor: C.redBg,
              border: `1px solid ${C.redBdr}`,
              borderRadius: '6px',
              padding: '10px',
              marginBottom: '8px',
              display: 'flex', flexDirection: 'column', gap: '5px',
            }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: C.red }}>Illegal action</div>
              <div style={{ fontSize: '12px', color: '#fca5a5', lineHeight: '1.5', fontFamily: 'monospace', wordBreak: 'break-word' }}>
                {r.action}
              </div>

              {r.cardNames.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                  {r.cardNames.map(cn => (
                    <span key={cn} style={S.chokeCatPill}>{cn}</span>
                  ))}
                </div>
              )}

              <div style={{ fontSize: '11px', color: '#fca5a5', lineHeight: '1.4' }}>
                {r.explanation}
              </div>

              {r.violatedRuling && (
                <div style={{
                  fontSize: '11px', color: '#fca5a5', lineHeight: '1.5',
                  backgroundColor: 'rgba(239,68,68,0.05)',
                  border: `1px solid rgba(239,68,68,0.18)`,
                  borderRadius: '4px', padding: '6px 8px',
                }}>
                  <strong style={{ color: C.red }}>Violated ruling:</strong> {r.violatedRuling}
                </div>
              )}
            </div>
          ))}

          <div style={{ fontSize: '11px', color: C.muted, marginTop: '2px' }}>
            Correct the invalid actions and upload a new replay to continue.
          </div>
        </div>
      )}

      {/* ── Ambiguous actions – clarification form ─────────────────────── */}
      {phase === 'results' && illegalResults.length === 0 && ambiguousResults.length > 0 && (
        <div style={{ marginTop: '12px' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: C.amber, marginBottom: '8px' }}>
            {ambiguousResults.length} action{ambiguousResults.length !== 1 ? 's need' : ' needs'} clarification before the replay can be accepted.
          </div>

          {ambiguousResults.map((r) => (
            <div key={r.index} style={{
              backgroundColor: C.amberBg,
              border: `1px solid ${C.amberBdr}`,
              borderRadius: '6px',
              padding: '10px',
              marginBottom: '8px',
              display: 'flex', flexDirection: 'column', gap: '5px',
            }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: C.amber }}>Ambiguous action</div>
              <div style={{ fontSize: '12px', color: '#fcd34d', lineHeight: '1.5', fontFamily: 'monospace', wordBreak: 'break-word' }}>
                {r.action}
              </div>

              {r.cardNames.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                  {r.cardNames.map(cn => (
                    <span key={cn} style={S.substituteChip}>{cn}</span>
                  ))}
                </div>
              )}

              <div style={{ fontSize: '11px', color: C.amber }}>
                {r.clarifyingQuestion ?? r.explanation}
              </div>

              <textarea
                value={clarifications[r.index] ?? ''}
                onChange={ev => setClarifications(prev => ({ ...prev, [r.index]: ev.target.value }))}
                placeholder="Type your clarification here…"
                rows={2}
                style={{
                  width: '100%', boxSizing: 'border-box',
                  backgroundColor: C.surface2,
                  border: `1px solid ${C.amberBdr}`,
                  borderRadius: '6px',
                  color: C.text,
                  fontSize: '12px', fontFamily: 'Geist, sans-serif',
                  padding: '6px 8px',
                  resize: 'vertical', outline: 'none',
                }}
              />
            </div>
          ))}

          <button
            style={{
              ...S.dbBtn,
              backgroundColor: C.amberBg,
              borderColor: C.amberBdr,
              color: C.amber,
              marginTop: '4px',
              opacity: allClarificationsProvided ? 1 : 0.5,
              cursor: allClarificationsProvided ? 'pointer' : 'default',
            }}
            onClick={handleSubmitClarifications}
            disabled={!allClarificationsProvided}
          >
            Submit clarifications
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Minimal DuelingBook log parser.
 * Extracts ordered play action lines from a plain-text replay export.
 *
 * DuelingBook text replays look like:
 *   Turn 1 (PlayerName):
 *   PlayerName Normal Summoned "Card Name".
 *   PlayerName activated "Card Name"'s effect.
 *   …
 *
 * Returns { actions: string[] } or null if the text is empty / unrecognisable.
 */
function parseDuelingBookLog(raw, filename) {
  if (!raw || typeof raw !== 'string') return null;

  const lines = raw
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(l => l.length > 0);

  if (lines.length === 0) return null;

  // Heuristic: accept if any line contains a known DB log keyword
  const logKeywords = ['Summoned', 'activated', 'added', 'sent', 'banished', 'attached', 'detached', 'Turn'];
  const looksLikeLog = lines.some(l => logKeywords.some(kw => l.includes(kw)));
  if (!looksLikeLog) return null;

  // Filter to action lines (non-turn-header, non-empty)
  const actions = lines.filter(l => !/^Turn\s+\d+/.test(l) && l.length > 0);

  return { filename, raw, actions };
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ComboSequenceDisplay({
  sequence,
  delta,
  showMissingCards = false,
  logMapping,
  isValidatingLog,
  onClose,
  onSequenceCorrected,
}) {
  if (!sequence || !delta) return null;

  const { isExactMatch, substitutionCount, annotatedSteps, annotatedEndboard } = delta;

  // Collect unique missing cards across all steps for the summary panel (FDGG-42)
  const missingCardsList = (() => {
    if (!showMissingCards) return [];
    const seen = new Set();
    const list = [];
    for (const step of annotatedSteps) {
      for (const card of step.annotatedCards) {
        if (!card.inDeck && !seen.has(card.name)) {
          seen.add(card.name);
          list.push({ name: card.name, stepIndex: step.index });
        }
      }
    }
    return list;
  })();

  const matchBadgeColor = isExactMatch ? 'green' : 'amber';
  const matchBadgeText  = isExactMatch
    ? 'Exact match'
    : `${substitutionCount} substitution${substitutionCount !== 1 ? 's' : ''}`;

  // Build a stepIndex → MappedStep lookup for log annotations
  const logStepMap = new Map();
  if (logMapping?.mappedSteps) {
    for (const ms of logMapping.mappedSteps) {
      logStepMap.set(ms.stepIndex, ms);
    }
  }

  const legalCount = logMapping?.mappedSteps?.filter(
    ms => ms.verdict === 'legal'
  ).length ?? 0;

  return (
    <div style={S.panel}>
      {/* Header */}
      <div style={S.panelHeader}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <span style={S.panelTitle}>{sequence.name}</span>
          <span style={S.badge(matchBadgeColor)}>{matchBadgeText}</span>
          {logMapping && (
            <span style={S.badge('blue')}>
              Log: {legalCount}/{logMapping.mappedSteps.length} steps validated
            </span>
          )}
          {isValidatingLog && (
            <span style={{ fontSize: '11px', color: '#6b7280' }}>Validating log…</span>
          )}
        </div>
        {onClose && (
          <button style={S.closeBtn} onClick={onClose} aria-label="Close sequence display">×</button>
        )}
      </div>

      <div style={S.body}>
        {/* Missing cards summary (FDGG-42) */}
        {missingCardsList.length > 0 && (
          <div style={S.section}>
            <div style={S.sectionLabel}>Missing cards</div>
            <div style={S.missingBanner}>
              {missingCardsList.map((card, i) => (
                <div
                  key={card.name}
                  style={i === missingCardsList.length - 1 ? S.missingBannerItemLast : S.missingBannerItem}
                >
                  <span>{card.name}</span>
                  <span style={S.missingStepBadge}>step {card.stepIndex + 1}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Steps */}
        <div style={S.section}>
          <div style={S.sectionLabel}>Play sequence</div>
          {annotatedSteps.map(step => (
            <StepItem
              key={step.index}
              annotatedStep={step}
              logStep={logStepMap.get(step.index) ?? null}
            />
          ))}
        </div>

        {/* Endboard */}
        {(annotatedEndboard.field.length > 0 ||
          annotatedEndboard.gy.length > 0 ||
          annotatedEndboard.hand.length > 0) && (
          <div style={S.section}>
            <div style={S.sectionLabel}>Endboard</div>
            <EndboardSection annotatedEndboard={annotatedEndboard} />
          </div>
        )}

        {/* Weakness profile */}
        {sequence.weaknesses && (
          <div style={S.section}>
            <div style={S.sectionLabel}>Weakness profile</div>
            <WeaknessSection weaknesses={sequence.weaknesses} />
          </div>
        )}

        {/* DuelingBook correction */}
        <DuelingBookUpload onSequenceCorrected={onSequenceCorrected} />
      </div>
    </div>
  );
}
