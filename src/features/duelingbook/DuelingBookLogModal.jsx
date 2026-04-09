/**
 * DuelingBookLogModal
 *
 * Prompts the user to paste a DuelingBook game log, validates the format, and
 * on success parses it into structured actions that are stored via
 * DuelingBookLogStorageService.
 *
 * Props:
 *   onClose()                      – close / dismiss the modal
 *   onSubmit(record)               – called with the saved storage record on success
 */

import React, { useState, useRef, useEffect } from 'react';
import DuelingBookLogService from '../../services/DuelingBookLogService';
import DuelingBookLogStorageService from '../../services/DuelingBookLogStorageService';

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
    maxWidth: '560px',
    color: '#fff',
    fontFamily: 'Geist, sans-serif',
  },
  title: {
    fontSize: '15px', fontWeight: 600, marginBottom: '6px',
  },
  subtitle: {
    fontSize: '13px', color: '#888', marginBottom: '20px', lineHeight: '1.5',
  },
  label: {
    fontSize: '12px', fontWeight: 600, color: '#aaa',
    textTransform: 'uppercase', letterSpacing: '0.04em',
    marginBottom: '8px', display: 'block',
  },
  textarea: {
    width: '100%',
    minHeight: '200px',
    padding: '10px 12px',
    borderRadius: '8px',
    border: '1px solid #333',
    backgroundColor: '#1a1a1a',
    color: '#fff',
    fontFamily: 'Geist Mono, "Geist", monospace',
    fontSize: '12px',
    lineHeight: '1.6',
    resize: 'vertical',
    outline: 'none',
    boxSizing: 'border-box',
  },
  textareaWarning: {
    border: '1px solid #7f3434',
  },
  warning: {
    marginTop: '10px',
    padding: '10px 14px',
    borderRadius: '8px',
    backgroundColor: '#2a1010',
    border: '1px solid #7f3434',
    color: '#f87171',
    fontSize: '13px',
    lineHeight: '1.5',
    display: 'flex',
    alignItems: 'flex-start',
    gap: '8px',
  },
  warningIcon: {
    flexShrink: 0,
    marginTop: '1px',
  },
  success: {
    marginTop: '10px',
    padding: '10px 14px',
    borderRadius: '8px',
    backgroundColor: '#0d2b1a',
    border: '1px solid #166534',
    color: '#4ade80',
    fontSize: '13px',
    lineHeight: '1.5',
  },
  footer: {
    display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px',
  },
  btnSecondary: {
    height: '36px', padding: '0 18px', borderRadius: '8px',
    border: '1px solid #333', backgroundColor: 'transparent',
    color: '#aaa', fontFamily: 'Geist, sans-serif', fontSize: '13px',
    cursor: 'pointer',
  },
  btnPrimary: {
    height: '36px', padding: '0 18px', borderRadius: '8px',
    border: 'none', backgroundColor: '#fff',
    color: '#000', fontFamily: 'Geist, sans-serif', fontSize: '13px',
    fontWeight: 600, cursor: 'pointer',
  },
  btnPrimaryDisabled: {
    opacity: 0.45,
    cursor: 'not-allowed',
  },
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function DuelingBookLogModal({ onClose, onSubmit }) {
  const [rawText, setRawText]       = useState('');
  const [warning, setWarning]       = useState(null);  // string | null
  const [submitted, setSubmitted]   = useState(false); // success state
  const [savedRecord, setSavedRecord] = useState(null);
  const textareaRef = useRef(null);

  // Focus the textarea when the modal opens.
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const hasText = rawText.trim().length > 0;

  const handleSubmit = () => {
    setWarning(null);

    const { valid, reason } = DuelingBookLogService.validate(rawText);
    if (!valid) {
      setWarning(reason ?? 'Unrecognised log format. Check the paste and try again.');
      return;
    }

    const actions = DuelingBookLogService.parse(rawText);
    const record  = DuelingBookLogStorageService.save({ rawText, actions });

    setSavedRecord(record);
    setSubmitted(true);
    onSubmit?.(record);
  };

  const handleChange = (e) => {
    setRawText(e.target.value);
    // Clear warning as soon as the user starts editing again.
    if (warning) setWarning(null);
    if (submitted) setSubmitted(false);
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  if (submitted && savedRecord) {
    const actionCount = savedRecord.actions.filter(
      a => a.actionType !== 'turn-marker' && a.actionType !== 'phase-change' && a.actionType !== 'other'
    ).length;

    return (
      <div style={S.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
        <div style={S.modal}>
          <div style={S.title}>Log imported</div>
          <div style={S.subtitle}>
            The game log was parsed and saved successfully.
          </div>

          <div style={S.success}>
            Parsed <strong>{actionCount} game action{actionCount !== 1 ? 's' : ''}</strong> across{' '}
            <strong>{savedRecord.actions.filter(a => a.actionType === 'turn-marker').length} turn{savedRecord.actions.filter(a => a.actionType === 'turn-marker').length !== 1 ? 's' : ''}</strong>.
          </div>

          <div style={S.footer}>
            <button style={S.btnPrimary} onClick={onClose}>Done</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={S.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={S.modal}>
        <div style={S.title}>Import DuelingBook log</div>
        <div style={S.subtitle}>
          Paste a DuelingBook game log below. The log will be validated and parsed
          into structured game actions.
        </div>

        <label style={S.label} htmlFor="db-log-textarea">Game log</label>
        <textarea
          id="db-log-textarea"
          ref={textareaRef}
          style={{ ...S.textarea, ...(warning ? S.textareaWarning : {}) }}
          value={rawText}
          onChange={handleChange}
          placeholder={"Paste your DuelingBook game log here…\n\nExample:\nTurn 1\n[Main Phase 1]\nSlavi Normal Summoned Ash Blossom & Joyous Spring.\nSlavi activated Pot of Desires."}
          spellCheck={false}
        />

        {warning && (
          <div style={S.warning}>
            <span style={S.warningIcon}>⚠</span>
            <span>{warning}</span>
          </div>
        )}

        <div style={S.footer}>
          <button style={S.btnSecondary} onClick={onClose}>Cancel</button>
          <button
            style={{ ...S.btnPrimary, ...(!hasText ? S.btnPrimaryDisabled : {}) }}
            disabled={!hasText}
            onClick={handleSubmit}
          >
            Parse log
          </button>
        </div>
      </div>
    </div>
  );
}
