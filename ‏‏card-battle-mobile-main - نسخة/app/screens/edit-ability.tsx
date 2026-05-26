/**
 * edit-ability.tsx — two-column layout matching add-card.tsx
 * Supports: edit existing ability (via route params) OR create new
 */
import React, { useState } from 'react';
import {
  View, Text, TextInput, ScrollView, TouchableOpacity,
  StyleSheet, Alert, Platform, KeyboardAvoidingView, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Save, Check } from 'lucide-react-native';
import * as LucideIcons from 'lucide-react-native';
import { Rarity } from '@/data/abilities';

// ─── Rarity config ───
const RARITIES: { id: Rarity; labelAr: string; color: string }[] = [
  { id: 'Common',    labelAr: 'عادي',   color: '#10b981' },
  { id: 'Rare',      labelAr: 'نادر',   color: '#3b82f6' },
  { id: 'Epic',      labelAr: 'ملحمي',  color: '#a855f7' },
  { id: 'Legendary', labelAr: 'أسطوري', color: '#f59e0b' },
  { id: 'Special',   labelAr: 'خاص',    color: '#e879f9' },
];

const RARITY_STARS: Record<Rarity, number> = {
  Common: 1, Rare: 2, Epic: 3, Legendary: 4, Special: 4,
};

// ─── Ability icons ───
const ABILITY_ICONS: { key: string; labelAr: string; Icon: any }[] = [
  { key: 'Zap',       labelAr: 'برق',   Icon: LucideIcons.Zap        },
  { key: 'Shield',    labelAr: 'درع',   Icon: LucideIcons.Shield     },
  { key: 'Sword',     labelAr: 'سيف',   Icon: LucideIcons.Sword      },
  { key: 'Star',      labelAr: 'نجمة',  Icon: LucideIcons.Star       },
  { key: 'Flame',     labelAr: 'نار',   Icon: LucideIcons.Flame      },
  { key: 'Snowflake', labelAr: 'جليد',  Icon: LucideIcons.Snowflake  },
  { key: 'Wind',      labelAr: 'ريح',   Icon: LucideIcons.Wind       },
  { key: 'Droplets',  labelAr: 'ماء',   Icon: LucideIcons.Droplets   },
  { key: 'Sun',       labelAr: 'شمس',   Icon: LucideIcons.Sun        },
  { key: 'Moon',      labelAr: 'قمر',   Icon: LucideIcons.Moon       },
  { key: 'Eye',       labelAr: 'عين',   Icon: LucideIcons.Eye        },
  { key: 'Heart',     labelAr: 'قلب',   Icon: LucideIcons.Heart      },
  { key: 'Skull',     labelAr: 'جمجمة', Icon: LucideIcons.Skull      },
  { key: 'Trophy',    labelAr: 'كأس',   Icon: LucideIcons.Trophy     },
  { key: 'Crown',     labelAr: 'تاج',   Icon: LucideIcons.Crown      },
];

// ─── pick file ───
function pickFileCrossPlatform(accept: string): Promise<{ uri: string } | null> {
  return new Promise(resolve => {
    if (Platform.OS !== 'web') {
      Alert.alert('قريباً', 'هذه الخاصية تعمل على الويب حالياً.');
      resolve(null);
      return;
    }
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.onchange = (e: any) => {
      const file = e.target?.files?.[0];
      if (!file) { resolve(null); return; }
      const reader = new FileReader();
      reader.onload = (ev) => resolve({ uri: ev.target?.result as string });
      reader.readAsDataURL(file);
    };
    input.click();
  });
}

// ─── Chip ───
const Chip = ({ label, selected, color, onPress }: {
  label: string; selected: boolean; color: string; onPress: () => void;
}) => (
  <TouchableOpacity
    onPress={onPress}
    style={[S.chip, selected && { borderColor: color, backgroundColor: color + '25' }]}
  >
    <Text style={[S.chipTxt, selected && { color }]}>{label}</Text>
  </TouchableOpacity>
);

