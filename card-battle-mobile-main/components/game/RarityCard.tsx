/**
 * RarityCard – Premium game card component with high-end visual effects.
 *
 * ┌──────────────────────────────────────────────────────────────────────┐
 * │ 5 ANIMATED VISUAL LAYERS (applied conditionally by rarity):          │
 * │                                                                      │
 * │ LAYER 1 → Holo-Foil Sweep          (Epic + Legendary + Special)      │
 * │ LAYER 2 → Clean Minimal Stat Badges (all rarities)                   │
 * │ LAYER 3 → Breathing Aura / Pulsing Border  (Legendary + Special)    │
 * │ LAYER 4 → Static SVG Filigree Corners                                │
 * │ LAYER 5 → Rarity Glow Ring                                           │
 * └──────────────────────────────────────────────────────────────────────┘
 */

import React, { JSX, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Pressable,
    ViewStyle,
} from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withTiming,
    Easing,
    interpolate,
    interpolateColor,
} from 'react-native-reanimated';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import {
    Svg,
    Circle,
    Path,
    Line,
    Ellipse,
    G,
} from 'react-native-svg';
import type { Card } from '@/lib/game/types';
import type { CardRarityName, CardEffectType } from '@/types/card.types';
import {
    CARD_GRADIENTS,
    CARD_GLOWS,
    CARD_BADGE_COLORS,
    CARD_SHADOWS,
    CARD_HAS_GLOW,
    CARD_HAS_PARTICLES,
    CARD_RARITY_LABELS,
} from '@/constants/cardGradients';
import {
    useCardTapAnimation,
    useCardSummonAnimation,
    useCardHoverScale,
    useGlowPulse,
} from '@/hooks/useCardAnimations';
import { FireParticles } from '@/lib/particles';
import { getCardImage } from '../../lib/game/get-card-image';

// ─── Placeholder colors per rarity ───────────────────────────────────────────
const PLACEHOLDER_COLORS: Record<CardRarityName, readonly [string, string, string]> = {
    common:    ['#1a1a2e', '#2d2d44', '#1a1a2e'],
    rare:      ['#1a1200', '#2d2000', '#1a1200'],
    epic:      ['#1a0030', '#2d0050', '#1a0030'],
    legendary: ['#1a1400', '#2d2400', '#1a1400'],
    special:   ['#001a2e', '#012e40', '#001a2e'],
};

// ─── Rarity Configuration ─────────────────────────────────────────────────────────

const ELVEN = {
    bg: '#06150A',
    bgMid: '#0A1F0F',
    forest: '#0d2315',
    gold: '#FFD700',
    goldMid: '#C8A84B',
    goldDim: 'rgba(200,168,75,0.35)',
    goldGlow: 'rgba(200,168,75,0.55)',
    leaf: '#3FA66A',
    leafFade: 'rgba(63,166,106,0.25)',
    vine: '#2D6E45',
    mist: 'rgba(0,140,60,0.4)',
} as const;

const ELVEN_GRADIENTS: Record<CardRarityName, string[]> = {
    common: [ELVEN.bg, ELVEN.bgMid],
    rare: [ELVEN.bgMid, '#071A0C', ELVEN.forest],
    epic: ['#080F06', '#0E2610', '#0A1A08'],
    legendary: ['#050F04', '#0C1E0A', '#112510', '#050F04'],
    special: ['#001a2e', '#003344', '#004455', '#001a2e'],
};

const ELVEN_BORDERS: Record<CardRarityName, string> = {
    common: 'rgba(200,168,75,0.25)',
    rare: 'rgba(200,168,75,0.45)',
    epic: 'rgba(200,168,75,0.65)',
    legendary: ELVEN.goldMid,
    special: 'rgba(6,182,212,0.85)',
};

const ELVEN_GLOW: Record<CardRarityName, string> = {
    common: 'transparent',
    rare: ELVEN.leaf,
    epic: ELVEN.goldMid,
    legendary: ELVEN.gold,
    special: '#06b6d4',
};

