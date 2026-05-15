import React, { useState, useEffect, useCallback } from 'react';
import {
  View, TouchableOpacity, StyleSheet, ScrollView, Modal,
  TextInput, Switch, Text as RNText, Image, Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemedText as Text } from '@/components/ui/ThemedText';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { LuxuryBackground } from '@/components/game/luxury-background';
import { LuxuryCharacterCardAnimated } from '@/components/game/luxury-character-card-animated';
import { RotateHintScreen } from '@/components/game/RotateHintScreen';
import { ALL_CARDS } from '@/lib/game/cards-data-exports';
import { Card, CardRarity, CardClass, Element, Race, Tag, Gender, RageModeData, ELEMENT_EMOJI, RACE_EMOJI, CLASS_EMOJI, GENDER_EMOJI, GENDER_COLORS } from '@/lib/game/types';
import { getRarityConfig } from '@/lib/game/card-rarity';
import { useLandscapeLayout, useCardSize, LAYOUT_PADDING } from '@/utils/layout';
import { ArrowLeft, Minus, Plus, Image as ImageIcon, Film, X, ChevronUp, ChevronDown, Zap, Trash2, Filter } from 'lucide-react-native';
import { saveImage, loadImage, deleteImage } from '@/lib/game/image-storage';
import { getRageOverrides, saveRageOverride, RageOverridesMap } from '@/lib/game/rage-store';
import { loadCustomCards, deleteCustomCard } from '@/lib/game/custom-cards-store';

export const CARD_EDITS_KEY = 'card_edits_v1';
export const DELETED_CARDS_KEY = 'deleted_cards_v1';

