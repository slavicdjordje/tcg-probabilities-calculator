/**
 * PieceGroupConfirmationModal
 *
 * Presents the AI-computed piece groups to the user for review before
 * probability calculation.  For each combo step that requires a hand card,
 * the modal lists the reference card (from the stored sequence) alongside the
 * AI-identified deck cards that can substitute for it.
 *
 * The user can toggle individual cards in or out of each group, then confirm
 * to proceed with probability calculation.
 *
 * Props
 * -----
 *   sequence        {object}   The matched combo sequence (for step descriptions).
 *   inferenceResult {object}   Output from FunctionalRoleInferenceService.
 *   isLoading       {boolean}  True while inference is still running.
 *   onConfirm       {function} Called with confirmedGroups when user confirms.
 *   onCancel        {function} Called when user skips / dismisses the modal.
 */

import React, { useState } from 'react';

// ── Shared styles (mirrors the DeltaModal palette) ────────────────────────────

const S = {
  overlay: {
    position: 'fixed', inset: 0,
    backgroundColor: 'rgba(0,0,0,0.80)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 1000,
    padding: '24px',
    overflowY: 'auto',
  },
  modal: {
    backgroundColor: '#111',
    border: '1px solid #333',
    borderRadius: '12px',
    padding: '28px',
    width: '100%',
    maxWidth: '620px',
    maxHeight: '85vh',
    overflowY: 'auto',
    color: '#fff',
    fontFamily: 'Geist, sans-serif',
  },
  title:    { fontSize: '15px', fontWeight: 600, marginBottom: '4px' },
  subtitle: { fontSize: '13px', color: '#888', marginBottom: '20px', lineHeight: '1.5' },
  stepCard: {
    border: '1px solid #2a2a2a',
    borderRadius: '8px',
    padding: '14px 16px',
    marginBottom: '14px',
  },
  stepHeader: { display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '10px' },
  stepIndex: {
    flexShrink: 0,
    width: '22px', height: '22px',
    borderRadius: '50%',
    backgroundColor: '#222',
    border: '1px solid #444',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '11px', color: '#888', fontWeight: 600,
  },
  stepDesc: { fontSize: '13px', color: '#ddd', lineHeight: '1.5', flex: 1 },
  label: {
    fontSize: '11px', fontWeight: 600, color: '#666',
    textTransform: 'uppercase', letterSpacing: '0.05em',
    marginBottom: '6px',
  },
  referenceChip: {
    display: 'inline-flex', alignItems: 'center',
    padding: '3px 10px', borderRadius: '999px',
    fontSize: '12px',
    backgroundColor: '#1a1a1a',
    border: '1px solid #333',
    color: '#888',
    marginBottom: '8px',
  },
  cardRow: {
    display: 'flex', alignItems: 'flex-start', gap: '8px',
    padding: '6px 8px',
    borderRadius: '6px',
    cursor: 'pointer',
    userSelect: 'none',
  },
  checkbox: (checked) => ({
    flexShrink: 0,
    width: '16px', height: '16px',
    borderRadius: '4px',
    border: `1px solid ${checked ? '#4ade80' : '#444'}`,
    backgroundColor: checked ? '#166534' : 'transparent',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '10px', color: '#4ade80',
    marginTop: '2px',
  }),
  cardName: (checked) => ({
    fontSize: '13px',
    color: checked ? '#e5e7eb' : '#666',
    fontWeight: checked ? 500 : 400,
  }),
  cardCount: {
    fontSize: '11px', color: '#555',
    marginLeft: '4px',
  },
  cardReason: { fontSize: '11px', color: '#666', lineHeight: '1.4', marginTop: '2px' },
  rejectedToggle: {
    fontSize: '11px', color: '#555',
    cursor: 'pointer',
    marginTop: '4px',
    background: 'none', border: 'none', padding: 0,
    textDecoration: 'underline',
  },
  rejectedList: { marginTop: '6px' },
  rejectedItem: {
    fontSize: '12px', color: '#555',
    display: 'flex', gap: '6px',
    padding: '3px 0',
    borderBottom: '1px solid #1e1e1e',
  },
  tags: { display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '10px' },
  tag: {
    padding: '2px 8px', borderRadius: '999px',
    fontSize: '11px', color: '#6b7280',
    backgroundColor: '#1a1a1a',
    border: '1px solid #2a2a2a',
  },
  footer: { display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' },
  btnSecondary: {
    height: '36px', padding: '0 18px', borderRadius: '8px',
    border: '1px solid #333', backgroundColor: 'transparent',
    color: '#aaa', fontFamily: 'Geist, sans-serif', fontSize: '13px', cursor: 'pointer',
  },
  btnPrimary: {
    height: '36px', padding: '0 18px', borderRadius: '8px',
    border: 'none', backgroundColor: '#fff',
    color: '#000', fontFamily: 'Geist, sans-serif', fontSize: '13px',
    fontWeight: 600, cursor: 'pointer',
  },
  spinner: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    gap: '12px', padding: '32px 0',
  },
  spinnerRing: {
    width: '32px', height: '32px',
    border: '2px solid #333',
    borderTopColor: '#fff',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  spinnerText: { fontSize: '13px', color: '#888' },
};

// ── Spinner keyframes injected once ──────────────────────────────────────────
if (typeof document !== 'undefined' && !document.getElementById('fdgg-spin-kf')) {
  const style = document.createElement('style');
  style.id = 'fdgg-spin-kf';
  style.textContent = '@keyframes spin { to { transform: rotate(360deg); } }';
  document.head.appendChild(style);
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StepGroupCard({ group, toggledCards, onToggle }) {
  const [showRejected, setShowRejected] = useState(false);

  return (
    <div style={S.stepCard}>
      <div style={S.stepHeader}>
        <div style={S.stepIndex}>{group.stepIndex + 1}</div>
        <div>
          <div style={S.stepDesc}>{group.description}</div>
          {group.tags.length > 0 && (
            <div style={{ ...S.tags, marginTop: '6px', marginBottom: 0 }}>
              {group.tags.map(t => <span key={t} style={S.tag}>{t}</span>)}
            </div>
          )}
        </div>
      </div>

      <div style={{ marginBottom: '8px' }}>
        <div style={S.label}>Reference card</div>
        <span style={S.referenceChip}>
          {group.referenceCard.name}
          <span style={{ color: '#555', marginLeft: '6px', fontSize: '11px' }}>
            ({group.referenceCard.role})
          </span>
        </span>
      </div>

      <div>
        <div style={S.label}>
          Piece group
          {group.qualified.length > 0 && (
            <span style={{ color: '#555', fontWeight: 400, marginLeft: '6px', textTransform: 'none' }}>
              — {group.qualified.filter(c => toggledCards.has(c.name)).length} selected
            </span>
          )}
        </div>

        {group.qualified.length === 0 && (
          <div style={{ fontSize: '12px', color: '#555', padding: '4px 0' }}>
            No matching cards found in your deck.
          </div>
        )}

        {group.qualified.map(card => {
          const checked = toggledCards.has(card.name);
          return (
            <div
              key={card.name}
              style={{ ...S.cardRow, backgroundColor: checked ? 'rgba(22,101,52,0.12)' : 'transparent' }}
              onClick={() => onToggle(group.stepIndex, card.name)}
              role="checkbox"
              aria-checked={checked}
              tabIndex={0}
              onKeyDown={e => (e.key === ' ' || e.key === 'Enter') && onToggle(group.stepIndex, card.name)}
            >
              <div style={S.checkbox(checked)}>{checked ? '✓' : ''}</div>
              <div>
                <div>
                  <span style={S.cardName(checked)}>{card.name}</span>
                  {card.count > 0 && (
                    <span style={S.cardCount}>×{card.count}</span>
                  )}
                </div>
                <div style={S.cardReason}>{card.reason}</div>
              </div>
            </div>
          );
        })}
      </div>

      {group.rejected.length > 0 && (
        <div style={{ marginTop: '10px' }}>
          <button
            style={S.rejectedToggle}
            onClick={() => setShowRejected(v => !v)}
          >
            {showRejected ? 'Hide' : `Show ${group.rejected.length} excluded card${group.rejected.length !== 1 ? 's' : ''}`}
          </button>
          {showRejected && (
            <div style={S.rejectedList}>
              {group.rejected.map(card => (
                <div key={card.name} style={S.rejectedItem}>
                  <span style={{ color: '#444', flexShrink: 0 }}>–</span>
                  <span>
                    <strong style={{ fontWeight: 500 }}>{card.name}</strong>
                    {' '}
                    <span style={{ color: '#444' }}>{card.reason}</span>
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function PieceGroupConfirmationModal({
  sequence,
  inferenceResult,
  isLoading,
  onConfirm,
  onCancel,
}) {
  // toggledCards: Map<stepIndex, Set<cardName>>
  const [toggledCards, setToggledCards] = useState(() => {
    if (!inferenceResult) return new Map();
    const map = new Map();
    for (const group of inferenceResult.groups) {
      map.set(group.stepIndex, new Set(group.qualified.map(c => c.name)));
    }
    return map;
  });

  const handleToggle = (stepIndex, cardName) => {
    setToggledCards(prev => {
      const next = new Map(prev);
      const set  = new Set(next.get(stepIndex) ?? []);
      if (set.has(cardName)) {
        set.delete(cardName);
      } else {
        set.add(cardName);
      }
      next.set(stepIndex, set);
      return next;
    });
  };

  const handleConfirm = () => {
    if (!inferenceResult) return;
    // Build confirmed groups: keep only toggled cards
    const confirmedGroups = inferenceResult.groups.map(group => ({
      ...group,
      qualified: group.qualified.filter(
        c => (toggledCards.get(group.stepIndex) ?? new Set()).has(c.name)
      ),
    }));
    onConfirm(confirmedGroups);
  };

  const totalSelected = inferenceResult
    ? inferenceResult.groups.reduce((sum, g) => {
        const sel = toggledCards.get(g.stepIndex);
        return sum + (sel ? sel.size : 0);
      }, 0)
    : 0;

  return (
    <div style={S.overlay} onClick={e => e.target === e.currentTarget && onCancel()}>
      <div style={S.modal}>
        <div style={S.title}>
          {inferenceResult ? inferenceResult.sequenceName : sequence?.name ?? 'Combo Sequence'}
        </div>
        <div style={S.subtitle}>
          AI-computed piece groups for each hand requirement.
          Review the cards below and deselect any that shouldn't be included in
          the probability calculation, then confirm.
        </div>

        {isLoading && (
          <div style={S.spinner}>
            <div style={S.spinnerRing} />
            <div style={S.spinnerText}>Analysing deck cards…</div>
          </div>
        )}

        {!isLoading && inferenceResult && inferenceResult.groups.map(group => (
          <StepGroupCard
            key={group.stepIndex}
            group={group}
            toggledCards={toggledCards.get(group.stepIndex) ?? new Set()}
            onToggle={handleToggle}
          />
        ))}

        {!isLoading && inferenceResult && inferenceResult.groups.length === 0 && (
          <div style={{ fontSize: '13px', color: '#666', padding: '16px 0' }}>
            No hand-card requirements found in this sequence — nothing to confirm.
          </div>
        )}

        <div style={S.footer}>
          <button style={S.btnSecondary} onClick={onCancel}>
            Skip
          </button>
          <button
            style={{ ...S.btnPrimary, opacity: isLoading ? 0.5 : 1 }}
            disabled={isLoading}
            onClick={handleConfirm}
          >
            Confirm &amp; Calculate{totalSelected > 0 ? ` (${totalSelected} card${totalSelected !== 1 ? 's' : ''})` : ''}
          </button>
        </div>
      </div>
    </div>
  );
}