const RARITY_CONFIG = {
    common: {
        borderColor: '#374151',
        borderWidth: 1.5,
        glowColor: null,
        filigree: false,
        foilSweep: false,
        magicCircles: false,
        breathingAura: false,
        foilDuration: 0,
        foilOpacity: 0,
        circleColor: null,
        circleSpeed: 0,
    },
    rare: {
        borderColor: '#B87333',
        borderWidth: 2,
        glowColor: '#CD7F32',
        filigree: true,
        foilSweep: false,
        magicCircles: false,
        breathingAura: false,
        foilDuration: 0,
        foilOpacity: 0,
        circleColor: '#B87333',
        circleSpeed: 0,
    },
    epic: {
        borderColor: '#7C3AED',
        borderWidth: 2.5,
        glowColor: '#A855F7',
        filigree: true,
        foilSweep: true,
        magicCircles: true,
        breathingAura: false,
        foilDuration: 7000,
        foilOpacity: 0.40,
        circleColor: '#A855F7',
        circleSpeed: 8000,
    },
    legendary: {
        borderColor: '#D97706',
        borderWidth: 3,
        glowColor: '#FFD700',
        filigree: true,
        foilSweep: true,
        magicCircles: true,
        breathingAura: true,
        foilDuration: 3500,
        foilOpacity: 0.65,
        circleColor: '#FFD700',
        circleSpeed: 5000,
    },
    special: {
        borderColor: '#06b6d4',
        borderWidth: 3,
        glowColor: '#22d3ee',
        filigree: true,
        foilSweep: true,
        magicCircles: true,
        breathingAura: true,
        foilDuration: 2500,
        foilOpacity: 0.75,
        circleColor: '#06b6d4',
        circleSpeed: 4000,
    },
} as const;


// ─── Rarity Glow Ring ─────────────────────────────────────────────────────────────
function GlowRing({
    color,
    borderRadius,
}: {
    color: string;
    borderRadius: number;
}): JSX.Element {
    const { animatedStyle } = useGlowPulse();
    return (
        <Animated.View
            style={[
                styles.glowRing,
                { borderColor: color, borderRadius, shadowColor: color },
                animatedStyle,
            ]}
            pointerEvents="none"
        />
    );
}

// ─── Effect Icons ─────────────────────────────────────────────────────────────────

const EFFECT_ICON: Record<CardEffectType, string> = {
    taunt: '🛡️',
    divine_shield: '✨',
    poison: '☠️',
    stealth: '👁️',
    charge: '⚡',
    lifesteal: '🩸',
    windfury: '💨',
};

// ─── Size Presets ─────────────────────────────────────────────────────────────────

const SIZES = {
    small: { w: 90, h: 135, name: 8, stat: 8, badge: 6 },
    medium: { w: 160, h: 240, name: 11, stat: 10, badge: 8 },
    large: { w: 200, h: 300, name: 13, stat: 13, badge: 10 },
    landscape: { w: 220, h: 310, name: 14, stat: 13, badge: 10 },
} as const;

// ─── Props ────────────────────────────────────────────────────────────────────────

export interface RarityCardProps {
    card: Card;
    rarity?: CardRarityName;
    size?: keyof typeof SIZES;
    theme?: 'default' | 'elven';
    isSelected?: boolean;
    showStats?: boolean;
    playEntrance?: boolean;
    entranceDelay?: number;
    onPress?: () => void;
    onPressIn?: () => void;
    onPressOut?: () => void;
    disabled?: boolean;
    style?: ViewStyle;
}

// ─── SUB-COMPONENT A: Holo-Foil Sweep (Epic + Legendary + Special) ──────────

