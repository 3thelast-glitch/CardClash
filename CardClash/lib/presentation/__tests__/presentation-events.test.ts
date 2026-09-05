import { describe, expect, it } from 'vitest';
import { PresentationEventGate, PresentationEventQueue } from '../presentation-events';

describe('PresentationEventGate', () => {
  it('deduplicates within one session but permits the same event id in a new match', () => {
    const gate = new PresentationEventGate();
    expect(gate.accept({ id: 'round-1-hit', sessionId: 'room-a', kind: 'damage' })).toBe(true);
    expect(gate.accept({ id: 'round-1-hit', sessionId: 'room-a', kind: 'damage' })).toBe(false);
    expect(gate.accept({ id: 'round-1-hit', sessionId: 'room-b', kind: 'damage' })).toBe(true);
  });

  it('preserves accepted presentation event order', () => {
    const queue = new PresentationEventQueue();
    queue.push({ id: 'a', sessionId: 'match', kind: 'reveal' });
    queue.push({ id: 'b', sessionId: 'match', kind: 'impact' });
    expect(queue.shift()?.id).toBe('a');
    expect(queue.shift()?.id).toBe('b');
  });

  it('can settle to the latest valid event after interruption', () => {
    const queue = new PresentationEventQueue();
    queue.push({ id: 'old', sessionId: 'match', kind: 'effect' });
    queue.replaceWithLatest({ id: 'latest', sessionId: 'match', kind: 'settle' });
    expect(queue.length).toBe(1);
    expect(queue.shift()?.id).toBe('latest');
  });
});
