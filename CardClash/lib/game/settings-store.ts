import AsyncStorage from '@react-native-async-storage/async-storage';

export const GAME_SETTINGS_KEY = 'game_settings_v1';

export type GameSettings = {
  soundEnabled: boolean;
  musicEnabled: boolean;
  animationsEnabled: boolean;
  language: 'ar' | 'en';
  showAbilityHints: boolean;
  showDamageNumbers: boolean;
  vibration: boolean;
};

export const DEFAULT_SETTINGS: GameSettings = {
  soundEnabled: true,
  musicEnabled: true,
  animationsEnabled: true,
  language: 'ar',
  showAbilityHints: true,
  showDamageNumbers: true,
  vibration: true,
};

let cachedSettings: GameSettings = { ...DEFAULT_SETTINGS };
let hasLoadedSettings = false;
let loadingSettings: Promise<GameSettings> | null = null;
const listeners = new Set<(settings: GameSettings) => void>();

const notify = () => {
  listeners.forEach((listener) => listener(cachedSettings));
};

/**
 * Loads settings once per app process. All card and background components share
 * the same in-flight request instead of creating one AsyncStorage read each.
 */
export async function loadSettings(): Promise<GameSettings> {
  if (hasLoadedSettings) return cachedSettings;
  if (loadingSettings) return loadingSettings;

  loadingSettings = AsyncStorage.getItem(GAME_SETTINGS_KEY)
    .then((raw) => {
      cachedSettings = raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : { ...DEFAULT_SETTINGS };
      hasLoadedSettings = true;
      notify();
      return cachedSettings;
    })
    .catch(() => {
      cachedSettings = { ...DEFAULT_SETTINGS };
      hasLoadedSettings = true;
      notify();
      return cachedSettings;
    })
    .finally(() => {
      loadingSettings = null;
    });

  return loadingSettings;
}

/** Saves settings once and updates all active subscribers immediately. */
export async function saveSettings(settings: GameSettings): Promise<void> {
  cachedSettings = { ...DEFAULT_SETTINGS, ...settings };
  hasLoadedSettings = true;
  notify();
  await AsyncStorage.setItem(GAME_SETTINGS_KEY, JSON.stringify(cachedSettings));
}

/** Subscribes mounted UI components to changes made from the settings screen. */
export function subscribeSettings(listener: (settings: GameSettings) => void): () => void {
  listeners.add(listener);
  if (hasLoadedSettings) listener(cachedSettings);
  return () => listeners.delete(listener);
}
