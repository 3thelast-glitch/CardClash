import { AbilityType } from './types';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ✅ موحَّد مع abilities-store.ts
export const DISABLED_ABILITIES_KEY = 'disabled_abilities_v1';

export const ALL_ABILITIES: AbilityType[] = [
  'LogicalEncounter', 'Recall', 'Protection', 'Arise', 'Reinforcement',
  'Wipe', 'Purge', 'HalvePoints', 'Seal', 'DoubleOrNothing',
  'StarSuperiority', 'Reduction', 'Sacrifice', 'Popularity', 'Eclipse',
  'CancelAbility', 'Revive', 'ConsecutiveLossBuff', 'Lifesteal',
  'Revenge', 'Suicide', 'Disaster', 'Compensation', 'Weakening',
  'Misdirection', 'StealAbility', 'Rescue', 'Trap', 'ConvertDebuffsToBuffs',
  'Sniping', 'Merge', 'DoubleNextCards', 'Deprivation', 'Greed',
  'Dilemma', 'Subhan', 'Propaganda', 'DoubleYourBuffs', 'Avatar',
  'Penetration', 'Pool', 'Conversion', 'Shield', 'SwapClass',
  'TakeIt', 'Skip', 'AddElement', 'Explosion', 'DoublePoints', 'ElementalMastery'
];

export const NAME_TO_ABILITY_TYPE: Record<string, AbilityType> = {
  'Logical Encounter': 'LogicalEncounter',
  'Recall': 'Recall',
  'Protection': 'Protection',
  'Wipe': 'Wipe',
  'Halve Points': 'HalvePoints',
  'Seal': 'Seal',
  'Reduction': 'Reduction',
  'Sacrifice': 'Sacrifice',
  'Suicide': 'Suicide',
  'Compensation': 'Compensation',
  'Arise': 'Arise',
  'Reinforcement': 'Reinforcement',
  'Purge': 'Purge',
  'Double Or Nothing': 'DoubleOrNothing',
  'Disaster': 'Disaster',
  'Rescue': 'Rescue',
  'Trap': 'Trap',
  'Sniping': 'Sniping',
  'Merge': 'Merge',
  'Revive': 'Revive',
  'Consecutive Loss Buff': 'ConsecutiveLossBuff',
  'Weakening': 'Weakening',
  'Subhan': 'Subhan',
  'Swap Class': 'SwapClass',
  'Lifesteal': 'Lifesteal',
  'Revenge': 'Revenge',
  'Popularity': 'Popularity',
  'Misdirection': 'Misdirection',
  'Steal Ability': 'StealAbility',
  'Convert Debuffs': 'ConvertDebuffsToBuffs',
  'Double Next Cards': 'DoubleNextCards',
  'Deprivation': 'Deprivation',
  'Greed': 'Greed',
  'Dilemma': 'Dilemma',
  'Propaganda': 'Propaganda',
  'Double Your Buffs': 'DoubleYourBuffs',
  'Avatar': 'Avatar',
  'Penetration': 'Penetration',
  'Pool': 'Pool',
  'Conversion': 'Conversion',
  'Shield': 'Shield',
  'Take It': 'TakeIt',
  'Skip': 'Skip',
  'Add Element': 'AddElement',
  'Explosion': 'Explosion',
  'Double Points': 'DoublePoints',
  'Star Superiority': 'StarSuperiority',
  'Eclipse': 'Eclipse',
  'Cancel Ability': 'CancelAbility',
  'Elemental Mastery': 'ElementalMastery',
  'Deprivation (Ability)': 'Deprivation',
};

let _disabledCache: Set<AbilityType> | null = null;

export async function loadDisabledAbilities(): Promise<Set<AbilityType>> {
  try {
    const raw = await AsyncStorage.getItem(DISABLED_ABILITIES_KEY);
    const arr: AbilityType[] = raw ? JSON.parse(raw) : [];
    _disabledCache = new Set(arr);
  } catch {
    _disabledCache = new Set();
  }
  return _disabledCache;
}

export function getDisabledAbilitiesCache(): Set<AbilityType> {
  return _disabledCache ?? new Set();
}

export async function saveDisabledAbilities(disabled: Set<AbilityType>): Promise<void> {
  _disabledCache = disabled;
  await AsyncStorage.setItem(DISABLED_ABILITIES_KEY, JSON.stringify([...disabled]));
}

export function getRandomAbilities(count: number): AbilityType[] {
  const disabled = getDisabledAbilitiesCache();
  const available = ALL_ABILITIES.filter(a => !disabled.has(a));
  if (available.length === 0) return [];
  const shuffled = [...available].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}
