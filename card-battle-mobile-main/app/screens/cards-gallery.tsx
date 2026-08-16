import React, { useState, useEffect } from 'react';
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
import {
  Card, CardRarity, CardClass, Element, Race, Tag, RageModeData,
  ELEMENT_EMOJI, RACE_EMOJI, CLASS_EMOJI, GENDER_EMOJI,
} from '@/lib/game/types';
import { getRarityConfig, getRarityFromStars } from '@/lib/game/card-rarity';
import { useLandscapeLayout, useCardSize, LAYOUT_PADDING } from '@/utils/layout';
import {
  ArrowLeft, Minus, Plus, Image as ImageIcon, Film, X,
  ChevronUp, ChevronDown, Zap, Trash2, Filter, Download, Upload,
} from 'lucide-react-native';
import { saveImage, loadImage, deleteImage } from '@/lib/game/image-storage';
import { getRageOverrides, saveRageOverride, RageOverridesMap } from '@/lib/game/rage-store';
import { loadCustomCards, deleteCustomCard } from '@/lib/game/custom-cards-store';
import { exportBackup, importBackup } from '@/lib/game/backup-restore';

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
  for (const c of base) map[c.id] = c;
  for (const c of custom) map[c.id] = c;
  return Object.values(map);
}

const RARITY_ORDER: Record<string, number> = { special: 0, legendary: 1, epic: 2, rare: 3, common: 4 };

type CardEdits = {
  nameAr: string; stars: number; hasAbility: boolean; specialAbility: string;
  attack: number; defense: number; customImage?: string; imageOffsetY: number;
  fitInsideBorder: boolean; rarity: CardRarity; isVideo: boolean;
  element: Element | null; race: Race | null; cardClass: CardClass | null;
  gender: 'male' | 'female'; tags: Tag[];
};

type GalleryFilters = {
  rarity: CardRarity | 'All';
  cardClass: CardClass | null;
  race: Race | null;
  gender: 'male' | 'female' | null;
  element: Element | null;
};
const DEFAULT_GALLERY_FILTERS: GalleryFilters = {
  rarity: 'All', cardClass: null, race: null, gender: null, element: null,
};

function isVideoUri(uri: string): boolean {
  if (!uri) return false;
  const l = uri.toLowerCase();
  return l.includes('.mp4') || l.includes('.webm') || l.includes('.mov') || l.startsWith('data:video/');
}
function toStoreSafe(obj: Record<string, any>): Record<string, any> {
  const { customImage, finalImage, ...rest } = obj; return rest;
}
function toEdits(card: Card & { customImage?: string; imageOffsetY?: number; fitInsideBorder?: boolean; isVideo?: boolean }): CardEdits {
  const g = (card as any).gender;
  return {
    nameAr: card.nameAr ?? '', stars: card.stars ?? 0,
    hasAbility: !!card.specialAbility, specialAbility: card.specialAbility ?? '',
    attack: card.attack, defense: card.defense,
    customImage: card.customImage, imageOffsetY: card.imageOffsetY ?? 0,
    fitInsideBorder: card.fitInsideBorder ?? false, rarity: card.rarity ?? 'common',
    isVideo: card.isVideo ?? (card.customImage ? isVideoUri(card.customImage) : false),
    element: card.element ?? null, race: card.race ?? null,
    cardClass: card.cardClass ?? null,
    gender: (g === 'female') ? 'female' : 'male',
    tags: card.tags ?? [],
  };
}
const clamp = (v: number, mn: number, mx: number) => Math.min(mx, Math.max(mn, v));

// ─── Data Options ────────────────────────────────────────────────────
const RARITY_OPTIONS: { value: CardRarity; labelAr: string; color: string; stars: number }[] = [
  { value: 'common', labelAr: 'عادي', color: '#6366f1', stars: 1 },
  { value: 'rare', labelAr: 'نادر', color: '#f59e0b', stars: 3 },
  { value: 'epic', labelAr: 'ملحمي', color: '#8b5cf6', stars: 4 },
  { value: 'legendary', labelAr: 'أسطوري', color: '#ef4444', stars: 5 },
  { value: 'special', labelAr: 'خاص', color: '#ec4899', stars: 5 },
];
const ELEMENT_OPTIONS: { value: Element | null; label: string; icon: string; name: string }[] = [
  { value: null, label: '✕ بدون', icon: '✕', name: 'بدون' },
  { value: 'fire', label: `${ELEMENT_EMOJI.fire} نار`, icon: ELEMENT_EMOJI.fire, name: 'نار' },
  { value: 'water', label: `${ELEMENT_EMOJI.water} ماء`, icon: ELEMENT_EMOJI.water, name: 'ماء' },
  { value: 'earth', label: `${ELEMENT_EMOJI.earth} أرض`, icon: ELEMENT_EMOJI.earth, name: 'أرض' },
  { value: 'lightning', label: `${ELEMENT_EMOJI.lightning} برق`, icon: ELEMENT_EMOJI.lightning, name: 'برق' },
  { value: 'wind', label: `${ELEMENT_EMOJI.wind} ريح`, icon: ELEMENT_EMOJI.wind, name: 'ريح' },
];
const RACE_OPTIONS: { value: Race | null; label: string; icon: string; name: string }[] = [
  { value: null, label: '✕ بدون', icon: '✕', name: 'بدون' },
  { value: 'human', label: `${RACE_EMOJI.human} بشر`, icon: RACE_EMOJI.human, name: 'بشر' },
  { value: 'elf', label: `${RACE_EMOJI.elf} إلف`, icon: RACE_EMOJI.elf, name: 'إلف' },
  { value: 'orc', label: `${RACE_EMOJI.orc} أورك`, icon: RACE_EMOJI.orc, name: 'أورك' },
  { value: 'dragon', label: `${RACE_EMOJI.dragon} تنين`, icon: RACE_EMOJI.dragon, name: 'تنين' },
  { value: 'demon', label: `${RACE_EMOJI.demon} شيطان`, icon: RACE_EMOJI.demon, name: 'شيطان' },
  { value: 'undead', label: `${RACE_EMOJI.undead} ميت`, icon: RACE_EMOJI.undead, name: 'ميت' },
  { value: 'monster', label: `${RACE_EMOJI.monster} وحش`, icon: RACE_EMOJI.monster, name: 'وحش' },
  { value: 'robot', label: `${RACE_EMOJI.robot} روبوت`, icon: RACE_EMOJI.robot, name: 'روبوت' },
];
const CLASS_OPTIONS: { value: CardClass | null; label: string; icon: string; name: string }[] = [
  { value: null, label: '✕ بدون', icon: '✕', name: 'بدون' },
  { value: 'mage', label: `${CLASS_EMOJI.mage} ساحر`, icon: CLASS_EMOJI.mage, name: 'ساحر' },
  { value: 'archer', label: `${CLASS_EMOJI.archer} رامي`, icon: CLASS_EMOJI.archer, name: 'رامي' },
  { value: 'swordsman', label: `${CLASS_EMOJI.swordsman} سياف`, icon: CLASS_EMOJI.swordsman, name: 'سياف' },
  { value: 'fighter', label: `${CLASS_EMOJI.fighter} مقاتل`, icon: CLASS_EMOJI.fighter, name: 'مقاتل' },
  { value: 'guardian', label: `${CLASS_EMOJI.guardian}'روبوت`, icon: CLASS_EMOJI.guardian, name: 'روبوت' },
  { value: 'healer', label: `${CLASS_EMOJI.healer} طبيب`, icon: CLASS_EMOJI.healer, name: 'طبيب' },
];
const GENDER_OPTIONS: { value: 'male' | 'female' | null; label: string; icon: string; name: string }[] = [
  { value: null, label: '✕ بدون', icon: '✕', name: 'بدون' },
  { value: 'male', label: 'ذكر', icon: GENDER_EMOJI.male, name: 'ذكر' },
  { value: 'female', label: 'أنثى', icon: GENDER_EMOJI.female, name: 'أنثى' },
];

