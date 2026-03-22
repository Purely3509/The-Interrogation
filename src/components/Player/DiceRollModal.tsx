import { useState, useEffect } from 'react';
import { Character, StoryOption } from '../../types';
import { motion } from 'motion/react';

export function DiceRollModal({ option, character, onComplete }: { option: StoryOption, character: Character, onComplete: (nodeId: string) => void }) {
  const [rolling, setRolling] = useState(true);
  const [d1, setD1] = useState(1);
  const [d2, setD2] = useState(1);
  const [result, setResult] = useState<{ total: number, isCritSuccess: boolean, isSuccess: boolean } | null>(null);

  const check = option.rollCheck!;
  const abilityScore = character.abilities[check.ability] || 0;

  useEffect(() => {
    let interval: any;
    if (rolling) {
      interval = setInterval(() => {
        setD1(Math.floor(Math.random() * 6) + 1);
        setD2(Math.floor(Math.random() * 6) + 1);
      }, 50);

      setTimeout(() => {
        clearInterval(interval);
        setRolling(false);
        const finalD1 = Math.floor(Math.random() * 6) + 1;
        const finalD2 = Math.floor(Math.random() * 6) + 1;
        setD1(finalD1);
        setD2(finalD2);
        
        const diceTotal = finalD1 + finalD2;
        const total = diceTotal + abilityScore;
        const critThreshold = check.criticalSuccessThreshold || 12;
        
        const isCritSuccess = total >= critThreshold;
        const isSuccess = total >= check.difficulty;

        setResult({ total, isCritSuccess, isSuccess });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [abilityScore, check.criticalSuccessThreshold, check.difficulty, rolling]);

  const handleContinue = () => {
    if (!result) return;
    if (result.isCritSuccess && check.criticalSuccessNodeId) {
      onComplete(check.criticalSuccessNodeId);
    } else if (result.isSuccess) {
      onComplete(check.successNodeId);
    } else {
      onComplete(check.failureNodeId);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-zinc-900 border border-zinc-800 p-8 rounded-2xl max-w-md w-full text-center"
      >
        <h3 className="text-2xl font-bold mb-2">Rolling {check.ability}</h3>
        <p className="text-zinc-400 mb-8">Difficulty Rating: {check.difficulty}</p>

        <div className="flex justify-center gap-6 mb-8">
          <div className="w-20 h-20 bg-zinc-800 rounded-xl flex items-center justify-center text-4xl font-bold border border-zinc-700 shadow-inner">
            {d1}
          </div>
          <div className="w-20 h-20 bg-zinc-800 rounded-xl flex items-center justify-center text-4xl font-bold border border-zinc-700 shadow-inner">
            {d2}
          </div>
        </div>

        {!rolling && result && (
          <motion.div 
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
          >
            <div className="text-xl mb-2">
              Dice: {d1 + d2} + Ability: {abilityScore} = <span className="font-bold text-3xl">{result.total}</span>
            </div>
            
            <div className={`text-2xl font-bold mt-4 mb-8 ${result.isCritSuccess ? 'text-purple-400' : result.isSuccess ? 'text-emerald-400' : 'text-red-400'}`}>
              {result.isCritSuccess ? 'CRITICAL SUCCESS' : result.isSuccess ? 'SUCCESS' : 'FAILURE'}
            </div>

            <button 
              onClick={handleContinue}
              className="w-full py-3 bg-zinc-100 text-zinc-950 font-bold rounded-lg hover:bg-zinc-300 transition"
            >
              Continue
            </button>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
