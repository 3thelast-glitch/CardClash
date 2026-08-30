# واجهة Card Clash للعب الجماعي عبر WebSocket

هذا المستند يصف العقد المنفذ حاليًا في:

- `server/multiplayer/websocket-server.ts`
- `server/multiplayer/room-manager.ts`
- `lib/multiplayer/websocket-client.ts`

يتصل العميل بالمسار `/multiplayer` ويرسل رسائل JSON بالشكل التالي:

```json
{ "type": "MESSAGE_TYPE", "payload": {} }
```

## الاتصال والإعداد

يضبط تطبيق الهاتف عنوان الخادم بواسطة:

```env
EXPO_PUBLIC_MP_SERVER_URL=wss://multiplayer.example.com/multiplayer
```

يجب استخدام `wss://` في الإنتاج. لا يُحل العنوان عند استيراد التطبيق؛ لذلك غياب المتغير لا يمنع إقلاع APK، لكنه يجعل محاولة فتح اللعب الأونلاين تفشل برسالة إعداد واضحة. في الويب فقط يمكن اشتقاق العنوان من نطاق الصفحة الحالي.

## حدود الثقة

1. يربط الخادم كل WebSocket بهوية واحدة عند `CREATE_ROOM` أو `JOIN_ROOM` أو `QUEUE_MATCHMAKING`.
2. بعد الربط لا يقرأ الخادم هوية الأمر من `payload.playerId`؛ العميل المرجعي لا يرسلها أصلًا.
3. يصدر الخادم `reconnectToken` عشوائيًا لكل جلسة، ويتطلبه `RECONNECT` ثم يبدله بعد كل نجاح.
4. يرسل العميل معرّفات البطاقات فقط. يحل الخادم البطاقات من كتالوجه الموثوق ولا يقبل إحصاءات قادمة من الهاتف.
5. لا تصل تشكيلة الخصم المستقبلية إلى العميل. تظهر بطاقة الخصم ضمن `ROUND_RESULT` بعد كشف الطرفين فقط.

هذا الربط يمنع انتحال لاعب آخر داخل جلسة قائمة، لكنه ليس بديلًا عن مصادقة حسابات كاملة. إذا أضيفت حسابات عامة أو جوائز ذات قيمة، يجب ربط إنشاء الهوية بتوكن مصادقة صادر من الخادم.

## القيود والتحقق

- الحد الأقصى لإطار WebSocket: 16 KiB.
- الضغط `perMessageDeflate` معطل.
- الحد: 40 رسالة لكل اتصال خلال 10 ثوانٍ؛ التجاوز يغلق الاتصال برمز `1008`.
- كل payload يخضع لمخطط Zod صارم؛ الحقول الزائدة مرفوضة.
- بعد ثلاث مخالفات للبروتوكول يغلق الخادم الاتصال برمز `1008`.
- الأسماء من 1 إلى 20 حرفًا، وعدد الجولات والبطاقات من 1 إلى 20.
- أوزان الندرة أعداد صحيحة ومجموعها 100.

## إنشاء الجلسة

### `CREATE_ROOM`

```json
{
  "type": "CREATE_ROOM",
  "payload": {
    "playerId": "player_abc123",
    "playerName": "Fahad",
    "inviteCode": "CLASH24"
  }
}
```

الرد:

```json
{
  "type": "ROOM_CREATED",
  "payload": {
    "roomId": "CLASH24",
    "playerId": "player_abc123",
    "reconnectToken": "secret-random-token"
  }
}
```

### `JOIN_ROOM`

```json
{
  "type": "JOIN_ROOM",
  "payload": {
    "roomId": "CLASH24",
    "playerId": "player_xyz789",
    "playerName": "Noura"
  }
}
```

يرد الخادم بـ`ROOM_JOINED` للضيف و`PLAYER_JOINED` للمضيف. بيانات اللاعب العامة هي `id` و`name` و`isReady`، ومعها `rating` و`tier` عند وجودهما؛ ولا تتضمن بطاقات أو `socketId`.

### المطابقة التنافسية

```json
{
  "type": "QUEUE_MATCHMAKING",
  "payload": {
    "playerId": "player_abc123",
    "playerName": "Fahad",
    "rating": 1200
  }
}
```

الرد إما `MATCHMAKING_QUEUED` أو `MATCH_FOUND`. يحمل `MATCH_FOUND` توكن إعادة الاتصال الخاص بالمتلقي. لإلغاء الانتظار بعد ربط الاتصال:

