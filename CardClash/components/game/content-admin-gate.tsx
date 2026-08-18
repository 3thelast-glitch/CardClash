import { useEffect, useState } from 'react';
import { ActivityIndicator, SafeAreaView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { LockKeyhole, ShieldCheck } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { hasContentAdminPassword, setContentAdminPassword, verifyContentAdminPassword } from '@/lib/game/content-admin-auth';

type GateChild = (controls: { logout: () => void }) => React.ReactNode;

export function ContentAdminGate({ children }: { children: GateChild }) {
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [unlocked, setUnlocked] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void hasContentAdminPassword().then(setConfigured).catch(() => setConfigured(false));
  }, []);

  const submit = async () => {
    setError('');
    setBusy(true);
    try {
      if (configured) {
        const valid = await verifyContentAdminPassword(password);
        if (!valid) {
          setError('كلمة المرور غير صحيحة.');
          return;
        }
      } else {
        if (password.trim().length < 6) {
          setError('استخدم 6 أحرف أو أرقام على الأقل.');
          return;
        }
        if (password !== confirmation) {
          setError('تأكيد كلمة المرور غير مطابق.');
          return;
        }
        await setContentAdminPassword(password);
        setConfigured(true);
      }
      setPassword('');
      setConfirmation('');
      setUnlocked(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'تعذر حفظ إعداد الحماية.');
    } finally {
      setBusy(false);
    }
  };

  if (configured === null) {
    return <View style={S.loading}><ActivityIndicator color="#39E6D0" /></View>;
  }
  if (unlocked) return <>{children({ logout: () => setUnlocked(false) })}</>;

  return (
    <SafeAreaView style={S.root}>
      <LinearGradient colors={['#061017', '#0b1620', '#102331']} style={StyleSheet.absoluteFill} />
      <View style={S.shell}>
        <View style={S.icon}><LockKeyhole size={30} color="#39E6D0" /></View>
        <Text style={S.kicker}>PRIVATE CONTENT VAULT</Text>
        <Text style={S.title}>{configured ? 'تسجيل الدخول إلى لوحة الإدارة' : 'إعداد حماية لوحة الإدارة'}</Text>
        <Text style={S.subtitle}>{configured ? 'أدخل كلمة المرور للوصول إلى إضافة الكروت وتصديرها.' : 'أنشئ كلمة مرور محلية لحماية أدوات إدارة الكروت على هذا الجهاز.'}</Text>
        <TextInput value={password} onChangeText={setPassword} placeholder="كلمة المرور" placeholderTextColor="#64748B" secureTextEntry autoCapitalize="none" style={S.input} textAlign="right" />
        {!configured && <TextInput value={confirmation} onChangeText={setConfirmation} placeholder="تأكيد كلمة المرور" placeholderTextColor="#64748B" secureTextEntry autoCapitalize="none" style={S.input} textAlign="right" />}
        {error ? <Text style={S.error}>{error}</Text> : null}
        <TouchableOpacity onPress={submit} disabled={busy} style={S.button} activeOpacity={0.85}>
          {busy ? <ActivityIndicator color="#061017" /> : <><ShieldCheck size={18} color="#061017" /><Text style={S.buttonText}>{configured ? 'دخول آمن' : 'حفظ وفتح اللوحة'}</Text></>}
        </TouchableOpacity>
        <Text style={S.note}>الحماية محلية على هذا الجهاز. لحماية حقيقية بين عدة مستخدمين، يلزم ربط اللوحة بخادم ومصادقة خلفية.</Text>
      </View>
    </SafeAreaView>
  );
}

const S = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#061017' },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#061017' },
  shell: { flex: 1, justifyContent: 'center', alignItems: 'stretch', padding: 24, gap: 12 },
  icon: { alignSelf: 'center', width: 70, height: 70, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(57,230,208,0.1)', borderWidth: 1, borderColor: 'rgba(57,230,208,0.35)', marginBottom: 8 },
  kicker: { color: '#39E6D0', fontSize: 10, fontWeight: '900', letterSpacing: 2, textAlign: 'center' },
  title: { color: '#F8FAFC', fontSize: 25, fontWeight: '900', textAlign: 'center' },
  subtitle: { color: '#94A3B8', fontSize: 13, lineHeight: 21, textAlign: 'center', marginBottom: 8 },
  input: { minHeight: 48, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(148,163,184,0.22)', backgroundColor: 'rgba(255,255,255,0.06)', color: '#F8FAFC', paddingHorizontal: 14, fontSize: 14 },
  error: { color: '#FDA4AF', fontSize: 12, textAlign: 'right' },
  button: { minHeight: 48, borderRadius: 12, backgroundColor: '#39E6D0', alignItems: 'center', justifyContent: 'center', flexDirection: 'row-reverse', gap: 8, marginTop: 4 },
  buttonText: { color: '#061017', fontSize: 13, fontWeight: '900' },
  note: { color: '#64748B', fontSize: 11, lineHeight: 18, textAlign: 'center', marginTop: 8 },
});
