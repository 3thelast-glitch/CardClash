import { useState, useEffect } from 'react';
import {
  DEFAULT_SETTINGS,
  loadSettings,
  subscribeSettings,
  type GameSettings,
} from '@/lib/game/settings-store';

/**
 * useSettings
 * يجلب إعدادات اللعبة من AsyncStorage ويُحدّثها تلقائياً عند التغيير.
 * الاستخدام:
 *   const { settings, loaded } = useSettings();
 */
export function useSettings(): { settings: GameSettings; loaded: boolean } {
  const [settings, setSettings] = useState<GameSettings>(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    const unsubscribe = subscribeSettings((nextSettings) => {
      if (active) setSettings(nextSettings);
    });

    loadSettings().then((nextSettings) => {
      if (active) {
        setSettings(nextSettings);
        setLoaded(true);
      }
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  return { settings, loaded };
}

// ── ثوابت السرعة المشتقة من الإعدادات ──────────────────────────────────────
// يمكن توسيعها لاحقاً إذا أُعيد إضافة battleSpeed للإعدادات
export const BATTLE_TIMINGS = {
  combatDuration: 1000,   // مدة انيميشن القتال (ms)
  nextRoundDelay: 1200,   // التأخير قبل الجولة التالية (ms)
  cardEntryDelay: 80,     // تأخير ظهور كرت اللاعب
  botCardDelay: 240,      // تأخير ظهور كرت البوت
  vsDelay: 440,           // تأخير ظهور VS
  phaseActionDelay: 720,  // التأخير قبل مرحلة الاختيار
  cardEntrance: 720,      // التأخير قبل بدء مرحلة الاختيار
  autoNextRound: 1200,     // التأخير قبل الانتقال التلقائي للجولة التالية
} as const;