```json
{ "type": "CANCEL_MATCHMAKING", "payload": {} }
```

## إعداد المباراة والتشكيلة

المضيف وحده يستطيع إرسال `MATCH_SETTINGS`:

```json
{
  "type": "MATCH_SETTINGS",
  "payload": {
    "rounds": 5,
    "withAbilities": true,
    "rarityWeights": {
      "common": 50,
      "rare": 25,
      "epic": 15,
      "legendary": 8,
      "special": 2
    }
  }
}
```

التدفق الموصى به لتأكيد التشكيلة:

```json
{
  "type": "ARRANGEMENT_READY",
  "payload": {
    "cardIds": ["all_might", "artorias", "bulma", "chopper", "kaido"]
  }
}
```

يجب أن يكون كل معرّف معروفًا في كتالوج الخادم، وألا يتكرر معرّف، وأن يساوي العدد عدد الجولات. يدعم العقد أيضًا `SET_CARDS { cardIds, rounds }` ثم `PLAYER_READY { isReady }`.

بعد جاهزية الطرفين يرسل الخادم `BATTLE_START` مخصصًا لكل متلقٍ:

```json
{
  "type": "BATTLE_START",
  "payload": {
    "position": "player1",
    "you": {
      "id": "player_abc123",
      "name": "Fahad",
      "isReady": true,
      "cards": ["بطاقات اللاعب الكاملة فقط"]
    },
    "opponent": {
      "id": "player_xyz789",
      "name": "Noura",
      "isReady": true
    },
    "totalRounds": 5,
    "p1Score": 5,
    "p2Score": 5,
    "turnPlayerId": "player_abc123"
  }
}
```

## الجولات

لا يرسل الهاتف كائن البطاقة أو إحصاءاتها:

```json
{
  "type": "REVEAL_CARD",
  "payload": {
    "roundIndex": 0,
    "cardId": "all_might"
  }
}
```

يتحقق الخادم من الدور، ورقم الجولة، ومن أن `cardId` يطابق البطاقة المخزنة في الموضع نفسه. بعد الكشف الأول يرسل `OPPONENT_CARD_REVEALED` دون البطاقة، ثم `TURN_CHANGED`. بعد الكشف الثاني يرسل `ROUND_RESULT` للطرفين:

```ts
interface RoundResult {
  roundIndex: number;
  p1Card: Card;
  p2Card: Card;
  winner: 'player1' | 'player2' | 'draw';
  p1Score: number;
  p2Score: number;
  advantage: 'faction' | 'attack' | 'draw';
  p1FactionAdvantage: 'strong' | 'weak' | 'neutral';
  p2FactionAdvantage: 'strong' | 'weak' | 'neutral';
  nextOwnCard: Card | null;
  personalInsight?: string;
}
```

`nextOwnCard` مخصص للمتلقي ويزامن تأثيرات الخادم على بطاقته التالية. لا يحتوي على بطاقة الخصم التالية. عند نهاية المباراة يرسل الخادم `GAME_OVER`.

## إعادة الاتصال

يحتفظ العميل في الذاكرة بـ`playerId` و`roomId` و`reconnectToken`:

```json
{
  "type": "RECONNECT",
  "payload": {
    "playerId": "player_abc123",
    "roomId": "CLASH24",
    "reconnectToken": "secret-random-token"
  }
}
```

عند النجاح يرسل الخادم `RECONNECTED` مع توكن جديد، وموضع اللاعب، ولقطة الغرفة، وتشكيلة اللاعب نفسه، وبيانات الخصم العامة. يجب استبدال التوكن القديم فورًا. مهلة العودة 30 ثانية؛ بعدها يرسل الخادم `OPPONENT_LEFT_PERMANENTLY` ويحذف الغرفة.

## رسائل أخرى

```json
{ "type": "LEAVE_ROOM", "payload": {} }
```

```json
{ "type": "PING", "payload": { "ts": 1234567890 } }
```

يرد `PING` برسالة `PONG`. الأخطاء بالشكل:

```json
{
  "type": "ERROR",
  "payload": {
    "code": "INVALID_DECK",
    "error": "Deck contains unknown cards or does not match the configured rounds"
  }
}
```

## اختبارات الحماية

يغطي `server/multiplayer/__tests__/websocket-server-security.test.ts` ربط الهوية بالـsocket، وتوكن إعادة الاتصال وتدويره، وإخفاء تشكيلة الخصم، ورفض إحصاءات البطاقات المزورة، وحل البطاقة من الكتالوج الموثوق، وحد الرسائل.
