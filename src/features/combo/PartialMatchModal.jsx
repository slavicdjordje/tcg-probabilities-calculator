/**
 * PartialMatchModal
 *
 * Shown when a matched combo sequence references cards that are not present in
 * the uploaded deck.  Gives the user two choices:
 *
 *   [Show missing cards] → display the sequence with a missing-cards summary
 *   [Skip]               → dismiss and return to deck stats
 *
 * Props
 * -----
 *   missingCards  {Array<{ name: string, stepIndex: number }>}
 *   onShowMissing {function}  Called when the user wants to see the sequence
 *   onSkip        {function}  Called when the user dismisses the modal
 */

import React from 'react';

// ── Styles ────────────────────────────────────────────────────────────────────

const S = {
  overlay: {
    position: 'fixed', inset: 0,
    backgroundColor: 'rgba(0,0,0,0.80)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 1000,
    padding: '24px',
  },
  modal: {
    backgroundColor: '#111',
    border: '1px solid #333',
    borderRadius: '12px',
    padding: '28px',
    width: '100%',
    maxWidth: '480px',
    color: '#fff',
    fontFamily: 'Geist, sans-serif',
  },
  title:    { fontSize: '15px', fontWeight: 600, marginBottom: '6px' },
  subtitle: { fontSize: '13px', color: '#888', marginBottom: '20px', lineHeight: '1.5' },
  missingList: {
    borderRadius: '8px',
    backgroundColor: '#1a1a1a',
    border: '1px solid #2a2a2a',
    marginBottom: '20px',
    overflow: 'hidden',
  },
  missingItem: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '8px 14px',
    borderBottom: '1px solid #1e1e1e',
    fontSize: '13px',
    color: '#aaa',
  },
  missingItemLast: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '8px 14px',
    fontSize: '13px',
    color: '#aaa',
  },
  stepBadge: {
    fontSize: '11px', color: '#555',
    fontFamily: 'Geist Mono, "Geist", monospace',
  },
  footer: {
    display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px',
  },
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
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function PartialMatchModal({ missingCards = [], onShowMissing, onSkip }) {
  return (
    <div style={S.overlay} onClick={e => e.target === e.currentTarget && onSkip?.()}>
      <div style={S.modal}>
        <div style={S.title}>Your deck is missing some cards for this combo</div>
        <div style={S.subtitle}>
          This combo sequence requires cards that aren't in your current decklist.
          Would you like to see which cards are missing?
        </div>

        {missingCards.length > 0 && (
          <div style={S.missingList}>
            {missingCards.map((card, i) => (
              <div
                key={card.name}
                style={i === missingCards.length - 1 ? S.missingItemLast : S.missingItem}
              >
                <span>{card.name}</span>
                <span style={S.stepBadge}>step {card.stepIndex + 1}</span>
              </div>
            ))}
          </div>
        )}

        <div style={S.footer}>
          <button style={S.btnSecondary} onClick={() => onSkip?.()}>Skip</button>
          <button style={S.btnPrimary} onClick={() => onShowMissing?.()}>
            Show missing cards
          </button>
        </div>
      </div>
    </div>
  );
}
