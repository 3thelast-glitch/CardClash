import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Ability, Rarity } from '@/data/abilities';
import { ALL_ABILITIES } from './abilities';
import { getRarityFromStars } from './card-rarity';
import type { AbilityType, Card, CardClass, CardRarity, Gender, Race } from './types';

export interface CustomCardJson {
  id: string;
  name: string;
  nameAr: string;
  attack: number;
  defense: number;
  hp?: number;
  race: Race;
  cardClass: CardClass;
  /** قيمة قديمة اختيارية لتوافق ملفات الاستيراد السابقة؛ لا تؤثر في اللعب. */
  element?: Card['element'];
  tags?: string[];
  rarity?: CardRarity;
  stars?: number;
  specialAbility?: string;
  imageUrl?: string;
  videoUrl?: string;
  gender?: Gender;
  universe?: string;
  animationPreset?: Card['animationPreset'];
}

export interface CustomAbilityJson {
  id: string;
  nameEn: string;
  nameAr: string;
  description: string;
  descriptionWarning?: string;
  rarity: Rarity;
  iconKey?: string;
  /** Existing engine ability that executes when this custom label is selected. */
  runtimeType: AbilityType;
  isActive?: boolean;
  imageUrl?: string;
}

export interface CustomContentJson {
  cards: CustomCardJson[];
  abilities: CustomAbilityJson[];
}

export const CUSTOM_CONTENT_KEY = 'custom_content_v1';
export const CUSTOM_ABILITIES_KEY = 'custom_abilities_v1';

const RACES: Race[] = ['human', 'elf', 'orc', 'dragon', 'demon', 'undead', 'monster', 'robot'];
const CLASSES: CardClass[] = ['warrior', 'knight', 'mage', 'archer', 'berserker', 'paladin', 'swordsman', 'fighter', 'guardian', 'healer'];
const LEGACY_ELEMENTS = ['fire', 'water', 'earth', 'lightning', 'wind'] as const;
const RARITIES: CardRarity[] = ['common', 'rare', 'epic', 'legendary', 'special'];
const ABILITY_RARITIES: Rarity[] = ['Common', 'Rare', 'Epic', 'Legendary', 'Special'];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function nonEmpty(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function enumValue<T extends string>(value: unknown, values: readonly T[]): value is T {
  return typeof value === 'string' && values.includes(value as T);
}

function validNumber(value: unknown, min = 0, max = 99): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;
}

export function validateCustomCard(value: unknown): value is CustomCardJson {
  if (!isRecord(value)) return false;
  return nonEmpty(value.id) && nonEmpty(value.name) && nonEmpty(value.nameAr)
    && validNumber(value.attack, 1) && validNumber(value.defense, 1)
    && enumValue(value.race, RACES) && enumValue(value.cardClass, CLASSES)
    && (value.element === undefined || enumValue(value.element, LEGACY_ELEMENTS))
    && (value.hp === undefined || validNumber(value.hp, 1))
    && (value.stars === undefined || validNumber(value.stars, 0, 5))
    && (value.rarity === undefined || enumValue(value.rarity, RARITIES));
}

export function validateCustomAbility(value: unknown): value is CustomAbilityJson {
  if (!isRecord(value)) return false;
  return nonEmpty(value.id) && nonEmpty(value.nameEn) && nonEmpty(value.nameAr)
    && nonEmpty(value.description) && enumValue(value.rarity, ABILITY_RARITIES)
    && enumValue(value.runtimeType, ALL_ABILITIES);
}

export function parseCustomContentJson(raw: unknown): CustomContentJson {
  const source = isRecord(raw) ? raw : {};
  const cards = Array.isArray(source.cards) ? source.cards.filter(validateCustomCard) : [];
  const abilities = Array.isArray(source.abilities) ? source.abilities.filter(validateCustomAbility) : [];
  return { cards, abilities };
}

function bundledContent(): CustomContentJson {
  try {
    // JSON is bundled with Expo and is intentionally immutable at runtime.
    const raw = require('../../data/custom-cards.json') as unknown;
    return parseCustomContentJson(raw);
  } catch {
    return { cards: [], abilities: [] };
  }
}

function cardFromJson(card: CustomCardJson): Card {
  const stars = Math.max(0, Math.min(5, card.stars ?? 1));
  return {
    ...card,
    // لا تستخدم المعركة هذه القيمة؛ تُحفظ فقط لأن البيانات الأصلية لا تزال تحمل الحقل.
    element: card.element ?? 'fire',
    stars,
    rarity: getRarityFromStars(stars),
    hp: card.hp ?? card.defense,
  };
}

