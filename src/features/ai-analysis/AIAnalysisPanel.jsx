/**
 * AIAnalysisPanel
 *
 * Displays the state of an AI-powered deck analysis triggered after upload.
 *
 * Three display states:
 *   loading  – spinner while the API call is in flight
 *   error    – error message with a retry button
 *   result   – archetype badge, combo list, optional step sequences
 *
 * Props
 * -----
 *   isLoading   {boolean}          True while the AI call is in flight.
 *   error       {string|null}      Error message, or null.
 *   result      {object|null}      { deckType, confidence, appCombos, sequences }
 *   probResults {Array|null}       Individual probability results from ProbabilityService.
 *   onRetry     {function}         Called when user clicks "Retry".
 *   onDismiss   {function}         Called when user closes the panel.
 */

import React, { useState } from 'react';

// ── Palette (matches ComboSequenceDisplay) ────────────────────────────────────

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
  green:    '#4ade80',
  greenBg:  'rgba(74,222,128,0.08)',
  greenBdr: 'rgba(74,222,128,0.25)',
  blue:     '#60a5fa',
  blueBg:   'rgba(96,165,250,0.08)',
  blueBdr:  'rgba(96,165,250,0.25)',
  purple:   '#a78bfa',
  purpleBg: 'rgba(167,139,250,0.08)',
  purpleBdr:'rgba(167,139,250,0.25)',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function confidenceColor(confidence) {
  if (confidence === 'high')   return 'green';
  if (confidence === 'medium') return 'amber';
  return 'blue';
}

function ConfidenceBadge({ confidence }) {
  const color = confidenceColor(confidence);
  const bg    = color === 'green' ? C.greenBg  : color === 'amber' ? C.amberBg  : C.blueBg;
  const bdr   = color === 'green' ? C.greenBdr : color === 'amber' ? C.amberBdr : C.blueBdr;
  const fg    = color === 'green' ? C.green    : color === 'amber' ? C.amber    : C.blue;
  const label = confidence ? confidence.charAt(0).toUpperCase() + confidence.slice(1) : 'Low';
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '2px 8px', borderRadius: '999px',
      fontSize: '11px', fontWeight: 600,
      backgroundColor: bg, color: fg, border: `1px solid ${bdr}`,
    }}>
      {label} confidence
    </span>
  );
}

function AiBadge() {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '4px',
      padding: '2px 8px', borderRadius: '999px',
      fontSize: '11px', fontWeight: 600,
      backgroundColor: C.purpleBg, color: C.purple, border: `1px solid ${C.purpleBdr}`,
    }}>
      ✦ AI
    </span>
  );
}

// ── Spinner ───────────────────────────────────────────────────────────────────

function Spinner() {
  return (
    <span style={{
      display: 'inline-block',
      width: '14px', height: '14px',
      border: `2px solid ${C.dim}`,
      borderTopColor: C.purple,
      borderRadius: '50%',
      animation: 'spin 0.7s linear infinite',
      flexShrink: 0,
    }} />
  );
}

// ── Sequence accordion ────────────────────────────────────────────────────────

