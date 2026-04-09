/**
 * AdminPage — internal combo sequence authoring tool
 *
 * Access via: <app-url>#admin
 *
 * Workflow:
 *  1. Select an archetype from the dropdown.
 *  2. View existing sequences for that archetype (static DB + localStorage).
 *  3. Click "New sequence" to open the authoring form.
 *  4. Fill in steps, endboard, choke points, and weakness profile.
 *  5. Save → if a reference sequence already exists for this archetype,
 *     the delta modal fires so you can confirm the substitution delta.
 *  6. Export JS code to clipboard for permanent addition to the DB file.
 */

import React, { useState, useCallback } from 'react';
import { ARCHETYPE_DATABASE } from '../../data/archetypeDatabase';
import ComboSequenceStorageService from '../../services/ComboSequenceStorageService';
import SequenceForm, { emptySequence } from './SequenceForm';
import DeltaModal from './DeltaModal';

// ── Styles ───────────────────────────────────────────────────────────────────

const C = {
  bg: '#000',
  bgCard: '#0d0d0d',
  bgHover: '#141414',
  border: '#222',
  text: '#fff',
  textSub: '#777',
  textMuted: '#444',
  accent: '#fff',
  red: '#f87171',
};

const S = {
  page: {
    minHeight: '100vh',
    backgroundColor: C.bg,
    color: C.text,
    fontFamily: 'Geist, sans-serif',
    padding: '32px 24px',
    maxWidth: '900px',
    margin: '0 auto',
  },
  header: {
    display: 'flex', alignItems: 'baseline', gap: '16px',
    marginBottom: '32px',
  },
  title: { fontSize: '20px', fontWeight: 700 },
  badge: {
    fontSize: '11px', fontWeight: 600,
    padding: '2px 8px', borderRadius: '4px',
    backgroundColor: '#1a1a1a', color: C.textSub,
    border: '1px solid #2a2a2a',
    letterSpacing: '0.04em', textTransform: 'uppercase',
  },
  backLink: {
    marginLeft: 'auto', fontSize: '12px', color: C.textSub,
    cursor: 'pointer', textDecoration: 'none',
    background: 'none', border: 'none', fontFamily: 'inherit',
  },
  label: { display: 'block', fontSize: '12px', color: C.textSub, marginBottom: '6px' },
  select: {
    width: '100%', height: '40px', padding: '0 14px',
    borderRadius: '8px', border: '1px solid #2a2a2a',
    backgroundColor: '#111', color: C.text,
    fontFamily: 'Geist, sans-serif', fontSize: '14px',
    outline: 'none', marginBottom: '24px',
    appearance: 'auto',
  },
  seqList: { marginBottom: '24px' },
  seqItem: (isStatic) => ({
    display: 'flex', alignItems: 'center', gap: '12px',
    padding: '12px 16px', borderRadius: '8px',
    border: `1px solid ${C.border}`,
    backgroundColor: C.bgCard,
    marginBottom: '8px',
  }),
  seqName: { flex: 1, fontSize: '14px', fontWeight: 500 },
  seqMeta: { fontSize: '12px', color: C.textSub },
  seqBadge: (type) => ({
    fontSize: '10px', fontWeight: 600,
    padding: '1px 6px', borderRadius: '4px',
    backgroundColor: type === 'static' ? '#1a1a1a' : '#0d2b1a',
    color: type === 'static' ? C.textSub : '#4ade80',
    border: `1px solid ${type === 'static' ? '#2a2a2a' : '#166534'}`,
    textTransform: 'uppercase', letterSpacing: '0.04em',
  }),
  iconBtn: {
    background: 'none', border: 'none', cursor: 'pointer',
    color: C.textSub, fontFamily: 'Geist, sans-serif',
    fontSize: '12px', padding: '4px 8px',
    borderRadius: '4px',
  },
  newBtn: {
    display: 'inline-flex', alignItems: 'center', gap: '6px',
    height: '36px', padding: '0 18px', borderRadius: '8px',
    border: `1px solid #2a2a2a`, backgroundColor: 'transparent',
    color: C.textSub, fontFamily: 'Geist, sans-serif', fontSize: '13px',
    cursor: 'pointer',
  },
  exportBox: {
    marginTop: '12px', padding: '14px',
    borderRadius: '8px', border: '1px solid #2a2a2a',
    backgroundColor: '#0a0a0a',
  },
  exportCode: {
    display: 'block', whiteSpace: 'pre-wrap',
    fontSize: '11px', color: '#888', fontFamily: 'monospace',
    marginBottom: '10px', overflowX: 'auto',
    maxHeight: '200px', overflow: 'auto',
  },
  copyBtn: {
    height: '28px', padding: '0 14px', borderRadius: '6px',
    border: '1px solid #2a2a2a', backgroundColor: 'transparent',
    color: '#aaa', fontFamily: 'Geist, sans-serif', fontSize: '12px',
    cursor: 'pointer',
  },
  emptyState: {
    padding: '24px', textAlign: 'center',
    color: C.textSub, fontSize: '13px',
    border: `1px dashed ${C.border}`, borderRadius: '8px',
    marginBottom: '16px',
  },
  divider: { borderColor: '#1a1a1a', margin: '28px 0' },
  formTitle: { fontSize: '16px', fontWeight: 600, marginBottom: '20px' },
};

