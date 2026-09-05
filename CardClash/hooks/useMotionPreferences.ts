import { useEffect, useMemo, useState } from 'react';
import { AccessibilityInfo } from 'react-native';
import { useSettings } from '@/lib/game/hooks/useSettings';

export function useMotionPreferences() {
  const { settings, loaded } = useSettings();
  const [systemReduceMotion, setSystemReduceMotion] = useState(false);

  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (active) setSystemReduceMotion(enabled);
      })
      .catch(() => undefined);

    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setSystemReduceMotion,
    );

    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  return useMemo(() => {
    const preference = settings.motionPreference ?? 'system';
    const reduceMotion =
      !settings.animationsEnabled ||
      preference === 'reduced' ||
      (preference === 'system' && systemReduceMotion);

    return {
      loaded,
      reduceMotion,
      animationsEnabled: settings.animationsEnabled && !reduceMotion,
      preference,
    };
  }, [loaded, settings.animationsEnabled, settings.motionPreference, systemReduceMotion]);
}
