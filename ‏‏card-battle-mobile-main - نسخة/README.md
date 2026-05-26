<div dir="rtl">

# ⚔️ Card Clash — لعبة معركة البطاقات

> لعبة بطاقات استراتيجية مبنية بـ **React Native / Expo** تدعم اللعب الفردي ضد الذكاء الاصطناعي واللعب الجماعي أونلاين عبر WebSocket.

---

## 📊 نظرة عامة

**Card Clash** لعبة موبايل يختار فيها اللاعب بطاقات أنمي ويرتّبها عبر جولات متعددة للمنافسة ضد الذكاء الاصطناعي أو ضد لاعب حقيقي في الوقت الفعلي. تتميز اللعبة بنظام قدرات خاصة وتأثيرات بصرية فاخرة.

اللعبة مدعومة باللغتين **العربية والإنجليزية**، وتعمل بوضع **Landscape (أفقي)** للحصول على تجربة بصرية مثلى.

---

## ✨ المميزات الرئيسية

- 🃏 **نظام بطاقات متكامل** — بطاقات أنمي بإحصائيات (هجوم، دفاع، HP، نجوم)، مع نظام ندرة (Common → Legendary)
- ⚡ **50+ قدرة فريدة** — موزّعة على 4 مستويات: Common / Rare / Epic / Legendary
- 🦸 **قدرات خاصة بالبطاقات** — كل بطاقة لها شخصية وقدرة فريدة تؤثر على مجرى المعركة
- 🧠 **ذكاء اصطناعي** — ثلاثة مستويات صعوبة، يختار قدراته ويلعب استراتيجياً
- 🌐 **Multiplayer حقيقي** — غرف WebSocket، مباريات فورية، lobby + waiting
- 🏆 **لوحة متصدرين** — إحصائيات اللاعب وتسجيل النتائج
- 🎨 **تصميم فاخر** — أنيميشن سلس، خلفيات ديناميكية، ثيم ذهبي/بنفسجي
- 🔒 **نظام تعطيل القدرات** — التحكم الكامل بالقدرات النشطة
- 📱 **دعم كامل للموبايل** — iOS & Android & Web عبر Expo

---

## 🦸 القدرات الخاصة بالبطاقات

بعض البطاقات تمتلك قدرات سلبية أو إيجابية تُطبَّق تلقائياً أثناء اللعب — بمعزل عن قدرات الـ Abilities العادية.

| البطاقة | القدرة | التوقيت |
|---|---|---|
| **Turin** | يخسر النصف الأول من الجولات إجباريًا — مثال: 10 جولات → يخسر الجولات 1-5 تلقائياً | طوال الجولات الأولى |
| **Turin** | يجب أن يكون الكرت الأول في الفريق دائماً | عند ترتيب الفريق |
| **Dracule Mihawk** | ينتصر على جميع السيافين (tag: swordsman) | عند المواجهة |
| **Gehrman** | يصطاد جميع الوحوش (tag: monster/beast) | عند المواجهة |
| **Sanji** | يخسر من جميع النساء (tag: female/woman) | عند المواجهة |
| **Tsunade** | +2 صحة عند نزول الكرت للميدان | عند الدخول |
| **Sakura Haruno** | +1 صحة عند الفوز فقط | بعد الفوز |

### ترتيب تطبيق القدرات في كل جولة

```
1. تحقق من قدرة Turin (خسارة إجبارية؟)
      ↓
2. فحص القدرات الخاصة (Mihawk / Gehrman / Sanji)
      ↓
3. مقارنة الإحصائيات العادية
      ↓
4. تطبيق تأثيرات ما بعد المعركة (Sakura Haruno)
```

> هذا المنطق موجود في `lib/game/rage-engine.ts` — دالة `resolveBattle()`.

---

## 🛠️ التقنيات المستخدمة

