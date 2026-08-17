import React, { useCallback, useEffect, useState } from 'react';
import { Clipboard, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Code2, Download, Plus, Sparkles, Users } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { generateCustomContentCode, loadCustomContent, type CustomContentJson } from '@/lib/game/custom-content-store';
import { ContentAdminGate } from '@/components/game/content-admin-gate';

export default function ContentAdminScreen() {
  return <ContentAdminGate>{({ logout }) => <ContentAdminContent onLogout={logout} />}</ContentAdminGate>;
}

function ContentAdminContent({ onLogout }: { onLogout: () => void }) {
  const router = useRouter();
  const [content, setContent] = useState<CustomContentJson>({ cards: [], abilities: [] });
  const [exportedCode, setExportedCode] = useState<string | null>(null);

  const refresh = useCallback(() => {
    void loadCustomContent().then(setContent).catch(() => setContent({ cards: [], abilities: [] }));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const exportCode = () => {
    const code = generateCustomContentCode(content);
    setExportedCode(code);
    Clipboard.setString(code);
  };

  return (
    <SafeAreaView style={S.root}>
      <LinearGradient colors={['#061017', '#0b1620', '#102331']} style={StyleSheet.absoluteFill} />
      <ScrollView contentContainerStyle={S.container} showsVerticalScrollIndicator={false}>
        <View style={S.header}>
          <View style={S.headerActions}>
            <TouchableOpacity onPress={onLogout} style={S.logout} accessibilityLabel="تسجيل الخروج">
              <Text style={S.logoutText}>خروج</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.back()} style={S.back} accessibilityLabel="رجوع">
              <ArrowLeft size={18} color="#39E6D0" />
            </TouchableOpacity>
          </View>
          <View style={S.headerText}>
            <Text style={S.kicker}>CONTENT VAULT</Text>
            <Text style={S.title}>لوحة إدارة الكروت</Text>
            <Text style={S.subtitle}>أضف محتوى مخصصاً، عاينه، ثم صدّره ككود TypeScript.</Text>
          </View>
        </View>

        <View style={S.statsRow}>
          <Stat icon={<Users size={20} color="#39E6D0" />} value={content.cards.length} label="شخصيات مخصصة" />
          <Stat icon={<Sparkles size={20} color="#fbbf24" />} value={content.abilities.length} label="قدرات مخصصة" />
        </View>

        <View style={S.actionsRow}>
          <ActionCard title="إضافة شخصية" description="أدخل الهوية والإحصاءات والندرة" color="#39E6D0" icon={<Plus size={24} color="#061017" />} onPress={() => router.push('/screens/add-card' as any)} />
          <ActionCard title="إضافة قدرة" description="اختر آلية التنفيذ وشاهد المعاينة" color="#fbbf24" icon={<Sparkles size={24} color="#211500" />} onPress={() => router.push('/screens/edit-ability' as any)} />
        </View>

        <View style={S.panel}>
          <View style={S.panelHeader}>
            <View><Text style={S.panelTitle}>المحتوى المحفوظ</Text><Text style={S.panelHint}>المصدر: JSON المضمّن + AsyncStorage</Text></View>
            <TouchableOpacity onPress={refresh} style={S.refresh}><Text style={S.refreshText}>تحديث</Text></TouchableOpacity>
          </View>
          {content.cards.length === 0 && content.abilities.length === 0 ? (
            <Text style={S.empty}>لا توجد إضافات بعد. ابدأ بإضافة كرت من الأعلى.</Text>
          ) : (
            <View style={S.list}>
              {content.cards.map(card => <ContentRow key={`card-${card.id}`} type="شخصية" title={card.nameAr} detail={`${card.name} • ${card.stars ?? 1}★`} color="#39E6D0" />)}
              {content.abilities.map(ability => <ContentRow key={`ability-${ability.id}`} type="قدرة" title={ability.nameAr} detail={`${ability.nameEn} • ${ability.rarity}`} color="#fbbf24" />)}
            </View>
          )}
        </View>

        <View style={S.exportPanel}>
          <View style={S.exportIcon}><Code2 size={24} color="#7DD3FC" /></View>
          <View style={{ flex: 1 }}><Text style={S.panelTitle}>تصدير كود TypeScript</Text><Text style={S.panelHint}>ينسخ ملفاً يمكن حفظه داخل `data/custom-cards.ts`.</Text></View>
          <TouchableOpacity onPress={exportCode} style={S.exportButton}><Download size={16} color="#061017" /><Text style={S.exportText}>تصدير</Text></TouchableOpacity>
        </View>
        {exportedCode && <View style={S.codeBox}><Text style={S.copied}>تم نسخ الكود إلى الحافظة</Text><Text selectable style={S.code}>{exportedCode}</Text></View>}
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({ icon, value, label }: { icon: React.ReactNode; value: number; label: string }) {
  return <View style={S.stat}><View style={S.statIcon}>{icon}</View><Text style={S.statValue}>{value}</Text><Text style={S.statLabel}>{label}</Text></View>;
}

function ActionCard({ title, description, color, icon, onPress }: { title: string; description: string; color: string; icon: React.ReactNode; onPress: () => void }) {
  return <TouchableOpacity onPress={onPress} style={[S.action, { borderColor: `${color}55` }]} activeOpacity={0.82}><View style={[S.actionIcon, { backgroundColor: color }]}>{icon}</View><Text style={S.actionTitle}>{title}</Text><Text style={S.actionDescription}>{description}</Text></TouchableOpacity>;
}

function ContentRow({ type, title, detail, color }: { type: string; title: string; detail: string; color: string }) {
  return <View style={S.row}><View style={[S.dot, { backgroundColor: color }]} /><View style={S.rowText}><Text style={S.rowTitle}>{title}</Text><Text style={S.rowDetail}>{detail}</Text></View><Text style={[S.rowType, { color }]}>{type}</Text></View>;
}

const S = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#061017' },
  container: { padding: 20, paddingBottom: 48, gap: 16 },
  header: { flexDirection: 'row-reverse', alignItems: 'flex-start', gap: 14, marginBottom: 4 },
  headerActions: { gap: 8, alignItems: 'center' },
  headerText: { flex: 1, alignItems: 'flex-end' },
  back: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: 'rgba(57,230,208,0.08)', borderWidth: 1, borderColor: 'rgba(57,230,208,0.3)' },
  logout: { paddingHorizontal: 9, paddingVertical: 6, borderRadius: 8, backgroundColor: 'rgba(253,164,175,0.1)', borderWidth: 1, borderColor: 'rgba(253,164,175,0.25)' },
  logoutText: { color: '#FDA4AF', fontSize: 10, fontWeight: '800' },
  kicker: { color: '#39E6D0', fontSize: 10, letterSpacing: 2, fontWeight: '800' },
  title: { color: '#F8FAFC', fontSize: 25, fontWeight: '900', textAlign: 'right', marginTop: 3 },
  subtitle: { color: '#94A3B8', fontSize: 12, textAlign: 'right', marginTop: 5, lineHeight: 20 },
  statsRow: { flexDirection: 'row-reverse', gap: 10 },
  stat: { flex: 1, minHeight: 110, padding: 14, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(148,163,184,0.18)', backgroundColor: 'rgba(255,255,255,0.04)', alignItems: 'flex-end', justifyContent: 'space-between' },
  statIcon: { width: 34, height: 34, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center' },
  statValue: { color: '#F8FAFC', fontSize: 25, fontWeight: '900' },
  statLabel: { color: '#94A3B8', fontSize: 11, textAlign: 'right' },
  actionsRow: { flexDirection: 'row-reverse', gap: 10 },
  action: { flex: 1, minHeight: 160, padding: 15, borderRadius: 18, borderWidth: 1, backgroundColor: 'rgba(255,255,255,0.045)', alignItems: 'flex-end', justifyContent: 'space-between' },
  actionIcon: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  actionTitle: { color: '#F8FAFC', fontSize: 16, fontWeight: '900', textAlign: 'right' },
  actionDescription: { color: '#94A3B8', fontSize: 11, lineHeight: 18, textAlign: 'right' },
  panel: { borderRadius: 18, borderWidth: 1, borderColor: 'rgba(148,163,184,0.16)', backgroundColor: 'rgba(255,255,255,0.035)', padding: 16 },
  panelHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  panelTitle: { color: '#F8FAFC', fontSize: 15, fontWeight: '900', textAlign: 'right' },
  panelHint: { color: '#64748B', fontSize: 11, marginTop: 4, textAlign: 'right' },
  refresh: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: 'rgba(57,230,208,0.08)' },
  refreshText: { color: '#39E6D0', fontSize: 11, fontWeight: '800' },
  empty: { color: '#64748B', textAlign: 'right', fontSize: 12, paddingVertical: 18 },
  list: { gap: 8 },
  row: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: 'rgba(148,163,184,0.08)' },
  dot: { width: 8, height: 8, borderRadius: 4 },
  rowText: { flex: 1, alignItems: 'flex-end' },
  rowTitle: { color: '#E2E8F0', fontSize: 13, fontWeight: '800', textAlign: 'right' },
  rowDetail: { color: '#64748B', fontSize: 10, marginTop: 2, textAlign: 'right' },
  rowType: { fontSize: 10, fontWeight: '800' },
  exportPanel: { flexDirection: 'row-reverse', gap: 12, alignItems: 'center', padding: 16, borderRadius: 18, borderWidth: 1, borderColor: 'rgba(125,211,252,0.25)', backgroundColor: 'rgba(14,116,144,0.12)' },
  exportIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(125,211,252,0.12)' },
  exportButton: { flexDirection: 'row-reverse', gap: 5, alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, backgroundColor: '#7DD3FC' },
  exportText: { color: '#061017', fontSize: 11, fontWeight: '900' },
  codeBox: { borderRadius: 14, padding: 14, backgroundColor: '#020617', borderWidth: 1, borderColor: 'rgba(125,211,252,0.25)' },
  copied: { color: '#39E6D0', fontSize: 11, fontWeight: '800', marginBottom: 8, textAlign: 'right' },
  code: { color: '#7DD3FC', fontSize: 10, lineHeight: 17, fontFamily: 'monospace' },
});
