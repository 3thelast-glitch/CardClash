/**
 * useBattleSound
 * ─────────────────────────────────────────────────────────────────────────
 * Hook يُدير أصوات المعركة باستخدام expo-av.
 * - يحمّل الأصوات مسبقاً عند mount.
 * - يحترم إعداد soundEnabled من GameSettings.
 * - يُنظّف (unload) الأصوات عند unmount تلقائياً.
 *
 * ⚠️ PLACEHOLDER: الأصوات مؤقتة من CDN مجاني (Freesound / Pixabay).
 *    استبدلها بملفات حقيقية في assets/sounds/ عند الجهوزية.
 *
 * الاستخدام:
 *   const sound = useBattleSound(settings.soundEnabled);
 *   sound.playAttack();
 */
import { useEffect, useRef, useCallback } from 'react';
import { Audio } from 'expo-av';

// ── Placeholder: أصوات مجانية مؤقتة من CDN ─────────────────────────────────
// عند توفر ملفات حقيقية: غيّر القيم إلى require('@/assets/sounds/xxx.mp3')
const SOUND_URIS: Record<string, string> = {
  attack:    'https://cdn.pixabay.com/download/audio/2022/03/10/audio_8cb749fb02.mp3',   // sword hit
  win:       'https://cdn.pixabay.com/download/audio/2021/08/04/audio_0625c1539c.mp3',   // victory fanfare
  loss:      'https://cdn.pixabay.com/download/audio/2022/01/18/audio_d0c6ff1bab.mp3',   // defeat
  ability:   'https://cdn.pixabay.com/download/audio/2022/03/15/audio_8b55735bf2.mp3',   // magic spell
  nextRound: 'https://cdn.pixabay.com/download/audio/2021/08/09/audio_dc80ad8b84.mp3',   // short chime
  draw:      'https://cdn.pixabay.com/download/audio/2022/01/27/audio_d0ef1f0562.mp3',   // neutral tone
};

type SoundKey = keyof typeof SOUND_URIS;

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
        });

        for (const [key, uri] of Object.entries(SOUND_URIS)) {
          if (cancelled) break;
          try {
            const { sound } = await Audio.Sound.createAsync(
              { uri },
              { shouldPlay: false, volume: 0.7 }
            );
            sounds.current[key as SoundKey] = sound;
          } catch {
            // تجاهل خطأ صامت لكل صوت
          }
        }
        if (!cancelled) loaded.current = true;
      } catch {
        // expo-av غير متاح (web أو بيئة بدون صوت)
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
