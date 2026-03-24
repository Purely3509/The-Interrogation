import { useState } from 'react';
import { StoryNode, Choice, StatName } from '../../types';
import { STAT_NAMES } from '../../engine';

interface Props {
  node: StoryNode;
  allNodeIds: string[];
  onSave: (node: StoryNode) => void;
  onDelete: () => void;
  onCancel: () => void;
}

function emptyChoice(): Choice {
  return { label: '', targetId: '' };
}

export default function NodeEditor({ node, allNodeIds, onSave, onDelete, onCancel }: Props) {
  const [draft, setDraft] = useState<StoryNode>(structuredClone(node));

  function updateField<K extends keyof StoryNode>(key: K, value: StoryNode[K]) {
    setDraft(d => ({ ...d, [key]: value }));
  }

  function updateChoice(idx: number, patch: Partial<Choice>) {
    setDraft(d => {
      const choices = [...d.choices];
      choices[idx] = { ...choices[idx], ...patch };
      return { ...d, choices };
    });
  }

  function addChoice() {
    setDraft(d => ({ ...d, choices: [...d.choices, emptyChoice()] }));
  }

  function removeChoice(idx: number) {
    setDraft(d => ({ ...d, choices: d.choices.filter((_, i) => i !== idx) }));
  }

  function toggleCheck(idx: number) {
    setDraft(d => {
      const choices = [...d.choices];
      if (choices[idx].check) {
        const { check: _, ...rest } = choices[idx];
        choices[idx] = rest;
      } else {
        choices[idx] = { ...choices[idx], check: { stat: 'resolve', dc: 10 } };
      }
      return { ...d, choices };
    });
  }

  return (
    <div className="node-editor">
      <div className="editor-header">
        <h3>Edit Node</h3>
        <div className="editor-actions">
          <button className="btn-danger" onClick={onDelete}>Delete</button>
          <button className="btn-secondary" onClick={onCancel}>Cancel</button>
          <button className="btn-primary" onClick={() => onSave(draft)}>Save</button>
        </div>
      </div>

      <div className="editor-fields">
        <label>ID <input type="text" value={draft.id} disabled /></label>
        <label>Speaker
          <input type="text" value={draft.speaker} onChange={e => updateField('speaker', e.target.value)} />
        </label>
        <label>Text
          <textarea rows={4} value={draft.text} onChange={e => updateField('text', e.target.value)} />
        </label>

        <div className="flags-row">
          <label>Set Flags (comma-separated)
            <input
              type="text"
              value={(draft.setFlags ?? []).join(', ')}
              onChange={e => updateField('setFlags', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
            />
          </label>
          <label>Grant Items
            <input
              type="text"
              value={(draft.grantItems ?? []).join(', ')}
              onChange={e => updateField('grantItems', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
            />
          </label>
          <label>Remove Items
            <input
              type="text"
              value={(draft.removeItems ?? []).join(', ')}
              onChange={e => updateField('removeItems', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
            />
          </label>
        </div>

        <label className="checkbox-label">
          <input type="checkbox" checked={draft.ending ?? false} onChange={e => updateField('ending', e.target.checked)} />
          Ending node
        </label>

        <div className="choices-section">
          <h4>Choices (Relationships)</h4>
          {draft.choices.map((choice, idx) => (
            <div key={idx} className="choice-editor">
              <div className="choice-main">
                <input
                  type="text"
                  placeholder="Label (relationship name)"
                  value={choice.label}
                  onChange={e => updateChoice(idx, { label: e.target.value })}
                />
                <select
                  value={choice.targetId}
                  onChange={e => updateChoice(idx, { targetId: e.target.value })}
                >
                  <option value="">— target —</option>
                  {allNodeIds.map(id => (
                    <option key={id} value={id}>{id}</option>
                  ))}
                </select>
                <button className="btn-icon" onClick={() => removeChoice(idx)} title="Remove choice">✕</button>
              </div>

              <div className="choice-conditions">
                <input
                  type="text"
                  placeholder="Require flags (comma-sep)"
                  value={(choice.requireFlags ?? []).join(', ')}
                  onChange={e => updateChoice(idx, { requireFlags: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                />
                <input
                  type="text"
                  placeholder="Exclude flags (comma-sep)"
                  value={(choice.excludeFlags ?? []).join(', ')}
                  onChange={e => updateChoice(idx, { excludeFlags: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                />
                <input
                  type="text"
                  placeholder="Require items (comma-sep)"
                  value={(choice.requireItems ?? []).join(', ')}
                  onChange={e => updateChoice(idx, { requireItems: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                />
              </div>

              <div className="choice-check-row">
                <label className="checkbox-label">
                  <input type="checkbox" checked={!!choice.check} onChange={() => toggleCheck(idx)} />
                  Stat check
                </label>
                {choice.check && (
                  <>
                    <select
                      value={choice.check.stat}
                      onChange={e => updateChoice(idx, { check: { ...choice.check!, stat: e.target.value as StatName } })}
                    >
                      {STAT_NAMES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <label>DC
                      <input
                        type="number"
                        min={1}
                        max={30}
                        value={choice.check.dc}
                        onChange={e => updateChoice(idx, { check: { ...choice.check!, dc: Number(e.target.value) } })}
                      />
                    </label>
                    <select
                      value={choice.failTargetId ?? ''}
                      onChange={e => updateChoice(idx, { failTargetId: e.target.value || undefined })}
                    >
                      <option value="">— fail target (same) —</option>
                      {allNodeIds.map(id => (
                        <option key={id} value={id}>{id}</option>
                      ))}
                    </select>
                  </>
                )}
              </div>
            </div>
          ))}
          <button className="btn-secondary" onClick={addChoice}>+ Add Choice</button>
        </div>
      </div>
    </div>
  );
}