function HoloFoilSweep({
    cardWidth,
    cardHeight,
    duration,
    opacity,
}: {
    cardWidth: number;
    cardHeight: number;
    duration: number;
    opacity: number;
}): JSX.Element {
    const sweepX = useSharedValue(-cardWidth);

    useEffect(() => {
        sweepX.value = withRepeat(
            withTiming(cardWidth * 1.5, {
                duration,
                easing: Easing.inOut(Easing.quad),
            }),
            -1,
            false
        );
    }, [cardWidth, duration, sweepX]);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: sweepX.value }],
    }));

    return (
        <View style={styles.holoFoilContainer} pointerEvents="none">
            <Animated.View style={animatedStyle}>
                <LinearGradient
                    colors={[
                        'transparent',
                        `rgba(255,255,255,${opacity * 0.3})`,
                        `rgba(180,120,255,${opacity * 0.5})`,
                        `rgba(100,200,255,${opacity * 0.5})`,
                        `rgba(255,220,80,${opacity * 0.4})`,
                        `rgba(255,255,255,${opacity * 0.3})`,
                        'transparent',
                    ]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[
                        styles.holoFoilGradient,
                        { width: cardWidth * 0.8, height: cardHeight * 1.5 },
                    ]}
                />
            </Animated.View>
        </View>
    );
}

// ─── SUB-COMPONENT B: Filigree SVG Corner ────────────────────────────────────

type FiligreePosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

interface FiligreeSVGCornerProps {
    position: FiligreePosition;
    rarity: CardRarityName;
    size?: number;
}

function FiligreeSVGCorner({ position, rarity, size = 80 }: FiligreeSVGCornerProps): JSX.Element {
    const colorMap: Record<string, { stroke: string; gemFill: string }> = {
        legendary: { stroke: '#FFD700', gemFill: '#FFD700' },
        epic: { stroke: '#A855F7', gemFill: '#C084FC' },
        rare: { stroke: '#B87333', gemFill: '#CD7F32' },
        special: { stroke: '#06b6d4', gemFill: '#22d3ee' },
    };

    const { stroke, gemFill } = colorMap[rarity] ?? { stroke: '#FFF', gemFill: '#FFF' };

    const transformMap: Record<FiligreePosition, string | undefined> = {
        'top-left': undefined,
        'top-right': `translate(${size}, 0) scale(-1, 1)`,
        'bottom-left': `translate(0, ${size}) scale(1, -1)`,
        'bottom-right': `translate(${size}, ${size}) scale(-1, -1)`,
    };

    const posStyleMap: Record<FiligreePosition, ViewStyle> = {
        'top-left': { top: 2, left: 2 },
        'top-right': { top: 2, right: 2 },
        'bottom-left': { bottom: 2, left: 2 },
        'bottom-right': { bottom: 2, right: 2 },
    };

    const transformProps = transformMap[position];
    const posStyle = posStyleMap[position] ?? {};

    const spokeLines = Array.from({ length: 8 }).map((_, i) => {
        const a = (i * 45 * Math.PI) / 180;
        const x1 = 14 + 5 * Math.cos(a);
        const y1 = 14 + 5 * Math.sin(a);
        const x2 = 14 + 10 * Math.cos(a);
        const y2 = 14 + 10 * Math.sin(a);
        return <Line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={stroke} strokeWidth={0.6} opacity={0.7} />;
    });

    return (
        <View style={[styles.filigreeCorner, posStyle]} pointerEvents="none">
            <Svg width={size} height={size} viewBox="0 0 80 80">
                <G transform={transformProps}>
                    <Path d="M 10 14 Q 30 10 60 12" stroke={stroke} strokeWidth={1.2} fill="none" opacity={0.85} />
                    <Path d="M 14 10 Q 10 30 12 60" stroke={stroke} strokeWidth={1.2} fill="none" opacity={0.85} />
                    {[32, 42, 52].map((x, i) => (
                        <Ellipse key={`hx-${i}`} cx={x} cy={11} rx={3} ry={1.5} fill={stroke} opacity={0.55} />
                    ))}
                    {[32, 42, 52].map((y, i) => (
                        <Ellipse key={`vy-${i}`} cx={11} cy={y} rx={1.5} ry={3} fill={stroke} opacity={0.55} />
                    ))}
                    <Circle cx={14} cy={14} r={7} stroke={stroke} strokeWidth={1} fill="none" opacity={0.8} />
                    <Circle cx={14} cy={14} r={4} fill={gemFill} opacity={0.9} />
                    {spokeLines}
                    <Circle cx={12.5} cy={12.5} r={1} fill="#fff" opacity={0.7} />
                    {[20, 28, 36, 44].map((x, i) => (
                        <Circle key={`ch-${i}`} cx={x} cy={13} r={0.8} fill={stroke} opacity={0.5} />
                    ))}
                    {[20, 28, 36, 44].map((y, i) => (
                        <Circle key={`cv-${i}`} cx={13} cy={y} r={0.8} fill={stroke} opacity={0.5} />
                    ))}
                </G>
            </Svg>
        </View>
    );
}

