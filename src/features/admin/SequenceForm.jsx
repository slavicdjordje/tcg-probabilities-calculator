/**
 * SequenceForm
 *
 * Multi-section form for authoring a single combo sequence.
 * Covers: metadata, steps (with StepCards), endboard, choke points, weakness profile.
 */

import React, { useState } from 'react';
import {
  STEP_TAGS,
  INTERRUPT_CATEGORIES,
  BREAKING_CATEGORIES,
  CHECKPOINT_ZONES,
} from '../../data/comboSequenceDatabase';

// ── Style tokens ────────────────────────────────────────────────────────────

const C = {
  bg: '#000',
  bgCard: '#111',
  bgInput: '#1a1a1a',
  border: '#2a2a2a',
  borderFocus: '#555',
  text: '#fff',
  textSub: '#888',
  textMuted: '#555',
  accent: '#fff',
  red: '#f87171',
  green: '#4ade80',
};

const baseInput = {
  width: '100%',
  padding: '6px 12px',
  borderRadius: '6px',
  border: `1px solid ${C.border}`,
  backgroundColor: C.bgInput,
  color: C.text,
  fontFamily: 'Geist, sans-serif',
  fontSize: '13px',
  outline: 'none',
  boxSizing: 'border-box',
};

const S = {
  section: {
    marginBottom: '28px',
    padding: '20px',
    backgroundColor: C.bgCard,
    borderRadius: '10px',
    border: `1px solid ${C.border}`,
  },
  sectionTitle: {
    fontSize: '13px', fontWeight: 600,
    color: C.textSub,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: '16px',
  },
  label: { display: 'block', fontSize: '12px', color: C.textSub, marginBottom: '4px' },
  input: { ...baseInput, height: '34px', marginBottom: '12px' },
  textarea: { ...baseInput, minHeight: '72px', resize: 'vertical', padding: '8px 12px', marginBottom: '12px' },
  row: { display: 'flex', gap: '12px', marginBottom: '0' },
  col: { flex: 1 },
  pill: (active) => ({
    display: 'inline-block',
    padding: '3px 10px',
    borderRadius: '999px',
    fontSize: '11px',
    cursor: 'pointer',
    userSelect: 'none',
    border: `1px solid ${active ? C.accent : C.border}`,
    backgroundColor: active ? 'rgba(255,255,255,0.1)' : 'transparent',
    color: active ? C.text : C.textSub,
    transition: 'all 0.15s',
    marginRight: '5px',
    marginBottom: '5px',
  }),
  stepCard: {
    padding: '12px',
    borderRadius: '8px',
    border: `1px solid ${C.border}`,
    backgroundColor: '#0d0d0d',
    marginBottom: '10px',
  },
  stepHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '10px',
  },
  stepNum: { fontSize: '11px', fontWeight: 600, color: C.textSub, textTransform: 'uppercase', letterSpacing: '0.05em' },
  removeBtn: {
    background: 'none', border: 'none', cursor: 'pointer',
    color: C.textMuted, fontSize: '16px', lineHeight: 1, padding: '0 4px',
  },
  addBtn: {
    display: 'inline-flex', alignItems: 'center', gap: '4px',
    padding: '5px 14px', borderRadius: '6px',
    border: `1px solid ${C.border}`, backgroundColor: 'transparent',
    color: C.textSub, fontFamily: 'Geist, sans-serif', fontSize: '12px',
    cursor: 'pointer',
  },
  select: { ...baseInput, height: '34px', marginBottom: '8px' },
  tagInput: {
    display: 'flex', gap: '8px', flexWrap: 'wrap',
    padding: '6px', borderRadius: '6px',
    border: `1px solid ${C.border}`, backgroundColor: C.bgInput,
    minHeight: '34px', alignItems: 'center', marginBottom: '12px',
    cursor: 'text',
  },
  tagChip: {
    display: 'inline-flex', alignItems: 'center', gap: '4px',
    padding: '2px 8px', borderRadius: '999px',
    backgroundColor: '#1e1e1e', border: `1px solid ${C.border}`,
    color: C.text, fontSize: '12px',
  },
  tagChipRemove: {
    background: 'none', border: 'none', cursor: 'pointer',
    color: C.textMuted, fontSize: '13px', padding: 0, lineHeight: 1,
  },
  inlineInput: {
    ...baseInput,
    flex: 1, height: '30px', fontSize: '12px',
    border: 'none', backgroundColor: 'transparent',
    padding: '0',
  },
  separator: { borderColor: C.border, margin: '16px 0' },
  chokeRow: {
    padding: '10px 12px', borderRadius: '8px',
    border: `1px solid ${C.border}`, backgroundColor: '#0d0d0d',
    marginBottom: '8px',
  },
  checkpointPanel: {
    marginTop: '12px',
    padding: '10px 12px',
    borderRadius: '8px',
    border: '1px solid rgba(99,102,241,0.2)',
    backgroundColor: 'rgba(99,102,241,0.04)',
  },
  checkpointPanelTitle: {
    fontSize: '11px', fontWeight: 600, color: '#a5b4fc',
    textTransform: 'uppercase', letterSpacing: '0.05em',
    marginBottom: '10px',
  },
  checkpointToggle: {
    display: 'flex', alignItems: 'center', gap: '8px',
    cursor: 'pointer', userSelect: 'none',
    fontSize: '12px', color: '#888',
    marginTop: '10px',
  },
};