function dedupById<T extends { id: string }>(items: T[]): T[] {
  return Object.values(items.reduce<Record<string, T>>((acc, item) => {
    acc[item.id] = item;
    return acc;
  }, {}));
}

export async function loadCustomContent(): Promise<CustomContentJson> {
  const bundled = bundledContent();
  try {
    const raw = await AsyncStorage.getItem(CUSTOM_CONTENT_KEY);
    const stored = raw ? parseCustomContentJson(JSON.parse(raw)) : { cards: [], abilities: [] };
    return {
      cards: dedupById([...bundled.cards, ...stored.cards]),
      abilities: dedupById([...bundled.abilities, ...stored.abilities]),
    };
  } catch {
    return bundled;
  }
}

export async function saveCustomAbility(ability: CustomAbilityJson): Promise<void> {
  if (!validateCustomAbility(ability)) throw new Error('بيانات القدرة المخصصة غير صحيحة');
  const current = await loadCustomContent();
  const next = { ...current, abilities: dedupById([...current.abilities.filter(a => a.id !== ability.id), ability]) };
  await AsyncStorage.setItem(CUSTOM_CONTENT_KEY, JSON.stringify(next));
}

export async function deleteCustomAbility(id: string): Promise<void> {
  const current = await loadCustomContent();
  await AsyncStorage.setItem(CUSTOM_CONTENT_KEY, JSON.stringify({
    cards: current.cards,
    abilities: current.abilities.filter(ability => ability.id !== id),
  }));
}

export function customCardsToRuntime(cards: CustomCardJson[]): Card[] {
  return cards.map(cardFromJson);
}

function stableNumericId(id: string): number {
  let hash = 2166136261;
  for (let index = 0; index < id.length; index += 1) {
    hash ^= id.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash % 1000000000) + 100000;
}

export function customAbilityToRuntime(ability: CustomAbilityJson): Ability {
  return {
    id: stableNumericId(ability.id),
    nameEn: ability.nameEn,
    nameAr: ability.nameAr,
    description: ability.description,
    descriptionWarning: ability.descriptionWarning,
    rarity: ability.rarity,
    icon: null,
    isActive: ability.isActive ?? true,
    image: ability.imageUrl ? { uri: ability.imageUrl } : undefined,
  };
}

function quote(value: string): string {
  return JSON.stringify(value);
}

export function generateCustomAbilityCode(ability: CustomAbilityJson): string {
  return `  {\n    id: ${quote(ability.id)},\n    nameEn: ${quote(ability.nameEn)},\n    nameAr: ${quote(ability.nameAr)},\n    description: ${quote(ability.description)},\n    descriptionWarning: ${quote(ability.descriptionWarning ?? '')},\n    rarity: '${ability.rarity}',\n    iconKey: '${ability.iconKey ?? 'Zap'}',\n    runtimeType: '${ability.runtimeType}',\n    isActive: ${ability.isActive ?? true},\n    imageUrl: ${quote(ability.imageUrl ?? '')},\n  },`;
}

export function generateCustomContentCode(content: CustomContentJson): string {
  const cards = content.cards.map(card => `  ${JSON.stringify(card, null, 2).replace(/^/gm, '  ')}`).join(',\n');
  const abilities = content.abilities.map(generateCustomAbilityCode).join('\n');
  return `import type { CustomContentJson } from '@/lib/game/custom-content-store';\n\nexport const customContent: CustomContentJson = {\n  cards: [\n${cards}\n  ],\n  abilities: [\n${abilities}\n  ],\n};\n`;
}

export function generateCustomCardCode(card: CustomCardJson): string {
  return `  ${JSON.stringify(card, null, 2).replace(/^/gm, '  ')},`;
}

export const CUSTOM_CONTENT_EXAMPLE: CustomContentJson = {
  cards: [],
  abilities: [],
};

export async function loadCustomAbilities(): Promise<Ability[]> {
  const content = await loadCustomContent();
  return content.abilities.map(customAbilityToRuntime);
}

export async function loadCustomCardsFromJson(): Promise<Card[]> {
  const content = await loadCustomContent();
  return customCardsToRuntime(content.cards);
}

export { RARITIES as CUSTOM_CARD_RARITIES };
