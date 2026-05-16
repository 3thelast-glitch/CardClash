/**
 * sync_images.js
 * ينقل صور الشخصيات تلقائياً بناءً على ندرتها في ملف الكروت
 *
 * الاستخدام:
 *   node scripts/sync_images.js
 *
 * شغّله من داخل مجلد card-battle-mobile-main
 */

const fs   = require('fs');
const path = require('path');

// ============================================================
// الإعدادات
// ============================================================
const BASE_DIR   = path.join('assets', 'characters');
const CARDS_FILE = path.join('lib', 'game', 'cards.ts');
const TIERS      = ['legendary', 'epic', 'rare', 'common'];
const EXTS       = ['.png', '.gif', '.mp4'];

// ============================================================
// قراءة ملف الكروت واستخراج (id, rarity)
// ============================================================
function loadCards(filePath) {
  if (!fs.existsSync(filePath)) {
    console.error(`❌ ملف الكروت غير موجود: ${filePath}`);
    console.error('   تأكد أنك تشغّل السكريبت من داخل مجلد card-battle-mobile-main');
    process.exit(1);
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const pattern = /id\s*:\s*["'](\w+)["'][\s\S]*?rarity\s*:\s*["'](\w+)["']/g;
  const cards   = {};
  let match;

  while ((match = pattern.exec(content)) !== null) {
    cards[match[1]] = match[2].toLowerCase();
  }
  return cards;
}

// ============================================================
// تحديث index.ts — حذف سطر أو إضافته
// ============================================================
function removeFromIndex(indexPath, cardId) {
  if (!fs.existsSync(indexPath)) return;
  const lines    = fs.readFileSync(indexPath, 'utf-8').split('\n');
  const filtered = lines.filter(l => !l.includes(`'${cardId}'`) && !l.includes(`"${cardId}"`));
  fs.writeFileSync(indexPath, filtered.join('\n'), 'utf-8');
}

function addToIndex(indexPath, cardId, filename) {
  if (!fs.existsSync(indexPath)) return;
  let content    = fs.readFileSync(indexPath, 'utf-8');
  const newLine  = `    ${cardId}: require('./${filename}'),`;
  // أضف السطر قبل قوس الإغلاق الأول }
  content        = content.replace(/(\n};)/, `\n${newLine}\n};`);
  fs.writeFileSync(indexPath, content, 'utf-8');
}

// ============================================================
// الدالة الرئيسية
// ============================================================
function sync() {
  const cards = loadCards(CARDS_FILE);
  const total = Object.keys(cards).length;
  console.log(`📋 تم تحميل ${total} كرت من ملف الكروت\n`);

  let moved  = 0;
  let errors = 0;

  for (const [cardId, correctTier] of Object.entries(cards)) {
    if (!TIERS.includes(correctTier)) continue;

    const correctFolder = path.join(BASE_DIR, correctTier);

    for (const tier of TIERS) {
      if (tier === correctTier) continue;

      for (const ext of EXTS) {
        const wrongPath = path.join(BASE_DIR, tier, `${cardId}${ext}`);
        const rightPath = path.join(BASE_DIR, correctTier, `${cardId}${ext}`);

        if (fs.existsSync(wrongPath)) {
          try {
            fs.mkdirSync(correctFolder, { recursive: true });
            fs.renameSync(wrongPath, rightPath);

            // تحديث index.ts في المجلدين
            const wrongIndex = path.join(BASE_DIR, tier, 'index.ts');
            const rightIndex = path.join(BASE_DIR, correctTier, 'index.ts');
            removeFromIndex(wrongIndex, cardId);
            addToIndex(rightIndex, cardId, `${cardId}${ext}`);

            console.log(`  ✅ ${cardId}${ext}  [${tier}] → [${correctTier}]`);
            moved++;
          } catch (e) {
            console.error(`  ❌ فشل نقل ${cardId}${ext}: ${e.message}`);
            errors++;
          }
        }
      }
    }
  }

  console.log(`\n${'='.repeat(45)}`);
  console.log(`🎯 تم نقل  : ${moved} ملف`);
  if (errors)  console.log(`⚠️  أخطاء   : ${errors}`);
  if (moved === 0 && errors === 0)
    console.log('✨ كل الصور في مكانها الصحيح، لا يوجد شيء للنقل');
}

sync();
