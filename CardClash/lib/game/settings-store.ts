import AsyncStorage from '@react-native-async-storage/async-storage';

export const GAME_SETTINGS_KEY = 'game_settings_v1';

export type MotionPreference = 'system' | 'reduced' | 'full';

export type GameSettings = {
  soundEnabled: boolean;
  musicEnabled: boolean;
  animationsEnabled: boolean;
  language: 'ar' | 'en';
  showAbilityHints: boolean;
  showDamageNumbers: boolean;
  vibration: boolean;
  /**
   * Presentation-only preference. The existing key is preserved and older
   * saves receive this value through the defaults merge.
   */
  motionPreference: MotionPreference;
};

export const DEFAULT_SETTINGS: GameSettings = {
  soundEnabled: true,
  musicEnabled: true,
  animationsEnabled: true,
  language: 'ar',
  showAbilityHints: true,
  showDamageNumbers: true,
  vibration: true,
  motionPreference: 'system',
};

let cachedSettings: GameSettings = { ...DEFAULT_SETTINGS };
let hasLoadedSettings = false;
let loadingSettings: Promise<GameSettings> | null = null;
const listeners = new Set<(settings: GameSettings) => void>();

const notify = () => {
  listeners.forEach((listener) => listener({ ...cachedSettings }));
};

function normalizeSettings(value: unknown): GameSettings {
  if (!value || typeof value !== 'object') return { ...DEFAULT_SETTINGS };
  const candidate = value as Partial<GameSettings>;
  const motionPreference: MotionPreference =
    candidate.motionPreference === 'full' || candidate.motionPreference === 'reduced'
      ? candidate.motionPreference
      : 'system';

  return {
    ...DEFAULT_SETTINGS,
    ...candidate,
    language: candidate.language === 'en' ? 'en' : 'ar',
    motionPreference,
  };
}

export async function loadSettings(): Promise<GameSettings> {
  if (hasLoadedSettings) return { ...cachedSettings };
  if (loadingSettings) return loadingSettings;

  loadingSettings = AsyncStorage.getItem(GAME_SETTINGS_KEY)
    .then((raw) => {
      cachedSettings = raw ? normalizeSettings(JSON.parse(raw)) : { ...DEFAULT_SETTINGS };
      hasLoadedSettings = true;
      notify();
      return { ...cachedSettings };
    })
    .catch(() => {
      cachedSettings = { ...DEFAULT_SETTINGS };
      hasLoadedSettings = true;
      notify();
      return { ...cachedSettings };
    })
    .finally(() => {
      loadingSettings = null;
    });

  return loadingSettings;
}

export async function saveSettings(settings: GameSettings): Promise<void> {
  cachedSettings = normalizeSettings(settings);
  hasLoadedSettings = true;
  notify();
  await AsyncStorage.setItem(GAME_SETTINGS_KEY, JSON.stringify(cachedSettings));
}

export function subscribeSettings(listener: (settings: GameSettings) => void): () => void {
  listeners.add(listener);
  if (hasLoadedSettings) listener({ ...cachedSettings });
  return () => listeners.delete(listener);
}

/** Fast read for non-React feedback services. */
export function getSettingsSnapshot(): GameSettings {
  return { ...cachedSettings };
}
