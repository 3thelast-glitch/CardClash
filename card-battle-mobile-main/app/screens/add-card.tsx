/**
 * add-card.tsx — تخطيط عمودين: شكل الكارت يسار + الحقول يمين
 */
import React, { useState, useCallback } from 'react';
import {
  View, Text, TextInput, ScrollView, TouchableOpacity,
  StyleSheet, Alert, Platform, KeyboardAvoidingView,
  Clipboard, Image, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { saveCustomCard, generateCardCode } from '@/lib/game/custom-cards-store';
import { saveImage } from '@/lib/game/image-storage';
import { Card, CardRarity, Race, CardClass, Element, Tag, Gender, ELEMENT_EMOJI, ELEMENT_COLORS, RACE_EMOJI, CLASS_EMOJI, GENDER_EMOJI, GENDER_COLORS } from '@/lib/game/types';
import { CARD_EDITS_KEY } from '@/app/screens/cards-gallery';
import { LuxuryCharacterCardAnimated } from '@/components/game/luxury-character-card-animated';
import AsyncStorage from '@react-native-async-storage/async-storage';

const RACE_AR: Record<Race, string> = {
  human: 'بشري', elf: 'إلف', orc: 'أورك',
  dragon: 'تنين', demon: 'شيطان', undead: 'حي ميت',
  monster: 'وحش', robot: 'روبوت',
};

// ✔ 6 فئات فقط: ساحر ، رامي ، سياف ، مقاتل ، والي ، طبيب
const CLASS_AR: Partial<Record<CardClass, string>> = {
  mage:      'ساحر',
  archer:    'رامي',
  swordsman: 'سياف',
  fighter:   'مقاتل',
  guardian:  'والي',
  healer:    'طبيب',
};

const ELEMENT_AR: Record<Element, string> = {
  fire: 'نار', water: 'ماء',
  earth: 'أرض', lightning: 'برق', wind: 'ريح',
};

// ✔ جنسين فقط: ذكر و أنثى (no unknown)
const GENDER_AR: Record<'male' | 'female', string> = {
  male:   'ذكر',
  female: 'أنثى',
};
const TAG_AR: Record<string, string> = {
  sword: 'سيف', shield: 'درع', magic: 'سحر', bow: 'قوس', crown: 'تاج',
};
const TAG_ICONS: Record<string, string> = {
  sword: '⚔️', shield: '🛡️', magic: '✨', bow: '🏹', crown: '👑',
};

const RARITIES: { value: CardRarity; label: string; color: string }[] = [
  { value: 'common',    label: 'عادي',   color: '#6366f1' },
  { value: 'rare',      label: 'نادر',   color: '#f59e0b' },
  { value: 'epic',      label: 'ملحمي',  color: '#8b5cf6' },
  { value: 'legendary', label: 'أسطوري', color: '#ef4444' },
  { value: 'special',   label: 'خاص',    color: '#ec4899' },
];
const RARITY_STARS: Record<CardRarity, number> = {
  common: 1, rare: 3, epic: 4, legendary: 5, special: 5,
};
const RACES: Race[] = ['human','elf','orc','dragon','demon','undead','monster','robot'];

// ✔ ست فئات فقط (حذف warrior, knight, berserker, paladin)
const CLASSES: CardClass[] = ['mage','archer','swordsman','fighter','guardian','healer'];

const ELEMENTS: Element[] = ['fire','water','earth','lightning','wind'];

// ✔ جنسين فقط (حذف unknown)
const GENDERS: ('male' | 'female')[] = ['male', 'female'];

const EL_COLORS: Record<Element, string> = {
  fire: '#ef4444', water: '#3b82f6',
  earth: '#a3e635', lightning: '#facc15', wind: '#a78bfa',
};
const RACE_COLORS: Record<Race, string> = {
  human:'#FCD34D', elf:'#34D399', orc:'#FB923C', dragon:'#F87171',
  demon:'#EF4444', undead:'#94A3B8', monster:'#A78BFA', robot:'#67E8F9',
};
const CLASS_COLORS: Partial<Record<CardClass, string>> = {
  mage:      '#C084FC',
  archer:    '#4ADE80',
  swordsman: '#E2E8F0',
  fighter:   '#F97316',
  guardian:  '#38BDF8',
  healer:    '#86EFAC',
};
const TAGS: string[] = ['sword','shield','magic','bow','crown'];

const defaultForm = { nameAr: '', nameEn: '', attack: '18', defense: '16', specialAbility: '' };

function nameToId(name: string): string {
  return name.trim().replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
}

function pickFileAsBase64(accept: string): Promise<{ base64: string; isVideo: boolean } | null> {
  return new Promise(resolve => {
    if (Platform.OS !== 'web') { resolve(null); return; }
    const input = document.createElement('input');
    input.type = 'file'; input.accept = accept;
    input.onchange = (e: Event) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) { resolve(null); return; }
      const reader = new FileReader();
      reader.onload = () => resolve({ base64: reader.result as string, isVideo: file.type.startsWith('video/') });
      reader.readAsDataURL(file);
    };
    input.click();
  });
}