async function loadDeletedCardIds(): Promise<Set<string>> {
  try {
    const raw = await AsyncStorage.getItem(DELETED_CARDS_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch { return new Set(); }
}

async function saveDeletedCardIds(ids: Set<string>): Promise<void> {
  await AsyncStorage.setItem(DELETED_CARDS_KEY, JSON.stringify([...ids]));
}

function buildUniqueCards(base: Card[], custom: Card[]): Card[] {
  const map: Record<string, Card> = {};
  for (const c of base)   map[c.id] = c;
  for (const c of custom) map[c.id] = c;
  return Object.values(map);
}

const RARITY_ORDER: Record<string, number> = {
  special: 0, legendary: 1, epic: 2, rare: 3, common: 4,
};

type CardEdits = {
  nameAr: string;
  stars: number;
  hasAbility: boolean;
  specialAbility: string;
  attack: number;
  defense: number;
  customImage?: string;
  imageOffsetY: number;
  fitInsideBorder: boolean;
  rarity: CardRarity;
  isVideo: boolean;
  element: Element | null;
  race: Race | null;
  cardClass: CardClass | null;
  gender: Gender | null;
  tags: Tag[];
};

// ── Active gallery filters ─────────────────────────────
type GalleryFilters = {
  rarity: CardRarity | 'All';
  cardClass: CardClass | null;
  race: Race | null;
  gender: Gender | null;
  element: Element | null;
};

const DEFAULT_GALLERY_FILTERS: GalleryFilters = {
  rarity: 'All',
  cardClass: null,
  race: null,
  gender: null,
  element: null,
};

function isVideoUri(uri: string): boolean {
  if (!uri) return false;
  const lower = uri.toLowerCase();
  return lower.includes('.mp4') || lower.includes('.webm') || lower.includes('.mov')
      || lower.startsWith('data:video/');
}

function toStoreSafe(obj: Record<string, any>): Record<string, any> {
  const { customImage, finalImage, ...rest } = obj;
  return rest;
}

function toEdits(card: Card & { customImage?: string; imageOffsetY?: number; fitInsideBorder?: boolean; isVideo?: boolean }): CardEdits {
  return {
    nameAr: card.nameAr ?? '',
    stars: card.stars ?? 0,
    hasAbility: !!card.specialAbility,
    specialAbility: card.specialAbility ?? '',
    attack: card.attack,
    defense: card.defense,
    customImage: card.customImage,
    imageOffsetY: card.imageOffsetY ?? 0,
    fitInsideBorder: card.fitInsideBorder ?? false,
    rarity: card.rarity ?? 'common',
    isVideo: card.isVideo ?? (card.customImage ? isVideoUri(card.customImage) : false),
    element: card.element ?? null,
    race: card.race ?? null,
    cardClass: card.cardClass ?? null,
    gender: (card as any).gender ?? null,
    tags: card.tags ?? [],
  };
}

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

const RARITY_OPTIONS: { value: CardRarity; labelAr: string; color: string; stars: number }[] = [
  { value: 'common',    labelAr: 'عادي',    color: '#6366f1', stars: 1 },
  { value: 'rare',      labelAr: 'نادر',    color: '#f59e0b', stars: 3 },
  { value: 'epic',      labelAr: 'ملحمي',   color: '#8b5cf6', stars: 4 },
  { value: 'legendary', labelAr: 'أسطوري',  color: '#ef4444', stars: 5 },
  { value: 'special',   labelAr: 'خاص',     color: '#ec4899', stars: 5 },
];

// ✔ No ice — matches the 5-element system in types.ts
const ELEMENT_OPTIONS: { value: Element | null; label: string; icon: string; name: string }[] = [
  { value: null,        label: '✕ بدون',  icon: '✕',  name: 'بدون' },
  { value: 'fire',      label: `${ELEMENT_EMOJI.fire} نار`,    icon: ELEMENT_EMOJI.fire,      name: 'نار' },
  { value: 'water',     label: `${ELEMENT_EMOJI.water} ماء`,    icon: ELEMENT_EMOJI.water,     name: 'ماء' },
  { value: 'earth',     label: `${ELEMENT_EMOJI.earth} أرض`,    icon: ELEMENT_EMOJI.earth,     name: 'أرض' },
  { value: 'lightning', label: `${ELEMENT_EMOJI.lightning} برق`,   icon: ELEMENT_EMOJI.lightning, name: 'برق' },
  { value: 'wind',      label: `${ELEMENT_EMOJI.wind} ريح`,    icon: ELEMENT_EMOJI.wind,      name: 'ريح' },
];

const RACE_OPTIONS: { value: Race | null; label: string; icon: string; name: string }[] = [
  { value: null,      label: '✕ بدون',    icon: '✕',         name: 'بدون' },
  { value: 'human',   label: `${RACE_EMOJI.human} بشر`,    icon: RACE_EMOJI.human,   name: 'بشر' },
  { value: 'elf',     label: `${RACE_EMOJI.elf} إلف`,     icon: RACE_EMOJI.elf,     name: 'إلف' },
  { value: 'orc',     label: `${RACE_EMOJI.orc} أورك`,    icon: RACE_EMOJI.orc,     name: 'أورك' },
  { value: 'dragon',  label: `${RACE_EMOJI.dragon} تنين`,   icon: RACE_EMOJI.dragon,  name: 'تنين' },
  { value: 'demon',   label: `${RACE_EMOJI.demon} شيطان`,  icon: RACE_EMOJI.demon,   name: 'شيطان' },
  { value: 'undead',  label: `${RACE_EMOJI.undead} ميت`,     icon: RACE_EMOJI.undead,  name: 'ميت' },
  { value: 'monster', label: `${RACE_EMOJI.monster} وحش`,    icon: RACE_EMOJI.monster, name: 'وحش' },
  { value: 'robot',   label: `${RACE_EMOJI.robot} روبوت`,  icon: RACE_EMOJI.robot,   name: 'روبوت' },
];

// ✔ Updated: includes all 10 classes (original 6 + 4 new)
const CLASS_OPTIONS: { value: CardClass | null; label: string; icon: string; name: string }[] = [
  { value: null,          label: '✕ بدون',         icon: '✕',                      name: 'بدون' },
  { value: 'warrior',     label: `${CLASS_EMOJI.warrior} محارب`,     icon: CLASS_EMOJI.warrior,     name: 'محارب' },
  { value: 'knight',      label: `${CLASS_EMOJI.knight} فارس`,       icon: CLASS_EMOJI.knight,      name: 'فارس' },
  { value: 'mage',        label: `${CLASS_EMOJI.mage} ساحر`,         icon: CLASS_EMOJI.mage,        name: 'ساحر' },
  { value: 'archer',      label: `${CLASS_EMOJI.archer} رامي`,        icon: CLASS_EMOJI.archer,      name: 'رامي' },
  { value: 'berserker',   label: `${CLASS_EMOJI.berserker} ضاري`,    icon: CLASS_EMOJI.berserker,   name: 'ضاري' },
  { value: 'paladin',     label: `${CLASS_EMOJI.paladin} بالادين`,   icon: CLASS_EMOJI.paladin,     name: 'بالادين' },
  { value: 'swordsman',   label: `${CLASS_EMOJI.swordsman} سياف`,      icon: CLASS_EMOJI.swordsman,   name: 'سياف' },
  { value: 'fighter',     label: `${CLASS_EMOJI.fighter} مقاتل`,     icon: CLASS_EMOJI.fighter,     name: 'مقاتل' },
  { value: 'guardian',    label: `${CLASS_EMOJI.guardian} والي`,      icon: CLASS_EMOJI.guardian,    name: 'والي' },
  { value: 'healer',      label: `${CLASS_EMOJI.healer} طبيب`,       icon: CLASS_EMOJI.healer,      name: 'طبيب' },
];

const GENDER_OPTIONS: { value: Gender | null; label: string; icon: string; name: string }[] = [
  { value: null,      label: '✕ بدون',  icon: '✕',                   name: 'بدون' },
  { value: 'male',    label: 'ذكر',    icon: GENDER_EMOJI.male,    name: 'ذكر' },
  { value: 'female',  label: 'أنثى',   icon: GENDER_EMOJI.female,  name: 'أنثى' },
  { value: 'unknown', label: 'غير محدد', icon: GENDER_EMOJI.unknown, name: 'غير محدد' },
];

// ─────────────────────────────────────────────────────────
// FilterChip
// ─────────────────────────────────────────────────────────
function FilterChip({
  icon, name, active, color, onPress,
}: {
  icon: string; name: string; active: boolean; color: string; onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[
        fc.chip,
        active
          ? { borderColor: color, backgroundColor: color + '18', shadowColor: color, shadowOpacity: 0.4, shadowRadius: 6, elevation: 5 }
          : { borderColor: '#1e1e2a', backgroundColor: '#0d0d14' },
      ]}
    >
      <RNText style={fc.icon}>{icon || '□'}</RNText>
      <RNText style={[fc.name, { color: active ? color : '#4a4a5a' }]} numberOfLines={1}>
        {name}
      </RNText>
      {active && <View style={[fc.dot, { backgroundColor: color }]} />}
    </TouchableOpacity>
  );
}

const fc = StyleSheet.create({
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 20, borderWidth: 1.5, marginRight: 6, marginBottom: 6,
  },
  icon:  { fontSize: 14 },
  name:  { fontSize: 11, fontWeight: '700' },
  dot:   { width: 5, height: 5, borderRadius: 3, marginLeft: 2 },
});

