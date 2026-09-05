import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { getSettingsSnapshot, loadSettings } from '@/lib/game/settings-store';

export type HapticEvent =
  | 'selection'
  | 'cardPickup'
  | 'acceptedPlacement'
  | 'attackImpact'
  | 'ability'
  | 'invalid'
  | 'victory'
  | 'defeat';

const MIN_INTERVAL: Record<HapticEvent, number> = {
  selection: 45,
  cardPickup: 80,
  acceptedPlacement: 100,
  attackImpact: 120,
  ability: 180,
  invalid: 180,
  victory: 500,
  defeat: 500,
};

let lastEventAt = 0;
let lastEvent: HapticEvent | null = null;
let settingsLoadStarted = false;

function ensureSettingsLoaded() {
  if (settingsLoadStarted) return;
  settingsLoadStarted = true;
  void loadSettings();
}

async function fireAndroid(event: HapticEvent) {
  const map: Record<HapticEvent, Haptics.AndroidHaptics> = {
    selection: Haptics.AndroidHaptics.Segment_Tick,
    cardPickup: Haptics.AndroidHaptics.Drag_Start,
    acceptedPlacement: Haptics.AndroidHaptics.Confirm,
    attackImpact: Haptics.AndroidHaptics.Long_Press,
    ability: Haptics.AndroidHaptics.Context_Click,
    invalid: Haptics.AndroidHaptics.Reject,
    victory: Haptics.AndroidHaptics.Confirm,
    defeat: Haptics.AndroidHaptics.Reject,
  };
  await Haptics.performAndroidHapticsAsync(map[event]);
}

async function fireAppleOrWeb(event: HapticEvent) {
  if (event === 'selection') {
    await Haptics.selectionAsync();
    return;
  }
  if (event === 'victory') {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    return;
  }
  if (event === 'defeat' || event === 'invalid') {
    await Haptics.notificationAsync(
      event === 'defeat'
        ? Haptics.NotificationFeedbackType.Warning
        : Haptics.NotificationFeedbackType.Error,
    );
    return;
  }

  const impact =
    event === 'attackImpact' || event === 'ability'
      ? Haptics.ImpactFeedbackStyle.Medium
      : Haptics.ImpactFeedbackStyle.Light;
  await Haptics.impactAsync(impact);
}

export const haptics = {
  trigger(event: HapticEvent) {
    ensureSettingsLoaded();
    if (!getSettingsSnapshot().vibration || Platform.OS === 'web') return;

    const now = Date.now();
    if (lastEvent === event && now - lastEventAt < MIN_INTERVAL[event]) return;
    lastEvent = event;
    lastEventAt = now;

    const promise = Platform.OS === 'android' ? fireAndroid(event) : fireAppleOrWeb(event);
    promise.catch(() => undefined);
  },
};