| الطبقة | التقنية |
|---|---|
| تطبيق الموبايل | React Native 0.81 + Expo 54 + Expo Router 6 |
| التنسيق | NativeWind 4 (Tailwind CSS) |
| الحالة / البيانات | React Context + TanStack Query |
| API | tRPC v11 (type-safe RPC) |
| Multiplayer | WebSocket (ws) — Node.js server مستقل |
| قاعدة البيانات | MySQL + Drizzle ORM |
| المصادقة | OAuth (Manus) عبر tRPC |
| اللغة | TypeScript 5.9 |
| إدارة الحزم | **pnpm فقط** (لا npm ولا yarn) |
| الاختبارات | Vitest |

---

## 📁 هيكل المشروع

```
card-battle-mobile-main/
├── app/                        # شاشات التطبيق (Expo Router)
│   ├── _layout.tsx             # Root layout — providers + navigation
│   ├── screens/                # جميع شاشات اللعبة (17 شاشة)
│   │   ├── splash.tsx
│   │   ├── game-mode.tsx
│   │   ├── difficulty.tsx
│   │   ├── rounds-config.tsx
│   │   ├── card-selection.tsx
│   │   ├── battle.tsx
│   │   ├── battle-results.tsx
│   │   ├── abilities.tsx
│   │   ├── edit-ability.tsx
│   │   ├── collection.tsx
│   │   ├── cards-gallery.tsx
│   │   ├── stats.tsx
│   │   ├── leaderboard.tsx
│   │   ├── multiplayer-lobby.tsx
│   │   ├── multiplayer-waiting.tsx
│   │   ├── multiplayer-battle.tsx
│   │   └── multiplayer-results.tsx
│   └── oauth/callback.tsx      # OAuth redirect handler
│
├── components/
│   ├── game/                   # 17 مكوّن واجهة اللعبة
│   ├── modals/                 # BattleHistory, Popularity, Prediction
│   └── ui/                     # ProButton, design-tokens
│
├── lib/
│   ├── game/                   # منطق اللعبة الكامل
│   │   ├── game-context.tsx    # حالة اللعبة الرئيسية
│   │   ├── cards-data.ts       # بيانات البطاقات (91KB)
│   │   ├── anime-cards-data.ts # بطاقات الأنمي (43KB)
│   │   ├── bot-ai.ts           # محرك الذكاء الاصطناعي (19KB)
│   │   ├── abilities.ts        # تعريف القدرات
│   │   ├── abilities-store.ts  # حفظ/قراءة القدرات المعطّلة
│   │   ├── ability-names.ts    # أسماء القدرات بالعربية
│   │   ├── card-rarity.ts      # نظام الندرة
│   │   ├── rage-engine.ts      # قدرات البطاقات الخاصة + Turin penalty
│   │   ├── types.ts            # جميع أنواع TypeScript
│   │   ├── hooks/              # game hooks
│   │   └── __tests__/          # اختبارات Vitest
│   ├── multiplayer/            # WebSocket client
│   ├── _core/                  # Manus runtime + tRPC helpers
│   ├── theme-provider.tsx
│   ├── animations.ts
│   └── trpc.ts
│
├── server/                     # Backend
│   ├── _core/                  # tRPC + Auth + Drizzle (PORT 3000)
│   ├── multiplayer/            # WebSocket server (PORT 3001)
│   │   ├── websocket-server.ts
│   │   └── room-manager.ts
│   ├── db.ts
│   └── routers.ts
│
├── drizzle/                    # Migrations قاعدة البيانات
│   ├── schema.ts               # جدول users
│   └── migrations/
│
├── scripts/                    # سكريبتات المشروع (generate_qr.mjs)
├── constants/
├── hooks/
├── assets/                     # خطوط، صور
├── types/
├── data/
├── app.config.ts
├── drizzle.config.ts
├── package.json
├── tsconfig.json
├── tailwind.config.js
├── babel.config.js
├── metro.config.js
├── theme.config.js
└── .env.example
```

---

## 🌐 بنية الـ Backend

