# وضع اللعب المحلي عبر Wi‑Fi

## البنية

يعمل وضع LAN في هذا المشروع داخل الشبكة المحلية فقط. ينشر المضيف خدمة `_cardclash._tcp.local.` عبر Bonjour/mDNS، ثم يكتشفها اللاعب الآخر ويستخرج عنوان IPv4 المحلي والمنفذ `45983`. بعد الانضمام، تنتقل رسائل اللعب في اتصال TCP مباشر بين الهاتفين بإطارات JSON سطرية. لا يفتح هذا المسار WebSocket ولا WebRTC ولا STUN/TURN ولا يتصل بخادم إشارات أو خدمة إنترنت خارجية.

| خطوة اللعب | التقنية | الاعتماد الخارجي |
|---|---|---|
| نشر الغرفة | mDNS / Bonjour | لا يوجد |
| فحص الغرف | mDNS داخل Wi‑Fi | لا يوجد |
| الانضمام | TCP إلى IPv4 محلي | لا يوجد |
| إجراءات اللعب | `LAN_GAME_EVENT` عبر TCP | لا يوجد |

## إعداد الأجهزة

يتطلب هذا الوضع **Development Build** أو تطبيقاً أصلياً؛ معاينة الويب وExpo Go لا يمكنهما نشر mDNS أو الاستماع إلى خادم TCP خاص بالتطبيق. يجب أن يكون الهاتفان على نقطة Wi‑Fi نفسها وأن يكون AP Isolation أو Client Isolation معطلاً في الراوتر. يطلب iOS إذن الشبكة المحلية ويعلن نوع خدمة Bonjour، بينما يطلب Android أذونات حالة Wi‑Fi وmulticast.

```bash
pnpm exec expo prebuild --clean
pnpm exec expo run:android --device
# أو
pnpm exec expo run:ios --device
```

بعد التثبيت، يختار اللاعب **لعب محلي Wi‑Fi** من شاشة الأنماط. ينشئ اللاعب الأول غرفة، ثم يضغط اللاعب الثاني **تحديث الغرف** وينضم إلى الغرفة الظاهرة. ينبغي اختبار الاكتشاف على هاتفين فعليين؛ محاكي Android لا يدعم multicast/mDNS بصورة موثوقة.

## ملاحظة أمنية

تظل الرسائل داخل الشبكة المحلية لكن TCP في هذا الإصدار ليس طبقة TLS. لا تستخدم الوضع على شبكة عامة غير موثوقة. قبل الإطلاق العام، أضف مصافحة عشوائية للغرفة وحدود حجم للرسائل والتحقق من إصدارات البروتوكول.

## المراجع

[1] [Expo Network — Wi‑Fi وIPv4](https://docs.expo.dev/versions/latest/sdk/network/)

[2] [react-native-zeroconf — Bonjour/mDNS discovery and publishing](https://www.npmjs.com/package/react-native-zeroconf)

[3] [react-native-tcp-socket — TCP server and client for React Native](https://www.npmjs.com/package/react-native-tcp-socket)