// ── Sequence list item ────────────────────────────────────────────────────────

function SequenceItem({ seq, isStatic, onExport, onDelete, onEdit }) {
  return (
    <div style={S.seqItem(isStatic)}>
      <span style={S.seqName}>{seq.name}</span>
      <span style={S.seqMeta}>{seq.valid_from}</span>
      {seq.substitutionDelta && (
        <span title="Has substitution delta" style={{ fontSize: '12px', color: '#4ade80' }}>Δ</span>
      )}
      <span style={S.seqBadge(isStatic ? 'static' : 'authored')}>
        {isStatic ? 'built-in' : 'authored'}
      </span>
      {!isStatic && (
        <button style={S.iconBtn} onClick={() => onEdit(seq)}>Edit</button>
      )}
      <button style={S.iconBtn} onClick={() => onExport(seq)}>Export JS</button>
      {!isStatic && (
        <button
          style={{ ...S.iconBtn, color: C.red }}
          onClick={() => {
            if (window.confirm(`Delete "${seq.name}"?`)) onDelete(seq.id);
          }}
        >
          Delete
        </button>
      )}
    </div>
  );
}

// ── AdminPage ─────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const [archetypeId, setArchetypeId] = useState('');
  const [view, setView]               = useState('list'); // 'list' | 'form'
  const [editingSeq, setEditingSeq]   = useState(null);   // null = new
  const [exportSeq, setExportSeq]     = useState(null);   // sequence to show exported JS for
  const [deltaState, setDeltaState]   = useState(null);   // { pendingSeq, referenceSeq }
  const [tick, setTick]               = useState(0);      // force re-render after save/delete

  const sequences     = archetypeId ? ComboSequenceStorageService.getByArchetype(archetypeId) : [];
  const authoredIds   = new Set(ComboSequenceStorageService.getAuthored().map(s => s.id));

  // ── Handlers ────────────────────────────────────────────────────────────

  const handleSave = useCallback((seq) => {
    // If there's already at least one sequence for this archetype (reference = first one),
    // and this is a new sequence (not an edit), prompt for delta.
    const existing = ComboSequenceStorageService.getByArchetype(archetypeId);
    const isNew = !existing.find(s => s.id === seq.id);
    const referenceSeq = existing.find(s => s.id !== seq.id);

    if (isNew && referenceSeq) {
      const auto = ComboSequenceStorageService.computeDelta(referenceSeq, seq);
      setDeltaState({ pendingSeq: seq, referenceSeq, auto });
    } else {
      ComboSequenceStorageService.save(seq);
      setView('list');
      setEditingSeq(null);
      setTick(t => t + 1);
    }
  }, [archetypeId]);

  const handleDeltaConfirm = useCallback((delta) => {
    const seq = { ...deltaState.pendingSeq, substitutionDelta: delta };
    ComboSequenceStorageService.save(seq);
    setDeltaState(null);
    setView('list');
    setEditingSeq(null);
    setTick(t => t + 1);
  }, [deltaState]);

  const handleDelete = useCallback((id) => {
    ComboSequenceStorageService.delete(id);
    setTick(t => t + 1);
  }, []);

  const handleExport = useCallback((seq) => {
    setExportSeq(exportSeq?.id === seq.id ? null : seq);
  }, [exportSeq]);

  const handleCopyJS = useCallback(() => {
    if (!exportSeq) return;
    navigator.clipboard.writeText(ComboSequenceStorageService.exportAsJS(exportSeq))
      .then(() => alert('Copied to clipboard!'))
      .catch(() => alert('Copy failed — see console for the code.'));
  }, [exportSeq]);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={S.page}>
      {/* Header */}
      <div style={S.header}>
        <span style={S.title}>Combo Sequence Authoring</span>
        <span style={S.badge}>Internal</span>
        <button
          style={S.backLink}
          onClick={() => { window.location.hash = ''; }}
        >
          ← Back to app
        </button>
      </div>

      {/* Archetype selector */}
      <label style={S.label}>Archetype</label>
      <select
        style={S.select}
        value={archetypeId}
        onChange={e => {
          setArchetypeId(e.target.value);
          setView('list');
          setEditingSeq(null);
          setExportSeq(null);
        }}
      >
        <option value="">— select an archetype —</option>
        {ARCHETYPE_DATABASE.filter(a => a.parents.length === 0 || a.parents.length === 1).map(a => (
          <option key={a.id} value={a.id}>{a.name}</option>
        ))}
        <optgroup label="Hybrid">
          {ARCHETYPE_DATABASE.filter(a => a.parents.length >= 2).map(a => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </optgroup>
      </select>

      {/* Sequence list */}
      {archetypeId && view === 'list' && (
        <>
          <div style={S.seqList}>
            {sequences.length === 0 ? (
              <div style={S.emptyState}>
                No sequences yet for this archetype.
              </div>
            ) : (
              sequences.map(seq => (
                <React.Fragment key={seq.id}>
                  <SequenceItem
                    seq={seq}
                    isStatic={!authoredIds.has(seq.id)}
                    onExport={handleExport}
                    onDelete={handleDelete}
                    onEdit={s => { setEditingSeq(s); setView('form'); }}
                  />
                  {exportSeq?.id === seq.id && (
                    <div style={S.exportBox}>
                      <code style={S.exportCode}>
                        {ComboSequenceStorageService.exportAsJS(exportSeq)}
                      </code>
                      <button style={S.copyBtn} onClick={handleCopyJS}>
                        Copy to clipboard
                      </button>
                    </div>
                  )}
                </React.Fragment>
              ))
            )}
          </div>
          <button
            style={S.newBtn}
            onClick={() => { setEditingSeq(null); setView('form'); }}
          >
            + New sequence
          </button>
        </>
      )}

      {/* Authoring form */}
      {archetypeId && view === 'form' && (
        <>
          <hr style={S.divider} />
          <div style={S.formTitle}>
            {editingSeq ? `Editing: ${editingSeq.name}` : 'New sequence'}
          </div>
          <SequenceForm
            archetypeId={archetypeId}
            initial={editingSeq}
            onSave={handleSave}
            onCancel={() => { setView('list'); setEditingSeq(null); }}
          />
        </>
      )}

      {/* Delta modal */}
      {deltaState && (
        <DeltaModal
          referenceName={deltaState.referenceSeq.name}
          initialDelta={deltaState.auto}
          onConfirm={handleDeltaConfirm}
          onCancel={() => setDeltaState(null)}
        />
      )}
    </div>
  );
}
