import type { ImageSourcePropType } from 'react-native';
import type { Card, CardRarity } from '@/lib/game/types';
import { COMMON_IMAGES, COMMON_VIDEOS } from '@/assets/characters/common';
import { RARE_IMAGES } from '@/assets/characters/rare';
import { EPIC_IMAGES, EPIC_VIDEOS, EPIC_GIFS } from '@/assets/characters/epic';
import { LEGENDARY_IMAGES, LEGENDARY_VIDEOS } from '@/assets/characters/legendary';
import { SPECIAL_IMAGES, SPECIAL_VIDEOS } from '@/assets/characters/special';
import { RAGE_IMAGES, RAGE_VIDEOS } from '@/assets/characters/rage';

// ─── خرائط الصور لكل ندرة ────────────────────────────────────────────────────
const IMAGE_MAPS: Record<string, Record<string, any>> = {
    common: COMMON_IMAGES,
    rare: RARE_IMAGES,
    epic: EPIC_IMAGES,
    legendary: LEGENDARY_IMAGES,
    special: SPECIAL_IMAGES,
};

// ─── خرائط الفيديو لكل ندرة ──────────────────────────────────────────────────
const VIDEO_MAPS: Record<string, Record<string, any>> = {
    common: COMMON_VIDEOS,
    epic: EPIC_VIDEOS,
    legendary: LEGENDARY_VIDEOS,
    special: SPECIAL_VIDEOS,
};

// ─── خرائط GIF لكل ندرة ──────────────────────────────────────────────────────
const GIF_MAPS: Record<string, Record<string, any>> = {
    epic: EPIC_GIFS,
};

/**
 * يحدد ندرة الكرت تلقائياً بناءً على مكان الأصل (صورة أو فيديو أو GIF).
 * الترتيب: special → legendary → epic → rare → common
 */
export function resolveRarityFromAssets(cardId: string): CardRarity {
    const order: CardRarity[] = ['special', 'legendary', 'epic', 'rare', 'common'];
    for (const rarity of order) {
        if (VIDEO_MAPS[rarity]?.[cardId]) return rarity;
        if (GIF_MAPS[rarity]?.[cardId]) return rarity;
        if (IMAGE_MAPS[rarity]?.[cardId]) return rarity;
    }
    return 'common';
}

/**
 * يرجع مصدر الصورة للكرت.
 * - يحدد الندرة تلقائياً من مجلدات الأصول إذا لم تكن محددة.
 * - إذا كان للكرت فيديو/GIF محلي، يُسجَّل في card.videoUrl تلقائياً.
 */
export function getCardImage(
    card: Card & { customImage?: string; finalImage?: ImageSourcePropType }
): ImageSourcePropType | null {
    // ─── اعتراض الغضب كأولوية قصوى ──────────────────────────────────────────
    if ((card as any).isRagedVersion) {
        const rageFileName = `${card.id}_rage`;
        const rageVideo = RAGE_VIDEOS[rageFileName];
        if (rageVideo) {
            (card as any).videoUrl = rageVideo;
            return null;
        }
        const rageImage = RAGE_IMAGES[rageFileName];
        if (rageImage) {
            (card as any).videoUrl = null;
            return rageImage;
        }
    }

    // صورة مخصصة من المستخدم تتقدم على الكل
    if ((card as any).customImage) return { uri: (card as any).customImage };
    if (card.finalImage) return card.finalImage;

    // ─── تحديد الندرة تلقائياً من الأصول إذا لم تكن محددة ───────────────────
    const rarity: CardRarity = resolveRarityFromAssets(card.id);
    if (!card.rarity || card.rarity !== rarity) {
        (card as any).rarity = rarity;
    }

    // ─── فيديو محلي ──────────────────────────────────────────────────────────
    const localVideo = VIDEO_MAPS[rarity]?.[card.id];
    if (localVideo) {
        (card as any).videoUrl = localVideo;
        return null;
    }

    // ─── GIF محلي ────────────────────────────────────────────────────────────
    const localGif = GIF_MAPS[rarity]?.[card.id];
    if (localGif) {
        (card as any).videoUrl = null;
        return localGif;
    }

    // ─── صورة محلية ──────────────────────────────────────────────────────────
    const local = IMAGE_MAPS[rarity]?.[card.id];
    if (local) return local;

    // ─── صورة عن بعد (imageUrl) ───────────────────────────────────────────────
    if (card.imageUrl) return { uri: card.imageUrl };

    return null;
}
