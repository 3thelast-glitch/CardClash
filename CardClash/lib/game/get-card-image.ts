import type { ImageSourcePropType } from 'react-native';
import type { Card, CardRarity } from '@/lib/game/types';
import { COMMON_IMAGES, COMMON_VIDEOS } from '@/assets/characters/common';
import { RARE_IMAGES, RARE_VIDEOS } from '@/assets/characters/rare';
import { EPIC_IMAGES, EPIC_VIDEOS, EPIC_GIFS } from '@/assets/characters/epic';
import { LEGENDARY_IMAGES, LEGENDARY_VIDEOS, LEGENDARY_GIFS } from '@/assets/characters/legendary';
import { SPECIAL_IMAGES, SPECIAL_VIDEOS } from '@/assets/characters/special';
import { RAGE_IMAGES, RAGE_VIDEOS } from '@/assets/characters/rage';

const IMAGE_MAPS: Record<CardRarity, Record<string, ImageSourcePropType>> = {
  common: COMMON_IMAGES,
  rare: RARE_IMAGES,
  epic: EPIC_IMAGES,
  legendary: LEGENDARY_IMAGES,
  special: SPECIAL_IMAGES,
};

const VIDEO_MAPS: Record<CardRarity, Record<string, number>> = {
  common: COMMON_VIDEOS,
  rare: RARE_VIDEOS,
  epic: EPIC_VIDEOS,
  legendary: LEGENDARY_VIDEOS,
  special: SPECIAL_VIDEOS,
};

const GIF_MAPS: Partial<Record<CardRarity, Record<string, ImageSourcePropType>>> = {
  epic: EPIC_GIFS,
  legendary: LEGENDARY_GIFS,
};

export interface CardMediaResolution {
  readonly rarity: CardRarity;
  readonly imageSource: ImageSourcePropType | null;
  readonly videoSource: number | string | null;
  readonly isCustomImage: boolean;
}

type MediaCard = Card & {
  customImage?: string;
  finalImage?: ImageSourcePropType;
  videoUrl?: string | number;
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

function resolveStaticImage(card: MediaCard, rarity: CardRarity): ImageSourcePropType | null {
  if (card.customImage) return { uri: card.customImage };
  if (card.finalImage) return card.finalImage;

  const gif = GIF_MAPS[rarity]?.[card.id];
  if (gif) return gif;

  const localImage = IMAGE_MAPS[rarity]?.[card.id];
  if (localImage) return localImage;

  if (card.imageUrl) return { uri: card.imageUrl };
  return null;
}

/**
 * Pure media resolver used by presentation components.
 * It never assigns to card.videoUrl or any other game object field, so rendering
 * cannot change authoritative/cached card data as a side effect.
 */
export function getCardMedia(card: MediaCard): CardMediaResolution {
  if (card.isRagedVersion) {
    const rageKey = `${card.id}_rage`;
    const rageVideo = RAGE_VIDEOS[rageKey];
    const rageImage = RAGE_IMAGES[rageKey];
    if (rageVideo || rageImage) {
      return {
        rarity: card.rarity ?? resolveRarityFromAssets(card.id),
        imageSource: rageImage ?? null,
        videoSource: rageVideo ?? null,
        isCustomImage: false,
      };
    }
  }

  const rarity = card.rarity ?? resolveRarityFromAssets(card.id);
  const explicitVideo = card.videoUrl ?? null;
  const localVideo = VIDEO_MAPS[rarity]?.[card.id] ?? null;

  return {
    rarity,
    imageSource: resolveStaticImage(card, rarity),
    videoSource: explicitVideo ?? localVideo,
    isCustomImage: Boolean(card.customImage),
  };
}

/**
 * Backward-compatible image helper. For cards whose primary local asset is a
 * video this returns the best available static poster/fallback, but never mutates
 * the card to communicate the video. New video-aware UI should call getCardMedia.
 */
export function getCardImage(card: MediaCard): ImageSourcePropType | null {
  return getCardMedia(card).imageSource;
}