// ─── Icon Chip ───
const IconChip = ({ labelAr, Icon, selected, color, onPress }: {
  labelAr: string; Icon: any;
  selected: boolean; color: string; onPress: () => void;
}) => (
  <TouchableOpacity
    onPress={onPress}
    style={[IC.btn, selected && { borderColor: color, backgroundColor: color + '20' }]}
  >
    <Icon size={18} color={selected ? color : '#6B7280'} strokeWidth={selected ? 2.5 : 1.5} />
    <Text style={[IC.lbl, selected && { color }]}>{labelAr}</Text>
    {selected && (
      <View style={[IC.check, { backgroundColor: color }]}>
        <Check size={7} color="#000" />
      </View>
    )}
  </TouchableOpacity>
);
const IC = StyleSheet.create({
  btn:   { position: 'relative', paddingHorizontal: 10, paddingVertical: 7, borderRadius: 12, borderWidth: 1.5, borderColor: '#2D3748', backgroundColor: 'rgba(255,255,255,0.03)', alignItems: 'center', minWidth: 54, margin: 3 },
  lbl:   { fontSize: 9, color: '#6B7280', fontWeight: '700', marginTop: 3, textAlign: 'center' },
  check: { position: 'absolute', top: 3, right: 3, width: 13, height: 13, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
});

// ─── Mini Card Preview ───
function AbilityCardPreview({
  nameAr, nameEn, description, warning, rarity, mediaUri, iconKey,
}: {
  nameAr: string; nameEn: string; description: string; warning: string;
  rarity: Rarity; mediaUri: string | null; iconKey: string;
}) {
  const r      = RARITIES.find(x => x.id === rarity)!;
  const stars  = RARITY_STARS[rarity];
  const iconObj = ABILITY_ICONS.find(i => i.key === iconKey);
  const IconComp = iconObj?.Icon ?? LucideIcons.Zap;

  return (
    <View style={[P.card, { borderColor: r.color + 'AA', shadowColor: r.color }]}>
      <View style={P.artZone}>
        {mediaUri
          ? <Image source={{ uri: mediaUri }} style={P.artImg} resizeMode="cover" />
          : <View style={P.artEmpty}><LucideIcons.Image size={22} color={r.color + '50'} /></View>
        }
        <View style={P.artOverlay} />
        <View style={[P.badge, { backgroundColor: r.color + '22', borderColor: r.color + '66' }]}>
          <Text style={[P.badgeTxt, { color: r.color }]}>{r.id.toUpperCase()}</Text>
        </View>
        <View style={[P.iconCircle, { borderColor: r.color, shadowColor: r.color }]}>
          <IconComp size={14} color={r.color} strokeWidth={2} />
        </View>
      </View>
      <View style={P.body}>
        <Text style={[P.nameAr, { color: r.color }]} numberOfLines={1}>{nameAr || '—'}</Text>
        <Text style={P.nameEn} numberOfLines={1}>{nameEn || '—'}</Text>
        <View style={[P.divider, { backgroundColor: r.color + '55' }]} />
        <Text style={P.desc} numberOfLines={3}>{description || 'وصف القدرة...'}</Text>
        {warning ? <Text style={P.warn} numberOfLines={2}>⚠️ {warning}</Text> : null}
      </View>
      <View style={[P.foot, { borderTopColor: r.color + '44' }]}>
        <View style={P.stars}>
          {Array.from({ length: 4 }).map((_, i) => (
            <Text key={i} style={{ fontSize: 8, color: i < stars ? r.color : r.color + '28' }}>★</Text>
          ))}
        </View>
        <Text style={[P.footLbl, { color: r.color + 'BB' }]}>{r.labelAr}</Text>
      </View>
    </View>
  );
}
const P = StyleSheet.create({
  card:       { width: 168, borderRadius: 16, borderWidth: 2, backgroundColor: '#000', overflow: 'hidden', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 14, elevation: 12 },
  artZone:    { width: '100%', height: 110, backgroundColor: '#0d0d0d', overflow: 'hidden' },
  artImg:     { width: '100%', height: '100%' },
  artEmpty:   { flex: 1, alignItems: 'center', justifyContent: 'center' },
  artOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 36, backgroundColor: 'rgba(0,0,0,0.55)' },
  badge:      { position: 'absolute', top: 6, left: 6, paddingHorizontal: 5, paddingVertical: 2, borderRadius: 5, borderWidth: 1 },
  badgeTxt:   { fontSize: 6.5, fontWeight: '900', letterSpacing: 1 },
  iconCircle: { position: 'absolute', bottom: -14, alignSelf: 'center', width: 30, height: 30, borderRadius: 15, borderWidth: 2, backgroundColor: '#080808', alignItems: 'center', justifyContent: 'center', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.9, shadowRadius: 4, elevation: 8 },
  body:       { paddingTop: 20, paddingHorizontal: 10, paddingBottom: 4, alignItems: 'center', gap: 2 },
  nameAr:     { fontSize: 13, fontWeight: '900', textAlign: 'center' },
  nameEn:     { fontSize: 7.5, fontWeight: '700', color: '#555', textAlign: 'center', letterSpacing: 1, textTransform: 'uppercase' },
  divider:    { width: 30, height: 1.5, borderRadius: 1, marginVertical: 4 },
  desc:       { fontSize: 8.5, color: '#7a8fa6', textAlign: 'center', lineHeight: 12 },
  warn:       { fontSize: 8, color: '#f87171', textAlign: 'center', marginTop: 2 },
  foot:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8, paddingVertical: 5, borderTopWidth: 1, backgroundColor: 'rgba(0,0,0,0.7)', marginTop: 6 },
  stars:      { flexDirection: 'row', gap: 2 },
  footLbl:    { fontSize: 6.5, fontWeight: '800', letterSpacing: 0.5, textTransform: 'uppercase' },
});