function SequenceAccordion({ sequences }) {
  const [open, setOpen] = useState(null);

  if (!sequences || sequences.length === 0) return null;

  return (
    <div style={{ marginTop: '16px' }}>
      <div style={{ fontSize: '11px', fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>
        Combo Sequences
      </div>
      {sequences.map((seq, i) => (
        <div key={i} style={{ marginBottom: '6px', border: `1px solid ${C.border}`, borderRadius: '8px', overflow: 'hidden' }}>
          <button
            onClick={() => setOpen(open === i ? null : i)}
            style={{
              width: '100%', textAlign: 'left',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '10px 14px',
              background: 'none', border: 'none', cursor: 'pointer',
              color: C.text, fontSize: '13px', fontWeight: 500,
              fontFamily: 'Geist, sans-serif',
            }}
          >
            <span>{seq.name}</span>
            <span style={{ color: C.muted, fontSize: '12px' }}>{open === i ? '▲' : '▼'}</span>
          </button>

          {open === i && (
            <div style={{ padding: '0 14px 14px', borderTop: `1px solid ${C.border}` }}>
              {/* Steps */}
              {Array.isArray(seq.steps) && seq.steps.length > 0 && (
                <div style={{ marginTop: '12px' }}>
                  {seq.steps.map((step, j) => (
                    <div key={j} style={{ display: 'flex', gap: '10px', marginBottom: '8px' }}>
                      <div style={{
                        flexShrink: 0, width: '20px', height: '20px', borderRadius: '50%',
                        backgroundColor: C.surface2, border: `1px solid ${C.dim}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '10px', fontWeight: 700, color: C.muted, marginTop: '2px',
                      }}>
                        {j + 1}
                      </div>
                      <span style={{ fontSize: '13px', color: C.text, lineHeight: '1.5' }}>
                        {step}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Endboard */}
              {Array.isArray(seq.endboard) && seq.endboard.length > 0 && (
                <div style={{ marginTop: '10px' }}>
                  <div style={{ fontSize: '11px', color: C.muted, marginBottom: '6px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Endboard</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                    {seq.endboard.map((card, k) => (
                      <span key={k} style={{
                        padding: '2px 8px', borderRadius: '6px', fontSize: '11px',
                        backgroundColor: C.greenBg, color: C.green, border: `1px solid ${C.greenBdr}`,
                      }}>
                        {card}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function AIAnalysisPanel({ isLoading, error, result, probResults, onRetry, onDismiss }) {
  if (!isLoading && !error && !result) return null;

  return (
    <>
      {/* Inject keyframes once */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      <div style={{
        backgroundColor: C.bg,
        border: `1px solid ${C.border}`,
        borderRadius: '12px',
        overflow: 'hidden',
        fontFamily: 'Geist, sans-serif',
        color: C.text,
        marginBottom: '24px',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 18px',
          borderBottom: `1px solid ${C.border}`,
          backgroundColor: C.surface,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AiBadge />
            <span style={{ fontSize: '14px', fontWeight: 600, color: C.text }}>
              {isLoading ? 'Analyzing deck…' : error ? 'Analysis failed' : `${result.deckType}`}
            </span>
            {result && <ConfidenceBadge confidence={result.confidence} />}
          </div>
          {!isLoading && onDismiss && (
            <button
              onClick={onDismiss}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.muted, fontSize: '16px', lineHeight: 1, padding: '0 2px' }}
              aria-label="Dismiss AI analysis"
            >
              ×
            </button>
          )}
        </div>

        {/* Body */}
        <div style={{ padding: '18px' }}>
          {/* Loading state */}
          {isLoading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: C.muted, fontSize: '13px' }}>
              <Spinner />
              Identifying combo lines from your deck…
            </div>
          )}

          {/* Error state */}
          {!isLoading && error && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <p style={{ fontSize: '13px', color: '#ef4444', margin: 0 }}>{error}</p>
              {onRetry && (
                <button
                  onClick={onRetry}
                  style={{
                    alignSelf: 'flex-start',
                    padding: '6px 14px', borderRadius: '8px',
                    border: `1px solid ${C.border}`,
                    backgroundColor: C.surface2, color: C.text,
                    fontSize: '12px', cursor: 'pointer',
                    fontFamily: 'Geist, sans-serif',
                  }}
                >
                  Retry
                </button>
              )}
            </div>
          )}

          {/* Result state */}
          {!isLoading && !error && result && (
            <>
              {/* Combo list */}
              {result.appCombos && result.appCombos.length > 0 ? (
                <>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>
                    {result.appCombos.length} combo line{result.appCombos.length !== 1 ? 's' : ''} identified
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {result.appCombos.map((combo, i) => {
                      const prob = probResults?.[i];
                      const pct  = prob != null ? `${(prob * 100).toFixed(1)}%` : null;
                      return (
                        <div key={combo.id} style={{
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          padding: '8px 12px', borderRadius: '8px',
                          backgroundColor: C.surface2, border: `1px solid ${C.border}`,
                        }}>
                          <div>
                            <span style={{ fontSize: '13px', color: C.text }}>{combo.name}</span>
                            <div style={{ fontSize: '11px', color: C.muted, marginTop: '2px' }}>
                              {combo.cards.map(c => `${c.starterCard} ×${c.startersInDeck}`).join(' + ')}
                            </div>
                          </div>
                          {pct && (
                            <span style={{
                              fontSize: '15px', fontWeight: 700,
                              color: parseFloat(pct) >= 60 ? C.green : parseFloat(pct) >= 35 ? C.amber : C.blue,
                              flexShrink: 0, marginLeft: '12px',
                            }}>
                              {pct}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                <p style={{ fontSize: '13px', color: C.muted, margin: 0 }}>
                  No combo starters were identified in this deck. Try defining combos manually.
                </p>
              )}

              {/* Sequences accordion */}
              <SequenceAccordion sequences={result.sequences} />
            </>
          )}
        </div>
      </div>
    </>
  );
}
