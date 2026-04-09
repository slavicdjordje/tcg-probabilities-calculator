/**
 * DeltaModal
 *
 * Shown when saving a variant sequence (second+ sequence for an archetype).
 * Displays the computed substitution delta and lets the author edit it before
 * confirming.  The confirmed delta is stored on the sequence and feeds the deck
 * diff engine.
 */

import React, { useState } from 'react';

const S = {
  overlay: {
    position: 'fixed', inset: 0,
    backgroundColor: 'rgba(0,0,0,0.75)',
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
  title: { fontSize: '15px', fontWeight: 600, marginBottom: '8px' },
  subtitle: { fontSize: '13px', color: '#888', marginBottom: '20px' },
  section: { marginBottom: '20px' },
  sectionLabel: { fontSize: '12px', fontWeight: 600, color: '#aaa', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' },
  tagRow: { display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' },
  tag: (color) => ({
    display: 'inline-flex', alignItems: 'center', gap: '4px',
    padding: '2px 10px',
    borderRadius: '999px',
    fontSize: '12px',
    backgroundColor: color === 'red' ? '#3b0d0d' : '#0d2b1a',
    color: color === 'red' ? '#f87171' : '#4ade80',
    border: `1px solid ${color === 'red' ? '#7f1d1d' : '#166534'}`,
  }),
  removeBtn: {
    background: 'none', border: 'none', cursor: 'pointer', padding: '0',
    color: '#666', fontSize: '12px', lineHeight: 1,
  },
  inputRow: { display: 'flex', gap: '8px' },
  input: {
    flex: 1, height: '32px', padding: '0 12px',
    borderRadius: '6px', border: '1px solid #333',
    backgroundColor: '#1a1a1a', color: '#fff',
    fontFamily: 'Geist, sans-serif', fontSize: '13px', outline: 'none',
  },
  addBtn: {
    height: '32px', padding: '0 14px',
    borderRadius: '6px', border: '1px solid #333',
    backgroundColor: '#1a1a1a', color: '#aaa',
    fontFamily: 'Geist, sans-serif', fontSize: '13px',
    cursor: 'pointer', whiteSpace: 'nowrap',
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
};

function TagList({ items, color, onRemove }) {
  return (
    <div style={S.tagRow}>
      {items.length === 0 && <span style={{ fontSize: '12px', color: '#555' }}>none</span>}
      {items.map(item => (
        <span key={item} style={S.tag(color)}>
          {item}
          <button style={S.removeBtn} onClick={() => onRemove(item)}>×</button>
        </span>
      ))}
    </div>
  );
}

function AddCardInput({ placeholder, onAdd }) {
  const [value, setValue] = useState('');
  const submit = () => {
    const trimmed = value.trim();
    if (trimmed) { onAdd(trimmed); setValue(''); }
  };
  return (
    <div style={S.inputRow}>
      <input
        style={S.input}
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && submit()}
        placeholder={placeholder}
      />
      <button style={S.addBtn} onClick={submit}>Add</button>
    </div>
  );
}

export default function DeltaModal({ referenceName, initialDelta, onConfirm, onCancel }) {
  const [removed, setRemoved] = useState(initialDelta.removed);
  const [added, setAdded]     = useState(initialDelta.added);

  return (
    <div style={S.overlay} onClick={e => e.target === e.currentTarget && onCancel()}>
      <div style={S.modal}>
        <div style={S.title}>Variant substitution delta</div>
        <div style={S.subtitle}>
          Cards that differ between <strong style={{ color: '#fff' }}>{referenceName}</strong> (reference) and the new variant.
          Edit the lists to reflect the actual substitution — this feeds the deck diff engine.
        </div>

        <div style={S.section}>
          <div style={S.sectionLabel}>Removed from reference</div>
          <TagList
            items={removed} color="red"
            onRemove={name => setRemoved(prev => prev.filter(c => c !== name))}
          />
          <AddCardInput
            placeholder="Card name removed in this variant…"
            onAdd={name => setRemoved(prev => prev.includes(name) ? prev : [...prev, name])}
          />
        </div>

        <div style={S.section}>
          <div style={S.sectionLabel}>Added in this variant</div>
          <TagList
            items={added} color="green"
            onRemove={name => setAdded(prev => prev.filter(c => c !== name))}
          />
          <AddCardInput
            placeholder="Card name added in this variant…"
            onAdd={name => setAdded(prev => prev.includes(name) ? prev : [...prev, name])}
          />
        </div>

        <div style={S.footer}>
          <button style={S.btnSecondary} onClick={onCancel}>Cancel</button>
          <button style={S.btnPrimary} onClick={() => onConfirm({ removed, added })}>
            Confirm &amp; Save
          </button>
        </div>
      </div>
    </div>
  );
}