// ─── SUB-COMPONENT C: Breathing Border (Legendary + Special) ────────────────

function BreathingBorder({
    width,
    height,
    borderRadius,
    rarity,
}: {
    width: number;
    height: number;
    borderRadius: number;
    rarity: CardRarityName;
}): JSX.Element {
    const pulse = useSharedValue(0);

    useEffect(() => {
        pulse.value = withRepeat(
            withTiming(1, { duration: rarity === 'special' ? 2000 : 3000, easing: Easing.inOut(Easing.quad) }),
            -1,
            true
        );
    }, [pulse, rarity]);

    const [colorFrom, colorTo, shadowCol] = rarity === 'special'
        ? ['#0e4a5e', '#67e8f9', '#06b6d4']
        : ['#7C5B1A', '#FFE087', '#FFD700'];

    const animatedStyle = useAnimatedStyle(() => ({
        borderColor: interpolateColor(pulse.value, [0, 1], [colorFrom, colorTo]),
        shadowOpacity: interpolate(pulse.value, [0, 1], [0.3, 0.9]),
        shadowRadius: interpolate(pulse.value, [0, 1], [8, 30]),
        transform: [{ scale: interpolate(pulse.value, [0, 1], [0.995, 1.008]) }],
    }));

    return (
        <Animated.View
            style={[
                styles.breathingBorder,
                { width: width + 6, height: height + 6, borderRadius: borderRadius + 2, shadowColor: shadowCol },
                animatedStyle,
            ]}
            pointerEvents="none"
        />
    );
}

// ─── SUB-COMPONENT D: Clean Minimal Stat Badge ───────────────────────────────