const Chip = ({ label, selected, color, onPress }: {
  label: string; selected: boolean; color?: string; onPress: () => void;
}) => (
  <TouchableOpacity onPress={onPress}
    style={[S.chip, selected && { borderColor: color ?? '#FFD700', backgroundColor: (color ?? '#FFD700') + '25' }]}>
    <Text style={[S.chipTxt, selected && { color: color ?? '#FFD700' }]}>{label}</Text>
  </TouchableOpacity>
);

const IconChip = ({ icon, label, selected, color, onPress, onClear }: {
  icon: string; label: string; selected: boolean; color: string;
  onPress: () => void; onClear?: () => void;
}) => (
  <View style={IC.wrapper}>
    <TouchableOpacity
      onPress={onPress}
      style={[IC.btn, selected && { borderColor: color, backgroundColor: color + '20' }]}
    >
      <Text style={IC.icon}>{icon}</Text>
      <Text style={[IC.lbl, selected && { color }]}>{label}</Text>
    </TouchableOpacity>
    {selected && onClear && (
      <TouchableOpacity style={IC.clearBtn} onPress={onClear}>
        <Text style={IC.clearTxt}>✕</Text>
      </TouchableOpacity>
    )}
  </View>
);
const IC = StyleSheet.create({
  wrapper:  { position: 'relative', margin: 3 },
  btn:      { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, borderWidth: 1.5, borderColor: '#2D3748', backgroundColor: 'rgba(255,255,255,0.03)', alignItems: 'center', minWidth: 52 },
  icon:     { fontSize: 18, textAlign: 'center' },
  lbl:      { fontSize: 10, color: '#6B7280', fontWeight: '700', marginTop: 2, textAlign: 'center' },
  clearBtn: { position: 'absolute', top: -6, right: -6, backgroundColor: '#EF4444', borderRadius: 8, width: 16, height: 16, alignItems: 'center', justifyContent: 'center', zIndex: 10 },
  clearTxt: { color: '#fff', fontSize: 9, fontWeight: '900', lineHeight: 16 },
});

function CardPreview({ card, mediaB64, isVideo }: { card: Partial<Card>; mediaB64?: string; isVideo: boolean }) {
  const previewCard: Card = {
    id: 'preview',
    name:      card.name      ?? 'New Card',
    nameAr:    card.nameAr   ?? 'كارت جديد',
    attack:    card.attack   ?? 18,
    defense:   card.defense  ?? 16,
    hp:        card.defense  ?? 16,
    race:      card.race     ?? 'human',
    cardClass: card.cardClass ?? 'mage',
    element:   card.element  ?? 'fire',
    tags:      card.tags     ?? ['sword'],
    rarity:    card.rarity   ?? 'common',
    stars:     card.stars    ?? 1,
    gender:    card.gender   ?? 'male',
    specialAbility: card.specialAbility,
    customImage: mediaB64,
    isVideo,
  } as any;
  return (
    <View style={S.previewWrap} pointerEvents="none">
      <LuxuryCharacterCardAnimated card={previewCard} imageOffsetY={0} fitInsideBorder={false} style={{ width: 170, height: 240 }} />
    </View>
  );
}