// ─── Toast ───────────────────────────────────────────────────────────
function Toast({ message, type }: { message: string; type: 'success' | 'error' }) {
  const bg = type === 'success' ? 'rgba(52,211,153,0.15)' : 'rgba(248,113,113,0.15)';
  const border = type === 'success' ? '#34d399' : '#f87171';
  const icon = type === 'success' ? '✅' : '❌';
  return (
    <View style={[toastSt.wrap, { backgroundColor: bg, borderColor: border }]}>
      <RNText style={toastSt.icon}>{icon}</RNText>
      <RNText style={[toastSt.msg, { color: border }]}>{message}</RNText>
    </View>
  );
}
const toastSt = StyleSheet.create({
  wrap: { position: 'absolute', bottom: 30, left: '10%', right: '10%', flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 18, paddingVertical: 12, borderRadius: 16, borderWidth: 1.5, zIndex: 999, shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 12, elevation: 20 },
  icon: { fontSize: 18 },
  msg: { fontSize: 13, fontWeight: '700', flex: 1, textAlign: 'right', },
});

// ─── FilterChip ──────────────────────────────────────────────────────
function FilterChip({ icon, name, active, color, onPress }: {
  icon: string; name: string; active: boolean; color: string; onPress: () => void;
}) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}
      style={[fc.chip, active
        ? { borderColor: color, backgroundColor: color + '18', shadowColor: color, shadowOpacity: 0.4, shadowRadius: 6, elevation: 5 }
        : { borderColor: '#1e1e2a', backgroundColor: '#0d0d14' }]}
    >
      <RNText style={fc.icon}>{icon || '□'}</RNText>
      <RNText style={[fc.name, { color: active ? color : '#4a4a5a' }]} numberOfLines={1}>{name}</RNText>
      {active && <View style={[fc.dot, { backgroundColor: color }]} />}
    </TouchableOpacity>
  );
}
const fc = StyleSheet.create({
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, borderWidth: 1.5, marginRight: 6, marginBottom: 6 },
  icon: { fontSize: 14 }, name: { fontSize: 11, fontWeight: '700' },
  dot: { width: 5, height: 5, borderRadius: 3, marginLeft: 2 },
});

// ─── GridTile ────────────────────────────────────────────────────────
function GridTile({ icon, name, active, color, onPress }: {
  icon: string; name: string; active: boolean; color: string; onPress: () => void;
}) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}
      style={[gt.tile, active
        ? { borderColor: color, backgroundColor: '#0d0d14', shadowColor: color, shadowOpacity: 0.45, shadowRadius: 8, elevation: 6 }
        : { borderColor: '#1e1e2a', backgroundColor: '#0d0d14' }]}
    >
      <View style={[gt.iconBadge, active
        ? { backgroundColor: color + '22', borderColor: color + '55' }
        : { backgroundColor: '#161620', borderColor: '#252530' }]}>
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

// ─── IconPicker ──────────────────────────────────────────────────────
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
            <GridTile key={String(opt.value)} icon={opt.icon} name={opt.name} active={active}
              color={opt.value === null ? '#f87171' : color}
              onPress={() => onChange(opt.value as T | null)} />
          );
        })}
      </View>
    </View>
  );
}
const ip = StyleSheet.create({ wrap: { marginBottom: 6 }, grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 } });

