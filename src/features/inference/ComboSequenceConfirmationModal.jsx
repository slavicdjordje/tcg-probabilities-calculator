/**
 * ComboSequenceConfirmationModal (FDGG-55)
 *
 * Lightweight confirmation prompt shown when the system recognises a combo
 * sequence in the database for the uploaded deck.  Replaces the dense
 * AI-computed piece-groups modal (FDGG-21).
 *
 * Props
 * -----
 *   onShow   {function}  Called when the user clicks [Show sequence].
 *   onCancel {function}  Called when the user clicks [No].
 */

import React from 'react';

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
    maxWidth: '520px',
    color: '#fff',
    fontFamily: 'Geist, sans-serif',
  },
  title:    { fontSize: '15px', fontWeight: 600, marginBottom: '8px' },
  desc:     { fontSize: '13px', color: '#888', lineHeight: '1.6', marginBottom: '24px' },
  footer:   { display: 'flex', justifyContent: 'flex-end', gap: '10px' },
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

export default function ComboSequenceConfirmationModal({ onShow, onCancel }) {
  return (
    <div style={S.overlay} onClick={e => e.target === e.currentTarget && onCancel()}>
      <div style={S.modal}>
        <div style={S.title}>Combo lines recognized</div>
        <div style={S.desc}>
          We have a combo sequence for your deck in our database.
          Would you like to display it?
        </div>
        <div style={S.footer}>
          <button style={S.btnSecondary} onClick={onCancel}>No</button>
          <button style={S.btnPrimary} onClick={onShow}>Show sequence</button>
        </div>
      </div>
    </div>
  );
}
