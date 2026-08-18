/**
 * use-sfx.ts
 * Wrapper around useBattleSound so battle.tsx can import { useSFX } from '@/hooks/use-sfx'.
 */
import { useBattleSound } from '@/lib/game/hooks/useBattleSound';

export function useSFX(enabled = true) {
  const sound = useBattleSound(enabled);
  return {
    playSound: (key: 'win' | 'lose' | 'draw' | 'attack' | 'ability' | 'nextRound') => {
      switch (key) {
        case 'win':       return sound.playWin();
        case 'lose':      return sound.playLoss();
        case 'draw':      return sound.playDraw();
        case 'attack':    return sound.playAttack();
        case 'ability':   return sound.playAbility();
        case 'nextRound': return sound.playNextRound();
      }
    },
    ...sound,
  };
}
