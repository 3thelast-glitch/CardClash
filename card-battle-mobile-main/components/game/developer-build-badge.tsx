import Constants from 'expo-constants';
import { StyleSheet, View } from 'react-native';
import { ThemedText as Text } from '@/components/ui/ThemedText';
import { isDeveloperBuild } from '@/lib/build-variant';

/** شارة غير تفاعلية تظهر في نسخة المطور فقط لتفادي خلطها مع نسخة اللاعب. */
export function DeveloperBuildBadge() {
  if (!isDeveloperBuild(Constants.expoConfig?.extra)) return null;
  return (
    <View pointerEvents="none" style={styles.badge} accessibilityLabel="نسخة مطور">
      <Text style={styles.text}>DEV · تشخيص LAN</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { position: 'absolute', top: 8, right: 12, zIndex: 100, backgroundColor: 'rgba(94, 54, 180, 0.92)', borderWidth: 1, borderColor: '#c4b5fd', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  text: { color: '#fff', fontSize: 10, fontWeight: '900', letterSpacing: 0.4 },
});