// ─── Main Screen ───
export default function EditAbilityScreen() {
  const navigation = useNavigation();
  const route      = useRoute() as any;
  const params     = route.params ?? {};

  // ── تعبئة أولية من params (تعديل كرت موجود) أو فارغة (كرت جديد)
  const [nameAr,      setNameAr]      = useState<string>(params.presetNameAr      ?? '');
  const [nameEn,      setNameEn]      = useState<string>(params.presetNameEn      ?? '');
  const [description, setDescription] = useState<string>(params.presetDescription ?? '');
  const [warning,     setWarning]     = useState<string>(params.presetWarning     ?? '');
  const [rarity,      setRarity]      = useState<Rarity>((params.presetRarity as Rarity) ?? 'Common');
  const [iconKey,     setIconKey]     = useState('Zap');
  const [mediaUri,    setMediaUri]    = useState<string | null>(null);
  const [iconsOpen,   setIconsOpen]   = useState(false);

  const isEditing = !!params.abilityId;
  const sel       = RARITIES.find(r => r.id === rarity)!;
  const IconPrev  = ABILITY_ICONS.find(i => i.key === iconKey)?.Icon ?? LucideIcons.Zap;

  const handlePickMedia = async (accept: string) => {
    const res = await pickFileCrossPlatform(accept);
    if (res) setMediaUri(res.uri);
  };

  const handleSave = () => {
    if (!nameAr.trim() && !nameEn.trim()) {
      Alert.alert('تنبيه', 'أدخل اسم القدرة على الأقل.');
      return;
    }
    Alert.alert(
      isEditing ? 'تم التعديل ✅' : 'تم الحفظ ✅',
      `"${nameAr || nameEn}" — ${sel.labelAr}`,
    );
    navigation.goBack();
  };

  return (
    <SafeAreaView style={S.root}>
      <LinearGradient colors={['#060610', '#0f172a']} style={StyleSheet.absoluteFill} />

      {/* TOP BAR */}
      <View style={S.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={S.backBtn}>
          <Text style={S.backTxt}>← رجوع</Text>
        </TouchableOpacity>
        <Text style={S.pageTitle}>
          {isEditing ? '✏️ تعديل القدرة' : '➕ قدرة جديدة'}
        </Text>
        <View style={{ width: 60 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={S.columns}>

          {/* LEFT: preview + media + rarity */}
          <View style={S.leftCol}>
            <AbilityCardPreview
              nameAr={nameAr} nameEn={nameEn}
              description={description} warning={warning}
              rarity={rarity} mediaUri={mediaUri} iconKey={iconKey}
            />
            <View style={S.mediaRow}>
              <TouchableOpacity style={[S.mediaBtn, { borderColor: sel.color + '88' }]} onPress={() => handlePickMedia('image/*')}>
                <Text style={[S.mediaBtnTxt, { color: sel.color }]}>🖼️ صورة</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[S.mediaBtn, { borderColor: '#a78bfa88' }]} onPress={() => handlePickMedia('video/mp4,video/webm,video/*')}>
                <Text style={[S.mediaBtnTxt, { color: '#a78bfa' }]}>🎦 فيديو</Text>
              </TouchableOpacity>
            </View>
            {mediaUri && (
              <TouchableOpacity onPress={() => setMediaUri(null)} style={S.removeMedia}>
                <Text style={{ color: '#f87171', fontSize: 11, fontWeight: '700' }}>✕ حذف الوسيط</Text>
              </TouchableOpacity>
            )}
            <Text style={S.secLabel}>الندرة</Text>
            <View style={S.chipCol}>
              {RARITIES.map(r => (
                <Chip key={r.id} label={r.labelAr} selected={rarity === r.id} color={r.color} onPress={() => setRarity(r.id)} />
              ))}
            </View>
          </View>

          {/* RIGHT: fields */}
          <ScrollView style={S.rightCol} contentContainerStyle={{ paddingBottom: 100 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

            <Text style={S.secLabel}>الاسم بالعربي *</Text>
            <TextInput style={[S.input, { borderColor: sel.color + '55' }]} placeholder="مثال: ناروتو" placeholderTextColor="#444" value={nameAr} onChangeText={setNameAr} textAlign="right" />

            <Text style={S.secLabel}>الاسم بالإنجليزي *</Text>
            <TextInput style={[S.input, { borderColor: '#37415155' }]} placeholder="Naruto" placeholderTextColor="#444" value={nameEn} onChangeText={setNameEn} />

            {/* icon picker */}
            <TouchableOpacity style={S.iconHeader} onPress={() => setIconsOpen(v => !v)} activeOpacity={0.75}>
              <Text style={S.iconHeaderTitle}>الأيقونة</Text>
              <View style={{ flex: 1, alignItems: 'center' }}>
                <IconPrev size={16} color={sel.color} strokeWidth={2} />
              </View>
              <Text style={S.iconHeaderChevron}>{iconsOpen ? '▲' : '▼'}</Text>
            </TouchableOpacity>
            {iconsOpen && (
              <View style={S.iconsGrid}>
                {ABILITY_ICONS.map(({ key, labelAr, Icon }) => (
                  <IconChip key={key} labelAr={labelAr} Icon={Icon} selected={iconKey === key} color={sel.color} onPress={() => setIconKey(key)} />
                ))}
              </View>
            )}

            <Text style={S.secLabel}>القدرة الخاصة (اختياري)</Text>
            <TextInput style={[S.input, S.multiline, { borderColor: sel.color + '33' }]} placeholder="اكتب وصف القدرة..." placeholderTextColor="#444" multiline value={description} onChangeText={setDescription} textAlign="right" />

            <Text style={S.secLabel}>⚠️ تحذير (اختياري)</Text>
            <TextInput style={[S.input, { borderColor: '#ef444433' }]} placeholder="تحذير أو ملاحظة..." placeholderTextColor="#444" value={warning} onChangeText={setWarning} textAlign="right" />

            <TouchableOpacity style={[S.saveBtn, { backgroundColor: sel.color }]} onPress={handleSave}>
              <Save size={18} color="#000" />
              <Text style={S.saveBtnTxt}>{isEditing ? 'حفظ التعديلات' : 'حفظ القدرة'}</Text>
            </TouchableOpacity>

          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const S = StyleSheet.create({
  root:             { flex: 1, backgroundColor: '#060610' },
  topBar:           { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
  backBtn:          { width: 60 },
  backTxt:          { color: '#6B7280', fontSize: 13, fontWeight: '700' },
  pageTitle:        { color: '#FFD700', fontSize: 18, fontWeight: '900', textAlign: 'center', flex: 1 },
  columns:          { flex: 1, flexDirection: 'row' },
  leftCol:          { width: 200, paddingHorizontal: 12, paddingTop: 16, alignItems: 'center', borderRightWidth: 1, borderRightColor: 'rgba(255,255,255,0.06)' },
  rightCol:         { flex: 1, paddingHorizontal: 14, paddingTop: 12 },
  mediaRow:         { flexDirection: 'row', gap: 6, marginTop: 12, marginBottom: 4 },
  mediaBtn:         { flex: 1, paddingVertical: 7, borderRadius: 10, borderWidth: 1.5, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.04)' },
  mediaBtnTxt:      { fontSize: 12, fontWeight: '700' },
  removeMedia:      { alignSelf: 'center', paddingVertical: 4, marginBottom: 4 },
  chipCol:          { flexDirection: 'column', gap: 5, width: '100%', marginTop: 4 },
  chip:             { paddingHorizontal: 11, paddingVertical: 5, borderRadius: 20, borderWidth: 1.5, borderColor: '#2D3748', backgroundColor: 'rgba(255,255,255,0.03)', width: '100%', alignItems: 'center' },
  chipTxt:          { color: '#6B7280', fontSize: 12, fontWeight: '700' },
  secLabel:         { color: '#9CA3AF', fontSize: 11, fontWeight: '700', marginTop: 14, marginBottom: 5, textAlign: 'right' },
  input:            { backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderRadius: 10, color: '#fff', fontSize: 14, paddingHorizontal: 12, paddingVertical: 9, marginBottom: 2 },
  multiline:        { minHeight: 64, textAlignVertical: 'top' },
  iconHeader:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', backgroundColor: 'rgba(255,255,255,0.04)' },
  iconHeaderTitle:  { color: '#E2E8F0', fontSize: 13, fontWeight: '800' },
  iconHeaderChevron:{ color: '#6B7280', fontSize: 12, fontWeight: '700' },
  iconsGrid:        { flexDirection: 'row', flexWrap: 'wrap', paddingVertical: 6 },
  saveBtn:          { marginTop: 20, borderRadius: 12, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  saveBtnTxt:       { color: '#000', fontWeight: '900', fontSize: 15 },
});
