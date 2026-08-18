import { resolveMultiplayerWebSocketUrl } from './websocket-client';

export type PublicRoom = {
  id: string;
  hostName: string;
  createdAt: string;
};

type RoomDirectoryResponse = {
  rooms?: Array<{ id?: unknown; status?: unknown; players?: unknown; createdAt?: unknown }>;
};

export function resolveRoomDirectoryUrl(webSocketUrl = resolveMultiplayerWebSocketUrl()): string {
  const url = new URL(webSocketUrl);
  url.protocol = url.protocol === 'wss:' ? 'https:' : 'http:';
  url.pathname = '/rooms';
  url.search = '';
  url.hash = '';
  return url.toString();
}

/** يجلب الغرف المنتظرة فقط؛ الغرف التي دخلها لاعب ثانٍ لا تظهر في الدليل العام. */
export async function fetchJoinableRooms(
  fetcher: typeof fetch = fetch,
  webSocketUrl = resolveMultiplayerWebSocketUrl(),
): Promise<PublicRoom[]> {
  const response = await fetcher(resolveRoomDirectoryUrl(webSocketUrl));
  if (!response.ok) throw new Error('تعذر جلب قائمة الغرف');
  const payload = await response.json() as RoomDirectoryResponse;
  return (payload.rooms ?? [])
    .filter((room) => room.status === 'waiting' && typeof room.id === 'string')
    .map((room) => ({
      id: room.id as string,
      hostName: Array.isArray(room.players) && typeof room.players[0] === 'string' ? room.players[0] : 'مضيف',
      createdAt: typeof room.createdAt === 'string' ? room.createdAt : '',
    }))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}
