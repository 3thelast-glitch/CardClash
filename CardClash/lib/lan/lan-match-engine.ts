import type { Card, RoundResult, RoundTimeline } from '../game/types';
import { determineRoundWinner } from '../game/cards-data-exports';

export type LanPlayerRole = 'host' | 'guest';
export type LanRoundWinner = LanPlayerRole | 'draw';

export type LanRoundResult = {
  roundIndex: number;
  hostCard: Card;
  guestCard: Card;
  winner: LanRoundWinner;
  hostScore: number;
  guestScore: number;
  advantage: 'faction' | 'attack' | 'draw';
  /** معلومة خاصة بصاحب بولما، لا تدخل في بيانات الخصم المشتركة. */
  personalInsight?: string;
  /** لقطات قبل/بعد الاستخدام وسبب الحسم من المحرك المشترك. */
  timeline?: RoundTimeline;
  comparison?: {
    hostDamage: number;
    guestDamage: number;
    hostBaseDamage: number;
    guestBaseDamage: number;
    hostFactionAdvantage: RoundResult['playerFactionAdvantage'];
    guestFactionAdvantage: RoundResult['botFactionAdvantage'];
    hostHealthDelta: number;
    guestHealthDelta: number;
  };
};

/** يحاكي قواعد حسم الجولة الجماعية، لكن بمصطلحي المضيف والضيف للـ LAN. */
export function resolveLanRound(
  roundIndex: number,
  hostCard: Card,
  guestCard: Card,
  hostScore: number,
  guestScore: number,
): LanRoundResult {
  const resolved = determineRoundWinner(hostCard, guestCard);
  const winner: LanRoundWinner = resolved.winner === 'player' ? 'host' : resolved.winner === 'bot' ? 'guest' : 'draw';
  const factionWon = (resolved.winner === 'player' && resolved.playerFactionAdvantage === 'strong')
    || (resolved.winner === 'bot' && resolved.botFactionAdvantage === 'strong');

  return {
    roundIndex,
    hostCard,
    guestCard,
    winner,
    hostScore: Math.max(0, hostScore - (winner === 'guest' ? 1 : 0)),
    guestScore: Math.max(0, guestScore - (winner === 'host' ? 1 : 0)),
    advantage: factionWon ? 'faction' : winner === 'draw' ? 'draw' : 'attack',
    comparison: {
      hostDamage: resolved.playerDamage,
      guestDamage: resolved.botDamage,
      hostBaseDamage: resolved.playerBaseDamage,
      guestBaseDamage: resolved.botBaseDamage,
      hostFactionAdvantage: resolved.playerFactionAdvantage,
      guestFactionAdvantage: resolved.botFactionAdvantage,
      hostHealthDelta: resolved.playerHealthDelta,
      guestHealthDelta: resolved.botHealthDelta,
    },
  };
}

export function isLanGameOver(result: LanRoundResult, totalRounds: number): boolean {
  return result.roundIndex >= totalRounds - 1 || result.hostScore <= 0 || result.guestScore <= 0;
}
