import { useState } from 'react';
import { StoryNode, Choice, StatConfig } from '../../types';
import { isValidNodeId } from '../../engine';

interface Props {
  node: StoryNode;
  allNodeIds: string[];
  statConfig: StatConfig;
  onSave: (node: StoryNode) => void;
  onRename: (oldId: string, updatedNode: StoryNode) => void;
  onDelete: () => void;
  onCancel: () => void;
}

function emptyChoice(): Choice {
  return { label: '', targetId: '' };
}

export default function NodeEditor({ node, allNodeIds, statConfig, onSave, onRename, onDelete, onCancel }: Props) {
  const [draft, setDraft] = useState<StoryNode>(structuredClone(node));
  const [draftId, setDraftId] = useState(node.id);
  const idError = isValidNodeId(draftId, allNodeIds, node.id);
  const idChanged = draftId !== node.id;

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
        const defaultStat = statConfig.stats[0]?.key ?? 'resolve';
        choices[idx] = { ...choices[idx], check: { stat: defaultStat, dc: 8 } };
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
          <button
            className="btn-primary"
            disabled={!!idError}
            onClick={() => {
              const updatedDraft = { ...draft, id: draftId };
              if (idChanged) {
                onRename(node.id, updatedDraft);
              } else {
                onSave(updatedDraft);
              }
            }}
          >Save</button>
        </div>
      </div>

      <div className="editor-fields">
        <label>
          ID
          <input
            type="text"
            value={draftId}
            onChange={e => setDraftId(e.target.value)}
            className={idError ? 'input-error' : ''}
          />
          {idError && <span className="field-error">{idError}</span>}
        </label>
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

        <div className="checkbox-row">
          <label className="checkbox-label">
            <input type="checkbox" checked={draft.ending ?? false} onChange={e => updateField('ending', e.target.checked)} />
            Ending node
          </label>
          <label className="checkbox-label">
            <input type="checkbox" checked={draft.statConfirmation ?? false} onChange={e => updateField('statConfirmation', e.target.checked)} />
            Stat confirmation
          </label>
        </div>

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
                      onChange={e => updateChoice(idx, { check: { ...choice.check!, stat: e.target.value } })}
                    >
                      {statConfig.stats.map(def => <option key={def.key} value={def.key}>{def.name}</option>)}
                    </select>
                    <label>DC
                      <input
                        type="number"
                        min={2}
                        max={16}
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

              {/* Stat bonuses */}
              <div className="choice-bonuses-row">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={!!choice.statBonuses && Object.keys(choice.statBonuses).length > 0}
                    onChange={() => {
                      if (choice.statBonuses && Object.keys(choice.statBonuses).length > 0) {
                        updateChoice(idx, { statBonuses: undefined });
                      } else {
                        const bonuses: Record<string, number> = {};
                        statConfig.stats.forEach(def => { bonuses[def.key] = 0; });
                        updateChoice(idx, { statBonuses: bonuses });
                      }
                    }}
                  />
                  Stat bonuses
                </label>
                {choice.statBonuses && Object.keys(choice.statBonuses).length > 0 && (
                  <div className="stat-bonus-inputs">
                    {statConfig.stats.map(def => (
                      <label key={def.key} className="stat-bonus-label">
                        {def.name}
                        <input
                          type="number"
                          min={-6}
                          max={6}
                          value={choice.statBonuses?.[def.key] ?? 0}
                          onChange={e => updateChoice(idx, {
                            statBonuses: { ...choice.statBonuses, [def.key]: Number(e.target.value) },
                          })}
                        />
                      </label>
                    ))}
                  </div>
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
