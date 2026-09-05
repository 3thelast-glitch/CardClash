export interface PresentationEvent<TPayload = unknown> {
  /** Stable event identity from accepted game/network state. */
  id: string;
  /** Match/room identity. Deduplication never crosses this boundary. */
  sessionId: string;
  kind: string;
  payload?: TPayload;
}

export class PresentationEventGate {
  private sessionId: string | null = null;
  private seen = new Set<string>();
  private order: string[] = [];

  constructor(private readonly maxRemembered = 256) {}

  accept(event: PresentationEvent): boolean {
    if (this.sessionId !== event.sessionId) this.reset(event.sessionId);

    const key = `${event.sessionId}:${event.id}`;
    if (this.seen.has(key)) return false;

    this.seen.add(key);
    this.order.push(key);
    while (this.order.length > this.maxRemembered) {
      const oldest = this.order.shift();
      if (oldest) this.seen.delete(oldest);
    }
    return true;
  }

  reset(sessionId: string | null = null) {
    this.sessionId = sessionId;
    this.seen.clear();
    this.order = [];
  }

  getSessionId() {
    return this.sessionId;
  }
}

/**
 * Presentation queues do not resolve gameplay. They only maintain visual order
 * for effects that have already been accepted by authoritative state.
 */
export class PresentationEventQueue<TPayload = unknown> {
  private readonly gate = new PresentationEventGate();
  private queue: PresentationEvent<TPayload>[] = [];

  push(event: PresentationEvent<TPayload>): boolean {
    if (!this.gate.accept(event)) return false;
    this.queue.push(event);
    return true;
  }

  shift(): PresentationEvent<TPayload> | undefined {
    return this.queue.shift();
  }

  replaceWithLatest(event: PresentationEvent<TPayload>) {
    if (this.gate.getSessionId() !== event.sessionId) {
      this.gate.reset(event.sessionId);
    }
    this.queue = [];
    if (this.gate.accept(event)) this.queue.push(event);
  }

  clear(sessionId: string | null = null) {
    this.queue = [];
    this.gate.reset(sessionId);
  }

  get length() {
    return this.queue.length;
  }
}
