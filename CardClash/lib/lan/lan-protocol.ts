export const LAN_SERVICE_TYPE = 'cardclash';
export const LAN_SERVICE_PROTOCOL = 'tcp';
export const LAN_SERVICE_DOMAIN = 'local.';
export const LAN_GAME_PORT = 45983;
export const LAN_PROTOCOL_VERSION = 1;

export type LanRoom = {
  id: string;
  name: string;
  hostName: string;
  hostAddress: string;
  port: number;
  version: number;
};

export type LanWireMessage =
  | { type: 'LAN_HELLO'; payload: { playerId: string; playerName: string; version: number } }
  | { type: 'LAN_WELCOME'; payload: { roomId: string; hostName: string; version: number } }
  | { type: 'LAN_GAME_EVENT'; payload: { event: string; data: Record<string, unknown> } }
  | { type: 'LAN_PING'; payload: { id: number } }
  | { type: 'LAN_PONG'; payload: { id: number } }
  | { type: 'LAN_ERROR'; payload: { message: string } };

export function encodeLanMessage(message: LanWireMessage): string {
  return `${JSON.stringify(message)}\n`;
}

/** يؤطر رسائل TCP بأسطر JSON كي يبقى البروتوكول صحيحاً عند تجزؤ أو تجميع الحزم. */
export class LanLineDecoder {
  private buffer = '';

  push(chunk: string): LanWireMessage[] {
    this.buffer += chunk;
    const lines = this.buffer.split('\n');
    this.buffer = lines.pop() ?? '';
    return lines.flatMap((line) => {
      try {
        const message = JSON.parse(line) as LanWireMessage;
        return message && typeof message.type === 'string' && message.payload && typeof message.payload === 'object' ? [message] : [];
      } catch { return []; }
    });
  }
}

export function createLanRoomId(): string {
  return `LAN-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
}

export function isLocalIpv4(value: string): boolean {
  const parts = value.split('.').map(Number);
  return parts.length === 4 && parts.every((part) => Number.isInteger(part) && part >= 0 && part <= 255) && value !== '0.0.0.0';
}