// ─────────────────────────────────────────────────────────
// GridTile
// ─────────────────────────────────────────────────────────
function GridTile({
  icon, name, active, color, onPress,
}: {
  icon: string; name: string; active: boolean; color: string; onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[
        gt.tile,
        active
          ? { borderColor: color, backgroundColor: '#0d0d14', shadowColor: color, shadowOpacity: 0.45, shadowRadius: 8, elevation: 6 }
          : { borderColor: '#1e1e2a', backgroundColor: '#0d0d14' },
      ]}
    >
      <View style={[gt.iconBadge, active ? { backgroundColor: color + '22', borderColor: color + '55' } : { backgroundColor: '#161620', borderColor: '#252530' }]}>
        <RNText style={gt.icon}>{icon || '□'}</RNText>
      </View>
      <RNText style={[gt.name, { color: active ? color : '#4a4a5a' }]} numberOfLines={1}>{name}</RNText>
      {active && <View style={[gt.dot, { backgroundColor: color }]} />}
    </TouchableOpacity>
  );
}

const gt = StyleSheet.create({
  tile: { width: 68, height: 62, borderRadius: 12, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', paddingVertical: 6, gap: 4 },
  iconBadge: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  icon: { fontSize: 16, lineHeight: 19, textAlign: 'center' },
  name: { fontSize: 9, fontWeight: '700', textAlign: 'center', letterSpacing: 0.3 },
  dot: { position: 'absolute', bottom: 5, width: 4, height: 4, borderRadius: 2 },
});

// ─────────────────────────────────────────────────────────
// IconPicker
// ─────────────────────────────────────────────────────────
function IconPicker<T extends string | null>({
  label, options, value, color, onChange,
}: {
  label: string;
  options: { value: T; label: string; icon: string; name: string }[];
  value: T | null;
  color: string;
  onChange: (v: T | null) => void;
}) {
  return (
    <View style={ip.wrap}>
      <RNText style={[ep.label, { marginBottom: 6 }]}>{label}</RNText>
      <View style={ip.grid}>
        {options.map(opt => {
          const active = opt.value === value || (opt.value === null && value === null);
          return (
            <GridTile
              key={String(opt.value)}
              icon={opt.icon}
              name={opt.name}
              active={active}
              color={opt.value === null ? '#f87171' : color}
              onPress={() => onChange(opt.value as T | null)}
            />
          );
        })}
      </View>
    </View>
  );
}

const ip = StyleSheet.create({
  wrap: { marginBottom: 6 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
});

function RarityPicker({ value, onChange }: { value: CardRarity; onChange: (r: CardRarity) => void }) {
  return (
    <View style={rp.row}>
      {RARITY_OPTIONS.map(opt => {
        const active = value === opt.value;
        return (
          <TouchableOpacity key={opt.value} onPress={() => onChange(opt.value)} activeOpacity={0.75}
            style={[rp.btn, { borderColor: active ? opt.color : opt.color + '33', backgroundColor: active ? opt.color + '22' : 'rgba(255,255,255,0.03)' }]}
          >
            <RNText style={[rp.txt, { color: active ? opt.color : opt.color + '88' }]}>{opt.labelAr}</RNText>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function StarPicker({ value, onChange }: { valu