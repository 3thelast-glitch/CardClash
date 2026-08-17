/**
 * useBattleSound
 * ─────────────────────────────────────────────────────────────────────────
 * Hook يُدير أصوات المعركة باستخدام expo-av.
 * - يحمّل الأصوات المحلية مسبقاً عند mount حتى تعمل دون اتصال.
 * - يحترم إعداد soundEnabled من GameSettings.
 * - يُنظّف (unload) الأصوات عند unmount تلقائياً.
 *
 * الاستخدام:
 *   const sound = useBattleSound(settings.soundEnabled);
 *   sound.playAttack();
 */
import { useEffect, useRef, useCallback } from 'react';
import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from 'expo-av';

// مؤثرات محلية مضمنة في التطبيق. تجنب روابط CDN المتغيرة أو المحجوبة على Android.
const SOUND_FILES = {
  attack: require('../../../assets/sounds/attack.mp3'),
  win: require('../../../assets/sounds/win.mp3'),
  loss: require('../../../assets/sounds/loss.mp3'),
  ability: require('../../../assets/sounds/ability.mp3'),
  nextRound: require('../../../assets/sounds/next-round.mp3'),
  draw: require('../../../assets/sounds/draw.mp3'),
};

type SoundKey = keyof typeof SOUND_FILES;

export function useBattleSound(enabled: boolean) {
  const sounds = useRef<Partial<Record<SoundKey, Audio.Sound>>>({});
  const loaded = useRef(false);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;

    const load = async () => {
      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
          interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
          interruptionModeIOS: InterruptionModeIOS.DoNotMix,
        });

        for (const key of Object.keys(SOUND_FILES) as SoundKey[]) {
          if (cancelled) break;
          try {
            const { sound } = await Audio.Sound.createAsync(
              SOUND_FILES[key],
              { shouldPlay: false, volume: 0.72, progressUpdateIntervalMillis: 500 }
            );
            sounds.current[key] = sound;
          } catch {
            // يستمر تحميل بقية المؤثرات حتى لو تعذر ملف منفرد.
          }
        }
        if (!cancelled) loaded.current = Object.keys(sounds.current).length > 0;
      } catch {
        // يبقى اللعب صالحاً في بيئة لا تدعم الصوت.
      }
    };

    load();

    return () => {
      cancelled = true;
      Object.values(sounds.current).forEach(s => s?.unloadAsync().catch(() => {}));
      sounds.current = {};
      loaded.current = false;
    };
  }, [enabled]);

  const play = useCallback(async (key: SoundKey) => {
    if (!enabled || !loaded.current) return;
    try {
      const s = sounds.current[key];
      if (!s) return;
      const status = await s.getStatusAsync();
      if (status.isLoaded && status.isPlaying) await s.stopAsync();
      await s.setPositionAsync(0);
      await s.playAsync();
    } catch {
      // تجاهل أخطاء التشغيل بصمت
    }
  }, [enabled]);

  return {
    playAttack:    () => play('attack'),
    playWin:       () => play('win'),
    playLoss:      () => play('loss'),
    playAbility:   () => play('ability'),
    playNextRound: () => play('nextRound'),
    playDraw:      () => play('draw'),
  };
}
