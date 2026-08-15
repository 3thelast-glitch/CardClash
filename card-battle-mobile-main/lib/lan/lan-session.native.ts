import * as Network from 'expo-network';
import TcpSocket from 'react-native-tcp-socket';
import Zeroconf from 'react-native-zeroconf';
import { createLanRoomId, encodeLanMessage, isLocalIpv4, LAN_GAME_PORT, LAN_PROTOCOL_VERSION, LAN_SERVICE_DOMAIN, LAN_SERVICE_PROTOCOL, LAN_SERVICE_TYPE, LanLineDecoder, type LanRoom, type LanWireMessage } from './lan-protocol';

type LanSocket = any;
type LanServer = any;

export type LanSessionEvents = {
  onRooms: (rooms: LanRoom[]) => void;
  onState: (state: 'idle' | 'hosting' | 'discovering' | 'connecting' | 'connected' | 'failed', notice?: string) => void;
  onPeer: (peer: { id: string; name: string } | null) => void;
  onMessage: (message: LanWireMessage) => void;
};

/** مسار لعب محلي خالص: mDNS للاكتشاف ثم TCP مباشر بين الهاتفين على Wi‑Fi. */
export class LanSession {
  private readonly zeroconf = new Zeroconf();
  private server: LanServer | null = null;
  private socket: LanSocket | null = null;
  private decoder = new LanLineDecoder();
  private rooms = new Map<string, LanRoom>();
  private hostedRoom: LanRoom | null = null;
  private selfId = '';
  private selfName = '';

  constructor(private readonly events: LanSessionEvents) {
    this.zeroconf.on('resolved', (service: any) => this.onResolved(service));
    this.zeroconf.on('remove', (name: string) => { this.rooms.delete(name); this.emitRooms(); });
    this.zeroconf.on('error', () => this.events.onState('failed', 'تعذر اكتشاف الغرف المحلية. تحقق من Wi‑Fi وصلاحية الشبكة.'));
  }

  async host(playerId: string, playerName: string): Promise<LanRoom> {
    this.stop();
    this.selfId = playerId;
    this.selfName = playerName.trim().slice(0, 20) || 'لاعب محلي';
    const localAddress = await Network.getIpAddressAsync();
    if (!isLocalIpv4(localAddress)) throw new Error('تعذر الحصول على عنوان IPv4 محلي. اتصل بشبكة Wi‑Fi أولاً.');
    const room: LanRoom = { id: createLanRoomId(), name: `غرفة ${this.selfName}`, hostName: this.selfName, hostAddress: localAddress, port: LAN_GAME_PORT, version: LAN_PROTOCOL_VERSION };
    const server = TcpSocket.createServer((socket: any) => this.attachSocket(socket, true)) as unknown as LanServer;
    this.server = server;
    await new Promise<void>((resolve, reject) => {
      server.on('error', (error: Error) => reject(error));
      server.listen({ port: LAN_GAME_PORT, host: '0.0.0.0' }, resolve);
    });
    this.hostedRoom = room;
    this.zeroconf.publishService(LAN_SERVICE_TYPE, LAN_SERVICE_PROTOCOL, LAN_SERVICE_DOMAIN, room.id, LAN_GAME_PORT, {
      roomId: room.id, hostName: room.hostName, hostId: playerId, version: String(LAN_PROTOCOL_VERSION),
    });
    this.events.onState('hosting', 'غرفتك مرئية الآن للأجهزة المتصلة بنفس شبكة Wi‑Fi.');
    return room;
  }

  discover() {
    this.zeroconf.stop('DNSSD' as any);
    this.rooms.clear();
    this.events.onRooms([]);
    this.zeroconf.scan(LAN_SERVICE_TYPE, LAN_SERVICE_PROTOCOL, LAN_SERVICE_DOMAIN, 'DNSSD' as any);
    this.events.onState('discovering', 'نبحث عن غرف محلية قريبة…');
  }

