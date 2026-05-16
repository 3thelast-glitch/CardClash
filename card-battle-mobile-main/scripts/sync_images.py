"""
sync_images.py — ينقل صور الشخصيات تلقائياً بناءً على ندرتها في ملف الكروت
الاستخدام:
    python scripts/sync_images.py
"""

import os
import re
import shutil

# ============================================================
# الإعدادات
# ============================================================
BASE_DIR   = os.path.join("assets", "characters")
CARDS_FILE = os.path.join("lib", "game", "cards.ts")
TIERS      = ["legendary", "epic", "rare", "common"]
EXTS       = [".png", ".gif", ".mp4"]

# ============================================================
# قراءة ملف الكروت واستخراج (id, rarity) لكل كرت
# ============================================================
def load_cards(path: str) -> dict[str, str]:
    """يرجع dict من card_id → rarity"""
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    # نمط يتعامل مع السطور المتعددة بين id و rarity
    pattern = r'id\s*:\s*["\'](\w+)["\'].*?rarity\s*:\s*["\'](\w+)["\']'
    matches = re.findall(pattern, content, re.DOTALL)
    return {card_id: rarity.lower() for card_id, rarity in matches}

# ============================================================
# تحديث index.ts — حذف سطر أو إضافته
# ============================================================
def remove_from_index(index_path: str, card_id: str):
    """يحذف سطر الكرت من index.ts"""
    if not os.path.exists(index_path):
        return
    with open(index_path, "r", encoding="utf-8") as f:
        lines = f.readlines()
    new_lines = [l for l in lines if f"'{card_id}'" not in l and f'"{card_id}"' not in l]
    with open(index_path, "w", encoding="utf-8") as f:
        f.writelines(new_lines)


def add_to_index(index_path: str, card_id: str, filename: str):
    """يضيف سطر الكرت في index.ts مرتباً أبجدياً"""
    if not os.path.exists(index_path):
        return
    with open(index_path, "r", encoding="utf-8") as f:
        content = f.read()

    new_line = f"    {card_id}: require('./{filename}'),\n"

    # أضف السطر قبل قوس الإغلاق الأول }
    content = re.sub(r'(\n\};)', f"\n{new_line}}};", content, count=1)

    with open(index_path, "w", encoding="utf-8") as f:
        f.write(content)

# ============================================================
# الدالة الرئيسية
# ============================================================
def sync():
    if not os.path.exists(CARDS_FILE):
        print(f"❌ ملف الكروت غير موجود: {CARDS_FILE}")
        print("   تأكد أنك تشغّل السكريبت من داخل مجلد card-battle-mobile-main")
        return

    cards = load_cards(CARDS_FILE)
    print(f"📋 تم تحميل {len(cards)} كرت من ملف الكروت\n")

    moved = 0
    errors = 0

    for card_id, correct_tier in cards.items():
        if correct_tier not in TIERS:
            continue

        correct_folder = os.path.join(BASE_DIR, correct_tier)

        for tier in TIERS:
            if tier == correct_tier:
                continue

            for ext in EXTS:
                wrong_path = os.path.join(BASE_DIR, tier, f"{card_id}{ext}")
                right_path = os.path.join(BASE_DIR, correct_tier, f"{card_id}{ext}")

                if os.path.exists(wrong_path):
                    try:
                        os.makedirs(correct_folder, exist_ok=True)
                        shutil.move(wrong_path, right_path)

                        # تحديث index.ts في المجلدين
                        wrong_index = os.path.join(BASE_DIR, tier, "index.ts")
                        right_index = os.path.join(BASE_DIR, correct_tier, "index.ts")
                        remove_from_index(wrong_index, card_id)
                        add_to_index(right_index, card_id, f"{card_id}{ext}")

                        print(f"  ✅ {card_id}{ext}  [{tier}] → [{correct_tier}]")
                        moved += 1
                    except Exception as e:
                        print(f"  ❌ فشل نقل {card_id}{ext}: {e}")
                        errors += 1

    print(f"\n{'='*45}")
    print(f"🎯 تم نقل  : {moved} ملف")
    if errors:
        print(f"⚠️  أخطاء   : {errors}")
    if moved == 0 and errors == 0:
        print("✨ كل الصور في مكانها الصحيح، لا يوجد شيء للنقل")

if __name__ == "__main__":
    # اذهب لمجلد المشروع تلقائياً
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_dir = os.path.dirname(script_dir)
    os.chdir(project_dir)
    sync()