```
Client (Expo)
  │
  ├── [HTTP/tRPC] ▶ server/_core/  (PORT 3000)
  │                   └── Auth · Users · Drizzle/MySQL
  │
  └── [WebSocket]  ▶ server/index.ts (PORT 3001)
                      └── Rooms · Real-time battle · Room Manager
```

### Health endpoints
```
GET http://localhost:3001/health  ➜ server status + active rooms
GET http://localhost:3001/rooms   ➜ list of active game rooms
```

---

## 🚀 تشغيل المشروع

### المتطلبات
- Node.js ≥ 18
- pnpm 9.12.0 — `npm i -g pnpm@9.12.0`
- MySQL database
- تطبيق Expo Go على الهاتف

### 1. تثبيت الاعتمادات
```bash
pnpm install
```

### 2. إعداد متغيرات البيئة
```bash
cp .env.example .env
```

```env
DATABASE_URL=mysql://user:password@host:3306/dbname
MULTIPLAYER_PORT=3001
```

### 3. تهيئة قاعدة البيانات
```bash
pnpm db:push
```

### 4. تشغيل المشروع (كل شيء دفعة واحدة)
```bash
pnpm dev
```

يُشغّل: tRPC server (3000) + Expo Metro bundler معاً.

---

## 🧑‍💻 أوامر مفيدة

| الأمر | الوصف |
|---|---|
| `pnpm dev` | تشغيل كل شيء (tRPC + Metro) |
| `pnpm server:multiplayer` | تشغيل WebSocket server فقط |
| `pnpm android` | تشغيل على Android |
| `pnpm ios` | تشغيل على iOS |
| `pnpm qr` | توليد QR code لـ Expo Go |
| `pnpm test` | تشغيل اختبارات Vitest |
| `pnpm check` | فحص TypeScript |
| `pnpm lint` | ESLint عبر Expo |
| `pnpm format` | تنسيق الكود بـ Prettier |
| `pnpm db:push` | توليد + تطبيق migrations |
| `pnpm build` | بناء tRPC server للإنتاج |

> ⚠️ **مهم:** استخدم **pnpm فقط** — لا `npm install` ولا `yarn` (مُقفَل في `engines`)

---

## 🎮 نظام اللعب

```
splash → game-mode → difficulty / rounds-config
                   ↓
            card-selection → battle → battle-results
                   ↓
            multiplayer-lobby → multiplayer-waiting
                              → multiplayer-battle → multiplayer-results
```

---

## ⚡ نظام القدرات

| المستوى | اللون | الوصف |
|---|---|---|
| **Common** | 🟢 | قدرات أساسية شائعة |
| **Rare** | 🔵 | قدرات متوسطة نادرة |
| **Epic** | 🟣 | قدرات قوية ونادرة |
| **Legendary** | 🟡 | قدرات استثنائية وحاسمة |

القدرات المعطّلة تُحفظ في `AsyncStorage` وتُستثنى تلقائياً من كل جلسة لعب.

---

## 🧪 الاختبارات

```bash
pnpm test
```

الاختبارات في `lib/game/__tests__/`:
- `game-logic.test.ts` — منطق المعركة الأساسي
- `bot-ai.test.ts` — قرارات الذكاء الاصطناعي

---

## 📌 قواعد المشروع

- **pnpm فقط** — لا npm ولا yarn
- منطق اللعبة في `lib/game/` فقط — لا في المكونات
- المكونات UI خالصة — لا business logic
- كود الـ server في `server/` فقط — لا يُستورد من Client
- القدرات الخاصة بالبطاقات في `lib/game/rage-engine.ts` — لا تُضاف في `game-context`
- السكريبتات المؤقتة تُوضع في `scripts/` ولا تُرفع للـ root مباشرة

---

<div align="center">
  <sub>مبني بـ React Native · Expo · TypeScript · tRPC · Drizzle ORM · WebSocket</sub>
</div>

</div>