// ── Helper components ────────────────────────────────────────────────────────

function TagChips({ items, onRemove }) {
  return (
    <>
      {items.map(item => (
        <span key={item} style={S.tagChip}>
          {item}
          <button style={S.tagChipRemove} onClick={() => onRemove(item)}>×</button>
        </span>
      ))}
    </>
  );
}

function TagInputBox({ items, onChange, placeholder }) {
  const [draft, setDraft] = useState('');

  const add = (val) => {
    const t = val.trim();
    if (t && !items.includes(t)) onChange([...items, t]);
    setDraft('');
  };

  return (
    <div style={S.tagInput} onClick={e => e.currentTarget.querySelector('input')?.focus()}>
      <TagChips items={items} onRemove={name => onChange(items.filter(i => i !== name))} />
      <input
        style={S.inlineInput}
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onKeyDown={e => {
          if ((e.key === 'Enter' || e.key === ',') && draft.trim()) {
            e.preventDefault();
            add(draft);
          } else if (e.key === 'Backspace' && !draft && items.length) {
            onChange(items.slice(0, -1));
          }
        }}
        placeholder={items.length === 0 ? placeholder : ''}
      />
    </div>
  );
}

function PillGroup({ options, selected, onChange }) {
  const toggle = (val) =>
    selected.includes(val)
      ? onChange(selected.filter(v => v !== val))
      : onChange([...selected, val]);
  return (
    <div style={{ marginBottom: '12px' }}>
      {options.map(opt => (
        <span key={opt} style={S.pill(selected.includes(opt))} onClick={() => toggle(opt)}>
          {opt}
        </span>
      ))}
    </div>
  );
}

// ── StepCard editor ──────────────────────────────────────────────────────────

const ZONES = ['hand', 'deck', 'gy', 'field', 'banished', 'extra'];
const ROLES = ['activator', 'material', 'cost', 'target'];

function StepCardRow({ card, onChange, onRemove }) {
  const field = (key) => (
    <select
      style={{ ...S.select, marginBottom: 0, flex: 1 }}
      value={card[key]}
      onChange={e => onChange({ ...card, [key]: e.target.value })}
    >
      {(key === 'role' ? ROLES : ZONES).map(v => (
        <option key={v} value={v}>{v}</option>
      ))}
    </select>
  );

  return (
    <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'flex-start' }}>
      <input
        style={{ ...S.input, flex: 2, marginBottom: 0 }}
        value={card.name}
        onChange={e => onChange({ ...card, name: e.target.value })}
        placeholder="Card name"
      />
      {field('role')}
      {field('fromZone')}
      <span style={{ fontSize: '12px', color: C.textMuted, alignSelf: 'center' }}>→</span>
      {field('toZone')}
      <button style={S.removeBtn} onClick={onRemove} title="Remove card">×</button>
    </div>
  );
}

function newCard() {
  return { name: '', role: 'activator', fromZone: 'hand', toZone: 'field' };
}

// ── Checkpoint editor ────────────────────────────────────────────────────────

const CHECKPOINT_ZONE_VALUES = Object.values(CHECKPOINT_ZONES);

function emptyCheckpoint() {
  return {
    gateCondition: null,
    consumedResource: null,
    intermediateState: null,
    causesCheckpointAt: null,
  };
}

