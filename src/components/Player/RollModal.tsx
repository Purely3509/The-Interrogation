import { RollResult } from '../../types';

interface Props {
  result: RollResult;
  onContinue: () => void;
}

export default function RollModal({ result, onContinue }: Props) {
  return (
    <div className="modal-overlay" onClick={onContinue}>
      <div className="modal roll-modal" onClick={e => e.stopPropagation()}>
        <h3>{result.choiceLabel}</h3>
        <div className="roll-details">
          <span className="roll-stat">{result.stat.toUpperCase()} check — DC {result.dc}</span>
          <div className="roll-breakdown">
            <span className="roll-die">🎲 {result.roll}</span>
            <span className="roll-plus">+</span>
            <span className="roll-mod">{result.modifier} ({result.stat})</span>
            <span className="roll-equals">=</span>
            <span className="roll-total">{result.total}</span>
          </div>
          <div className={`roll-outcome ${result.success ? 'success' : 'failure'}`}>
            {result.success ? 'SUCCESS' : 'FAILURE'}
          </div>
        </div>
        <button className="btn-primary" onClick={onContinue}>Continue</button>
      </div>
    </div>
  );
}
