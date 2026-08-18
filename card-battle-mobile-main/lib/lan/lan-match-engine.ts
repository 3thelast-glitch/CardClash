import type { Card } from '@/lib/game/types';

export type LanPlayerRole = 'host' | 'guest';
export type LanRoundWinner = LanPlayerRole | 'draw';

export type LanRoundResult = {
  roundIndex: number;
  hostCard: Card;
  guestCard: Card;
  winner: LanRoundWinner;
  hostScore: number;
  guestScore: number;
  advantage: 'element' | 'attack' | 'draw';
};

const ELEMENT_BEATS: Record<string, string> = {
  fire: 'ice',
  ice: 'water',
  water: 'fire',
  earth: 'lightning',
  lightning: 'wind',
  wind: 'earth',
};

function elementWinner(hostElement: string, guestElement: string): LanPlayerRole | null {
  if (ELEMENT_BEATS[hostElement] === guestElement) return 'host';
  if (ELEMENT_BEATS[guestElement] === hostElement) return 'guest';
  return null;
}

/** يحاكي قواعد حسم الجولة الجماعية، لكن بمصطلحي المضيف والضيف للـ LAN. */
export function resolveLanRound(
  roundIndex: number,
  hostCard: Card,
  guestCard: Card,
  hostScore: number,
  guestScore: number,
): LanRoundResult {
  const element = elementWinner(hostCard.element ?? '', guestCard.element ?? '');
  const hostAttack = hostCard.attack ?? 0;
  const guestAttack = guestCard.attack ?? 0;
  const hostNet = hostAttack - (guestCard.defense ?? 0);
  const guestNet = guestAttack - (hostCard.defense ?? 0);
  const winner: LanRoundWinner = element ?? (hostNet > guestNet ? 'host' : guestNet > hostNet ? 'guest' : 'draw');

  return {
    roundIndex,
    hostCard,
    guestCard,
    winner,
    hostScore: Math.max(0, hostScore - (winner === 'guest' ? 1 : 0)),
    guestScore: Math.max(0, guestScore - (winner === 'host' ? 1 : 0)),
    advantage: element ? 'element' : winner === 'draw' ? 'draw' : 'attack',
  };
}

export function isLanGameOver(result: LanRoundResult, totalRounds: number): boolean {
  return result.roundIndex >= totalRounds - 1 || result.hostScore <= 0 || result.guestScore <= 0;
}
