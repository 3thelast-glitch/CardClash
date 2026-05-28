// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Unit Tests — Data Sync
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('Data Sync', () => {

  // ── مزامنة اختيار البطاقات ──────────────────────────
  describe('Card Selection Sync', () => {
    it('should emit card_selected event with correct payload', () => {
      const payload = buildCardSelectPayload('player_1', ['card_01', 'card_05', 'card_09']);
      expect(payload.type).toBe('card_selected');
      expect(payload.playerId).toBe('player_1');
      expect(payload.cards).toHaveLength(3);
    });

    it('should reject selection with less than 3 cards', () => {
      expect(() =>
        buildCardSelectPayload('player_1', ['card_01'])
      ).toThrow('Minimum 3 cards required');
    });

    it('should reject selection with more than 5 cards', () => {
      expect(() =>
        buildCardSelectPayload('player_1', ['c1','c2','c3','c4','c5','c6'])
      ).toThrow('Maximum 5 cards allowed');
    });
  });

  // ── مزامنة نتيجة الجولة ─────────────────────────────
  describe('Round Result Sync', () => {
    it('should emit round_result with winner', () => {
      const result = buildRoundResult(1, 'player_1', 30, 'player_2', 20);
      expect(result.winner).toBe('player_1');
      expect(result.round).toBe(1);
    });

    it('should emit draw when damage is equal', () => {
      const result = buildRoundResult(1, 'player_1', 25, 'player_2', 25);
      expect(result.winner).toBe('draw');
    });

    it('should include net damage in result', () => {
      const result = buildRoundResult(1, 'player_1', 30, 'player_2', 20);
      expect(result.netDamage).toBe(10);
    });
  });

  // ── إعادة الاتصال ───────────────────────────────────
  describe('Reconnection', () => {
    it('should restore game state after reconnect', () => {
      const state = mockGameState({ round: 2, scores: { p1: 1, p2: 0 } });
      const restored = restoreState(state);
      expect(restored.round).toBe(2);
      expect(restored.scores.p1).toBe(1);
    });

    it('should not reset scores on reconnect', () => {
      const state = mockGameState({ round: 3, scores: { p1: 2, p2: 1 } });
      const restored = restoreState(state);
      expect(restored.scores.p1).toBe(2);
      expect(restored.scores.p2).toBe(1);
    });
  });

});

// ── Stubs ─────────────────────────────────────────────
function buildCardSelectPayload(playerId: string, cards: string[]) {
  if (cards.length < 3) throw new Error('Minimum 3 cards required');
  if (cards.length > 5) throw new Error('Maximum 5 cards allowed');
  return { type: 'card_selected', playerId, cards };
}

function buildRoundResult(
  round: number,
  p1Id: string, p1Dmg: number,
  p2Id: string, p2Dmg: number
) {
  const diff = p1Dmg - p2Dmg;
  return {
    round,
    winner: diff > 0 ? p1Id : diff < 0 ? p2Id : 'draw',
    netDamage: Math.abs(diff),
  };
}

function mockGameState(overrides: object) {
  return { round: 1, scores: { p1: 0, p2: 0 }, status: 'playing', ...overrides };
}

function restoreState(state: ReturnType<typeof mockGameState>) {
  return { ...state };
}
