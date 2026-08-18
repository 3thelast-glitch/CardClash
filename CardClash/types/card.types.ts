/**
 * Card Type Definitions — Complete Design System
 * Single source of truth for all card-related TypeScript types.
 */

// ─── Rarity ──────────────────────────────────────────────────────────────────

export type CardRarityName = 'common' | 'rare' | 'epic' | 'legendary' | 'special';

export interface CardRarity {
    name: CardRarityName;
    /** LinearGradient color stops for card background */
    gradient: string[];
    /** Primary border/outline color */
    border: string;
    /** Whether to render animated glow ring */
    glow: boolean;
    /** Whether to render fire particles (Legendary only) */
    particles: boolean;
}

// ─── Animations ───────────────────────────────────────────────────────────────

export interface TapAnimationConfig {
    /** Scale overshoot on press-in */
    scale: number;
    /** Rotation in degrees on press-in */
    rotate: string;
    /** Spring duration in ms */
    duration: number;
}

export interface DragAnimationConfig {
    /** Shadow radius during drag */
    shadow: number;
    /** Shadow opacity during drag */
    shadowOpacity: number;
}

export interface SummonAnimationConfig {
    /** Direction card slides in from: 'bottom' | 'top' | 'left' | 'right' */
    slide: 'bottom' | 'top' | 'left' | 'right';
    /** [peak scale, settle scale] */
    scale: [number, number];
    /** Duration in ms */
    duration: number;
}

export interface AttackAnimationConfig {
    /** Shake displacement in dp */
    shakeAmount: number;
    /** Total shake duration in ms */
    duration: number;
}

export interface CardAnimationPreset {
    tap: TapAnimationConfig;
    drag: DragAnimationConfig;
    summon: SummonAnimationConfig;
    attack: AttackAnimationConfig;
}

// ─── Game Card ────────────────────────────────────────────────────────────────

export type CardEffectType =
    | 'taunt'
    | 'divine_shield'
    | 'poison'
    | 'stealth'
    | 'charge'
    | 'lifesteal'
    | 'windfury';

export interface LocalizedString {
    en: string;
    ar: string;
}

/**
 * Full game card definition used in UI + game logic.
 * Extended from the existing Card interface in lib/game/types.ts.
 */
export interface GameCard {
    id: string;
    /** Localized display name */
    name: LocalizedString;
    /** Rarity tier key */
    rarity: CardRarityName;
    /** Mana cost to play */
    cost: number;
    /** Attack power */
    attack: number;
    /** Current health points */
    health: number;
    /** Max health points */
    maxHealth: number;
    /** Card art image URI or require() source */
    image: string | number;
    /** Special gameplay effects */
    effects: CardEffectType[];
    /** Optional per-card animation preset override */
    animationPreset?: Partial<CardAnimationPreset>;
}

// ─── Card Dimensions ──────────────────────────────────────────────────────────

export type CardSizeName = 'small' | 'medium' | 'large' | 'landscape';

export interface CardDimensions {
    width: number;
    height: number;
}

// ─── Damage Numbers ───────────────────────────────────────────────────────────

export type DamageVariant = 'damage' | 'heal' | 'critical' | 'blocked' | 'miss';

export interface DamageEvent {
    id: string;
    value: number;
    variant: DamageVariant;
    targetSide: 'player' | 'bot';
}
