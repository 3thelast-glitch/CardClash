# تدقيق بطاقات القدرات

## الهدف والنطاق

يوثق هذا الملف تدقيق نظام القدرات في لعبة **Card Clash**. يغطي التدقيق جميع الأنواع الـ54 المعلنة في `AbilityType`، بدءاً من تفعيل القدرة ووصولاً إلى تسوية أثرها في الجولة أو في الجولات اللاحقة. تُنفذ القدرة `LoseHalfRounds` تلقائياً كعقوبة بطاقة Turin عند بدء المباراة؛ لذلك لا تمر عبر إجراء تفعيل يدوي.

| جانب التحقق | النتيجة |
|---|---|
| أنواع القدرات المعلنة | 54 قدرة |
| تفعيل قدرات يدوية | 53 قدرة |
| قدرة تلقائية | `LoseHalfRounds` عبر عقوبة Turin |
| اختبارات القدرات | 77 اختباراً ناجحاً |
| اختبارات المشروع كاملة | 139 اختباراً ناجحاً واختبار واحد متخطى |
| فحص TypeScript | ناجح بلا أخطاء |
| فحص ESLint | 0 أخطاء حاجبة و135 تحذيراً قديماً |

## نطاق الاختبارات

تتحقق `lib/game/__tests__/abilities.test.ts` من اكتمال كتالوج القدرات ومن أن كل قدرة يدوية تُستهلك مرة واحدة وتنتج التغيير أو التأثير المتوقع. كما تغطي اختبارات السلوك الفعلي الفئات التالية.

| الفئة | أمثلة القدرات المدققة |
|---|---|
| تعديل البطاقات والسجل | Recall، Arise، Revive، Disaster، Dilemma، Merge، SwapClass، AddElement، InfinityLoop |
| حماية النقاط والنتائج | Protection، Shield، HalvePoints، Pool، Trap، Skip، StarSuperiority، AbsoluteDominance |
| نقاط الجولة والمكافآت | DoublePoints، DoubleOrNothing، Lifesteal، Reinforcement، Greed، Revenge، Compensation، Explosion، ConsecutiveLossBuff |
| التنبؤ والتحكم | LogicalEncounter، Seal، CancelAbility، Popularity، Sniping، Suicide، Sacrifice |
| التأثيرات والإحصاءات | Reduction، Eclipse، Penetration، Subhan، Propaganda، Avatar، Rescue، DoubleNextCards، PhantomBlade، ElementalMastery |
| إدارة التأثيرات والقدرات | Wipe، Purge، ConvertDebuffsToBuffs، DoubleYourBuffs، Conversion، TakeIt، Deprivation، Misdirection، StealAbility |
| العقوبة التلقائية | LoseHalfRounds / Turin |

## إصلاحات ناتجة عن التدقيق

| القدرة أو البنية | المشكلة المكتشفة | الإصلاح |
|---|---|---|
| `Skip` | كانت النتيجة الإجبارية تعامل دائماً كفوز لصاحب الأثر، رغم أن القدرة تطلب التعادل. | تُقرأ قيمة `outcome: 'draw'` الآن وتنتج تعادلاً بلا خسارة نقاط. |
| `StarSuperiority` | كانت تغيّر النقاط من دون تحديث الفائز المسجل وحالة البطاقة. | تُحسم الجولة الآن لصالح صاحب القدرة قبل التسوية العادية، مع بقاء أولوية النتائج الإجبارية الأعلى. |
| `StealAbility` | كانت القدرة المسروقة تُضاف مؤقتاً ثم تُفقد عند تعليم بطاقة السرقة بأنها مستخدمة. | يعتمد استهلاك القدرة على قائمة القدرات المحدثة، فتُحفظ القدرة المسروقة ويُعلَّم مصدرها في قائمة الخصم كمستخدم. |
| أنواع التأثيرات | كانت ثلاثة تأثيرات موجودة في التنفيذ خارج اتحاد `EffectKind`. | أضيفت `doubleDebuffs` و`doublePoints` و`elementalMastery` إلى الأنواع وعرضها في شريط التأثيرات. |

> عند إضافة قدرة جديدة، يجب تحديث `AbilityType` و`ABILITY_DETAILS` ومنطق `USE_ABILITY` ومنطق `PLAY_ROUND` عند الحاجة، ثم إضافة حالة تغطية إلى `abilities.test.ts`.

## أوامر التحقق

```bash
pnpm vitest run lib/game/__tests__/abilities.test.ts
pnpm test
pnpm check
pnpm lint
```