export default function AddCardScreen() {
  const router = useRouter();
  const [form,     setForm]     = useState(defaultForm);
  const [rarity,   setRarity]   = useState<CardRarity>('common');
  const [race,     setRace]     = useState<Race>('human');
  const [cls,      setCls]      = useState<CardClass>('mage');
  const [element,  setElement]  = useState<Element>('fire');
  // ✔ الافتراضي male وليس unknown
  const [gender,   setGender]   = useState<'male' | 'female'>('male');
  const [tags,     setTags]     = useState<string[]>(['sword']);
  const [mediaB64, setMediaB64] = useState<string | undefined>();
  const [isVideo,  setIsVideo]  = useState(false);
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [iconsOpen, setIconsOpen] = useState(false);

  const rarityColor = RARITIES.find(r => r.value === rarity)?.color ?? '#FFD700';
  const stars       = RARITY_STARS[rarity];
  const toggleTag   = (t: string) =>
    setTags(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);

  const handlePickMedia = async (accept: string) => {
    const res = await pickFileAsBase64(accept);
    if (res) { setMediaB64(res.base64); setIsVideo(res.isVideo); }
  };

  const handleSave = useCallback(async () => {
    if (!form.nameAr.trim()) { Alert.alert('أدخل الاسم العربي'); return; }
    if (!form.nameEn.trim()) { Alert.alert('أدخل الاسم الإنجليزي'); return; }
    setSaving(true);
    try {
      const id = nameToId(form.nameEn);
      const card: Card = {
        id,
        name:    form.nameEn.trim(),
        nameAr:  form.nameAr.trim(),
        attack:  Math.max(1,Math.min(99,parseInt(form.attack)||18)),
        defense: Math.max(1,Math.min(99,parseInt(form.defense)||16)),
        hp:      Math.max(1,Math.min(99,parseInt(form.defense)||16)),
        race, cardClass: cls, element, gender,
        tags: tags.length ? tags : ['sword'],
        rarity, stars,
        specialAbility: form.specialAbility.trim() || undefined,
      };
      await saveCustomCard(card);
      if (mediaB64) await saveImage(`card_img_${id}`, mediaB64);
      const rawEdits = await AsyncStorage.getItem(CARD_EDITS_KEY);
      const editsMap: Record<string,any> = rawEdits ? JSON.parse(rawEdits) : {};
      editsMap[id] = {
        nameAr: card.nameAr, stars, rarity,
        attack: card.attack, defense: card.defense,
        hasAbility: !!card.specialAbility, specialAbility: card.specialAbility ?? '',
        hasCustomImage: !!mediaB64, isVideo, imageOffsetY: 0, fitInsideBorder: false,
        _isCustom: true, name: card.name,
        race, cardClass: cls, element, gender, tags: card.tags, hp: card.hp,
      };
      await AsyncStorage.setItem(CARD_EDITS_KEY, JSON.stringify(editsMap));
      setGeneratedCode(generateCardCode(card));
    } finally { setSaving(false); }
  }, [form, rarity, race, cls, element, gender, tags, mediaB64, isVideo]);

  const copyCode = () => {
    if (!generatedCode) return;
    Clipboard.setString(generatedCode);
    Alert.alert('✅ تم النسخ');
  };

  if (generatedCode) {
    return (
      <SafeAreaView style={S.root}>
        <LinearGradient colors={['#060610','#0f172a']} style={StyleSheet.absoluteFill} />
        <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 60 }}>
          <Text style={[S.pageTitle,{marginBottom:6}]}>✅ تم حفظ الكارت!</Text>
          <Text style={S.subtitle}>الكارت يظهر في المعرض.{`\n`}كود TypeScript جاهز للصق في cards-batch:</Text>
          <View style={S.codeBox}><Text style={S.codeTxt} selectable>{generatedCode}</Text></View>
          <TouchableOpacity style={[S.btnFull,{backgroundColor:'#1d4ed8'}]} onPress={copyCode}>
            <Text style={S.btnFullTxt}>📋 نسخ الكود</Text>
          </TouchableOpacity>
          <TouchableOpacity style={S.btnOutline} onPress={()=>{ setGeneratedCode(null); setForm(defaultForm); setMediaB64(undefined); }}>
            <Text style={S.btnOutlineTxt}>➕ إضافة كارت آخر</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[S.btnOutline,{marginTop:8}]} onPress={()=>router.back()}>
            <Text style={S.btnOutlineTxt}>🔙 رجوع للمعرض</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const previewCardData: Partial<Card> = {
    nameAr:  form.nameAr  || 'كارت جديد',
    name:    form.nameEn  || 'New Card',
    attack:  parseInt(form.attack)  || 18,
    defense: parseInt(form.defense) || 16,
    race, cardClass: cls, element, gender, tags, rarity, stars,
    specialAbility: form.specialAbility || undefined,
  };

  const iconsPreview = [
    ELEMENT_EMOJI[element],
    RACE_EMOJI[race],
    CLASS_EMOJI[cls],
    GENDER_EMOJI[gender],
    tags[0] ? TAG_ICONS[tags[0]] : null,
  ].filter(Boolean).join('  ');

  return (
    <SafeAreaView style={S.root}>
      <LinearGradient colors={['#060610','#0f172a']} style={StyleSheet.absoluteFill} />

      <View style={S.topBar}>
        <TouchableOpacity onPress={()=>router.back()} style={S.backBtn}>
          <Text style={S.backTxt}>← رجوع</Text>
        </TouchableOpacity>
        <Text style={S.pageTitle}>➕ كارت جديد</Text>
        <View style={{width:60}} />
      </View>

      <KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios'?'padding':undefined}>
        <View style={S.columns}>

          <View style={S.leftCol}>
            <CardPreview card={previewCardData} mediaB64={mediaB64} isVideo={isVideo??false} />
            <View style={S.mediaButtons}>
              <TouchableOpacity style={[S.mediaBtnSmall,{borderColor:rarityColor+'88'}]} onPress={()=>handlePickMedia('image/*')}>
                <Text style={[S.mediaBtnTxt,{color:rarityColor}]}>🖼️ صورة</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[S.mediaBtnSmall,{borderColor:'#a78bfa88'}]} onPress={()=>handlePickMedia('video/mp4,video/webm,video/*')}>
                <Text style={[S.mediaBtnTxt,{color:'#a78bfa'}]}>🎦 فيديو</Text>
              </TouchableOpacity>
            </View>
            {mediaB64 && (
              <TouchableOpacity style={S.removeMedia} onPress={()=>{ setMediaB64(undefined); setIsVideo(false); }}>
                <Text style={{color:'#f87171',fontSize:11,fontWeight:'700'}}>✕ حذف الوسيط</Text>
              </TouchableOpacity>
            )}
            <Text style={S.secLabel}>الندرة</Text>
            <View style={S.chipCol}>
              {RARITIES.map(r=>(
                <Chip key={r.value} label={r.label} selected={rarity===r.value} color={r.color} onPress={()=>setRarity(r.value)} />
              ))}
            </View>
          </View>

          <ScrollView style={S.rightCol} contentContainerStyle={{paddingBottom:100}} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

            <Text style={S.secLabel}>الاسم بالعربي *</Text>
            <TextInput style={[S.input,{borderColor:rarityColor+'55'}]}
              placeholder="مثال: ناروتو" placeholderTextColor="#444"
              value={form.nameAr} onChangeText={t=>setForm(f=>({...f,nameAr:t}))}
              textAlign="right" />

            <Text style={S.secLabel}>الاسم بالإنجليزي *</Text>
            <TextInput style={[S.input,{borderColor:'#37415155'}]}
              placeholder="Naruto" placeholderTextColor="#444"
              value={form.nameEn} onChangeText={t=>setForm(f=>({...f,nameEn:t}))} />

            <Text style={S.secLabel}>الطاقات</Text>
            <View style={S.statsRow}>
              {([
                {label:'⚔️ هجوم',key:'attack',color:'#f87171'},
                {label:'🛡️ دفاع',key:'defense',color:'#60a5fa'},
              ] as const).map(({label,key,color})=>(
                <View key={key} style={S.statBox}>
                  <Text style={[S.statLbl,{color}]}>{label}</Text>
                  <TextInput
                    style={[S.statInput,{borderColor:color+'55',color}]}
                    keyboardType="number-pad" maxLength={2}
                    value={form[key]}
                    onChangeText={t=>setForm(f=>({...f,[key]:t}))}
                    textAlign="center" />
                </View>
              ))}
            </View>

            <TouchableOpacity
              style={S.iconsSectionHeader}
              onPress={()=>setIconsOpen(v=>!v)}
              activeOpacity={0.75}
            >
              <Text style={S.iconsSectionTitle}>🎨 الأيقونات</Text>
              <Text style={S.iconsPreviewTxt}>{iconsPreview}</Text>
              <Text style={S.iconsChevron}>{iconsOpen ? '▲' : '▼'}</Text>
            </TouchableOpacity>

            {iconsOpen && (
              <View style={S.iconsBody}>

                {/* العنصر */}
                <Text style={S.secLabel}>العنصر 🔥</Text>
                <View style={S.iconRow}>
                  {ELEMENTS.map(e=>(
                    <IconChip
                      key={e}
                      icon={ELEMENT_EMOJI[e]}
                      label={ELEMENT_AR[e]}
                      selected={element===e}
                      color={EL_COLORS[e]}
                      onPress={()=>setElement(e)}
                    />
                  ))}
                </View>

                {/* الجنس / الفصيلة */}
                <Text style={S.secLabel}>الجنس / الفصيلة 👤</Text>
                <View style={S.iconRow}>
                  {RACES.map(r=>(
                    <IconChip
                      key={r}
                      icon={RACE_EMOJI[r]}
                      label={RACE_AR[r]}
                      selected={race===r}
                      color={RACE_COLORS[r]}
                      onPress={()=>setRace(r)}
                    />
                  ))}
                </View>

                {/* الجنس البيولوجي — ذكر أو أنثى فقط ، لا يوجد بدون */}
                <Text style={S.secLabel}>الجنس البيولوجي ⚧</Text>
                <View style={S.iconRow}>
                  {GENDERS.map(g=>(
                    <IconChip
                      key={g}
                      icon={GENDER_EMOJI[g]}
                      label={GENDER_AR[g]}
                      selected={gender===g}
                      color={GENDER_COLORS[g]}
                      onPress={()=>setGender(g)}
                    />
                  ))}
                </View>

                {/* الفئة — 6 فئات */}
                <Text style={S.secLabel}>الفئة ⚔️</Text>
                <View style={S.iconRow}>
                  {CLASSES.map(c=>(
                    <IconChip
                      key={c}
                      icon={CLASS_EMOJI[c]}
                      label={CLASS_AR[c] ?? c}
                      selected={cls===c}
                      color={CLASS_COLORS[c] ?? '#fff'}
                      onPress={()=>setCls(c)}
                    />
                  ))}
                </View>

                {/* التاغات */}
                <Text style={S.secLabel}>التاغ 🏷️</Text>
                <View style={S.iconRow}>
                  {TAGS.map(t=>(
                    <IconChip
                      key={t}
                      icon={TAG_ICONS[t]}
                      label={TAG_AR[t] ?? t}
                      selected={tags.includes(t)}
                      color='#CBD5E1'
                      onPress={()=>toggleTag(t)}
                      onClear={()=>setTags(prev=>prev.filter(x=>x!==t))}
                    />
                  ))}
                </View>

              </View>
            )}

            <Text style={S.secLabel}>القدرة الخاصة (اختياري)</Text>
            <TextInput
              style={[S.input,S.multiline,{borderColor:rarityColor+'33'}]}
              placeholder="اكتب وصف القدرة..." placeholderTextColor="#444"
              multiline value={form.specialAbility}
              onChangeText={t=>setForm(f=>({...f,specialAbility:t}))}
              textAlign="right" />

            <TouchableOpacity
              style={[S.saveBtn,{backgroundColor:rarityColor,opacity:saving?0.6:1}]}
              onPress={handleSave} disabled={saving}>
              <Text style={S.saveBtnTxt}>{saving?'جاري الحفظ...':'💾 حفظ الكارت'}</Text>
            </TouchableOpacity>

          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const S = StyleSheet.create({
  root:          { flex:1, backgroundColor:'#060610' },
  topBar:        { flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingHorizontal:16, paddingVertical:12, borderBottomWidth:1, borderBottomColor:'rgba(255,255,255,0.06)' },
  backBtn:       { width:60 },
  backTxt:       { color:'#6B7280', fontSize:13, fontWeight:'700' },
  pageTitle:     { color:'#FFD700', fontSize:18, fontWeight:'900', textAlign:'center', flex:1 },
  subtitle:      { color:'#6B7280', fontSize:12, textAlign:'center', lineHeight:20, marginBottom:16 },

  columns:       { flex:1, flexDirection:'row' },
  leftCol:       { width:200, paddingHorizontal:12, paddingTop:16, alignItems:'center', borderRightWidth:1, borderRightColor:'rgba(255,255,255,0.06)' },
  rightCol:      { flex:1, paddingHorizontal:14, paddingTop:12 },

  previewWrap:   { marginBottom:12 },
  mediaButtons:  { flexDirection:'row', gap:6, marginBottom:6 },
  mediaBtnSmall: { flex:1, paddingVertical:7, borderRadius:10, borderWidth:1.5, alignItems:'center', backgroundColor:'rgba(255,255,255,0.04)' },
  mediaBtnTxt:   { fontSize:12, fontWeight:'700' },
  removeMedia:   { alignSelf:'center', paddingVertical:4, marginBottom:8 },

  chipCol:       { flexDirection:'column', gap:5, width:'100%' },

  secLabel:      { color:'#9CA3AF', fontSize:11, fontWeight:'700', marginTop:14, marginBottom:5, textAlign:'right' },
  input:         { backgroundColor:'rgba(255,255,255,0.05)', borderWidth:1, borderRadius:10, color:'#fff', fontSize:14, paddingHorizontal:12, paddingVertical:9, marginBottom:2 },
  multiline:     { minHeight:64, textAlignVertical:'top' },

  statsRow:      { flexDirection:'row', gap:10 },
  statBox:       { flex:1, alignItems:'center' },
  statLbl:       { fontSize:12, fontWeight:'700', marginBottom:4 },
  statInput:     { backgroundColor:'rgba(255,255,255,0.05)', borderWidth:1, borderRadius:8, fontSize:22, fontWeight:'900', paddingVertical:8, width:'100%' },

  chipRow:       { flexDirection:'row', flexWrap:'wrap', gap:6, marginBottom:2 },
  chip:          { paddingHorizontal:11, paddingVertical:5, borderRadius:20, borderWidth:1.5, borderColor:'#2D3748', backgroundColor:'rgba(255,255,255,0.03)' },
  chipTxt:       { color:'#6B7280', fontSize:12, fontWeight:'700' },

  iconsSectionHeader: { flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginTop:14, paddingVertical:10, paddingHorizontal:12, borderRadius:12, borderWidth:1, borderColor:'rgba(255,255,255,0.1)', backgroundColor:'rgba(255,255,255,0.04)' },
  iconsSectionTitle:  { color:'#E2E8F0', fontSize:13, fontWeight:'800' },
  iconsPreviewTxt:    { flex:1, textAlign:'center', fontSize:16, letterSpacing:4 },
  iconsChevron:       { color:'#6B7280', fontSize:12, fontWeight:'700' },
  iconsBody:          { paddingTop:4, paddingBottom:8 },
  iconRow:            { flexDirection:'row', flexWrap:'wrap', marginBottom:4 },

  saveBtn:       { marginTop:20, borderRadius:12, paddingVertical:14, alignItems:'center' },
  saveBtnTxt:    { color:'#fff', fontWeight:'900', fontSize:15 },

  codeBox:       { backgroundColor:'#0d1117', borderRadius:10, padding:16, marginVertical:16, borderWidth:1, borderColor:'#1F2937' },
  codeTxt:       { color:'#7DD3FC', fontSize:12, fontFamily:Platform.OS==='ios'?'Courier New':'monospace', lineHeight:20 },
  btnFull:       { borderRadius:12, paddingVertical:13, alignItems:'center', marginBottom:10 },
  btnFullTxt:    { color:'#fff', fontWeight:'800', fontSize:15 },
  btnOutline:    { borderRadius:12, borderWidth:1.5, borderColor:'#374151', paddingVertical:12, alignItems:'center', marginBottom:8 },
  btnOutlineTxt: { color:'#9CA3AF', fontWeight:'700', fontSize:14 },
});