function CheckpointEditor({ checkpoint, onChange, totalSteps }) {
  const has = !!checkpoint;
  const cp = checkpoint ?? emptyCheckpoint();

  const toggleCheckpoint = () => onChange(has ? null : emptyCheckpoint());

  const updateGate = (patch) =>
    onChange({ ...cp, gateCondition: { ...(cp.gateCondition ?? { zone: 'gy', cards: [], description: '' }), ...patch } });
  const clearGate = () => onChange({ ...cp, gateCondition: null });
  const enableGate = () => onChange({ ...cp, gateCondition: { zone: 'gy', cards: [], description: '' } });

  const updateResource = (patch) =>
    onChange({ ...cp, consumedResource: { ...(cp.consumedResource ?? { card: '', toZone: 'gy', downstreamDependency: '' }), ...patch } });
  const clearResource = () => onChange({ ...cp, consumedResource: null });
  const enableResource = () => onChange({ ...cp, consumedResource: { card: '', toZone: 'gy', downstreamDependency: '' } });

  const updateState = (zone, val) => {
    const cur = cp.intermediateState ?? { field: [], gy: [], hand: [] };
    onChange({ ...cp, intermediateState: { ...cur, [zone]: val } });
  };
  const clearState = () => onChange({ ...cp, intermediateState: null });
  const enableState = () => onChange({ ...cp, intermediateState: { field: [], gy: [], hand: [] } });

  return (
    <>
      <div style={S.checkpointToggle} onClick={toggleCheckpoint}>
        <input type="checkbox" readOnly checked={has} style={{ cursor: 'pointer' }} />
        <span>This step is a checkpoint</span>
      </div>

      {has && (
        <div style={S.checkpointPanel}>
          <div style={S.checkpointPanelTitle}>Checkpoint</div>

          {/* Gate condition */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <input type="checkbox" readOnly checked={!!cp.gateCondition}
              style={{ cursor: 'pointer' }}
              onClick={e => { e.stopPropagation(); cp.gateCondition ? clearGate() : enableGate(); }}
            />
            <label style={{ ...S.label, marginBottom: 0, cursor: 'pointer' }}
              onClick={() => cp.gateCondition ? clearGate() : enableGate()}>
              Gate condition
            </label>
          </div>
          {cp.gateCondition && (
            <div style={{ paddingLeft: '20px', marginBottom: '10px' }}>
              <label style={S.label}>Required zone</label>
              <select style={{ ...S.select }}
                value={cp.gateCondition.zone}
                onChange={e => updateGate({ zone: e.target.value })}>
                {CHECKPOINT_ZONE_VALUES.map(z => <option key={z} value={z}>{z}</option>)}
              </select>
              <label style={S.label}>Required cards (comma-separated)</label>
              <input style={S.input}
                value={cp.gateCondition.cards.join(', ')}
                onChange={e => updateGate({ cards: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                placeholder="Fiendsmith's Requiem"
              />
              <label style={S.label}>Gate description</label>
              <textarea style={{ ...S.textarea, marginBottom: 0 }}
                value={cp.gateCondition.description}
                onChange={e => updateGate({ description: e.target.value })}
                placeholder="Requiem must be on field before Lacrima can be Special Summoned."
                rows={2}
              />
            </div>
          )}

          {/* Consumed resource */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <input type="checkbox" readOnly checked={!!cp.consumedResource}
              style={{ cursor: 'pointer' }}
              onClick={e => { e.stopPropagation(); cp.consumedResource ? clearResource() : enableResource(); }}
            />
            <label style={{ ...S.label, marginBottom: 0, cursor: 'pointer' }}
              onClick={() => cp.consumedResource ? clearResource() : enableResource()}>
              Consumed resource
            </label>
          </div>
          {cp.consumedResource && (
            <div style={{ paddingLeft: '20px', marginBottom: '10px' }}>
              <label style={S.label}>Card consumed</label>
              <input style={S.input}
                value={cp.consumedResource.card}
                onChange={e => updateResource({ card: e.target.value })}
                placeholder="Fiendsmith Engraver"
              />
              <label style={S.label}>Goes to zone</label>
              <select style={{ ...S.select }}
                value={cp.consumedResource.toZone}
                onChange={e => updateResource({ toZone: e.target.value })}>
                {CHECKPOINT_ZONE_VALUES.map(z => <option key={z} value={z}>{z}</option>)}
              </select>
              <label style={S.label}>Downstream dependency</label>
              <textarea style={{ ...S.textarea, marginBottom: 0 }}
                value={cp.consumedResource.downstreamDependency}
                onChange={e => updateResource({ downstreamDependency: e.target.value })}
                placeholder="Engraver in GY is required at step 6 to SS itself."
                rows={2}
              />
            </div>
          )}

          {/* Intermediate state */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <input type="checkbox" readOnly checked={!!cp.intermediateState}
              style={{ cursor: 'pointer' }}
              onClick={e => { e.stopPropagation(); cp.intermediateState ? clearState() : enableState(); }}
            />
            <label style={{ ...S.label, marginBottom: 0, cursor: 'pointer' }}
              onClick={() => cp.intermediateState ? clearState() : enableState()}>
              Board state snapshot (after this step)
            </label>
          </div>
          {cp.intermediateState && (
            <div style={{ paddingLeft: '20px', marginBottom: '10px' }}>
              {['field', 'gy', 'hand'].map(zone => (
                <div key={zone}>
                  <label style={S.label}>{zone.toUpperCase()} (comma-separated)</label>
                  <input style={S.input}
                    value={cp.intermediateState[zone].join(', ')}
                    onChange={e => updateState(zone, e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                    placeholder={`Cards on ${zone}`}
                  />
                </div>
              ))}
            </div>
          )}

          {/* causesCheckpointAt */}
          <label style={{ ...S.label, marginTop: '4px' }}>Feeds gate condition at step (optional)</label>
          <select
            style={{ ...S.select, marginBottom: 0 }}
            value={cp.causesCheckpointAt ?? ''}
            onChange={e => onChange({ ...cp, causesCheckpointAt: e.target.value === '' ? null : Number(e.target.value) })}
          >
            <option value="">— none —</option>
            {Array.from({ length: totalSteps }, (_, i) => (
              <option key={i} value={i}>Step {i + 1}</option>
            ))}
          </select>
        </div>
      )}
    </>
  );
}

// ── Step editor ──────────────────────────────────────────────────────────────

const STEP_TAG_VALUES = Object.values(STEP_TAGS);

function StepEditor({ step, index, onChange, onRemove, onMoveUp, onMoveDown, isFirst, isLast, totalSteps }) {
  const update = (key, val) => onChange({ ...step, [key]: val });

  return (
    <div style={S.stepCard}>
      <div style={S.stepHeader}>
        <span style={S.stepNum}>Step {index + 1}</span>
        <div style={{ display: 'flex', gap: '6px' }}>
          {!isFirst && (
            <button style={{ ...S.removeBtn, fontSize: '13px' }} onClick={onMoveUp} title="Move up">↑</button>
          )}
          {!isLast && (
            <button style={{ ...S.removeBtn, fontSize: '13px' }} onClick={onMoveDown} title="Move down">↓</button>
          )}
          <button style={S.removeBtn} onClick={onRemove} title="Remove step">×</button>
        </div>
      </div>

      <label style={S.label}>Description</label>
      <textarea
        style={S.textarea}
        value={step.description}
        onChange={e => update('description', e.target.value)}
        placeholder="Plain-English action, e.g. Normal Summon Fiendsmith Engraver."
        rows={2}
      />

      <label style={S.label}>Functional tags</label>
      <PillGroup
        options={STEP_TAG_VALUES}
        selected={step.tags}
        onChange={val => update('tags', val)}
      />

      <label style={{ ...S.label, marginBottom: '6px' }}>
        Cards — name / role / from → to
      </label>
      {step.cards.map((card, ci) => (
        <StepCardRow
          key={ci}
          card={card}
          onChange={updated => {
            const cards = [...step.cards];
            cards[ci] = updated;
            update('cards', cards);
          }}
          onRemove={() => update('cards', step.cards.filter((_, i) => i !== ci))}
        />
      ))}
      <button style={S.addBtn} onClick={() => update('cards', [...step.cards, newCard()])}>
        + card
      </button>

      <CheckpointEditor
        checkpoint={step.checkpoint ?? null}
        onChange={val => update('checkpoint', val)}
        totalSteps={totalSteps}
      />
    </div>
  );
}

function newStep(index) {
  return { index, description: '', tags: [], cards: [newCard()], checkpoint: null };
}

// ── Choke point editor ───────────────────────────────────────────────────────

const INTERRUPT_VALUES = Object.values(INTERRUPT_CATEGORIES);

function ChokePointRow({ cp, stepCount, onChange, onRemove }) {
  return (
    <div style={S.chokeRow}>
      <div style={{ display: 'flex', gap: '10px', marginBottom: '8px', alignItems: 'center' }}>
        <div style={{ flex: 1 }}>
          <label style={S.label}>After step</label>
          <select
            style={{ ...S.select, marginBottom: 0 }}
            value={cp.afterStepIndex}
            onChange={e => onChange({ ...cp, afterStepIndex: Number(e.target.value) })}
          >
            {Array.from({ length: stepCount }, (_, i) => (
              <option key={i} value={i}>Step {i + 1}</option>
            ))}
          </select>
        </div>
        <button style={{ ...S.removeBtn, alignSelf: 'flex-end', marginBottom: '4px' }} onClick={onRemove}>×</button>
      </div>
      <label style={S.label}>Interrupt categories</label>
      <PillGroup
        options={INTERRUPT_VALUES}
        selected={cp.interruptCategories}
        onChange={val => onChange({ ...cp, interruptCategories: val })}
      />
      <label style={S.label}>Description</label>
      <textarea
        style={{ ...S.textarea, marginBottom: 0 }}
        value={cp.description}
        onChange={e => onChange({ ...cp, description: e.target.value })}
        placeholder="Plain-English context, e.g. Ash Blossom can negate Engraver here."
        rows={2}
      />
    </div>
  );
}

function newChokePoint(stepCount) {
  return { afterStepIndex: Math.max(0, stepCount - 1), interruptCategories: [], description: '' };
}

// ── Weakness editor ──────────────────────────────────────────────────────────

const BREAKING_VALUES = Object.values(BREAKING_CATEGORIES);

function WeaknessEditor({ weaknesses, onChange }) {
  return (
    <>
      <label style={S.label}>Breaking categories</label>
      <PillGroup
        options={BREAKING_VALUES}
        selected={weaknesses.breakingCategories}
        onChange={val => onChange({ ...weaknesses, breakingCategories: val })}
      />
      <label style={S.label}>Named counter cards (press Enter to add)</label>
      <TagInputBox
        items={weaknesses.namedCounters}
        onChange={val => onChange({ ...weaknesses, namedCounters: val })}
        placeholder="e.g. Ash Blossom & Joyous Spring"
      />
      <label style={S.label}>Notes</label>
      <textarea
        style={{ ...S.textarea, marginBottom: 0 }}
        value={weaknesses.notes}
        onChange={e => onChange({ ...weaknesses, notes: e.target.value })}
        placeholder="Optional context about why this combo is weak to the above."
        rows={2}
      />
    </>
  );
}

// ── Endboard editor ──────────────────────────────────────────────────────────

function EndboardEditor({ endboard, onChange }) {
  return (
    <>
      {[['field', 'Field'], ['gy', 'Graveyard'], ['hand', 'Hand remaining']].map(([key, label]) => (
        <div key={key}>
          <label style={S.label}>{label} (press Enter to add)</label>
          <TagInputBox
            items={endboard[key]}
            onChange={val => onChange({ ...endboard, [key]: val })}
            placeholder={`Card name on ${label.toLowerCase()}…`}
          />
        </div>
      ))}
      <label style={S.label}>Notes</label>
      <textarea
        style={{ ...S.textarea, marginBottom: 0 }}
        value={endboard.notes}
        onChange={e => onChange({ ...endboard, notes: e.target.value })}
        placeholder="Optional summary of the resulting board state."
        rows={2}
      />
    </>
  );
}

// ── SequenceForm (main export) ───────────────────────────────────────────────

function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function emptySequence(archetypeId) {
  return {
    id: '',
    archetypeId,
    name: '',
    valid_from: new Date().toISOString().slice(0, 10),
    steps: [newStep(0)],
    endboard: { field: [], gy: [], hand: [], notes: '' },
    chokePoints: [],
    weaknesses: { breakingCategories: [], namedCounters: [], notes: '' },
  };
}

export { emptySequence };

export default function SequenceForm({ archetypeId, initial, onSave, onCancel }) {
  const [seq, setSeq] = useState(initial ?? emptySequence(archetypeId));

  const update = (key, val) => setSeq(prev => ({ ...prev, [key]: val }));

  // Auto-derive id from name when id is empty/was auto-derived
  const handleNameChange = (name) => {
    setSeq(prev => ({
      ...prev,
      name,
      id: prev.id === '' || prev.id === slugify(prev.name)
        ? slugify(name)
        : prev.id,
    }));
  };

  // Steps helpers
  const updateStep = (i, updated) =>
    update('steps', seq.steps.map((s, idx) => idx === i ? { ...updated, index: idx } : s));

  const removeStep = (i) => {
    const steps = seq.steps.filter((_, idx) => idx !== i).map((s, idx) => ({ ...s, index: idx }));
    update('steps', steps);
  };

  const moveStep = (from, to) => {
    const steps = [...seq.steps];
    [steps[from], steps[to]] = [steps[to], steps[from]];
    update('steps', steps.map((s, idx) => ({ ...s, index: idx })));
  };

  // Choke points helpers
  const updateCp = (i, updated) =>
    update('chokePoints', seq.chokePoints.map((cp, idx) => idx === i ? updated : cp));

  const removeCp = (i) =>
    update('chokePoints', seq.chokePoints.filter((_, idx) => idx !== i));

  const handleSave = () => {
    if (!seq.name.trim()) return alert('Name is required.');
    if (!seq.id.trim())   return alert('ID is required.');
    onSave(seq);
  };

  return (
    <div style={{ fontFamily: 'Geist, sans-serif', color: C.text }}>

      {/* Metadata */}
      <div style={S.section}>
        <div style={S.sectionTitle}>Metadata</div>
        <div style={S.row}>
          <div style={S.col}>
            <label style={S.label}>Name *</label>
            <input
              style={S.input}
              value={seq.name}
              onChange={e => handleNameChange(e.target.value)}
              placeholder="e.g. Fiendsmith Engraver (1-card)"
            />
          </div>
          <div style={{ width: '160px' }}>
            <label style={S.label}>Valid from (YYYY-MM-DD) *</label>
            <input
              style={S.input}
              value={seq.valid_from}
              onChange={e => update('valid_from', e.target.value)}
              placeholder="2024-10-01"
            />
          </div>
        </div>
        <label style={S.label}>ID (auto-derived; edit if needed)</label>
        <input
          style={S.input}
          value={seq.id}
          onChange={e => update('id', e.target.value)}
          placeholder="fiendsmith-engraver-1c"
        />
      </div>

      {/* Steps */}
      <div style={S.section}>
        <div style={S.sectionTitle}>Steps</div>
        {seq.steps.map((step, i) => (
          <StepEditor
            key={i}
            step={step}
            index={i}
            isFirst={i === 0}
            isLast={i === seq.steps.length - 1}
            totalSteps={seq.steps.length}
            onChange={updated => updateStep(i, updated)}
            onRemove={() => removeStep(i)}
            onMoveUp={() => moveStep(i, i - 1)}
            onMoveDown={() => moveStep(i, i + 1)}
          />
        ))}
        <button
          style={S.addBtn}
          onClick={() => update('steps', [...seq.steps, newStep(seq.steps.length)])}
        >
          + Add step
        </button>
      </div>

      {/* Endboard */}
      <div style={S.section}>
        <div style={S.sectionTitle}>Endboard</div>
        <EndboardEditor endboard={seq.endboard} onChange={val => update('endboard', val)} />
      </div>

      {/* Choke points */}
      <div style={S.section}>
        <div style={S.sectionTitle}>Choke points</div>
        {seq.chokePoints.map((cp, i) => (
          <ChokePointRow
            key={i}
            cp={cp}
            stepCount={seq.steps.length}
            onChange={updated => updateCp(i, updated)}
            onRemove={() => removeCp(i)}
          />
        ))}
        <button
          style={S.addBtn}
          onClick={() => update('chokePoints', [...seq.chokePoints, newChokePoint(seq.steps.length)])}
        >
          + Add choke point
        </button>
      </div>

      {/* Weakness profile */}
      <div style={S.section}>
        <div style={S.sectionTitle}>Weakness profile</div>
        <WeaknessEditor
          weaknesses={seq.weaknesses}
          onChange={val => update('weaknesses', val)}
        />
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingBottom: '40px' }}>
        <button
          style={{
            height: '36px', padding: '0 20px', borderRadius: '8px',
            border: `1px solid ${C.border}`, backgroundColor: 'transparent',
            color: C.textSub, fontFamily: 'Geist, sans-serif', fontSize: '13px', cursor: 'pointer',
          }}
          onClick={onCancel}
        >
          Cancel
        </button>
        <button
          style={{
            height: '36px', padding: '0 20px', borderRadius: '8px',
            border: 'none', backgroundColor: '#fff',
            color: '#000', fontFamily: 'Geist, sans-serif', fontSize: '13px',
            fontWeight: 600, cursor: 'pointer',
          }}
          onClick={handleSave}
        >
          Save sequence
        </button>
      </div>
    </div>
  );
}