function StatBadge({ icon, value, fs }: { icon: string; value: number; fs: number }): JSX.Element {
    const isAttack = icon === '⚔️';
    return (
        <View style={[styles.statBadge, isAttack ? styles.attackBadge : styles.defenseBadge]}>
            <Text style={{ fontSize: fs }}>{icon}</Text>
            <Text style={[styles.statValue, { fontSize: fs }, isAttack ? styles.attackText : styles.defenseText]}>
                {value}
            </Text>
        </View>
    );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export function RarityCard({
    card,
    rarity: rarityOverride,
    size = 'medium',
    theme = 'default',
    isSelected = false,
    showStats = true,
    playEntrance = false,
    entranceDelay = 0,
    onPress,
    onPressIn: externalPressIn,
    onPressOut: externalPressOut,
    disabled = false,
    style,
}: RarityCardProps): JSX.Element {
    const rarity: CardRarityName =
        rarityOverride ?? (card.rarity as CardRarityName) ?? 'common';

    const dim = SIZES[size];
    const config = RARITY_CONFIG[rarity] ?? RARITY_CONFIG['common'];

    const isElven = theme === 'elven';
    const baseBorderColor = isElven ? ELVEN_BORDERS[rarity] : config.borderColor;
    const baseGlowColor = isElven ? ELVEN_GLOW[rarity] : CARD_GLOWS[rarity];

    const elvenGrad = ELVEN_GRADIENTS[rarity] ?? ELVEN_GRADIENTS['common'];
    const gradient = isElven
        ? {
            base: elvenGrad.length >= 3
                ? [elvenGrad[0], elvenGrad[1], elvenGrad[2]] as const
                : [elvenGrad[0], elvenGrad[1] ?? elvenGrad[0], elvenGrad[1] ?? elvenGrad[0]] as const,
            mid: [elvenGrad[0], elvenGrad[1] ?? elvenGrad[0], 'transparent'] as const,
            top: [ELVEN.mist, 'rgba(255,255,255,0.05)', 'transparent'] as const,
        }
        : CARD_GRADIENTS[rarity] ?? CARD_GRADIENTS['common'];

    const glowColor = baseGlowColor;
    const shadowCfg = CARD_SHADOWS[rarity] ?? CARD_SHADOWS['common'];
    const hasGlow = CARD_HAS_GLOW[rarity] || (isElven && rarity !== 'common');
    const hasParticles = CARD_HAS_PARTICLES[rarity];
    const badgeColor = CARD_BADGE_COLORS[rarity] ?? CARD_BADGE_COLORS['common'];
    const rarityLabel = CARD_RARITY_LABELS[rarity] ?? CARD_RARITY_LABELS['common'];

    const tap = useCardTapAnimation();
    const summon = useCardSummonAnimation(entranceDelay);
    const hover = useCardHoverScale(isSelected);

    const cardImage = getCardImage(card);
    const hasImage = !!cardImage;
    const placeholderColors = PLACEHOLDER_COLORS[rarity] ?? PLACEHOLDER_COLORS['common'];

    useEffect(() => {
        if (playEntrance) {
            summon.reset();
            summon.play();
        }
    }, [card.id, playEntrance, summon]);

    const outerShadow: ViewStyle = {
        shadowColor: glowColor ?? '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: isSelected ? shadowCfg.shadowOpacity + 0.15 : shadowCfg.shadowOpacity,
        shadowRadius: isSelected ? shadowCfg.shadowRadius + 6 : shadowCfg.shadowRadius,
        elevation: isSelected ? 24 : 12,
    };

    const borderStyle: ViewStyle = {
        borderColor: isSelected ? '#ffffff' : baseBorderColor,
        borderWidth: isSelected ? 3 : config.borderWidth,
    };

    return (
        <Animated.View
            style={[
                styles.outerWrapper,
                { width: dim.w, height: dim.h },
                outerShadow,
                summon.animatedStyle,
                hover.animatedStyle,
                style,
            ]}
        >
            {config.filigree && rarity !== 'common' && (
                <>
                    <FiligreeSVGCorner position="top-left" rarity={rarity} />
                    <FiligreeSVGCorner position="top-right" rarity={rarity} />
                    {(rarity === 'legendary' || rarity === 'special') && (
                        <>
                            <FiligreeSVGCorner position="bottom-left" rarity={rarity} />
                            <FiligreeSVGCorner position="bottom-right" rarity={rarity} />
                        </>
                    )}
                </>
            )}

            {(rarity === 'legendary' || rarity === 'special') && (
                <BreathingBorder width={dim.w} height={dim.h} borderRadius={BORDER_R} rarity={rarity} />
            )}

            {hasGlow && glowColor && (
                <GlowRing color={glowColor} borderRadius={BORDER_R + 2} />
            )}

            <Pressable
                onPress={disabled ? undefined : onPress}
                onPressIn={() => { if (!disabled) { tap.onPressIn(); externalPressIn?.(); } }}
                onPressOut={() => { if (!disabled) { tap.onPressOut(); externalPressOut?.(); } }}
                style={styles.pressable}
                accessibilityRole="button"
                accessibilityLabel={`${card.nameAr} card, rarity: ${rarityLabel.ar}`}
            >
                <Animated.View
                    style={[styles.card, { width: dim.w, height: dim.h }, borderStyle, tap.animatedStyle]}
                >
                    <LinearGradient
                        colors={gradient.base}
                        start={{ x: 0.5, y: 0 }}
                        end={{ x: 0.5, y: 1 }}
                        style={styles.bgBase}
                    />
                    <LinearGradient
                        colors={gradient.mid}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.bgMid}
                    />
                    <LinearGradient
                        colors={gradient.top}
                        start={{ x: 0.5, y: 0 }}
                        end={{ x: 0.5, y: 1 }}
                        style={styles.bgTop}
                    />

                    {rarity !== 'common' && <View style={styles.shimmer} />}

                    {config.foilSweep && (
                        <HoloFoilSweep
                            cardWidth={dim.w}
                            cardHeight={dim.h}
                            duration={config.foilDuration}
                            opacity={config.foilOpacity}
                        />
                    )}

                    {hasImage ? (
                        <>
                            <Image
                                source={cardImage}
                                style={styles.art}
                                contentFit="contain"
                                cachePolicy="memory-disk"
                                transition={200}
                            />
                            <LinearGradient
                                pointerEvents="none"
                                colors={['rgba(2,6,15,0)', 'rgba(2,6,15,0.12)', 'rgba(2,6,15,0.84)']}
                                locations={[0, 0.48, 1]}
                                style={styles.artReadabilityOverlay}
                            />
                        </>
                    ) : (
                        <>
                            <LinearGradient
                                colors={placeholderColors}
                                style={styles.artPlaceholder}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                            />
                            <View style={styles.noImageBadge} pointerEvents="none">
                                <Text style={styles.noImageIcon}>🖼️</Text>
                                <Text style={styles.noImageText}>لا توجد صورة</Text>
                            </View>
                        </>
                    )}

                    <View style={styles.topRow}>
                        <View style={styles.elementPill}>
                            <Text style={[styles.elementEmoji, { fontSize: dim.badge + 2 }]}>{card.emoji}</Text>
                        </View>

                        {config.magicCircles ? (
                            <View
                                style={[
                                    styles.rarityPillPremium,
                                    { borderColor: config.borderColor, backgroundColor: `${config.borderColor}33` },
                                ]}
                            >
                                <Text style={[styles.rarityPillPremiumText, { color: config.borderColor }]}>
                                    {rarityLabel.ar}
                                </Text>
                            </View>
                        ) : (
                            <View style={[styles.rarityPill, { backgroundColor: badgeColor }]}>
                                <Text style={[styles.rarityPillText, { fontSize: dim.badge }]}>
                                    {rarityLabel.en[0]}
                                </Text>
                            </View>
                        )}
                    </View>

                    {/* ── Stats strip (bottom) — Clean Minimal Badges ── */}
                    {showStats && (
                        <View style={styles.statsStrip}>
                            <View style={styles.statsRow}>
                                <StatBadge icon="⚔️" value={card.attack} fs={dim.stat} />
                                <StatBadge icon="🛡️" value={card.defense} fs={dim.stat} />
                                <StatBadge icon="❤️" value={card.hp ?? card.defense} fs={dim.stat} />
                            </View>
                            <View style={[styles.cardNamePlate, { borderColor: baseBorderColor }]}>
                                <Text style={[styles.cardName, { fontSize: dim.name }]} numberOfLines={1}>
                                    {card.nameAr}
                                </Text>
                            </View>
                        </View>
                    )}

                    {card.cardEffects && card.cardEffects.length > 0 && (
                        <View style={styles.effectColumn}>
                            {card.cardEffects.slice(0, 3).map((fx) => (
                                <Text key={fx} style={styles.effectIcon}>
                                    {EFFECT_ICON[fx as CardEffectType] ?? '◈'}
                                </Text>
                            ))}
                        </View>
                    )}

                    {isSelected && <View style={styles.selectedOverlay} />}
                </Animated.View>
            </Pressable>

            {hasParticles && !disabled && (
                <FireParticles width={dim.w} height={dim.h} />
            )}
        </Animated.View>
    );
}

