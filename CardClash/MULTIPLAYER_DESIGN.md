# تصميم نظام اللعب الجماعي (Multiplayer P2P)

## نظرة عامة

نظام اللعب الجماعي يسمح للاعبين باللعب ضد بعضهم البعض عبر الإنترنت في الوقت الفعلي باستخدام نظام P2P (Peer-to-Peer) مع خادم وسيط للمطابقة.

## البنية المعمارية

### 1. الخادم (Server)
- **WebSocket Server**: للاتصال الفوري بين اللاعبين
- **Room Manager**: إدارة الغرف والمطابقة
- **Message Broker**: توجيه الرسائل بين اللاعبين

### 2. العميل (Client)
- **WebSocket Client**: الاتصال بالخادم
- **Game Sync Manager**: مزامنة حالة اللعبة
- **UI Components**: واجهات اللعب الجماعي

## تدفق اللعب

### 1. إنشاء/الانضمام للغرفة
```
اللاعب 1 → يختار "Online" → ينشئ غرفة → يحصل على Room ID
اللاعب 2 → يختار "Online" → يدخل Room ID → ينضم للغرفة
```

### 2. اختيار البطاقات
```
كل لاعب → يختار عدد الجولات → يختار الأرقام → يرتب البطاقات
عند الانتهاء → يرسل "ready" → ينتظر اللاعب الآخر
```

### 3. المعركة
```
الجولة 1 → كلا اللاعبين يكشفان البطاقة → حساب النتيجة → مزامنة
الجولة 2 → نفس العملية
...
نهاية المباراة → عرض النتائج → حفظ الإحصائيات
```

## بروتوكول الرسائل

### رسائل الغرفة
```typescript
// إنشاء غرفة
{ type: 'CREATE_ROOM', payload: { playerId, playerName } }
→ { type: 'ROOM_CREATED', payload: { roomId, playerId } }

// الانضمام للغرفة
{ type: 'JOIN_ROOM', payload: { roomId, playerId, playerName } }
→ { type: 'PLAYER_JOINED', payload: { roomId, player1, player2 } }
```

### رسائل اللعب
```typescript
// اختيار البطاقات
{ type: 'CARDS_SELECTED', payload: { playerId, cards, rounds } }

// جاهز للبدء
{ type: 'PLAYER_READY', payload: { playerId } }

// بدء المعركة
{ type: 'START_BATTLE', payload: { player1Cards, player2Cards } }

// كشف البطاقة
{ type: 'REVEAL_CARD', payload: { playerId, roundIndex, card } }

// نتيجة الجولة
{ type: 'ROUND_RESULT', payload: { winner, player1Damage, player2Damage } }

// نهاية المباراة
{ type: 'GAME_OVER', payload: { winner, player1Score, player2Score } }
```

## الأمان ومنع الغش

### 1. التحقق من الحركات
- الخادم يتحقق من صحة جميع الحركات
- لا يمكن للاعب تعديل بطاقات الخصم
- التحقق من توقيت الحركات

### 2. مزامنة الحالة
- الخادم هو مصدر الحقيقة الوحيد
- جميع الحسابات تتم على الخادم
- العميل يعرض النتائج فقط

### 3. معالجة الانقطاع
- إذا انقطع اللاعب لأكثر من 30 ثانية → خسارة تلقائية
- نظام إعادة الاتصال التلقائي
- حفظ حالة اللعبة على الخادم

## قاعدة البيانات

### جدول الغرف (Rooms)
```sql
CREATE TABLE multiplayer_rooms (
  id VARCHAR(10) PRIMARY KEY,
  player1_id VARCHAR(50),
  player2_id VARCHAR(50),
  status ENUM('waiting', 'playing', 'finished'),
  created_at TIMESTAMP,
  expires_at TIMESTAMP
);
```

### جدول المباريات (Matches)
```sql
CREATE TABLE multiplayer_matches (
  id INT PRIMARY KEY AUTO_INCREMENT,
  room_id VARCHAR(10),
  player1_id VARCHAR(50),
  player2_id VARCHAR(50),
  winner VARCHAR(50),
  player1_score INT,
  player2_score INT,
  total_rounds INT,
  duration INT,
  created_at TIMESTAMP
);
```

## التقنيات المستخدمة

- **WebSocket (ws)**: للاتصال الفوري
- **Express**: للخادم
- **React Native WebSocket**: للعميل
- **MySQL**: لحفظ البيانات
- **AsyncStorage**: للتخزين المحلي

## الخطوات التالية

1. ✅ تصميم البنية
2. ⏳ إنشاء WebSocket Server
3. ⏳ تطوير Room Manager
4. ⏳ إنشاء واجهات اللعب الجماعي
5. ⏳ اختبار النظام
