// ============================================================
// anime-cards-data.ts  — Auto-generated from anime_cards_v4.xlsx
// 192 cards | Updated: 2026-05-15
// ============================================================

export type Rarity   = 'Common' | 'Rare' | 'Epic' | 'Legendary' | 'Special';
export type Gender   = 'male' | 'female' | 'unknown';
export type Element  = 'water' | 'fire' | 'wind' | 'earth' | 'ice' | 'lightning';

export interface AnimeCard {
  id:              string;
  nameAr:          string;
  universe:        string;
  gender:          Gender;
  attack:          number;
  defense:         number;
  race:            string;
  style:           string;
  element:         string;
  rarity:          Rarity;
  stars:           number;
  specialAbility?: string;
  rageMode?:       string;
}