  async join(room: LanRoom, playerId: string, playerName: string): Promise<void> {
    this.socket?.destroy();
    this.selfId = playerId;
    this.selfName = playerName.trim().slice(0, 20) || 'لاعب محلي';
    this.events.onState('connecting', `نتصل مباشرة بغرفة ${room.hostName}…`);
    try {
      await new Promise<void>((resolve, reject) => {
        const socket = TcpSocket.createConnection({ host: room.hostAddress, port: room.port, connectTimeout: 5_000, interface: 'wifi' }, () => {
          this.attachSocket(socket as LanSocket, false);
          this.send({ type: 'LAN_HELLO', payload: { playerId, playerName: this.selfName, version: LAN_PROTOCOL_VERSION } });
          resolve();
        }) as LanSocket;
        socket.on('error', reject);
      });
    } catch (error) {
      this.events.onState('failed', 'تعذر الاتصال بالغرفة. تأكد من أن الهاتفين على الشبكة نفسها.');
      throw error;
    }
  }

  sendGameEvent(event: string, data: Record<string, unknown>) { this.send({ type: 'LAN_GAME_EVENT', payload: { event, data } }); }

  stop() {
    this.socket?.destroy(); this.socket = null;
    this.server?.close(); this.server = null;
    if (this.hostedRoom) this.zeroconf.unpublishService(this.hostedRoom.id);
    this.hostedRoom = null;
    this.zeroconf.stop('DNSSD' as any);
    this.rooms.clear(); this.events.onRooms([]); this.events.onPeer(null); this.events.onState('idle');
  }

  dispose() { this.stop(); this.zeroconf.removeDeviceListeners(); }

  private attachSocket(socket: LanSocket, isHost: boolean) {
    this.socket?.destroy(); this.socket = socket; this.decoder = new LanLineDecoder();
    socket.on('data', (chunk: { toString: () => string }) => this.decoder.push(chunk.toString()).forEach((message) => this.handleMessage(message, isHost)));
    socket.on('close', () => {
      if (this.socket !== socket) return;
      this.socket = null; this.events.onPeer(null); this.events.onState(this.hostedRoom ? 'hosting' : 'idle', 'انقطع اتصال اللاعب المحلي.');
    });
    socket.on('error', () => undefined);
  }

  private handleMessage(message: LanWireMessage, isHost: boolean) {
    if (message.type === 'LAN_HELLO' && isHost) {
      if (message.payload.version !== LAN_PROTOCOL_VERSION) return void this.send({ type: 'LAN_ERROR', payload: { message: 'إصدار اللعبة المحلية غير متوافق.' } });
      this.events.onPeer({ id: message.payload.playerId, name: message.payload.playerName });
      this.send({ type: 'LAN_WELCOME', payload: { roomId: this.hostedRoom?.id ?? '', hostName: this.selfName, version: LAN_PROTOCOL_VERSION } });
      this.events.onState('connected', 'اتصال LAN مباشر جاهز — لا توجد خدمة خارجية في هذا الوضع.');
      return;
    }
    if (message.type === 'LAN_WELCOME' && !isHost) {
      this.events.onPeer({ id: this.hostedRoom?.id ?? 'host', name: message.payload.hostName });
      this.events.onState('connected', 'اتصال LAN مباشر جاهز.');
      return;
    }
    if (message.type === 'LAN_PING') return void this.send({ type: 'LAN_PONG', payload: { id: message.payload.id } });
    this.events.onMessage(message);
  }

  private send(message: LanWireMessage) { this.socket?.write(encodeLanMessage(message)); }

  private onResolved(service: any) {
    const txt = service?.txt ?? {};
    const address = Array.isArray(service?.addresses) ? service.addresses.find((item: unknown) => typeof item === 'string' && isLocalIpv4(item)) : undefined;
    const roomId = typeof txt.roomId === 'string' ? txt.roomId : service?.name;
    if (!roomId || !address || txt.hostId === this.selfId || typeof service?.port !== 'number') return;
    this.rooms.set(service.name, { id: roomId, name: `غرفة ${txt.hostName || roomId}`, hostName: typeof txt.hostName === 'string' ? txt.hostName : 'مضيف محلي', hostAddress: address, port: service.port, version: Number(txt.version) || 1 });
    this.emitRooms();
  }

  private emitRooms() { this.events.onRooms([...this.rooms.values()].sort((a, b) => a.name.localeCompare(b.name))); }
}