// ─── RarityPicker ────────────────────────────────────────────────────
function RarityPicker({ value, onChange }: { value: CardRarity; onChange: (r: CardRarity) => void }) {
  return (
    <View style={rp.row}>
      {RARITY_OPTIONS.map(opt => {
        const active = value === opt.value;
        return (
          <TouchableOpacity key={opt.value} onPress={() => onChange(opt.value)} activeOpacity={0.75}
            style={[rp.btn, { borderColor: active ? opt.color : opt.color + '33', backgroundColor: active ? opt.color + '22' : 'rgba(255,255,255,0.03)' }]}>
            <RNText style={[rp.txt, { color: active ? opt.color : opt.color + '88' }]}>{opt.labelAr}</RNText>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
const rp = StyleSheet.create({
  row: { flexDirection: 'row', gap: 6, justifyContent: 'center', marginBottom: 4, flexWrap: 'wrap' },
  btn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1.5 },
  txt: { fontSize: 11, fontWeight: '800' },
});

// ─── StarPicker ──────────────────────────────────────────────────────
function StarPicker({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <View style={ep.starRow}>
      <TouchableOpacity onPress={() => onChange(0)} activeOpacity={0.7}
        style={[ep.clearBtn, value === 0 && ep.clearBtnActive]}>
        <RNText style={[ep.clearBtnTxt, value === 0 && { color: '#f87171' }]}>✕</RNText>
      </TouchableOpacity>
      {[1, 2, 3, 4, 5].map(n => (
        <TouchableOpacity key={n} onPress={() => onChange(n)} activeOpacity={0.7} style={ep.starBtn}>
          <RNText style={[ep.starIcon, { color: n <= value ? '#FFD700' : '#2a2a2a' }]}>★</RNText>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ─── StatStepper ─────────────────────────────────────────────────────
function StatStepper({ icon, label, value, color, onChange }: {
  icon: string; label: string; value: number; color: string; onChange: (v: number) => void;
}) {
  return (
    <View style={ep.statCol}>
      <RNText style={ep.statIcon}>{icon}</RNText>
      <View style={ep.statRow}>
        <TouchableOpacity onPress={() => onChange(clamp(value - 1, 0, 999))} style={[ep.stepBtn, { borderColor: color + '55' }]} activeOpacity={0.7}>
          <Minus size={12} color={color} />
        </TouchableOpacity>
        <TextInput
          style={[ep.statInput, { color, borderColor: color + '44' }]}
          value={String(value)} keyboardType="numeric"
          onChangeText={t => { const n = parseInt(t); if (!isNaN(n)) onChange(clamp(n, 0, 999)); }}
        />
        <TouchableOpacity onPress={() => onChange(clamp(value + 1, 0, 999))} style={[ep.stepBtn, { borderColor: color + '55' }]} activeOpacity={0.7}>
          <Plus size={12} color={color} />
        </TouchableOpacity>
      </View>
      <RNText style={[ep.statLabel, { color: color + '99' }]}>{label}</RNText>
    </View>
  );
}

// ─── MediaPickerSection ──────────────────────────────────────────────
function MediaPickerSection({ value, isVideo, rarityColor, onChange }: {
  value?: string; isVideo: boolean; rarityColor: string;
  onChange: (uri: string | undefined, isVid: boolean) => void;
}) {
  const pick = (accept: string, asVideo: boolean) => {
    if (Platform.OS !== 'web') return;
    const input = document.createElement('input');
    input.type = 'file'; input.accept = accept;
    input.onchange = (e: Event) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => { if (typeof reader.result === 'string') onChange(reader.result, asVideo); };
      reader.readAsDataURL(file);
    };
    input.click();
  };
  return (
    <View style={ep.imgSection}>
      {value ? (
        <View style={ep.imgPreviewWrap}>
          {isVideo
            ? <View style={ep.videoThumb}><RNText style={ep.videoThumbIcon}>🎦</RNText><RNText style={ep.videoThumbTxt}>فيديو محفوظ</RNText></View>
            : <Image source={{ uri: value }} style={ep.imgPreview} resizeMode="contain" />}
          <TouchableOpacity style={ep.imgRemoveBtn} onPress={() => onChange(undefined, false)} activeOpacity={0.8}>
            <X size={12} color="#fff" />
          </TouchableOpacity>
        </View>
      ) : null}
      <View style={ep.mediaPickRow}>
        <TouchableOpacity style={[ep.mediaPickBtn, { borderColor: rarityColor + '66', flex: 1 }]} onPress={() => pick('image/*', false)} activeOpacity={0.8}>
          <ImageIcon size={13} color={rarityColor} />
          <RNText style={[ep.imgPickTxt, { color: rarityColor }]}>صورة</RNText>
        </TouchableOpacity>
        <TouchableOpacity style={[ep.mediaPickBtn, { borderColor: '#a78bfa66', flex: 1 }]} onPress={() => pick('video/mp4,video/webm,video/*', true)} activeOpacity={0.8}>
          <Film size={13} color="#a78bfa" />
          <RNText style={[ep.imgPickTxt, { color: '#a78bfa' }]}>فيديو</RNText>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── ImageOffsetAdjuster ─────────────────────────────────────────────
function ImageOffsetAdjuster({ value, rarityColor, onChange }: {
  value: number; rarityColor: string; onChange: (v: number) => void;
}) {
  const STEP = 10;
  return (
    <View style={ep.offsetRow}>
      <TouchableOpacity style={[ep.offsetBtn, { borderColor: rarityColor + '55' }]} onPress={() => onChange(value - STEP)} activeOpacity={0.7}>
        <ChevronUp size={14} color={rarityColor} />
        <RNText style={[ep.offsetBtnTxt, { color: rarityColor }]}>لأعلى</RNText>
      </TouchableOpacity>
      <View style={ep.offsetValueBox}>
        <RNText style={[ep.offsetValue, { color: rarityColor }]}>{value > 0 ? `+${value}` : value}</RNText>
        <RNText style={ep.offsetHint}>px</RNText>
      </View>
      <TouchableOpacity style={[ep.offsetBtn, { borderColor: rarityColor + '55' }]} onPress={() => onChange(value + STEP)} activeOpacity={0.7}>
        <ChevronDown size={14} color={rarityColor} />
        <RNText style={[ep.offsetBtnTxt, { color: rarityColor }]}>لأسفل</RNText>
      </TouchableOpacity>
      <TouchableOpacity style={[ep.offsetResetBtn, { borderColor: '#44444466' }]} onPress={() => onChange(0)} activeOpacity={0.7}>
        <RNText style={ep.offsetResetTxt}>إعادة</RNText>
      </TouchableOpacity>
    </View>
  );
}

// ─── RageModeSection ─────────────────────────────────────────────────
const DEFAULT_RAGE: RageModeData = { enabled: false, rageAttackBoost: 0, rageDefenseBoost: 0, oncePer: 'match' };

function RageModeSection({ cardId, data, onChange }: {
  cardId: string; data: RageModeData; onChange: (p: Partial<RageModeData>) => void;
}) {
  const RAGE_COLOR = '#f59e0b';
  const pickFile = (accept: string, cb: (uri: string) => void) => {
    if (Platform.OS !== 'web') return;
    const input = document.createElement('input');
    input.type = 'file'; input.accept = accept;
    input.onchange = (e: Event) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => { if (typeof reader.result === 'string') cb(reader.result); };
      reader.readAsDataURL(file);
    };
    input.click();
  };
  return (
    <View style={rgs.container}>
      <View style={rgs.headerRow}>
        <Zap size={14} color={RAGE_COLOR} />
        <RNText style={[rgs.sectionTitle, { color: RAGE_COLOR }]}>وضع الغضب</RNText>
        <Zap size={14} color={RAGE_COLOR} />
      </View>
      <View style={ep.switchRow}>
        <Switch value={data.enabled} onValueChange={v => onChange({ enabled: v })}
          trackColor={{ false: '#1e1e1e', true: RAGE_COLOR + '55' }} thumbColor={data.enabled ? RAGE_COLOR : '#555'} />
        <RNText style={[ep.label, { marginBottom: 0 }]}>تفعيل وضع الغضب</RNText>
      </View>
      {data.enabled && (
        <>
          <RNText style={[ep.label, { marginTop: 10 }]}>⚡ اسم وضع الغضب</RNText>
          <TextInput style={[ep.nameArInput, { borderColor: RAGE_COLOR + '55', color: RAGE_COLOR, writingDirection: 'rtl' }]}
            value={data.rageNameAr ?? ''} onChangeText={t => onChange({ rageNameAr: t })}
            placeholder="مثال: سوبر سايان..." placeholderTextColor="#555"
            textAlign="right" />
          <RNText style={[ep.label, { marginTop: 10 }]}>⚡ زيادة الطاقات</RNText>
          <View style={ep.steppers}>
            <StatStepper icon="⚔️" label="هجوم +" value={data.rageAttackBoost} color="#f87171" onChange={v => onChange({ rageAttackBoost: clamp(v, 0, 999) })} />
            <StatStepper icon="🛡️" label="دفاع +" value={data.rageDefenseBoost} color="#60a5fa" onChange={v => onChange({ rageDefenseBoost: clamp(v, 0, 999) })} />
          </View>
          <RNText style={[ep.label, { marginTop: 10 }]}>🔁 تكرار التفعيل</RNText>
          <View style={rgs.onceRow}>
            {(['match', 'unlimited'] as const).map(opt => (
              <TouchableOpacity key={opt} onPress={() => onChange({ oncePer: opt })} activeOpacity={0.75}
                style={[rgs.onceBtn, data.oncePer === opt
                  ? { backgroundColor: RAGE_COLOR + '22', borderColor: RAGE_COLOR }
                  : { backgroundColor: 'rgba(255,255,255,0.03)', borderColor: '#333' }]}>
                <RNText style={[rgs.onceBtnTxt, { color: data.oncePer === opt ? RAGE_COLOR : '#666' }]}>
                  {opt === 'match' ? 'مرة واحدة بالمباراة' : 'كل خسارة'}
                </RNText>
              </TouchableOpacity>
            ))}
          </View>
          <RNText style={[ep.label, { marginTop: 10 }]}>🖼️ صورة وضع الغضب</RNText>
          <View style={ep.imgSection}>
            {data.rageImageUrl ? (
              <View style={ep.imgPreviewWrap}>
                <Image source={{ uri: data.rageImageUrl }} style={ep.imgPreview} resizeMode="contain" />
                <TouchableOpacity style={ep.imgRemoveBtn} onPress={() => onChange({ rageImageUrl: undefined })} activeOpacity={0.8}>
                  <X size={12} color="#fff" /></TouchableOpacity>
              </View>
            ) : null}
            <View style={ep.mediaPickRow}>
              <TouchableOpacity style={[ep.mediaPickBtn, { borderColor: RAGE_COLOR + '66', flex: 1 }]} onPress={() => pickFile('image/*', uri => onChange({ rageImageUrl: uri }))} activeOpacity={0.8}>
                <ImageIcon size={13} color={RAGE_COLOR} />
                <RNText style={[ep.imgPickTxt, { color: RAGE_COLOR }]}>صورة الغضب</RNText>
              </TouchableOpacity>
            </View>
          </View>
          <RNText style={[ep.label, { marginTop: 10 }]}>🎥 فيديو التحول (اختياري)</RNText>
          <View style={ep.imgSection}>
            {data.rageVideoUrl ? (
              <View style={[ep.imgPreviewWrap, { backgroundColor: 'rgba(245,158,11,0.08)' }]}>
                <View style={ep.videoThumb}>
                  <RNText style={ep.videoThumbIcon}>🎦</RNText>
                  <RNText style={[ep.videoThumbTxt, { color: RAGE_COLOR }]}>فيديو محفوظ</RNText>
                </View>
                <TouchableOpacity style={ep.imgRemoveBtn} onPress={() => onChange({ rageVideoUrl: undefined })} activeOpacity={0.8}>
                  <X size={12} color="#fff" /></TouchableOpacity>
              </View>
            ) : null}
            <View style={ep.mediaPickRow}>
              <TouchableOpacity style={[ep.mediaPickBtn, { borderColor: '#a78bfa66', flex: 1 }]} onPress={() => pickFile('video/mp4,video/webm,video/*', uri => onChange({ rageVideoUrl: uri }))} activeOpacity={0.8}>
                <Film size={13} color="#a78bfa" />
                <RNText style={[ep.imgPickTxt, { color: '#a78bfa' }]}>فيديو التحول</RNText>
              </TouchableOpacity>
            </View>
          </View>
        </>
      )}
    </View>
  );
}

// ─── GalleryFilterModal ──────────────────────────────────────────────
function GalleryFilterModal({ visible, filters, onApply, onClose }: {
  visible: boolean; filters: GalleryFilters;
  onApply: (f: GalleryFilters) => void; onClose: () => void;
}) {
  const [local, setLocal] = useState<GalleryFilters>(filters);
  useEffect(() => { if (visible) setLocal(filters); }, [visible]);
  const patch = (p: Partial<GalleryFilters>) => setLocal(prev => ({ ...prev, ...p }));

  const RARITY_FILTER_OPTS: { value: CardRarity | 'All'; labelAr: string; color: string }[] = [
    { value: 'All', labelAr: 'الكل', color: '#d4af37' },
    { value: 'common', labelAr: 'عادي', color: '#6366f1' },
    { value: 'rare', labelAr: 'نادر', color: '#f59e0b' },
    { value: 'epic', labelAr: 'ملحمي', color: '#8b5cf6' },
    { value: 'legendary', labelAr: 'أسطوري', color: '#ef4444' },
    { value: 'special', labelAr: 'خاص', color: '#ec4899' },
  ];

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={fm.backdrop}>
        <View style={fm.sheet}>
          <View style={fm.header}>
            <RNText style={fm.title}>🎯 فلترة الكروت</RNText>
            <TouchableOpacity onPress={onClose} activeOpacity={0.7} style={fm.closeBtn}>
              <X size={16} color="#888" />
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 16 }}>
            <RNText style={fm.sectionLabel}>❆ الندرة</RNText>
            <View style={fm.row}>
              {RARITY_FILTER_OPTS.map(opt => {
                const active = local.rarity === opt.value;
                return (
                  <TouchableOpacity key={opt.value} onPress={() => patch({ rarity: opt.value })} activeOpacity={0.75}
                    style={[fm.pill, { borderColor: active ? opt.color : opt.color + '33', backgroundColor: active ? opt.color + '22' : 'rgba(255,255,255,0.03)' }]}>
                    <RNText style={[fm.pillTxt, { color: active ? opt.color : opt.color + '88' }]}>{opt.labelAr}</RNText>
                  </TouchableOpacity>
                );
              })}
            </View>
            <RNText style={fm.sectionLabel}>🔥 العنصر</RNText>
            <View style={fm.chipsRow}>
              {ELEMENT_OPTIONS.map(opt => (
                <FilterChip key={String(opt.value)} icon={opt.icon} name={opt.name}
                  active={local.element === opt.value} color={opt.value === null ? '#f87171' : '#f59e0b'}
                  onPress={() => patch({ element: opt.value as Element | null })} />
              ))}
            </View>
            <RNText style={fm.sectionLabel}>👤 الجنس / الفصيلة</RNText>
            <View style={fm.chipsRow}>
              {RACE_OPTIONS.map(opt => (
                <FilterChip key={String(opt.value)} icon={opt.icon} name={opt.name}
                  active={local.race === opt.value} color={opt.value === null ? '#f87171' : '#60a5fa'}
                  onPress={() => patch({ race: opt.value as Race | null })} />
              ))}
            </View>
            <RNText style={fm.sectionLabel}>⚔️ الفئة</RNText>
            <View style={fm.chipsRow}>
              {CLASS_OPTIONS.map(opt => (
                <FilterChip key={String(opt.value)} icon={opt.icon} name={opt.name}
                  active={local.cardClass === opt.value} color={opt.value === null ? '#f87171' : '#a78bfa'}
                  onPress={() => patch({ cardClass: opt.value as CardClass | null })} />
              ))}
            </View>
            <RNText style={fm.sectionLabel}>⚧ الجنس البيولوجي</RNText>
            <View style={fm.chipsRow}>
              {GENDER_OPTIONS.map(opt => (
                <FilterChip key={String(opt.value)} icon={opt.icon} name={opt.name}
                  active={local.gender === opt.value} color={opt.value === null ? '#f87171' : '#34d399'}
                  onPress={() => patch({ gender: opt.value as 'male' | 'female' | null })} />
              ))}
            </View>
          </ScrollView>
          <View style={fm.footer}>
            <TouchableOpacity style={fm.resetBtn} onPress={() => patch(DEFAULT_GALLERY_FILTERS)} activeOpacity={0.8}>
              <RNText style={fm.resetTxt}>إعادة تعيين</RNText>
            </TouchableOpacity>
            <TouchableOpacity style={fm.applyBtn} onPress={() => { onApply(local); onClose(); }} activeOpacity={0.8}>
              <RNText style={fm.applyTxt}>✔ تطبيق</RNText>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
const fm = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.88)', justifyContent: 'center', alignItems: 'center' },
  sheet: { width: 360, maxHeight: '85%', backgroundColor: '#12121c', borderRadius: 20, borderWidth: 1.5, borderColor: '#2a2a38', padding: 20, shadowColor: '#d4af37', shadowOpacity: 0.15, shadowRadius: 20, elevation: 12 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  title: { fontSize: 16, fontWeight: '800', color: '#d4af37' },
  closeBtn: { width: 28, height: 28, borderRadius: 14, borderWidth: 1, borderColor: '#333', alignItems: 'center', justifyContent: 'center' },
  sectionLabel: { fontSize: 11, color: '#888', fontWeight: '700', textAlign: 'right', marginBottom: 8, marginTop: 10 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 4 },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 4 },
  pill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1.5 },
  pillTxt: { fontSize: 11, fontWeight: '800' },
  footer: { flexDirection: 'row', gap: 10, marginTop: 14 },
  resetBtn: { flex: 1, paddingVertical: 11, borderRadius: 14, borderWidth: 1, borderColor: '#333', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)' },
  resetTxt: { color: '#888', fontWeight: '700', fontSize: 13 },
  applyBtn: { flex: 2, paddingVertical: 11, borderRadius: 14, borderWidth: 1.5, borderColor: '#d4af3788', backgroundColor: 'rgba(212,175,55,0.15)', alignItems: 'center' },
  applyTxt: { color: '#d4af37', fontWeight: '800', fontSize: 13 },
});

// ─── Main Screen ─────────────────────────────────────────────────────
export default function CardsGalleryScreen() {
  const router = useRouter();
  const [savedMap, setSavedMap] = useState<Record<string, Record<string, any>>>({});
  const [cards, setCards] = useState<(Card & { customImage?: string; imageOffsetY?: number; fitInsideBorder?: boolean; isVideo?: boolean; _isCustom?: boolean })[]>([]);
  const [deletedBaseIds, setDeletedBaseIds] = useState<Set<string>>(new Set());
  const [cardToDelete, setCardToDelete] = useState<(Card & { _isCustom?: boolean }) | null>(null);
  const [selectedCard, setSelectedCard] = useState<(Card & { customImage?: string; imageOffsetY?: number; fitInsideBorder?: boolean; isVideo?: boolean; _isCustom?: boolean }) | null>(null);
  const [edits, setEdits] = useState<CardEdits | null>(null);
  const [previewCard, setPreviewCard] = useState<any | null>(null);
  const { isLandscape, size } = useLandscapeLayout();

  const [galleryFilters, setGalleryFilters] = useState<GalleryFilters>(DEFAULT_GALLERY_FILTERS);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [rageMap, setRageMap] = useState<RageOverridesMap>({});
  const [rageEdits, setRageEdits] = useState<RageModeData>(DEFAULT_RAGE);

  // ── Backup state
  const [backupLoading, setBackupLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const { cardW: galleryCardW, cardH: galleryCardH } = useCardSize('gallery');
  const { cardW: modalCardW, cardH: modalCardH } = useCardSize('modal');
  const padding = LAYOUT_PADDING[size];
  const gridGap = size === 'sm' ? 10 : size === 'md' ? 14 : size === 'lg' ? 18 : 22;

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleExport = async () => {
    setBackupLoading(true);
    try {
      await exportBackup();
      showToast('✅ تم تصدير النسخة الاحتياطية بنجاح', 'success');
    } catch (e) {
      showToast('فشل التصدير: ' + String(e), 'error');
    } finally {
      setBackupLoading(false);
    }
  };

  const handleImport = () => {
    importBackup(
      () => {
        showToast('✅ تم الاستيراد! أعد تحميل الصفحة لتفعيل التغييرات', 'success');
        setTimeout(() => { if (Platform.OS === 'web') window.location.reload(); }, 2000);
      },
      (msg) => showToast(msg, 'error')
    );
  };

  const load = async () => {
    const customCards = await loadCustomCards();
    const UNIQUE = buildUniqueCards(ALL_CARDS, customCards);
    const customIds = new Set(customCards.map(c => c.id));
    const deletedIds = await loadDeletedCardIds();
    setDeletedBaseIds(deletedIds);
    const rawEdits = await AsyncStorage.getItem(CARD_EDITS_KEY);
    const rageOverrides = await getRageOverrides();
    setRageMap(rageOverrides);
    const VISIBLE = UNIQUE.filter(c => !deletedIds.has(c.id));
    if (!rawEdits) { setCards(VISIBLE.map(c => ({ ...c, _isCustom: customIds.has(c.id) }))); return; }
    try {
      const map: Record<string, any> = JSON.parse(rawEdits);
      const entries = await Promise.all(
        Object.entries(map).map(async ([id, data]) => {
          const safeCopy = toStoreSafe({ ...data });
          if (data.hasCustomImage) {
            const img = await loadImage(`card_img_${id}`);
            if (img) return [id, { ...safeCopy, customImage: img, isVideo: data.isVideo ?? isVideoUri(img) }] as [string, any];
          }
          return [id, safeCopy] as [string, any];
        })
      );
      const fullMap = Object.fromEntries(entries);
      setSavedMap(Object.fromEntries(entries.map(([id, d]) => [id, toStoreSafe(d)])));
      setCards(VISIBLE.map((c: Card) => ({ ...c, ...(fullMap[c.id] ?? {}), _isCustom: customIds.has(c.id) })));
    } catch {
      setCards(VISIBLE.map(c => ({ ...c, _isCustom: customIds.has(c.id) })));
    }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!selectedCard || !edits) { setPreviewCard(null); return; }
    setPreviewCard({
      ...selectedCard,
      nameAr: edits.nameAr || selectedCard.nameAr,
      stars: edits.stars, rarity: edits.rarity,
      specialAbility: edits.hasAbility ? (edits.specialAbility || undefined) : undefined,
      attack: edits.attack, defense: edits.defense,
      customImage: edits.customImage, imageOffsetY: edits.imageOffsetY,
      fitInsideBorder: edits.fitInsideBorder, isVideo: edits.isVideo,
      element: edits.element ?? undefined, race: edits.race ?? undefined,
      cardClass: edits.cardClass ?? undefined, gender: edits.gender,
      tags: edits.tags,
    });
  }, [edits, selectedCard]);

  const handleCardPress = (card: any) => { setSelectedCard(card); setEdits(toEdits(card)); setRageEdits(rageMap[card.id] ?? { ...DEFAULT_RAGE }); };
  const patchRage = (p: Partial<RageModeData>) => setRageEdits(prev => ({ ...prev, ...p }));
  const patch = (p: Partial<CardEdits>) => setEdits(prev => prev ? { ...prev, ...p } : prev);
  const handleClose = () => { setSelectedCard(null); setEdits(null); setPreviewCard(null); };

  const handleSave = async () => {
    if (!selectedCard || !edits) { handleClose(); return; }
    if (edits.customImage) await saveImage(`card_img_${selectedCard.id}`, edits.customImage);
    else await deleteImage(`card_img_${selectedCard.id}`);
    const storeSafe: Record<string, any> = {
      nameAr: edits.nameAr || selectedCard.nameAr, stars: edits.stars, rarity: edits.rarity,
      specialAbility: edits.hasAbility ? (edits.specialAbility || undefined) : undefined,
      attack: edits.attack, defense: edits.defense,
      hasCustomImage: !!edits.customImage, isVideo: edits.isVideo,
      imageOffsetY: edits.imageOffsetY, fitInsideBorder: edits.fitInsideBorder,
      element: edits.element ?? null, race: edits.race ?? null,
      cardClass: edits.cardClass ?? null, gender: edits.gender, tags: edits.tags,
    };
    const memRecord: Record<string, any> = { ...storeSafe, customImage: edits.customImage };
    const newStoredMap: Record<string, Record<string, any>> = {};
    for (const [id, data] of Object.entries(savedMap)) newStoredMap[id] = toStoreSafe(data);
    newStoredMap[selectedCard.id] = storeSafe;
    setSavedMap(newStoredMap);
    await AsyncStorage.setItem(CARD_EDITS_KEY, JSON.stringify(newStoredMap));
    await saveRageOverride(selectedCard.id, rageEdits);
    setRageMap(prev => ({ ...prev, [selectedCard.id]: rageEdits }));
    setCards(prev => prev.map(c => c.id === selectedCard.id ? { ...c, ...memRecord, rageMode: rageEdits } : c));
    handleClose();
  };

  const handleDelete = (card?: typeof selectedCard) => { const t = card || selectedCard; if (!t) return; setCardToDelete(t); };
  const executeDelete = async () => {
    if (!cardToDelete) return;
    const id = cardToDelete.id;
    if (cardToDelete._isCustom) {
      await deleteCustomCard(id);
    } else {
      const nd = new Set(deletedBaseIds); nd.add(id);
      setDeletedBaseIds(nd); await saveDeletedCardIds(nd);
    }
    await deleteImage(`card_img_${id}`);
    const nm = { ...savedMap }; delete nm[id]; setSavedMap(nm);
    await AsyncStorage.setItem(CARD_EDITS_KEY, JSON.stringify(nm));
    setCards(prev => prev.filter(c => c.id !== id));
    if (selectedCard?.id === id) handleClose();
    setCardToDelete(null);
  };

  const handleRarityChange = (r: CardRarity) => {
    const defaultStars = RARITY_OPTIONS.find(o => o.value === r)?.stars ?? 1;
    patch({ rarity: r, stars: defaultStars });
  };

  if (!isLandscape) return <RotateHintScreen />;

  const filteredCards = cards.filter(card => {
    if (galleryFilters.rarity !== 'All' && (card.rarity ?? 'common').toLowerCase() !== galleryFilters.rarity) return false;
    if (galleryFilters.element !== null && (card.element ?? null) !== galleryFilters.element) return false;
    if (galleryFilters.race !== null && (card.race ?? null) !== galleryFilters.race) return false;
    if (galleryFilters.cardClass !== null && ((card as any).cardClass ?? null) !== galleryFilters.cardClass) return false;
    if (galleryFilters.gender !== null) {
      const cardGender = (card as any).gender;
      const effectiveGender = (cardGender === 'female') ? 'female' : 'male';
      if (effectiveGender !== galleryFilters.gender) return false;
    }
    return true;
  });
  const sortedCards = [...filteredCards].sort((a, b) => {
    const ra = RARITY_ORDER[a.rarity ?? 'common'] ?? 5;
    const rb = RARITY_ORDER[b.rarity ?? 'common'] ?? 5;
    if (ra !== rb) return ra - rb;
    return (a.nameAr || a.name).localeCompare(b.nameAr || b.name, 'ar');
  });

  const rarityColor = edits
    ? getRarityConfig(edits.rarity).badgeColor
    : selectedCard ? getRarityConfig(selectedCard.rarity).badgeColor : '#d4af37';

  const activeFilterCount = [
    galleryFilters.rarity !== 'All',
    galleryFilters.element !== null,
    galleryFilters.race !== null,
    galleryFilters.cardClass !== null,
    galleryFilters.gender !== null,
  ].filter(Boolean).length;

  return (
    <ScreenContainer edges={['top', 'bottom', 'left', 'right']}>
      <View style={styles.bg}><LuxuryBackground /></View>

      {/* رجوع */}
      <TouchableOpacity onPress={() => router.back()}
        className="absolute top-6 left-6 z-50 flex-row items-center gap-2 px-4 py-2 bg-slate-800/80 backdrop-blur-md rounded-xl border border-white/10"
        activeOpacity={0.7}>
        <ArrowLeft size={16} color="#fff" />
        <Text className="text-white text-sm font-bold">رجوع</Text>
      </TouchableOpacity>

      {/* ─── أزرار Backup ─── */}
      <View style={styles.backupRow}>
        <TouchableOpacity onPress={handleExport} disabled={backupLoading}
          style={[styles.backupBtn, { borderColor: '#34d39988', backgroundColor: 'rgba(52,211,153,0.10)' }]}
          activeOpacity={0.8}>
          <Download size={13} color="#34d399" />
          <RNText style={[styles.backupBtnTxt, { color: '#34d399' }]}>تصدير</RNText>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleImport} disabled={backupLoading}
          style={[styles.backupBtn, { borderColor: '#60a5fa88', backgroundColor: 'rgba(96,165,250,0.10)' }]}
          activeOpacity={0.8}>
          <Upload size={13} color="#60a5fa" />
          <RNText style={[styles.backupBtnTxt, { color: '#60a5fa' }]}>استيراد</RNText>
        </TouchableOpacity>
      </View>

      {/* ＋ كارت */}
      <TouchableOpacity onPress={() => router.push('/screens/add-card')} style={styles.fab} activeOpacity={0.8}>
        <RNText style={styles.fabTxt}>＋ كارت</RNText>
      </TouchableOpacity>

      <View style={styles.container} className="pt-4 pb-2">
        <View className="mb-2 mt-4 items-center">
          <Text style={styles.title}>Card Collection</Text>
          <Text style={styles.subtitle}>{sortedCards.length} cards</Text>
        </View>

        <View style={styles.filterRow}>
          <TouchableOpacity onPress={() => setFilterModalVisible(true)}
            style={[styles.filterBtn, activeFilterCount > 0 && styles.filterBtnActive]} activeOpacity={0.8}>
            <Filter size={14} color={activeFilterCount > 0 ? '#d4af37' : '#888'} />
            <RNText style={[styles.filterBtnTxt, activeFilterCount > 0 && { color: '#d4af37' }]}>فلترة</RNText>
            {activeFilterCount > 0 && (
              <View style={styles.filterBadge}><RNText style={styles.filterBadgeTxt}>{activeFilterCount}</RNText></View>
            )}
          </TouchableOpacity>
          {activeFilterCount > 0 && (
            <TouchableOpacity onPress={() => setGalleryFilters(DEFAULT_GALLERY_FILTERS)}
              style={styles.clearFiltersBtn} activeOpacity={0.8}>
              <X size={11} color="#f87171" />
              <RNText style={styles.clearFiltersTxt}>مسح الفلاتر</RNText>
            </TouchableOpacity>
          )}
        </View>

        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={[styles.grid, { gap: gridGap, paddingHorizontal: padding }]}>
            {sortedCards.map(card => (
              <TouchableOpacity key={card.id} onPress={() => handleCardPress(card)} activeOpacity={0.85}>
                <View>
                  <LuxuryCharacterCardAnimated card={card} imageOffsetY={card.imageOffsetY ?? 0}
                    fitInsideBorder={card.fitInsideBorder ?? false}
                    style={{ width: galleryCardW, height: galleryCardH }} />
                  {card._isCustom && (
                    <View style={styles.customBadge}><RNText style={styles.customBadgeTxt}>❆</RNText></View>
                  )}
                  <TouchableOpacity style={styles.gridDeleteBtn}
                    onPress={e => { e.stopPropagation?.(); handleDelete(card); }}
                    activeOpacity={0.7} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                    <Trash2 size={11} color="#f87171" />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Toast */}
      {toast && <Toast message={toast.message} type={toast.type} />}

      <GalleryFilterModal visible={filterModalVisible} filters={galleryFilters}
        onApply={setGalleryFilters} onClose={() => setFilterModalVisible(false)} />

      {/* Edit Modal */}
      <Modal visible={!!selectedCard} animationType="fade" transparent onRequestClose={handleClose}>
        <View style={styles.overlay}>
          {selectedCard && edits && previewCard && (
            <View style={styles.modalRow}>
              <View pointerEvents="none">
                <LuxuryCharacterCardAnimated card={previewCard} imageOffsetY={edits.imageOffsetY}
                  fitInsideBorder={edits.fitInsideBorder} isOpenedView playAudio
                  style={{ width: modalCardW, height: modalCardH }} />
              </View>
              <View style={[ep.panel, { borderColor: rarityColor + '77' }]}>
                <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                  <TouchableOpacity style={ep.deleteBtn} onPress={() => handleDelete()} activeOpacity={0.8}>
                    <Trash2 size={13} color="#f87171" />
                    <RNText style={ep.deleteBtnTxt}>حذف الكارت</RNText>
                  </TouchableOpacity>
                  <RNText style={[ep.title, { color: rarityColor }]}>{edits.nameAr || selectedCard.nameAr || selectedCard.name}</RNText>
                  <RNText style={ep.sub}>{selectedCard.name}</RNText>
                  <View style={ep.divider} />

                  <RNText style={ep.label}>❆ الندرة</RNText>
                  <RarityPicker value={edits.rarity} onChange={handleRarityChange} />
                  <View style={ep.divider} />

                  <RNText style={ep.label}>✏️ الاسم العربي</RNText>
                  <TextInput style={[ep.nameArInput, { borderColor: rarityColor + '55', color: rarityColor, writingDirection: 'rtl' }]}
                    value={edits.nameAr} onChangeText={t => patch({ nameAr: t })}
                    placeholder="الاسم بالعربي..." placeholderTextColor="#444"
                    textAlign="right" />
                  <View style={ep.divider} />

                  <RNText style={ep.label}>⭐ عدد النجوم</RNText>
                  <StarPicker value={edits.stars} onChange={n => patch({ stars: n, rarity: getRarityFromStars(n) })} />
                  {edits.stars === 0 && <RNText style={ep.hint}>الكرت بدون نجوم</RNText>}
                  <View style={ep.divider} />

                  <RNText style={ep.sectionHeader}>🏷️ أيقونات المنتصف</RNText>
                  <IconPicker label="🔥 العنصر" options={ELEMENT_OPTIONS as any} value={edits.element} color={rarityColor}
                    onChange={v => patch({ element: v as Element | null })} />
                  <View style={ep.divider} />
                  <IconPicker label="👤 الجنس / الفصيلة" options={RACE_OPTIONS as any} value={edits.race} color={rarityColor}
                    onChange={v => patch({ race: v as Race | null })} />
                  <View style={ep.divider} />
                  <IconPicker label="⚔️ الفئة" options={CLASS_OPTIONS as any} value={edits.cardClass} color={rarityColor}
                    onChange={v => patch({ cardClass: v as CardClass | null })} />
                  <View style={ep.divider} />
                  <IconPicker label="⚧ الجنس البيولوجي" options={GENDER_OPTIONS as any} value={edits.gender} color={rarityColor}
                    onChange={v => patch({ gender: (v ?? 'male') as 'male' | 'female' })} />
                  <View style={ep.divider} />

                  <View style={ep.switchRow}>
                    <RNText style={ep.label}>❆ يملك قدرة خاصة</RNText>
                    <Switch value={edits.hasAbility} onValueChange={v => patch({ hasAbility: v })}
                      trackColor={{ false: '#1e1e1e', true: rarityColor + '66' }} thumbColor={edits.hasAbility ? rarityColor : '#555'} />
                  </View>
                  {edits.hasAbility && (
                    <View style={ep.abilityBox}>
                      <TextInput style={[ep.abilityInput, { borderColor: rarityColor + '55' }]}
                        value={edits.specialAbility} onChangeText={t => patch({ specialAbility: t })}
                        placeholder="اكتب القدرة الخاصة هنا..." placeholderTextColor="#444"
                        multiline textAlign="right" textAlignVertical="top" scrollEnabled />
                    </View>
                  )}
                  <View style={ep.divider} />

                  <RNText style={ep.label}>⚙️ الطاقات</RNText>
                  <View style={ep.steppers}>
                    <StatStepper icon="⚔️" label="هجوم" value={edits.attack} color="#f87171" onChange={v => patch({ attack: v })} />
                    <StatStepper icon="🛡️" label="درع" value={edits.defense} color="#60a5fa" onChange={v => patch({ defense: v })} />
                  </View>
                  <View style={ep.divider} />

                  <RNText style={ep.label}>🎦 صورة / فيديو الكرت</RNText>
                  <MediaPickerSection value={edits.customImage} isVideo={edits.isVideo} rarityColor={rarityColor}
                    onChange={(uri, isVid) => patch({ customImage: uri, isVideo: isVid, imageOffsetY: 0, fitInsideBorder: false })} />

                  {edits.customImage && !edits.isVideo && (
                    <>
                      <View style={ep.divider} />
                      <View style={ep.switchRow}>
                        <RNText style={ep.label}>📄 احتواء داخل الحدود</RNText>
                        <Switch value={edits.fitInsideBorder} onValueChange={v => patch({ fitInsideBorder: v })}
                          trackColor={{ false: '#1e1e1e', true: rarityColor + '66' }} thumbColor={edits.fitInsideBorder ? rarityColor : '#555'} />
                      </View>
                      <View style={ep.divider} />
                      <RNText style={ep.label}>🔄 موضع الصورة عمودياً</RNText>
                      <ImageOffsetAdjuster value={edits.imageOffsetY} rarityColor={rarityColor} onChange={v => patch({ imageOffsetY: v })} />
                    </>
                  )}
                  <View style={ep.divider} />
                  <RageModeSection cardId={selectedCard.id} data={rageEdits} onChange={patchRage} />
                  <View style={ep.divider} />

                  <View style={ep.actionRow}>
                    <TouchableOpacity style={[ep.actionBtn, { borderColor: '#444' }]} onPress={handleClose} activeOpacity={0.8}>
                      <RNText style={{ color: '#888', fontWeight: '700', fontSize: 13 }}>إلغاء</RNText>
                    </TouchableOpacity>
                    <TouchableOpacity style={[ep.actionBtn, { borderColor: rarityColor + '88', backgroundColor: rarityColor + '18' }]} onPress={handleSave} activeOpacity={0.8}>
                      <RNText style={{ color: rarityColor, fontWeight: '800', fontSize: 13 }}>✔ حفظ</RNText>
                    </TouchableOpacity>
                  </View>
                </ScrollView>
              </View>
            </View>
          )}
        </View>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal visible={!!cardToDelete} animationType="fade" transparent onRequestClose={() => setCardToDelete(null)}>
        <View style={delModal.backdrop}>
          <View style={delModal.container}>
            <View style={delModal.topAccent} />
            <View style={delModal.iconWrap}><Trash2 size={28} color="#f87171" /></View>
            <RNText style={delModal.title}>حذف البطاقة</RNText>
            {cardToDelete && <RNText style={delModal.cardName}>{cardToDelete.nameAr || cardToDelete.name}</RNText>}
            <RNText style={delModal.message}>هل أنت متأكد أنك تريد حذف هذا الكرت نهائياً؟</RNText>
            <RNText style={delModal.warning}>⚠️ هذا الإجراء لا يمكن التراجع عنه</RNText>
            <View style={delModal.divider} />
            <View style={delModal.btnRow}>
              <TouchableOpacity style={delModal.cancelBtn} onPress={() => setCardToDelete(null)} activeOpacity={0.8}>
                <RNText style={delModal.cancelTxt}>إلغاء</RNText>
              </TouchableOpacity>
              <TouchableOpacity style={delModal.deleteBtn} onPress={executeDelete} activeOpacity={0.8}>
                <Trash2 size={14} color="#fff" />
                <RNText style={delModal.deleteTxt}>حذف</RNText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────
const delModal = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.88)', justifyContent: 'center', alignItems: 'center' },
  container: { width: 320, backgroundColor: '#1A1A24', borderRadius: 20, borderWidth: 1.5, borderColor: '#2A2A35', padding: 24, alignItems: 'center', shadowColor: '#f87171', shadowOpacity: 0.15, shadowRadius: 24, elevation: 12, overflow: 'hidden' },
  topAccent: { position: 'absolute', top: 0, left: 0, right: 0, height: 3, backgroundColor: '#ef4444', borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  iconWrap: { width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(248,113,113,0.12)', borderWidth: 1, borderColor: 'rgba(248,113,113,0.30)', alignItems: 'center', justifyContent: 'center', marginBottom: 14, marginTop: 4 },
  title: { fontSize: 18, fontWeight: '800', color: '#f87171', textAlign: 'center', marginBottom: 6 },
  cardName: { fontSize: 15, fontWeight: '700', color: '#e2e8f0', textAlign: 'center', marginBottom: 12, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', overflow: 'hidden' },
  message: { fontSize: 13, fontWeight: '600', color: '#94a3b8', textAlign: 'center', lineHeight: 20, marginBottom: 6 },
  warning: { fontSize: 11, fontWeight: '600', color: '#f87171', textAlign: 'center', opacity: 0.8, marginBottom: 4 },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.06)', width: '100%', marginVertical: 16 },
  btnRow: { flexDirection: 'row', gap: 12, width: '100%' },
  cancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 14, borderWidth: 1.5, borderColor: '#333340', backgroundColor: 'rgba(255,255,255,0.04)', alignItems: 'center', justifyContent: 'center' },
  cancelTxt: { color: '#94a3b8', fontWeight: '700', fontSize: 14 },
  deleteBtn: { flex: 1, paddingVertical: 12, borderRadius: 14, borderWidth: 1.5, borderColor: '#ef4444', backgroundColor: 'rgba(239,68,68,0.20)', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  deleteTxt: { color: '#fff', fontWeight: '800', fontSize: 14 },
});
const rgs = StyleSheet.create({
  container: { borderTopWidth: 1, borderTopColor: 'rgba(245,158,11,0.2)', paddingTop: 12, marginTop: 4 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 10 },
  sectionTitle: { fontSize: 13, fontWeight: '800', letterSpacing: 1 },
  onceRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  onceBtn: { flex: 1, paddingVertical: 8, borderRadius: 12, borderWidth: 1.5, alignItems: 'center' },
  onceBtnTxt: { fontSize: 11, fontWeight: '800' },
});
const ep = StyleSheet.create({
  panel: { backgroundColor: 'rgba(10,10,16,0.97)', padding: 18, borderRadius: 20, borderWidth: 1.5, width: 290, maxHeight: 520 },
  title: { fontSize: 19, fontWeight: '800', textAlign: 'center', marginBottom: 2 },
  sub: { fontSize: 11, color: '#555', textAlign: 'center', marginBottom: 2 },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.06)', marginVertical: 10 },
  label: { fontSize: 11, color: '#999', fontWeight: '700', marginBottom: 7, textAlign: 'right' },
  hint: { fontSize: 10, color: '#f87171', textAlign: 'center', marginTop: 3, opacity: 0.8 },
  sectionHeader: { fontSize: 12, color: '#ccc', fontWeight: '800', textAlign: 'center', marginBottom: 10, letterSpacing: 0.5 },
  nameArInput: { backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, fontSize: 15, fontWeight: '700', textAlign: 'right', marginBottom: 2 },
  starRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 3, marginBottom: 2 },
  starBtn: { padding: 3 },
  starIcon: { fontSize: 26 },
  clearBtn: { width: 28, height: 28, borderRadius: 14, borderWidth: 1, borderColor: '#333', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.04)' },
  clearBtnActive: { borderColor: '#f87171', backgroundColor: 'rgba(248,113,113,0.1)' },
  clearBtnTxt: { fontSize: 13, color: '#555', fontWeight: '800' },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  abilityBox: { marginTop: 6 },
  abilityInput: { backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderRadius: 10, padding: 10, color: '#e2e8f0', fontSize: 12, minHeight: 58, maxHeight: 110, },
  steppers: { flexDirection: 'row', justifyContent: 'space-around', gap: 10 },
  statCol: { alignItems: 'center', gap: 4, flex: 1 },
  statIcon: { fontSize: 18 },
  statRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  stepBtn: { width: 26, height: 26, borderRadius: 7, borderWidth: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.04)' },
  statInput: { width: 46, height: 32, borderRadius: 8, borderWidth: 1, textAlign: 'center', fontSize: 15, fontWeight: '800', backgroundColor: 'rgba(255,255,255,0.04)' },
  statLabel: { fontSize: 10, fontWeight: '600' },
  actionRow: { flexDirection: 'row', gap: 10, justifyContent: 'center', marginBottom: 2 },
  actionBtn: { flex: 1, paddingVertical: 10, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.03)' },
  imgSection: { gap: 8 },
  imgPreviewWrap: { position: 'relative', alignSelf: 'center', width: 110, height: 140, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', backgroundColor: 'rgba(255,255,255,0.04)', overflow: 'hidden' },
  imgPreview: { width: '100%', height: '100%' },
  imgRemoveBtn: { position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: 10, backgroundColor: '#f87171', alignItems: 'center', justifyContent: 'center' },
  videoThumb: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6 },
  videoThumbIcon: { fontSize: 32 },
  videoThumbTxt: { fontSize: 10, color: '#a78bfa', fontWeight: '700' },
  mediaPickRow: { flexDirection: 'row', gap: 8 },
  mediaPickBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 8, borderRadius: 12, borderWidth: 1, backgroundColor: 'rgba(255,255,255,0.04)' },
  imgPickTxt: { fontSize: 12, fontWeight: '700' },
  offsetRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  offsetBtn: { flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, borderWidth: 1, backgroundColor: 'rgba(255,255,255,0.04)', minWidth: 52 },
  offsetBtnTxt: { fontSize: 9, fontWeight: '700' },
  offsetValueBox: { alignItems: 'center', minWidth: 44 },
  offsetValue: { fontSize: 16, fontWeight: '800' },
  offsetHint: { fontSize: 9, color: '#555' },
  offsetResetBtn: { paddingHorizontal: 8, paddingVertical: 6, borderRadius: 8, borderWidth: 1, backgroundColor: 'rgba(255,255,255,0.04)' },
  offsetResetTxt: { fontSize: 10, color: '#666', fontWeight: '600' },
  deleteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: '#f8717155', backgroundColor: 'rgba(248,113,113,0.08)', marginBottom: 10 },
  deleteBtnTxt: { color: '#f87171', fontWeight: '800', fontSize: 12 },
});
const styles = StyleSheet.create({
  bg: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 0 },
  container: { flex: 1, zIndex: 1, alignItems: 'center', width: '100%' },
  title: { fontSize: 32, fontWeight: 'bold', color: '#d4af37', textAlign: 'center' },
  subtitle: { fontSize: 13, color: '#a0a0a0', marginTop: 4, textAlign: 'center' },
  scroll: { flex: 1, width: '100%' },
  scrollContent: { alignItems: 'center', paddingBottom: 20 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', maxWidth: 1100 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', justifyContent: 'center', alignItems: 'center' },
  modalRow: { flexDirection: 'row', alignItems: 'center', gap: 26 },
  fab: {
    position: 'absolute', top: 20, right: 20, zIndex: 50,
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 16, paddingVertical: 9,
    backgroundColor: 'rgba(217,119,6,0.90)',
    borderRadius: 16, borderWidth: 1.5, borderColor: '#f59e0b',
    shadowColor: '#f59e0b', shadowOpacity: 0.5, shadowRadius: 10, elevation: 8,
  },
  fabTxt: { color: '#fff', fontWeight: '800', fontSize: 13 },
  // ── Backup buttons
  backupRow: { position: 'absolute', top: 20, right: 110, zIndex: 50, flexDirection: 'row', gap: 8 },
  backupBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14, borderWidth: 1.5, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 6, elevation: 6 },
  backupBtnTxt: { fontSize: 12, fontWeight: '800' },
  // ── Other
  customBadge: { position: 'absolute', top: 4, left: 4, backgroundColor: 'rgba(217,119,6,0.85)', borderRadius: 6, paddingHorizontal: 5, paddingVertical: 2 },
  customBadgeTxt: { color: '#fff', fontSize: 9, fontWeight: '900' },
  gridDeleteBtn: {
    position: 'absolute', top: 4, right: 4, width: 24, height: 24, borderRadius: 12,
    backgroundColor: 'rgba(15,5,5,0.65)', borderWidth: 1, borderColor: 'rgba(248,113,113,0.45)',
    alignItems: 'center', justifyContent: 'center',
  },
  filterRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10, paddingHorizontal: 16 },
  filterBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: '#2a2a38', backgroundColor: 'rgba(255,255,255,0.04)' },
  filterBtnActive: { borderColor: '#d4af3788', backgroundColor: 'rgba(212,175,55,0.10)' },
  filterBtnTxt: { fontSize: 13, fontWeight: '700', color: '#888' },
  filterBadge: { width: 18, height: 18, borderRadius: 9, backgroundColor: '#d4af37', alignItems: 'center', justifyContent: 'center' },
  filterBadgeTxt: { fontSize: 10, fontWeight: '900', color: '#000' },
  clearFiltersBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: '#f8717155', backgroundColor: 'rgba(248,113,113,0.08)' },
  clearFiltersTxt: { fontSize: 11, fontWeight: '700', color: '#f87171' },
});
