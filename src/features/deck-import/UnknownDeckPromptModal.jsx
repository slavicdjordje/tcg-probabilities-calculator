/**
 * UnknownDeckPromptModal
 *
 * Shown when a deck upload yields no archetype match (no-match or
 * unknown-hybrid from ArchetypeRecognitionService).  The modal:
 *
 *   1. Confirms that the deck hash has been logged for frequency tracking.
 *   2. Shows the top near-miss archetypes (if any scored > 0).
 *   3. Invites the user to contribute a DuelingBook game log so a reference
 *      sequence can eventually be built.
 *
 * If the user declines, an inline notice explains that analysis will be
 * limited to raw card counts.
 *
 * Props
 * -----
 *   deckHash        {string}   8-char hex identifier shown in the badge.
 *   archetypeScores {Array}    Sorted array from ArchetypeRecognitionService.scoreAll().
 *   onContribute    {function} Called when the user accepts (open DB log modal).
 *   onDecline       {function} Called after the user dismisses the declined view.
 */

import React, { useState } from 'react';

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
  badge: {
    display: 'inline-flex', alignItems: 'center',
    padding: '3px 10px',
    borderRadius: '999px',
    fontSize: '12px', color: '#6b7280',
    fontFamily: 'Geist Mono, "Geist", monospace',
    letterSpacing: '0.05em',
    backgroundColor: '#1a1a1a',
    border: '1px solid #2a2a2a',
    marginBottom: '20px',
  },
  sectionLabel: {
    fontSize: '11px', fontWeight: 600, color: '#555',
    textTransform: 'uppercase', letterSpacing: '0.05em',
    marginBottom: '8px',
  },
  nearMissRow: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '5px 0',
    borderBottom: '1px solid #1e1e1e',
    fontSize: '13px',
    color: '#aaa',
  },
  nearMissScore: { fontSize: '12px', color: '#555' },
  infoBox: {
    padding: '12px 14px',
    borderRadius: '8px',
    backgroundColor: '#1a1a1a',
    border: '1px solid #2a2a2a',
    fontSize: '13px', color: '#888', lineHeight: '1.6',
    marginBottom: '20px',
  },
  limitedBox: {
    padding: '12px 14px',
    borderRadius: '8px',
    backgroundColor: '#1a1210',
    border: '1px solid #44291a',
    fontSize: '13px', color: '#d97706', lineHeight: '1.6',
    marginBottom: '20px',
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

export default function UnknownDeckPromptModal({
  deckHash,
  archetypeScores = [],
  onContribute,
  onDecline,
}) {
  const [declined, setDeclined] = useState(false);

  // Top near-misses: any archetype that scored at least 1 % but below threshold
  const nearMisses = archetypeScores
    .filter(s => s.confidence > 0)
    .slice(0, 3);

  const handleSkip = () => setDeclined(true);

  // ── Declined view ─────────────────────────────────────────────────────────

  if (declined) {
    return (
      <div style={S.overlay} onClick={e => e.target === e.currentTarget && onDecline?.()}>
        <div style={S.modal}>
          <div style={S.title}>Analysis limited</div>
          <div style={S.limitedBox}>
            Without a reference combo sequence, probability results are based on
            raw card counts only. You can still use the calculator manually.
          </div>
          <div style={S.footer}>
            <button style={S.btnPrimary} onClick={() => onDecline?.()}>OK</button>
          </div>
        </div>
      </div>
    );
  }

  // ── Prompt view ───────────────────────────────────────────────────────────

  return (
    <div style={S.overlay} onClick={e => e.target === e.currentTarget && handleSkip()}>
      <div style={S.modal}>
        <div style={S.title}>Deck not recognised</div>
        <div style={S.subtitle}>
          No reference combo sequence exists for this deck. Your deck has been
          logged for frequency tracking.
        </div>

        <div style={S.badge}>#{deckHash}</div>

        {nearMisses.length > 0 && (
          <div style={{ marginBottom: '20px' }}>
            <div style={S.sectionLabel}>Closest matches</div>
            {nearMisses.map(s => (
              <div key={s.id} style={S.nearMissRow}>
                <span>{s.name}</span>
                <span style={S.nearMissScore}>{(s.confidence * 100).toFixed(0)}%</span>
              </div>
            ))}
          </div>
        )}

        <div style={S.infoBox}>
          Contribute a DuelingBook game log to help build a reference sequence
          for this deck. The log will be used to map combo steps and run
          legality checks.
        </div>

        <div style={S.footer}>
          <button style={S.btnSecondary} onClick={handleSkip}>Skip</button>
          <button style={S.btnPrimary} onClick={() => onContribute?.()}>
            Contribute log
          </button>
        </div>
      </div>
    </div>
  );
}
