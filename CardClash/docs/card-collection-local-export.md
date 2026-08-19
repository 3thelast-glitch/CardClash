# تحديث بيانات Card Collection محلياً ثم رفعها إلى GitHub

يظل التعديل داخل **Card Collection** محفوظاً محلياً أثناء اللعب. لجعل التعديل جزءاً من المشروع ونسخة GitHub، افتح نسخة الويب من اللعبة ثم استخدم زر **تصدير JSON** داخل Card Collection. ينتج المتصفح ملف JSON يحتوي على تعديلات الكروت، الكروت المخصصة، الكروت المحذوفة، أوضاع الغضب، والصور المحلية.

بعد تنزيل الملف، افتح PowerShell داخل مجلد التطبيق وشغّل الأمر التالي مع اسم الملف الذي نزّله المتصفح:

```powershell
Set-Location A:\01\CardClash\CardClash
node .\scripts\sync-card-collection-export.mjs "$env:USERPROFILE\Downloads\card-backup-YYYY-MM-DD.json"
```

يتحقق الأمر من بنية الملف قبل استبدال `data/card-collection.json`. إذا كان الملف غير صالح، يتوقف من دون تغيير أي ملف في المشروع.

بعد نجاح التحقق، راجع التغيير واحفظه في GitHub:

```powershell
git diff -- data/card-collection.json
git add data/card-collection.json
git commit -m "data: update Card Collection"
git push origin main
```

بعد رفع `data/card-collection.json` إلى GitHub، تصبح بياناته جزءاً من نسخة اللعبة الجديدة: عند سحب آخر تحديث وتشغيل التطبيق، يدمج Card Collection تلقائياً تعديلات الملف والكروت المخصصة والصور وأوضاع الغضب مع التخزين المحلي. تبقى تعديلات الجهاز المحلي أولوية إذا كانت أحدث ولم تُصدَّر بعد.

يمكن استخدام زر **استيراد JSON** أيضاً عندما تريد نسخ التعديلات إلى التخزين المحلي نفسه لجهاز آخر، لكنه لم يعد شرطاً لرؤية البيانات الموجودة في ملف المشروع.

> لا تضع رمز GitHub أو كلمة مرور داخل التطبيق أو ملف JSON. الرفع يتم من جهاز التطوير عبر Git فقط.