// ─── Constants ─────────────────────────────────────────────────────────────────────

const BORDER_R = 14;

// ─── Styles ──────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    outerWrapper: {
        position: 'relative',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'visible',
    },
    pressable: { borderRadius: BORDER_R },
    card: {
        borderRadius: BORDER_R,
        overflow: 'hidden',
        position: 'relative',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2.5,
        zIndex: 1,
    },
    bgBase: { ...StyleSheet.absoluteFillObject },
    bgMid: { position: 'absolute', top: '30%', left: 0, right: 0, bottom: 0 },
    bgTop: { position: 'absolute', top: 0, left: 0, right: 0, height: '55%' },
    shimmer: {
        position: 'absolute',
        top: '-20%', left: '-30%',
        width: '50%', height: '160%',
        backgroundColor: 'rgba(255,255,255,0.06)',
        transform: [{ rotate: '35deg' }],
    },
    art: { width: '100%', height: '76%', position: 'absolute', top: 0 },
    artReadabilityOverlay: { position: 'absolute', top: 0, left: 0, right: 0, height: '78%', zIndex: 2 },
    artPlaceholder: { width: '100%', height: '76%', position: 'absolute', top: 0 },
    noImageBadge: {
        position: 'absolute', top: '18%', left: 0, right: 0,
        alignItems: 'center', zIndex: 4,
    },
    noImageIcon: { fontSize: 28, opacity: 0.35 },
    noImageText: { fontSize: 8, color: 'rgba(255,255,255,0.25)', marginTop: 3 },
    topRow: {
        position: 'absolute', top: 6, left: 6, right: 6,
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    },
    elementPill: {
        backgroundColor: 'rgba(0,0,0,0.55)',
        borderRadius: 10, paddingHorizontal: 4, paddingVertical: 2,
    },
    elementEmoji: { lineHeight: 18 },
    rarityPill: { width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    rarityPillText: { color: '#fff', fontWeight: '900', lineHeight: 13 },
    rarityPillPremium: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8, borderWidth: 1 },
    rarityPillPremiumText: { fontSize: 7, fontWeight: '900', letterSpacing: 0.5 },
    statsStrip: {
        position: 'absolute',
        bottom: 0, left: 0, right: 0,
        paddingHorizontal: 8, paddingVertical: 6,
        backgroundColor: 'rgba(2,6,15,0.94)',
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.12)',
        borderBottomLeftRadius: BORDER_R - 1,
        borderBottomRightRadius: BORDER_R - 1,
        gap: 3,
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: 3,
    },
    // Clean Minimal Stat Badges
    statBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 16,
        gap: 3,
        minWidth: 40,
        justifyContent: 'center',
    },
    attackBadge: {
        backgroundColor: 'rgba(20, 12, 0, 0.9)',
        borderWidth: 1.2,
        borderColor: '#B8860B',
    },
    defenseBadge: {
        backgroundColor: 'rgba(0, 10, 28, 0.9)',
        borderWidth: 1.2,
        borderColor: '#2563EB',
    },
    statValue: { fontWeight: '800', letterSpacing: 0.3 },
    attackText: { color: '#FFB830' },
    defenseText: { color: '#60A5FA' },
    cardNamePlate: { alignSelf: 'center', maxWidth: '94%', paddingHorizontal: 7, paddingVertical: 1, borderRadius: 6, borderWidth: 1, backgroundColor: 'rgba(255,255,255,0.05)' },
    cardName: { color: '#f8fafc', textAlign: 'center', fontWeight: '800', letterSpacing: 0.3, writingDirection: 'rtl' },
    effectColumn: { position: 'absolute', bottom: 56, right: 5, alignItems: 'center', gap: 2 },
    effectIcon: { fontSize: 10 },
    selectedOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(255,255,255,0.13)',
        borderRadius: BORDER_R - 1,
    },
    glowRing: {
        position: 'absolute', top: -4, left: -4, right: -4, bottom: -4,
        borderWidth: 2,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.9, shadowRadius: 12, elevation: 0,
    },
    holoFoilContainer: {
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        overflow: 'hidden', zIndex: 1,
    },
    holoFoilGradient: {
        position: 'absolute',
        transform: [{ rotate: '-45deg' }],
    },
    filigreeCorner: { position: 'absolute', zIndex: 10 },
    breathingBorder: {
        position: 'absolute', borderWidth: 2.5,
        shadowOffset: { width: 0, height: 0 },
    },
});

export default RarityCard;
