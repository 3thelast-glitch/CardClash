<div align="center">

# 🃏 Card Clash

### لعبة بطاقات استراتيجية متعددة الأنماط مبنية بـ React Native وExpo

**Single Player · Online Multiplayer · Local LAN · Custom Cards · Abilities · Statistics**

![Expo](https://img.shields.io/badge/Expo-54-000020?logo=expo&logoColor=white)
![React Native](https://img.shields.io/badge/React%20Native-0.81-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-%3E%3D18-339933?logo=node.js&logoColor=white)
![pnpm](https://img.shields.io/badge/pnpm-9.12-F69220?logo=pnpm&logoColor=white)

</div>

---

## نظرة عامة

**Card Clash** هي لعبة بطاقات استراتيجية تعتمد على اختيار البطاقات وترتيبها وإدارة قدراتها وعناصرها قبل الدخول في مواجهات متعددة الجولات.

المشروع مكتوب بـ **TypeScript** ويستخدم **React Native + Expo** لتشغيل واجهة واحدة على Android وiOS والويب، مع بنية خلفية منفصلة لخدمات API واللعب الجماعي عبر WebSocket.

واجهة اللعبة موجهة أساسًا للمستخدم العربي، وتستخدم خط **Noto Kufi Arabic** مع تصميم داكن وهوية بصرية تعتمد على الألوان الذهبية والبنفسجية.

المشروع لا يقتصر على شاشة معركة واحدة؛ بل يتضمن نظام بطاقات كامل، أنماط لعب فردية وجماعية، قدرات، معرض بطاقات، إحصاءات، ترتيب، أدوات إدارة محتوى، وضع Sandbox، ودعم اتصال محلي عبر LAN.

---

## المحتويات

- [المزايا الرئيسية](#المزايا-الرئيسية)
- [أنماط اللعب](#أنماط-اللعب)
- [نظام البطاقات والقتال](#نظام-البطاقات-والقتال)
- [اللعب الجماعي عبر الإنترنت](#اللعب-الجماعي-عبر-الإنترنت)
- [اللعب المحلي عبر LAN](#اللعب-المحلي-عبر-lan)
- [التقنيات المستخدمة](#التقنيات-المستخدمة)
- [المتطلبات](#المتطلبات)
- [التثبيت والتشغيل](#التثبيت-والتشغيل)
- [متغيرات البيئة](#متغيرات-البيئة)
- [أوامر المشروع](#أوامر-المشروع)
- [بنية المشروع](#بنية-المشروع)
- [المعمارية](#المعمارية)
- [خادم Multiplayer](#خادم-multiplayer)
- [قاعدة البيانات](#قاعدة-البيانات)
- [نسخ Player وDeveloper](#نسخ-player-وdeveloper)
- [الاختبارات والجودة](#الاختبارات-والجودة)
- [البناء والنشر](#البناء-والنشر)
- [إرشادات التطوير](#إرشادات-التطوير)
- [ملاحظات الأمان](#ملاحظات-الأمان)

---

# المزايا الرئيسية

## 🃏 نظام بطاقات متكامل

كل بطاقة في اللعبة يمكن أن تحتوي على مجموعة من الخصائص التي تدخل في منطق المعركة، مثل:

- الهجوم.
- الدفاع.
- الصحة.
- الندرة.
- العنصر.
- الخصائص الخاصة.
- القدرات الخاصة.
- التأثيرات التي تعمل أثناء الجولة أو بعدها.

يوجد فصل بين بيانات البطاقات، قواعد القتال، واجهة العرض، وحالة المباراة، مما يجعل منطق اللعبة قابلًا للاختبار والتطوير دون ربطه مباشرة بمكونات الواجهة.

## ⚔️ معارك متعددة الجولات

المباراة لا تعتمد فقط على قوة بطاقة منفردة. اللاعب يمر بعدة مراحل تشمل اختيار إعدادات المباراة، تحديد البطاقات، ترتيبها، ثم كشفها جولة بعد جولة وحساب النتيجة وفق قواعد اللعبة.

التدفق العام للمباراة الفردية:

```text
Splash / Home
      ↓
اختيار نمط اللعب
      ↓
اختيار الصعوبة
      ↓
إعداد عدد الجولات
      ↓
اختيار البطاقات وترتيبها
      ↓
المعركة
      ↓
حساب نتيجة كل جولة
      ↓
النتيجة النهائية
      ↓
تحديث الإحصاءات
```

## ✨ القدرات الخاصة

يحتوي المشروع على نظام قدرات منفصل عن مكونات الشاشة. بعض البطاقات لديها سلوك خاص يؤثر في نتيجة الجولة أو في حالة المباراة.

يوجد كذلك شاشات مستقلة لاستعراض القدرات وتعديلها، ما يجعل نظام القدرات جزءًا أساسيًا من تجربة اللعبة وليس مجرد تأثير بصري.

## 🌪️ نظام العناصر

تتعامل اللعبة مع عناصر مختلفة داخل منطق البطاقات والقتال، منها:

- 🔥 النار
- 💧 الماء
- 🌍 الأرض
- ⚡ البرق
- 🌪️ الريح

يمكن لقواعد العنصر أن تضيف أفضلية أو ضعفًا داخل المواجهة بحسب منطق اللعبة الحالي.

## 🤖 اللعب ضد البوت

يدعم وضع اللاعب الفردي اللعب ضد خصم آلي مع مستويات صعوبة متعددة.

منطق البوت منفصل عن واجهة الشاشة، لذلك يمكن تعديل استراتيجية الاختيار أو الموازنة دون إعادة كتابة واجهة المعركة.

## 📚 معرض ومجموعة البطاقات

يتضمن التطبيق أكثر من مجرد شاشة اختيار البطاقات، حيث توجد واجهات مخصصة لـ:

- عرض مجموعة اللاعب.
- معرض البطاقات.
- استعراض خصائص البطاقات.
- إضافة بطاقات.
- إدارة محتوى اللعبة.

## 📊 الإحصاءات والترتيب

يحتوي التطبيق على شاشات للإحصاءات وLeaderboard، بالإضافة إلى حفظ بيانات محلية مرتبطة بنتائج المباريات وتجربة اللاعب.

## 🧪 Sandbox

يوجد وضع Sandbox مخصص لتجربة أجزاء من اللعبة واختبار البطاقات والسلوكيات بعيدًا عن تدفق المباراة العادي.

هذا مفيد عند تطوير قدرة جديدة أو تعديل توازن بطاقة قبل دمج التغيير في تجربة اللعب الأساسية.

## ⚙️ الإعدادات

يحتوي التطبيق على شاشة إعدادات مستقلة لإدارة الخيارات المتعلقة بتجربة المستخدم واللعبة.

---

# أنماط اللعب

يدعم المشروع أكثر من مسار لعب.

| النمط | الوصف |
|---|---|
| **Single Player** | مواجهة ضد بوت مع اختيار مستوى الصعوبة. |
| **Online Multiplayer** | لاعبان يتصلان بخادم WebSocket، ينشئ أحدهما غرفة وينضم الآخر إليها. |
| **Local LAN** | اتصال بين أجهزة على الشبكة المحلية باستخدام قدرات الشبكة الموجودة في التطبيق. |
| **Sandbox** | بيئة اختبار لتجربة اللعبة والبطاقات دون المرور بالتدفق الكامل للمباراة. |

---

# نظام البطاقات والقتال

منطق المعركة موجود في طبقة مستقلة داخل `lib/game/` بدل وضع قواعد اللعبة داخل ملفات React.

الفكرة الأساسية هي أن واجهة React Native مسؤولة عن:

- عرض البطاقات.
- استقبال تفاعل اللاعب.
- تشغيل الحركات والتأثيرات البصرية.
- عرض حالة الجولة والنتيجة.

بينما طبقة اللعبة مسؤولة عن:

- تطبيق القدرات.
- مقارنة البطاقات.
- حساب تأثير العناصر.
- تطبيق الخصائص الخاصة.
- تحديد الفائز في الجولة.
- تحديث حالة المباراة.

تسلسل الحساب المنطقي يكون بصورة عامة كالتالي:

```text
بداية الجولة
   ↓
تطبيق التأثيرات/القدرات المطلوبة
   ↓
تطبيق خصائص البطاقة الخاصة
   ↓
قراءة الإحصاءات والعناصر
   ↓
حساب نتيجة المواجهة
   ↓
تطبيق تأثيرات ما بعد الجولة
   ↓
تحديث النتيجة وحالة المباراة
```

> عند إضافة قاعدة قتال جديدة، الأفضل وضعها في طبقة `lib/game/` وإضافة اختبار لها بدل تضمينها مباشرة داخل `battle.tsx`.

---

# اللعب الجماعي عبر الإنترنت

يستخدم Card Clash خادم WebSocket مستقل للمباريات الجماعية.

المكونات الرئيسية للنظام:

```text
Expo / React Native Client
          │
          │ WebSocket
          ▼
/multiplayer
          │
          ▼
Multiplayer Server
          │
          ├── Room Manager
          ├── Player Sessions
          ├── Turn Validation
          ├── Battle Synchronization
          └── Match State
```

## تدفق المباراة الجماعية

```text
Player 1
   ↓
إنشاء غرفة
   ↓
الحصول على Room ID
   ↓
انتظار لاعب آخر

Player 2
   ↓
إدخال Room ID
   ↓
الانضمام إلى الغرفة

كلا اللاعبين
   ↓
اختيار/تجهيز البطاقات
   ↓
Ready
   ↓
بدء المعركة
   ↓
تبادل الأدوار وكشف البطاقات
   ↓
حساب الجولات
   ↓
النتيجة النهائية
```

## إدارة الدور

الخادم يحتفظ بحالة الدور الحالي ويرفض محاولات كشف بطاقة عندما لا يكون اللاعب صاحب الدور أو عندما تكون الجولة غير متوافقة مع حالة المباراة.

هذا مهم لأن العميل لا يجب أن يكون المصدر الوحيد للحقيقة في مباراة عبر الإنترنت.

## حالة الخادم الحالية

الغرف وحالة المباريات الجماعية تحفظ حاليًا **في ذاكرة عملية الخادم**.

هذا يعني أن التشغيل الحالي مناسب لنسخة Server واحدة، لكن تشغيل عدة نسخ متوازية خلف Load Balancer يحتاج إلى مخزن حالة مشترك مثل Redis قبل اعتباره تصميمًا موزعًا كاملًا.

للمزيد راجع:

- `MULTIPLAYER_DESIGN.md`
- `MULTIPLAYER_DEPLOYMENT.md`

---

# اللعب المحلي عبر LAN

المشروع يحتوي كذلك على شاشات مستقلة للعب عبر الشبكة المحلية:

```text
app/screens/local-lan.tsx
app/screens/lan-battle.tsx
```

كما توجد اعتماديات شبكية مثل:

- `react-native-tcp-socket`
- `react-native-zeroconf`
- `expo-network`

وتوجد صلاحيات Android خاصة بالشبكة والـWi-Fi، إضافة إلى إعدادات Bonjour على iOS لخدمة `_cardclash._tcp.`.

هذه الميزة تسمح ببناء تجربة لعب محلية بين أجهزة موجودة على الشبكة نفسها بدون الاعتماد فقط على خادم Multiplayer العام.

> ميزات LAN تحتاج عادةً إلى Native Build، وقد لا تعمل جميع وظائف TCP/Bonjour داخل بيئة Expo Go بنفس طريقة النسخة الأصلية المبنية للتطبيق.

---

# التقنيات المستخدمة

## Frontend / Mobile

| التقنية | الاستخدام |
|---|---|
| **React 19** | بناء واجهة التطبيق. |
| **React Native 0.81** | تشغيل الواجهة على الأجهزة المحمولة. |
| **Expo 54** | بيئة التطوير والبناء وإدارة خصائص المنصات. |
| **Expo Router 6** | التنقل والمسارات المبنية على الملفات. |
| **TypeScript 5.9** | الأنواع والتحقق الساكن. |
| **React Native Reanimated** | الحركات والانتقالات. |
| **React Native Gesture Handler** | الإيماءات والتفاعل. |
| **NativeWind** | تنسيق الواجهات بأسلوب Tailwind. |
| **Expo Audio / Video** | الوسائط داخل التطبيق. |
| **Expo Haptics** | ردود الفعل اللمسية. |
| **AsyncStorage** | التخزين المحلي. |
| **Expo Secure Store** | تخزين بيانات حساسة محليًا عند الحاجة. |

## Networking / State

| التقنية | الاستخدام |
|---|---|
| **WebSocket / ws** | مزامنة اللعب الجماعي لحظيًا. |
| **React Query** | إدارة الطلبات والـserver state. |
| **tRPC** | API typed بين TypeScript client/server. |
| **Axios** | طلبات HTTP عند الحاجة. |
| **Zod** | التحقق من البيانات والـschemas. |

## Backend

| التقنية | الاستخدام |
|---|---|
| **Node.js** | Runtime للخوادم والأدوات. |
| **Express 4** | خادم HTTP/API. |
| **tRPC Server** | إجراءات API typed. |
| **ws** | WebSocket server للمباريات الجماعية. |

## Database

| التقنية | الاستخدام |
|---|---|
| **PostgreSQL** | قاعدة البيانات. |
| **Neon Serverless** | اتصال PostgreSQL serverless. |
| **Drizzle ORM** | الوصول للبيانات والـschema. |
| **Drizzle Kit** | توليد وتطبيق migrations. |

## Testing & Tooling

| التقنية | الاستخدام |
|---|---|
| **Vitest** | Unit tests ومنطق اللعبة. |
| **Playwright** | اختبارات UI / End-to-End. |
| **ESLint** | فحص جودة الكود. |
| **Prettier** | تنسيق الملفات. |
| **esbuild** | بناء خوادم Node للإنتاج. |
| **tsx** | تشغيل TypeScript مباشرة أثناء التطوير. |

---

# المتطلبات

قبل تشغيل المشروع تأكد من توفر:

- **Node.js 18 أو أحدث**.
- **pnpm 9.12.0**.
- Git.

للعمل على Android Native:

- Android Studio.
- Android SDK.
- Java/JDK مناسب لنسخة Expo/React Native المستخدمة.

للعمل على iOS Native:

- macOS.
- Xcode.
- CocoaPods عند الحاجة.

يمكن تثبيت pnpm بالأمر:

```bash
npm install -g pnpm@9.12.0
```

أو عبر Corepack:

```bash
corepack enable
corepack prepare pnpm@9.12.0 --activate
```

---

# التثبيت والتشغيل

## 1. استنساخ المستودع

```bash
git clone https://github.com/ayf09/CardClash.git
cd CardClash/CardClash
```

> التطبيق الفعلي موجود حاليًا داخل مجلد `CardClash/` الموجود داخل المستودع.

## 2. تثبيت الاعتماديات

```bash
pnpm install
```

## 3. إنشاء ملف البيئة

أنشئ `.env` محليًا من ملف المثال:

```bash
cp .env.example .env
```

ثم عدّل القيم بحسب بيئة التطوير.

## 4. تشغيل بيئة التطوير الأساسية

```bash
pnpm dev
```

هذا الأمر يستخدم `concurrently` لتشغيل:

```text
pnpm dev:server
pnpm dev:metro
```

أي أنه يشغّل خادم API/tRPC وExpo Metro في الوقت نفسه.

## 5. تشغيل خادم Multiplayer

في Terminal ثانية:

```bash
pnpm server:multiplayer
```

الخادم يعمل افتراضيًا على:

```text
http://localhost:3001
```

ومسار WebSocket هو:

```text
ws://localhost:3001/multiplayer
```

## 6. فحص الخادم

Health check:

```text
GET http://localhost:3001/health
```

عرض الغرف الحالية:

```text
GET http://localhost:3001/rooms
```

مثال استجابة `/health`:

```json
{
  "status": "ok",
  "uptime": 123.4,
  "rooms": 1,
  "activePlayers": 2,
  "timestamp": "..."
}
```

---

# متغيرات البيئة

لا تضع أسرارًا حقيقية داخل Git.

استخدم `.env` محليًا، ومتغيرات البيئة في منصة الاستضافة للإنتاج.

مثال آمن:

```env
# PostgreSQL / Neon
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DATABASE?sslmode=require

# عنوان خادم اللعب الجماعي الذي يستخدمه تطبيق Expo
EXPO_PUBLIC_MP_SERVER_URL=ws://192.168.1.10:3001/multiplayer

# منفذ خادم Multiplayer
MULTIPLAYER_PORT=3001

# عنوان الاستماع للخادم - اختياري
HOST=0.0.0.0
```

## `DATABASE_URL`

مطلوب عند استخدام وظائف قاعدة البيانات وDrizzle.

في الإنتاج يفضل PostgreSQL عبر TLS، مثل Neon أو خدمة PostgreSQL أخرى موثوقة.

## `EXPO_PUBLIC_MP_SERVER_URL`

لأن المتغير يبدأ بـ `EXPO_PUBLIC_` فهو يصبح متاحًا داخل تطبيق العميل.

لذلك:

**لا تضع أي Secret أو Token خاص داخل هذا المتغير.**

للتطوير على الهاتف الحقيقي، `localhost` يشير إلى الهاتف نفسه وليس إلى جهاز الكمبيوتر. استخدم عنوان IP الخاص بجهاز التطوير على الشبكة، مثل:

```env
EXPO_PUBLIC_MP_SERVER_URL=ws://192.168.1.25:3001/multiplayer
```

وفي الإنتاج استخدم `wss://`:

```env
EXPO_PUBLIC_MP_SERVER_URL=wss://multiplayer.example.com/multiplayer
```

## `MULTIPLAYER_PORT`

المنفذ الافتراضي:

```text
3001
```

إذا لم تحدده، يستخدم الخادم `3001` تلقائيًا.

---

# أوامر المشروع

جميع الأوامر التالية تنفذ من مجلد:

```text
CardClash/CardClash
```

| الأمر | الوظيفة |
|---|---|
| `pnpm dev` | تشغيل خادم API وMetro معًا. |
| `pnpm dev:server` | تشغيل خادم API الأساسي بوضع watch. |
| `pnpm dev:metro` | تشغيل Expo للويب على المنفذ 8081. |
| `pnpm server:multiplayer` | تشغيل خادم Multiplayer بوضع التطوير والمراقبة. |
| `pnpm build:multiplayer` | بناء Multiplayer Server إلى `dist/multiplayer-server.js`. |
| `pnpm start:multiplayer` | تشغيل نسخة Multiplayer المبنية للإنتاج. |
| `pnpm build` | بناء خادم API باستخدام esbuild. |
| `pnpm start` | تشغيل خادم API المبني من `dist/index.js`. |
| `pnpm android` | تشغيل Android Native Build. |
| `pnpm android:player` | تشغيل نسخة Android من نوع Player. |
| `pnpm android:developer` | تشغيل نسخة Android Developer. |
| `pnpm ios` | تشغيل iOS Native Build. |
| `pnpm check` | تشغيل TypeScript type-check بدون توليد ملفات. |
| `pnpm lint` | تشغيل Expo ESLint. |
| `pnpm format` | تنسيق المشروع باستخدام Prettier. |
| `pnpm test` | تشغيل اختبارات Vitest. |
| `pnpm test:ui` | تشغيل اختبارات Playwright. |
| `pnpm db:push` | توليد migrations ثم تطبيقها عبر Drizzle. |
| `pnpm qr` | تشغيل أداة إنشاء QR الخاصة بالمشروع. |
| `pnpm config:android:player` | عرض Expo public config لنسخة Player. |
| `pnpm config:android:developer` | عرض Expo public config لنسخة Developer. |

---

# بنية المشروع

```text
CardClash/
├── app/
│   ├── _layout.tsx
│   ├── index.tsx
│   ├── oauth/
│   └── screens/
│       ├── abilities.tsx
│       ├── add-card.tsx
│       ├── battle.tsx
│       ├── battle-results.tsx
│       ├── card-selection.tsx
│       ├── cards-gallery.tsx
│       ├── collection.tsx
│       ├── content-admin.tsx
│       ├── difficulty.tsx
│       ├── edit-ability.tsx
│       ├── game-mode.tsx
│       ├── how-to-play.tsx
│       ├── lan-battle.tsx
│       ├── leaderboard.tsx
│       ├── local-lan.tsx
│       ├── multiplayer-battle.tsx
│       ├── multiplayer-lobby.tsx
│       ├── multiplayer-results.tsx
│       ├── multiplayer-waiting.tsx
│       ├── rounds-config.tsx
│       ├── sandbox.tsx
│       ├── settings.tsx
│       ├── splash.tsx
│       └── stats.tsx
│
├── components/
│   ├── game/
│   ├── modals/
│   └── ui/
│
├── lib/
│   ├── game/
│   ├── multiplayer/
│   ├── stats/
│   └── trpc.ts
│
├── server/
│   ├── _core/
│   ├── multiplayer/
│   └── index.ts
│
├── drizzle/
├── assets/
├── scripts/
├── app.config.js
├── babel.config.js
├── MULTIPLAYER_DESIGN.md
├── MULTIPLAYER_DEPLOYMENT.md
├── package.json
└── README.md
```

## `app/`

مسارات التطبيق والشاشات باستخدام Expo Router.

## `components/`

المكونات القابلة لإعادة الاستخدام، خصوصًا مكونات البطاقات والمعركة والنوافذ المنبثقة وعناصر UI العامة.

## `lib/game/`

القلب المنطقي للعبة.

يجب أن تبقى قواعد المواجهة والبطاقات والقدرات والبوت داخل هذه الطبقة قدر الإمكان.

## `lib/multiplayer/`

منطق عميل اللعب الجماعي وحالة الاتصال والمزامنة.

## `server/_core/`

الخادم الأساسي وطبقة API/tRPC والبنية الخلفية العامة.

## `server/multiplayer/`

إدارة الغرف ورسائل WebSocket ومنطق Multiplayer server.

## `drizzle/`

Schema ومخرجات migrations المتعلقة بقاعدة البيانات.

---

# المعمارية

المشروع يجمع بين تطبيق Expo وخدمتين خلفيتين منطقيًا:

```text
┌──────────────────────────────────────────┐
│          React Native / Expo App         │
│                                          │
│  Screens → Components → Game Logic       │
│                 │                        │
│                 ├──── AsyncStorage       │
│                 ├──── tRPC Client        │
│                 └──── WebSocket Client   │
└──────────────────┬──────────────┬────────┘
                   │              │
                   │ HTTP/tRPC    │ WebSocket
                   ▼              ▼
       ┌──────────────────┐  ┌──────────────────────┐
       │ API / tRPC Server│  │ Multiplayer Server   │
       │ Express          │  │ Room Manager         │
       │ Drizzle          │  │ Match State          │
       └────────┬─────────┘  └──────────────────────┘
                │
                ▼
       ┌──────────────────┐
       │ PostgreSQL / Neon│
       └──────────────────┘
```

هذا الفصل مهم لأن Multiplayer له دورة حياة ومتطلبات مختلفة عن HTTP API التقليدي.

---

# خادم Multiplayer

نقطة تشغيل الخادم:

```text
server/index.ts
```

الخادم ينشئ HTTP Server ثم يربط عليه WebSocket Multiplayer.

الإعدادات الافتراضية:

```text
HOST=0.0.0.0
MULTIPLAYER_PORT=3001
WebSocket path=/multiplayer
```

ويقدم أيضًا:

```text
GET /health
GET /rooms
```

## البناء للإنتاج

```bash
pnpm build:multiplayer
```

ينشئ:

```text
dist/multiplayer-server.js
```

ثم:

```bash
pnpm start:multiplayer
```

## ملاحظة Scaling مهمة

حالة الغرف موجودة داخل ذاكرة العملية حاليًا.

لذلك لا تشغل عدة instances بشكل عشوائي بدون أحد الحلول التالية:

- Redis / shared state store.
- Sticky sessions مع تصميم يدعم الاستعادة.
- خدمة غرف مركزية.
- إعادة تصميم الحالة لتصبح موزعة.

وإلا قد يدخل لاعبان إلى instances مختلفة ولا يتمكنا من مشاركة نفس حالة الغرفة.

---

# قاعدة البيانات

يستخدم المشروع:

```text
Drizzle ORM
     ↓
PostgreSQL
     ↓
Neon Serverless compatible driver
```

بعد إعداد `DATABASE_URL` يمكن تطبيق تغييرات المخطط بواسطة:

```bash
pnpm db:push
```

الأمر الحالي ينفذ:

```text
drizzle-kit generate
        ↓
drizzle-kit migrate
```

قبل تطبيق migration على production:

1. راجع SQL الناتج.
2. خذ نسخة احتياطية إن كانت البيانات مهمة.
3. لا تشغّل migration غير مختبرة مباشرة على قاعدة الإنتاج.

---

# نسخ Player وDeveloper

يدعم `app.config.js` نوعين من البناء عبر المتغير:

```text
APP_VARIANT
```

## Player

هو الوضع الافتراضي للمستخدم النهائي.

```bash
pnpm android:player
```

## Developer

نسخة منفصلة مخصصة للتطوير والتشخيص.

```bash
pnpm android:developer
```

يغيّر App Config الاسم والـslug وpackage/bundle identifier والـscheme بحيث يمكن فصل النسخة التطويرية عن نسخة اللاعب.

يمكن فحص config الناتج بدون البناء:

```bash
pnpm config:android:player
pnpm config:android:developer
```

---

# الاختبارات والجودة

قبل دمج أي تغيير مهم يفضل تشغيل:

```bash
pnpm check
pnpm lint
pnpm test
```

ولواجهات E2E/UI:

```bash
pnpm test:ui
```

## TypeScript

```bash
pnpm check
```

ينفذ:

```bash
tsc --noEmit
```

ويكشف أخطاء الأنواع بدون بناء المشروع.

## Unit Tests

```bash
pnpm test
```

يستخدم Vitest.

أي تعديل في هذه المناطق يجب أن يصاحبه اختبار عندما يكون ذلك ممكنًا:

- حساب نتيجة الجولة.
- تأثير العناصر.
- القدرات الخاصة.
- منطق البوت.
- ترتيب الأدوار.
- قواعد Multiplayer.
- أي إصلاح Bug كان سببه منطق قابل لإعادة الاختبار.

## UI Tests

```bash
pnpm test:ui
```

يستخدم Playwright.

---

# البناء والنشر

## خادم API

```bash
pnpm build
pnpm start
```

## Multiplayer Server

```bash
pnpm build:multiplayer
pnpm start:multiplayer
```

## Android

```bash
pnpm android
```

أو:

```bash
pnpm android:player
pnpm android:developer
```

## iOS

```bash
pnpm ios
```

## Expo / EAS

المشروع يحتوي على إعداد EAS داخل Expo config، كما توجد workflow خاصة بنشر APK عبر EAS ضمن GitHub Actions.

عند النشر تأكد من أن متغيرات البيئة الخاصة بالبنية المستهدفة مضبوطة على منصة البناء/الاستضافة بدل تضمينها داخل المستودع.

## نشر Multiplayer

يمكن نشر Multiplayer Server على خدمة Node تدعم اتصالات WebSocket طويلة العمر.

للتفاصيل راجع:

```text
MULTIPLAYER_DEPLOYMENT.md
```

في production استخدم:

```text
https:// → HTTP endpoints
wss://   → WebSocket
```

ولا تستخدم `ws://` عبر الإنترنت العام في نسخة الإنتاج.

---

# إرشادات التطوير

## إضافة بطاقة جديدة

عند إضافة بطاقة:

1. أضف بيانات البطاقة في طبقة بيانات اللعبة المناسبة.
2. حدد الإحصاءات والعنصر والندرة.
3. أضف القدرة الخاصة إن وجدت في طبقة منطق اللعبة.
4. أضف الـassets المطلوبة.
5. تحقق من ظهورها في المعرض والاختيار.
6. اختبر تأثيرها في المعركة.
7. أضف Unit Test إذا كانت تحتوي على قاعدة خاصة.

## تعديل قدرة

لا تعدّل النتيجة من داخل مكون React إذا كان التغيير قاعدة من قواعد اللعبة.

المسار الصحيح:

```text
UI interaction
      ↓
Game state/action
      ↓
Game engine / ability logic
      ↓
Result
      ↓
UI render
```

## تعديل Multiplayer Protocol

أي تغيير على رسالة WebSocket يجب أن يُراجع من الجهتين:

```text
Client
Server
```

واختبر على جهازين أو جلستين منفصلتين، خصوصًا:

- إنشاء الغرفة.
- الانضمام.
- Ready state.
- بداية المباراة.
- تبديل الدور.
- كشف البطاقة.
- الانقطاع وإعادة الاتصال إن كانت الحالة تدعمه.
- نهاية المباراة.

## المحافظة على الفصل بين الطبقات

تجنب:

```text
Screen → Database مباشرة
Screen → Server internals
Component → Game rule hardcoded داخل JSX
```

وفضّل:

```text
Screen
  ↓
Hook / state / service
  ↓
Game / API / Multiplayer layer
```

---

# ملاحظات الأمان

## لا ترفع الأسرار إلى Git

يجب ألا يحتوي أي من التالي على بيانات إنتاج حقيقية:

```text
.env
.env.example
README.md
source code
GitHub issues
client-side Expo config
```

`.env.example` يجب أن يحتوي فقط على placeholders.

إذا تم رفع Database URL أو Token حقيقي سابقًا، **حذف النص من آخر commit لا يكفي**؛ يجب كذلك تدوير/إلغاء الـcredential من مزود الخدمة.

## متغيرات `EXPO_PUBLIC_*`

أي متغير باسم يبدأ بـ:

```text
EXPO_PUBLIC_
```

يجب اعتباره معلومة عامة يمكن للمستخدم النهائي رؤيتها داخل bundle التطبيق.

لا تستخدمه للأسرار.

## WebSocket في الإنتاج

يفضل إضافة أو مراجعة:

- TLS عبر `wss://`.
- Authentication للجلسات.
- التحقق من payloads.
- Rate limiting.
- حد أقصى لحجم الرسالة.
- مهلة inactivity.
- حماية إنشاء الغرف من الإساءة.
- مراقبة وإغلاق الاتصالات غير الصالحة.

## Multiplayer Server authoritative state

كلما أمكن، يجب أن تكون القرارات الحساسة في المباراة متحققة من جهة الخادم بدل الوثوق الكامل برسائل العميل.

---

# Troubleshooting

## الهاتف لا يتصل بخادم Multiplayer

تأكد من الآتي:

1. الهاتف والكمبيوتر على شبكة تسمح بالاتصال بين الأجهزة.
2. الخادم يعمل على `0.0.0.0` وليس localhost فقط.
3. `EXPO_PUBLIC_MP_SERVER_URL` يحتوي IP الكمبيوتر الصحيح.
4. المنفذ `3001` غير محجوب بجدار الحماية.
5. المسار ينتهي بـ `/multiplayer`.

مثال:

```env
EXPO_PUBLIC_MP_SERVER_URL=ws://192.168.1.25:3001/multiplayer
```

## قاعدة البيانات لا تعمل

تحقق من:

```bash
DATABASE_URL
```

ثم جرّب:

```bash
pnpm db:push
```

وتأكد من أن عنوان PostgreSQL يسمح بالاتصال من بيئة التشغيل الحالية.

## مشاكل بعد تحديث الاعتماديات

ابدأ بفحص الأنواع والـlint والاختبارات:

```bash
pnpm check
pnpm lint
pnpm test
```

وفي حال كانت المشكلة خاصة بـExpo/Native modules، تحقق من توافق نسخة المكتبة مع Expo SDK 54 قبل رفع إصدارها يدويًا.

---

# قبل فتح Pull Request

قائمة مراجعة مختصرة:

```text
[ ] pnpm check ينجح
[ ] pnpm lint ينجح
[ ] pnpm test ينجح
[ ] تم اختبار التدفق المتأثر يدويًا
[ ] لم تتم إضافة أسرار أو credentials
[ ] تمت إضافة/تحديث الاختبارات لمنطق اللعبة الجديد
[ ] تم اختبار Multiplayer على جلستين إذا تغير البروتوكول
[ ] تم التحقق من Android/iOS إذا تغير Native config
```

---

# ملفات توثيق إضافية

| الملف | الغرض |
|---|---|
| `README.md` | التوثيق الرئيسي للمشروع. |
| `MULTIPLAYER_DESIGN.md` | شرح تصميم وبروتوكول نظام اللعب الجماعي. |
| `MULTIPLAYER_DEPLOYMENT.md` | تشغيل ونشر خادم Multiplayer. |
| `design.md` | مرجع تصميم وتجربة المستخدم إن كان مستخدمًا في النسخة الحالية. |

---

<div align="center">

## Card Clash

**Built with React Native · Expo · TypeScript · tRPC · Drizzle · PostgreSQL · WebSocket**

مشروع لعبة بطاقات يركز على فصل منطق القتال عن الواجهة، ودعم اللعب الفردي والجماعي من قاعدة كود واحدة.

</div>
