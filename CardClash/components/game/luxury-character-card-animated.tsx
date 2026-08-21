/**
 * LuxuryCharacterCardAnimated
 * ✨ MetaStrip: sits BETWEEN attack & defense badges (same row)
 * ✨ Chips = icon only, no background, no border — pure clean icons
 * ✨ Faction and class metadata are shown without any elemental system
 * ✨ StatBadge shows effective value with ▲/▼ diff indicator when buffs/debuffs active
 */
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, ViewStyle } from 'react-native';
import type { ImageSourcePropType } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from 'expo-av';
import { VideoView, useVideoPlayer } from 'expo-video';
import Animated, {
    useSharedValue, useAnimatedStyle, withRepeat, withTiming,
    withSequence, interpolate, Easing, withDelay, cancelAnimation,
    type SharedValue,
} from 'react-native-reanimated';
import { Svg, Circle, Line, Ellipse, Path, Defs, RadialGradient, Stop } from 'react-native-svg';
import { Card, CardClass, CardRarity, Race, RACE_EMOJI, RACE_LABELS, CLASS_EMOJI } from '@/lib/game/types';
import { getCardImage } from '../../lib/game/get-card-image';
import { useSettings } from '@/lib/game/hooks/useSettings';

const CLASS_LABELS: Record<CardClass, string> = {
    warrior: 'محارب', knight: 'فارس', mage: 'ساحر', archer: 'رامي',
    berserker: 'مقاتل', paladin: 'بلادين', swordsman: 'سياف', fighter: 'مقاتل',
    guardian: 'حارس', healer: 'طبيب',
};

const FACTION_MEDALLIONS: Partial<Record<Race, ImageSourcePropType>> = {
    human: require('../../assets/icons/factions/human_clean.png'),
    elf: require('../../assets/icons/factions/elf.png'),
    orc: require('../../assets/icons/factions/orc.png'),
    demon: require('../../assets/icons/factions/demon.png'),
    undead: require('../../assets/icons/factions/undead.png'),
    robot: require('../../assets/icons/factions/robot.png'),
};

const BASE_W = 220;
const BASE_H = 320;

interface Props {
    card: Card;
    style?: ViewStyle;
    imageOffsetY?: number;
    fitInsideBorder?: boolean;
    isOpenedView?: boolean;
    /** القيمة الفعلية للهجوم بعد تطبيق التأثيرات (Buffs/Debuffs). إذا لم تُمرَّر يُستخدم card.attack */
    effectiveAttack?: number;
    /** القيمة الفعلية للدفاع بعد تطبيق التأثيرات (Buffs/Debuffs). إذا لم تُمرَّر يُستخدم card.defense */
    effectiveDefense?: number;
    /** يسمح بصوت الفيديو في معاينة البطاقة المفردة فقط؛ يظل صوت بطاقات المعركة المتعددة مكتوماً. */
    playAudio?: boolean;
    winnerState?: 'winner' | 'leading' | null;
    /** وسم سياقي قصير، مثل موضع الكرت في ترتيب الجولات. */
    selectionLabel?: string;
    /** أثر مرئي يوضح أن كرت الخصم قُطع بقدرة زورو. */
    slashEffect?: boolean;
}

function isVideoUri(uri: string): boolean {
    if (!uri || typeof uri !== 'string') return false;
    const l = uri.toLowerCase();
    return l.includes('.mp4') || l.includes('.webm') || l.includes('.mov') || l.startsWith('data:video/');
}
function isAnimatedUri(uri: string): boolean {
    if (!uri || typeof uri !== 'string') return false;
    const l = uri.toLowerCase();
    return l.includes('.gif') || l.includes('.webp') || l.startsWith('data:image/gif') || l.startsWith('data:image/webp');
}
function isLocalAsset(value: any): value is number { return typeof value === 'number'; }

// Tags removed from this compact strip; it presents faction and class only.

// ─────────────────────────────────────────────
// MetaStrip — class icon only, sits BETWEEN atk & def
// ─────────────────────────────────────────────
const MetaStrip = ({ card, sc }: { card: Card; sc: number }) => {
    const iconFs = Math.max(9, Math.min(15, 12 * sc));
    const cls = card.cardClass;
    const classEmoji = cls ? CLASS_EMOJI[cls] : undefined;

    if (!classEmoji) return null;

    return (
        <View style={ms.row}>
            <Text style={{ fontSize: iconFs, lineHeight: iconFs * 1.3 }}>{classEmoji}</Text>
        </View>
    );
};
const ms = StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
});

const FactionCornerMedallion = ({ card, sc }: { card: Card; sc: number }) => {
    const race = card.race;
    const medallion = race ? FACTION_MEDALLIONS[race] : undefined;
    const fallbackEmoji = race ? RACE_EMOJI[race] : undefined;
    const fallbackLabel = race ? RACE_LABELS[race] : undefined;
    if (!race || (!medallion && !fallbackEmoji)) return null;

    const size = Math.max(22, Math.min(43, 38 * sc));
    const position = { top: Math.max(3, 7 * sc), right: Math.max(3, 7 * sc) };
    return (
        <>
            {medallion ? (
                <View style={[styles.factionCornerMedallion, { width: size, height: size, borderRadius: size / 2 }, position]}>
                <Image source={medallion} style={{ width: size, height: size }} resizeMode="contain" />
                </View>
            ) : (
                <View style={[styles.factionFallbackChip, position]}>
                    <Text style={{ fontSize: size * 0.44, lineHeight: size * 0.68 }}>{fallbackEmoji}</Text>
                    <Text style={{ color: '#F8FAFC', fontSize: Math.max(8, size * 0.28), fontWeight: '800', writingDirection: 'rtl' }}>{fallbackLabel}</Text>
                </View>
            )}
        </>
    );
};

// ─────────────────────────────────────────────
// RARITY THEMES
// ─────────────────────────────────────────────
const RARITY_THEMES = {
    common: {
        label: 'عادي', color: '#9CA3AF', borderColor: '#6B7280', borderWidth: 1,
        shadowColor: '#6B7280', shadowOpacity: 0.15, shadowRadius: 6, elevation: 4,
        hasFoil: false, hasFiligree: false, hasSideVines: false, hasDarkSmoke: false,
        hasParticles: false, foilDuration: 0,
        starColor: '#9CA3AF', starEmpty: '#3f3f46',
        abilityBg: ['rgba(10,10,14,0.88)', 'rgba(20,20,28,0.92)'] as any,
        abilityBorder: '#6B728066', abilityTextColor: '#d1d5db', abilityIconColor: '#9CA3AF',
        bgColors: ['#1a1a2e', '#2d2d44', '#1a1a2e'] as any,
    },
    rare: {
        label: 'نادر', color: '#CD7F32', borderColor: '#CD7F32', borderWidth: 1.5,
        shadowColor: '#CD7F32', shadowOpacity: 0.35, shadowRadius: 10, elevation: 6,
        hasFoil: false, hasFiligree: true, hasSideVines: false, hasDarkSmoke: false,
        hasParticles: false, foilDuration: 0,
        starColor: '#CD7F32', starEmpty: '#3f2d1a',
        abilityBg: ['rgba(15,10,5,0.9)', 'rgba(30,18,8,0.95)'] as any,
        abilityBorder: '#CD7F3266', abilityTextColor: '#fcd9a0', abilityIconColor: '#CD7F32',
        bgColors: ['#1a1200', '#2d2000', '#1a1200'] as any,
    },
    epic: {
        label: 'ملحمي', color: '#A855F7', borderColor: '#A855F7', borderWidth: 2,
        shadowColor: '#A855F7', shadowOpacity: 0.65, shadowRadius: 18, elevation: 9,
        hasFoil: true, hasFiligree: true, hasSideVines: true, hasDarkSmoke: false,
        hasParticles: false, foilDuration: 3000,
        starColor: '#A855F7', starEmpty: '#2d1a3f',
        abilityBg: ['rgba(30,5,55,0.92)', 'rgba(50,10,80,0.96)'] as any,
        abilityBorder: '#A855F7AA', abilityTextColor: '#e9d5ff', abilityIconColor: '#d8b4fe',
        bgColors: ['#1a0030', '#2d0050', '#1a0030'] as any,
    },
    legendary: {
        label: 'أسطوري', color: '#FFD700', borderColor: '#FFD700', borderWidth: 2.5,
        shadowColor: '#FFD700', shadowOpacity: 0.9, shadowRadius: 26, elevation: 12,
        hasFoil: false, hasFiligree: false, hasSideVines: false, hasDarkSmoke: false,
        hasParticles: false, foilDuration: 0,
        starColor: '#FFD700', starEmpty: '#3a2d00',
        abilityBg: ['rgba(30,22,0,0.93)', 'rgba(50,36,0,0.97)'] as any,
        abilityBorder: '#FFD700CC', abilityTextColor: '#fef3c7', abilityIconColor: '#FFD700',
        bgColors: ['#110d00', '#1e1700', '#110d00'] as any,
    },
    special: {
        label: 'خاصة', color: '#C0C0C0', borderColor: '#1a1a1a', borderWidth: 3,
        shadowColor: '#000000', shadowOpacity: 1.0, shadowRadius: 32, elevation: 16,
        hasFoil: true, hasFiligree: true, hasSideVines: false, hasDarkSmoke: true,
        hasParticles: false, foilDuration: 4000,
        starColor: '#C0C0C0', starEmpty: '#1a1a1a',
        abilityBg: ['rgba(0,0,0,0.95)', 'rgba(5,5,5,0.98)'] as any,
        abilityBorder: '#C0C0C055', abilityTextColor: '#d4d4d4', abilityIconColor: '#C0C0C0',
        bgColors: ['#000000', '#0a0a0a', '#000000'] as any,
    },
} as const;

// ─────────────────────────────────────────────
// RarityShimmer — foil using rarity color only
// ─────────────────────────────────────────────
const RarityShimmer = ({ cardW, foilDuration, color }: { cardW: number; foilDuration: number; color: string }) => {
    const x = useSharedValue(-cardW * 0.7);
    useEffect(() => {
        x.value = withRepeat(withTiming(cardW * 1.7, { duration: foilDuration, easing: Easing.inOut(Easing.quad) }), -1, false);
        return () => cancelAnimation(x);
    }, [x, cardW, foilDuration]);
    const animStyle = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    const shimmerColors = [
        'transparent',
        `rgba(${r},${g},${b},0.04)`,
        `rgba(${r},${g},${b},0.14)`,
        `rgba(${r},${g},${b},0.22)`,
        `rgba(${r},${g},${b},0.14)`,
        `rgba(${r},${g},${b},0.04)`,
        'transparent',
    ] as any;
    return (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
            <Animated.View style={[{ position: 'absolute', top: 0, bottom: 0, width: cardW * 0.55 }, animStyle]}>
                <LinearGradient colors={shimmerColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1, transform: [{ rotate: '-25deg' }] }} />
            </Animated.View>
        </View>
    );
};

// ─────────────────────────────────────────────
// StatBadge — يدعم إظهار الفرق ▲/▼ عند وجود تأثيرات
// ─────────────────────────────────────────────
const StatBadge = ({
    icon, value, effectiveValue, isAttack, fs
}: {
    icon: string;
    value: number;
    effectiveValue: number;
    isAttack: boolean;
    fs: number;
}) => {
    const diff = effectiveValue - value;
    const isModified = diff !== 0;
    const diffColor = diff > 0 ? '#4ade80' : '#f87171';

    return (
        <View style={[styles.statBadge, isAttack ? styles.attackBadge : styles.defenseBadge]}>
            <View style={{ position: 'absolute', top: -11, left: 0, right: 0, alignItems: 'center', zIndex: 10 }}>
                <Text style={{ fontSize: fs, textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 }} numberOfLines={1}>{icon}</Text>
            </View>
            {isModified ? (
                <>
                    {diff < 0 ? (
                        <Text style={[styles.statValue, { fontSize: Math.max(9, fs - 2), color: diffColor, fontWeight: 'bold', flexShrink: 1 }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
                            {value} → {effectiveValue}
                        </Text>
                    ) : (
                        <>
                            <Text style={[styles.statValue, { fontSize: fs, color: diffColor, fontWeight: 'bold', flexShrink: 1 }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
                                {effectiveValue}
                            </Text>
                            <Text style={{ fontSize: Math.max(8, fs - 6), color: diffColor, fontWeight: 'bold', flexShrink: 1 }} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
                                (+{diff}▲)
                            </Text>
                        </>
                    )}
                </>
            ) : (
                <Text style={[styles.statValue, { fontSize: fs, flexShrink: 1 }, isAttack ? styles.attackText : styles.defenseText]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
                    {value}
                </Text>
            )}
        </View>
    );
};

/** يعرض القيمة الفعلية في القالب التكتيكي مع فرق واضح بعد البفات أو النيرفات. */
const TacticalStatValue = ({ baseValue, effectiveValue, color, fontSize }: {
    baseValue: number;
    effectiveValue: number;
    color: string;
    fontSize: number;
}) => {
    const diff = effectiveValue - baseValue;
    const diffColor = diff > 0 ? '#4ade80' : '#f87171';
    return (
        <View style={styles.tacticalLegendaryStatValueWrap}>
            <Text style={[styles.tacticalLegendaryStatValue, { color: diff === 0 ? color : diffColor, fontSize }]}>{effectiveValue}</Text>
            {diff !== 0 && (
                <Text style={[styles.tacticalLegendaryStatDelta, { color: diffColor, fontSize: Math.max(7, fontSize - 8) }]}>
                    {diff > 0 ? `▲+${diff}` : `▼${diff}`}
                </Text>
            )}
        </View>
    );
};

// ─────────────────────────────────────────────
// ElvenCorner
// ─────────────────────────────────────────────
const ElvenCorner = ({ position, color, rich = false, scale = 1 }: { position: 'tl' | 'tr' | 'bl' | 'br'; color: string; rich?: boolean; scale?: number }) => {
    const rot = position === 'tl' ? 0 : position === 'tr' ? 90 : position === 'bl' ? -90 : 180;
    const posStyle: ViewStyle = position === 'tl' ? { top: 2, left: 2 } : position === 'tr' ? { top: 2, right: 2 } : position === 'bl' ? { bottom: 2, left: 2 } : { bottom: 2, right: 2 };
    const sz = (rich ? 54 : 40) * scale;
    return (
        <View style={[styles.filigreeCorner, posStyle, { width: sz, height: sz }]} pointerEvents="none">
            <Svg width={sz} height={sz} viewBox="0 0 80 80" style={{ transform: [{ rotate: `${rot}deg` }] }}>
                <Line x1={8} y1={14} x2={68} y2={11} stroke={color} strokeWidth={1.4} opacity={0.9} />
                <Line x1={14} y1={8} x2={11} y2={68} stroke={color} strokeWidth={1.4} opacity={0.9} />
                <Line x1={8} y1={22} x2={50} y2={20} stroke={color} strokeWidth={0.7} opacity={0.5} />
                <Line x1={22} y1={8} x2={20} y2={50} stroke={color} strokeWidth={0.7} opacity={0.5} />
                {[28, 40, 52, 64].map((x, i) => <Ellipse key={`hx${i}`} cx={x} cy={11} rx={rich ? 3.5 : 2.5} ry={rich ? 2 : 1.5} fill={color} opacity={0.6} />)}
                {[28, 40, 52, 64].map((y, i) => <Ellipse key={`vy${i}`} cx={11} cy={y} rx={rich ? 2 : 1.5} ry={rich ? 3.5 : 2.5} fill={color} opacity={0.6} />)}
                <Circle cx={14} cy={14} r={rich ? 9 : 7} stroke={color} strokeWidth={1.2} fill="none" opacity={0.85} />
                <Circle cx={14} cy={14} r={rich ? 6 : 4} fill={color} opacity={0.9} />
                {rich && <Circle cx={14} cy={14} r={2} fill="#fff" opacity={0.7} />}
                {[20, 28, 36, 44, 52, 60].map((x, i) => <Circle key={`chi${i}`} cx={x} cy={13} r={rich ? 1.1 : 0.8} fill={color} opacity={0.5} />)}
                {[20, 28, 36, 44, 52, 60].map((y, i) => <Circle key={`cvi${i}`} cx={13} cy={y} r={rich ? 1.1 : 0.8} fill={color} opacity={0.5} />)}
                {rich && <Path d="M22 22 Q30 18 28 28 Q18 30 22 22" fill={color} fillOpacity={0.35} stroke={color} strokeWidth={0.6} />}
                {rich && <Path d="M30 14 L34 10 L36 16 Z" fill={color} fillOpacity={0.7} />}
                {rich && <Path d="M14 30 L10 34 L16 36 Z" fill={color} fillOpacity={0.7} />}
            </Svg>
        </View>
    );
};

// ─────────────────────────────────────────────
// SideVines
// ─────────────────────────────────────────────
const SideVines = ({ color }: { color: string }) => (
    <View style={styles.sideVinesWrapper} pointerEvents="none">
        <Svg style={styles.vineLeft} width={14} height="60%" viewBox="0 0 14 180">
            <Path d="M7 0 Q12 20 7 40 Q2 60 7 80 Q12 100 7 120 Q2 140 7 160 Q12 170 7 180" stroke={color} strokeWidth={1.2} fill="none" opacity={0.45} />
            {[20, 50, 80, 110, 140].map((y, i) => (<Ellipse key={i} cx={i % 2 === 0 ? 10 : 4} cy={y} rx={3} ry={4.5} fill={color} fillOpacity={0.3} stroke={color} strokeWidth={0.5} opacity={0.6} />))}
        </Svg>
        <Svg style={styles.vineRight} width={14} height="60%" viewBox="0 0 14 180">
            <Path d="M7 0 Q2 20 7 40 Q12 60 7 80 Q2 100 7 120 Q12 140 7 160 Q2 170 7 180" stroke={color} strokeWidth={1.2} fill="none" opacity={0.45} />
            {[20, 50, 80, 110, 140].map((y, i) => (<Ellipse key={i} cx={i % 2 === 0 ? 4 : 10} cy={y} rx={3} ry={4.5} fill={color} fillOpacity={0.3} stroke={color} strokeWidth={0.5} opacity={0.6} />))}
        </Svg>
    </View>
);

// ─────────────────────────────────────────────
// DarkSmokeEffect
// ─────────────────────────────────────────────
const DarkSmokeEffect = () => {
    const s1 = useSharedValue(0), s2 = useSharedValue(0), s3 = useSharedValue(0);
    useEffect(() => {
        s1.value = withRepeat(withTiming(1, { duration: 3200, easing: Easing.out(Easing.quad) }), -1, false);
        s2.value = withDelay(800, withRepeat(withTiming(1, { duration: 2800, easing: Easing.out(Easing.quad) }), -1, false));
        s3.value = withDelay(1400, withRepeat(withTiming(1, { duration: 2400, easing: Easing.out(Easing.ease) }), -1, false));
        return () => { cancelAnimation(s1); cancelAnimation(s2); cancelAnimation(s3); };
    }, [s1, s2, s3]);
    const useSmokeStyle = (sv: SharedValue<number>, fx: number, fy: number, tx: number, sc: number) => useAnimatedStyle(() => ({
        opacity: interpolate(sv.value, [0, 0.2, 0.7, 1], [0, 0.55, 0.3, 0]),
        transform: [{ translateX: fx + (tx - fx) * sv.value }, { translateY: fy + (-60 * sv.value) }, { scale: interpolate(sv.value, [0, 1], [sc * 0.6, sc * 1.8]) }],
    }));
    const a1 = useSmokeStyle(s1, 30, 280, 10, 0.9);
    const a2 = useSmokeStyle(s2, 160, 260, 185, 1.1);
    const a3 = useSmokeStyle(s3, 90, 300, 70, 0.7);
    return (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
            {[a1, a2, a3].map((st, i) => (
                <Animated.View key={i} style={[styles.smokeBlob, st]}>
                    <Svg width={50} height={50} viewBox="0 0 50 50">
                        <Defs><RadialGradient id={`sg${i}`} cx="50%" cy="50%" r="50%">
                            <Stop offset="0%" stopColor="#1a1a1a" stopOpacity={0.9} />
                            <Stop offset="60%" stopColor="#0a0a0a" stopOpacity={0.5} />
                            <Stop offset="100%" stopColor="#000000" stopOpacity={0} />
                        </RadialGradient></Defs>
                        <Ellipse cx={25} cy={25} rx={22} ry={18} fill={`url(#sg${i})`} />
                    </Svg>
                </Animated.View>
            ))}
        </View>
    );
};

// ─────────────────────────────────────────────
// SpecialBreathingBorder / GlowRing
// ─────────────────────────────────────────────
const SpecialBreathingBorder = () => {
    const p = useSharedValue(0);
    useEffect(() => { p.value = withRepeat(withTiming(1, { duration: 3500, easing: Easing.inOut(Easing.quad) }), -1, true); return () => cancelAnimation(p); }, [p]);
    const s = useAnimatedStyle(() => ({ opacity: interpolate(p.value, [0, 1], [0.3, 0.9]), transform: [{ scale: interpolate(p.value, [0, 1], [0.997, 1.007]) }] }));
    return <Animated.View style={[styles.specialBreathingBorder, s]} pointerEvents="none" />;
};
const GlowRing = ({ color }: { color: string }) => {
    const op = useSharedValue(0.4);
    useEffect(() => { op.value = withRepeat(withSequence(withTiming(1, { duration: 1800 }), withTiming(0.4, { duration: 1800 })), -1, false); return () => cancelAnimation(op); }, [op]);
    const s = useAnimatedStyle(() => ({ opacity: op.value }));
    return <Animated.View style={[styles.glowRing, { borderColor: color, shadowColor: color }, s]} pointerEvents="none" />;
};

// ─────────────────────────────────────────────
// StarsRow
// ─────────────────────────────────────────────
const StarsRow = ({ count, color, emptyColor, sc }: { count: number; color: string; emptyColor: string; sc: number }) => (
    <View style={styles.starsRow}>
        {Array.from({ length: 5 }).map((_, i) => (
            <Text key={i} style={[styles.star, { color: i < count ? color : emptyColor, fontSize: Math.max(7, 11 * sc) }]}>{i < count ? '★' : '☆'}</Text>
        ))}
    </View>
);

// ─────────────────────────────────────────────
// AbilityBanner
// ─────────────────────────────────────────────
const AbilityBanner = ({ text, rarity, theme, sc }: { text: string; rarity: CardRarity; theme: any; sc: number }) => {
    const textSize = Math.max(7, 9.5 * sc), iconSize = Math.max(8, 11 * sc), padH = Math.max(4, 8 * sc), padV = Math.max(3, 5 * sc);
    if (rarity === 'legendary') return (
        <View style={styles.abilityWrapperLegendary}>
            <View style={styles.legendaryDivider}>
                <View style={[styles.dividerLine, { backgroundColor: theme.color }]} />
                <Text style={[styles.dividerGem, { color: theme.color, fontSize: Math.max(7, 10 * sc) }]}>✦</Text>
                <View style={[styles.dividerLine, { backgroundColor: theme.color }]} />
            </View>
            <LinearGradient colors={theme.abilityBg} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.abilityBannerBase, { borderColor: theme.abilityBorder, borderWidth: 1.2, paddingHorizontal: padH, paddingVertical: padV }]}>
                <Text style={[styles.abilityIcon, { color: theme.abilityIconColor, fontSize: iconSize }]}>⚜️</Text>
                <Text style={[styles.abilityText, { color: theme.abilityTextColor, fontSize: textSize, lineHeight: textSize * 1.35 }]} numberOfLines={2}>{text}</Text>
            </LinearGradient>
        </View>
    );
    if (rarity === 'special') return (
        <View style={styles.abilityWrapperLegendary}>
            <View style={styles.legendaryDivider}>
                <View style={[styles.dividerLine, { backgroundColor: theme.color }]} />
                <Text style={[styles.dividerGem, { color: theme.color, fontSize: Math.max(7, 10 * sc) }]}>☠️</Text>
                <View style={[styles.dividerLine, { backgroundColor: theme.color }]} />
            </View>
            <LinearGradient colors={theme.abilityBg} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.abilityBannerBase, { borderColor: theme.abilityBorder, borderWidth: 1.2, paddingHorizontal: padH, paddingVertical: padV }]}>
                <Text style={[styles.abilityIcon, { color: theme.abilityIconColor, fontSize: iconSize }]}>⚫</Text>
                <Text style={[styles.abilityText, { color: theme.abilityTextColor, fontSize: textSize, lineHeight: textSize * 1.35 }]} numberOfLines={2}>{text}</Text>
            </LinearGradient>
        </View>
    );
    if (rarity === 'epic') return (
        <View style={styles.abilityWrapperEpic}>
            <View style={[styles.epicAccentBar, { backgroundColor: theme.color }]} />
            <LinearGradient colors={theme.abilityBg} style={[styles.abilityBannerBase, { borderColor: theme.abilityBorder, borderWidth: 1, borderLeftWidth: 0, paddingHorizontal: padH, paddingVertical: padV }]}>
                <Text style={[styles.abilityIcon, { color: theme.abilityIconColor, fontSize: iconSize }]}>✦</Text>
                <Text style={[styles.abilityText, { color: theme.abilityTextColor, fontSize: textSize, lineHeight: textSize * 1.35 }]} numberOfLines={2}>{text}</Text>
            </LinearGradient>
        </View>
    );
    return (
        <LinearGradient colors={theme.abilityBg} style={[styles.abilityBannerSimple, { borderColor: theme.abilityBorder, paddingHorizontal: padH, paddingVertical: padV - 1 }]}>
            <Text style={[styles.abilityIcon, { color: theme.abilityIconColor, fontSize: iconSize }]}>◆</Text>
            <Text style={[styles.abilityText, { color: theme.abilityTextColor, fontSize: textSize, lineHeight: textSize * 1.35 }]} numberOfLines={2}>{text}</Text>
        </LinearGradient>
    );
};

// ─────────────────────────────────────────────
// CardMedia
// ─────────────────────────────────────────────
// These transparent character cut-outs are much narrower than the card canvas.
// Contain preserves the full silhouette instead of cropping heads, weapons, or feet.
const CARD_IMAGE_FIT_OVERRIDES: Record<string, 'cover' | 'contain'> = {
    ay_raikage: 'contain',
    bam: 'contain',
    trunks: 'contain',
    nelliel_tu: 'contain',
    emlyn_white: 'contain',
    riza_hawkeye: 'contain',
    leafa: 'contain',
    ebisu: 'contain',
    ino_yamanaka: 'contain',
    yosaku: 'contain',
    yonji: 'contain',
};

const CardVideo = ({ source, imgStyle, imageFit, audioEnabled, shouldAnimate }: {
    source: number | string;
    imgStyle: object;
    imageFit: 'cover' | 'contain';
    audioEnabled: boolean;
    shouldAnimate: boolean;
}) => {
    const [hasRenderedFirstFrame, setHasRenderedFirstFrame] = useState(false);
    const player = useVideoPlayer(source, (instance) => {
        instance.loop = true;
        instance.muted = !audioEnabled;
        instance.volume = audioEnabled ? 0.82 : 0;
        if (shouldAnimate) instance.play();
    });

    useEffect(() => {
        player.loop = true;
        player.muted = !audioEnabled;
        player.volume = audioEnabled ? 0.82 : 0;
        if (shouldAnimate) player.play();
        else player.pause();
    }, [audioEnabled, player, shouldAnimate]);

    return (
        <View style={imgStyle as any}>
            <VideoView
                player={player}
                style={StyleSheet.absoluteFill}
                contentFit={imageFit}
                nativeControls={false}
                surfaceType="textureView"
                useExoShutter={false}
                onFirstFrameRender={() => setHasRenderedFirstFrame(true)}
            />
            {!hasRenderedFirstFrame && <View testID="card-video-loading" style={styles.videoLoadingCover} pointerEvents="none" />}
        </View>
    );
};

const CardMedia = ({ cardImage, videoAsset, customUri, isCustomImage, imageFit, imgStyle, audioEnabled, shouldAnimate }: {
    cardImage: ReturnType<typeof getCardImage>; videoAsset?: any; customUri?: string;
    isCustomImage: boolean; imageFit: 'cover' | 'contain'; imgStyle: object; audioEnabled: boolean; shouldAnimate: boolean;
}) => {
    const hasVideo = !!videoAsset || !!(customUri && isVideoUri(customUri));

    useEffect(() => {
        if (!hasVideo || !audioEnabled) return;
        Audio.setAudioModeAsync({
            playsInSilentModeIOS: true,
            staysActiveInBackground: false,
            shouldDuckAndroid: true,
            playThroughEarpieceAndroid: false,
            interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
            interruptionModeIOS: InterruptionModeIOS.DoNotMix,
        }).catch(() => {});
    }, [audioEnabled, hasVideo]);

    if (videoAsset) return <CardVideo source={videoAsset} imgStyle={imgStyle} imageFit={imageFit} audioEnabled={audioEnabled} shouldAnimate={shouldAnimate} />;
    if (customUri && isVideoUri(customUri)) return <CardVideo source={customUri} imgStyle={imgStyle} imageFit={imageFit} audioEnabled={audioEnabled} shouldAnimate={shouldAnimate} />;
    const uri: string | undefined = cardImage && typeof cardImage === 'object' && 'uri' in cardImage ? (cardImage as any).uri : undefined;
    const animated = uri ? isAnimatedUri(uri) : false;
    const source = animated ? { uri, headers: {} } : (cardImage as any);
    return <Image source={source} style={imgStyle as any} resizeMode={isCustomImage ? 'contain' : imageFit} />;
};

/**
 * مسار المعلومات الموحد: يبقي وسيط البطاقة ذاته (صورة أو فيديو وصوت)
 * ويعتمد طبقات واجهة متجاوبة مشتركة مع هوية مستقلة لكل ندرة.
 */
type TacticalRarityPalette = {
    label: string;
    symbol: string;
    outer: string;
    frame: string;
    surface: string;
    shadow: string;
    chipBg: string;
    chipBorder: string;
    chipText: string;
    nameBg: string;
    text: string;
    subText: string;
    star: string;
    starEmpty: string;
    abilityBg: string;
    abilityBorder: string;
    railBg: string;
    railBorder: string;
    statBg: string;
    statBorder: string;
    overlayBottom: string;
    fallback: [string, string];
};

const TACTICAL_RARITY_PALETTES: Record<CardRarity, TacticalRarityPalette> = {
    common: {
        label: 'عادي', symbol: '●', outer: '#64748B', frame: 'rgba(226,232,240,0.48)', surface: '#111827', shadow: '#020617',
        chipBg: 'rgba(15,23,42,0.78)', chipBorder: 'rgba(203,213,225,0.5)', chipText: '#E2E8F0', nameBg: 'rgba(2,6,23,0.63)', text: '#F8FAFC', subText: '#CBD5E1',
        star: '#CBD5E1', starEmpty: 'rgba(203,213,225,0.28)', abilityBg: 'rgba(15,23,42,0.86)', abilityBorder: 'rgba(148,163,184,0.45)', railBg: 'rgba(15,23,42,0.72)', railBorder: 'rgba(148,163,184,0.34)', statBg: 'rgba(2,6,23,0.9)', statBorder: 'rgba(148,163,184,0.58)', overlayBottom: 'rgba(2,6,23,0.9)', fallback: ['#1E293B', '#020617'],
    },
    rare: {
        label: 'نادر', symbol: '◆', outer: '#C77F36', frame: 'rgba(254,215,170,0.55)', surface: '#211208', shadow: '#7C2D12',
        chipBg: 'rgba(45,24,8,0.8)', chipBorder: 'rgba(251,191,36,0.55)', chipText: '#FDE68A', nameBg: 'rgba(28,14,5,0.67)', text: '#FFF7ED', subText: '#FED7AA',
        star: '#F59E0B', starEmpty: 'rgba(251,191,36,0.28)', abilityBg: 'rgba(57,29,7,0.86)', abilityBorder: 'rgba(245,158,11,0.52)', railBg: 'rgba(45,24,8,0.74)', railBorder: 'rgba(251,191,36,0.36)', statBg: 'rgba(27,13,5,0.9)', statBorder: 'rgba(245,158,11,0.62)', overlayBottom: 'rgba(27,13,5,0.91)', fallback: ['#4A2510', '#160A03'],
    },
    epic: {
        label: 'ملحمي', symbol: '✦', outer: '#9B7FE8', frame: 'rgba(221,214,254,0.58)', surface: '#1B1031', shadow: '#4C1D95',
        chipBg: 'rgba(35,16,65,0.82)', chipBorder: 'rgba(196,181,253,0.58)', chipText: '#EDE9FE', nameBg: 'rgba(22,9,45,0.69)', text: '#FAF5FF', subText: '#DDD6FE',
        star: '#C4B5FD', starEmpty: 'rgba(196,181,253,0.28)', abilityBg: 'rgba(41,18,75,0.88)', abilityBorder: 'rgba(167,139,250,0.54)', railBg: 'rgba(29,12,56,0.75)', railBorder: 'rgba(196,181,253,0.38)', statBg: 'rgba(20,8,42,0.92)', statBorder: 'rgba(167,139,250,0.66)', overlayBottom: 'rgba(20,8,42,0.92)', fallback: ['#3B1A62', '#12051F'],
    },
    legendary: {
        label: 'أسطوري', symbol: '✦', outer: '#D4AF37', frame: 'rgba(253,230,138,0.58)', surface: '#090705', shadow: '#000000',
        chipBg: 'rgba(9,7,2,0.78)', chipBorder: 'rgba(253,230,138,0.62)', chipText: '#FEF3C7', nameBg: 'rgba(3,4,7,0.58)', text: '#FFF7D6', subText: '#FDE68A',
        star: '#FFD84D', starEmpty: 'rgba(253,230,138,0.28)', abilityBg: 'rgba(24,17,3,0.8)', abilityBorder: 'rgba(253,230,138,0.52)', railBg: 'rgba(4,5,8,0.7)', railBorder: 'rgba(253,230,138,0.36)', statBg: 'rgba(8,6,2,0.91)', statBorder: 'rgba(253,230,138,0.74)', overlayBottom: 'rgba(2,4,8,0.92)', fallback: ['#281C06', '#090705'],
    },
    special: {
        label: 'خاص', symbol: '◈', outer: '#C4CDD7', frame: 'rgba(226,232,240,0.62)', surface: '#0B0D12', shadow: '#111827',
        chipBg: 'rgba(9,11,16,0.82)', chipBorder: 'rgba(203,213,225,0.58)', chipText: '#F1F5F9', nameBg: 'rgba(2,3,6,0.72)', text: '#FFFFFF', subText: '#CBD5E1',
        star: '#E2E8F0', starEmpty: 'rgba(226,232,240,0.27)', abilityBg: 'rgba(30,19,31,0.9)', abilityBorder: 'rgba(244,114,182,0.5)', railBg: 'rgba(9,11,16,0.78)', railBorder: 'rgba(203,213,225,0.38)', statBg: 'rgba(2,3,6,0.93)', statBorder: 'rgba(203,213,225,0.66)', overlayBottom: 'rgba(2,3,6,0.94)', fallback: ['#19141D', '#020306'],
    },
};

const TacticalRarityCard = ({
    card, style, cardW, cardH, sc, cardImage, videoAsset, customUri,
    isCustomImage, imageFit, imgStyle, audioEnabled, shouldAnimate,
    attack, defense, baseAttack, baseDefense, selectionLabel, rarity, slashEffect,
}: {
    card: Card;
    style?: ViewStyle;
    cardW: number;
    cardH: number;
    sc: number;
    cardImage: ReturnType<typeof getCardImage>;
    videoAsset?: any;
    customUri?: string;
    isCustomImage: boolean;
    imageFit: 'cover' | 'contain';
    imgStyle: object;
    audioEnabled: boolean;
    shouldAnimate: boolean;
    attack: number;
    defense: number;
    baseAttack: number;
    baseDefense: number;
    selectionLabel?: string;
    rarity: CardRarity;
    slashEffect?: boolean;
}) => {
    const hasMedia = !!cardImage || !!videoAsset || !!customUri;
    const palette = TACTICAL_RARITY_PALETTES[rarity];
    const isCompact = cardW < 154 || cardH < 224;
    const pad = Math.max(7, Math.min(14, 11 * sc));
    const statsDockH = Math.max(isCompact ? 30 : 34, Math.min(42, 42 * sc));
    const statValueFont = Math.max(isCompact ? 12 : 15, Math.min(19, 17 * sc));
    const labelFont = Math.max(8, Math.min(10, 9 * sc));
    const nameFont = Math.max(isCompact ? 12 : 15, Math.min(21, 19 * sc));
    const badgeFont = Math.max(8, Math.min(11, 10 * sc));
    const showEnglishName = !isCompact && !!card.nameEn;
    const starCount = Math.max(0, Math.min(5, card.stars ?? 5));
    const abilityText = card.specialAbility?.trim();
    type MetaItem = { key: 'class'; label: string };
    const classLabel = card.cardClass ? CLASS_LABELS[card.cardClass] : undefined;
    const metaItems: MetaItem[] = [
        classLabel ? { key: 'class', label: classLabel } : null,
    ].filter((item): item is MetaItem => item !== null);
    const hasMeta = metaItems.length > 0;
    const metaHeight = hasMeta ? (isCompact ? 16 : 20) : 0;
    const abilityHeight = abilityText ? (isCompact ? 20 : 28) : 0;
    const metaBottom = pad + statsDockH + (hasMeta ? 4 : 0);
    const abilityBottom = metaBottom + metaHeight + (abilityText ? 4 : 0);
    const nameBottom = abilityText ? abilityBottom + abilityHeight + 5 : metaBottom + metaHeight + 5;

    return (
        <View style={[styles.tacticalLegendaryCard, { width: cardW, height: cardH, borderRadius: Math.round(12 * sc), backgroundColor: palette.surface, borderColor: palette.outer, shadowColor: palette.shadow }, style]}>
            <View style={[styles.tacticalLegendaryInner, { borderRadius: Math.round(10 * sc), backgroundColor: palette.surface }]}>
                {hasMedia && <CardMedia cardImage={cardImage} videoAsset={videoAsset} customUri={customUri} isCustomImage={isCustomImage} imageFit={imageFit} imgStyle={imgStyle} audioEnabled={audioEnabled} shouldAnimate={shouldAnimate} />}
                {!hasMedia && <LinearGradient colors={palette.fallback} style={StyleSheet.absoluteFill} />}
                <LinearGradient colors={['rgba(2,4,8,0.03)', 'rgba(2,4,8,0.08)', palette.overlayBottom]} locations={[0, 0.45, 1]} style={StyleSheet.absoluteFill} />
                {slashEffect && (
                    <View pointerEvents="none" style={styles.zoroSlashOverlay}>
                        <View style={[styles.zoroSlashLine, styles.zoroSlashLineOne]} />
                        <View style={[styles.zoroSlashLine, styles.zoroSlashLineTwo]} />
                        <View style={styles.zoroSlashLabel}><Text style={styles.zoroSlashLabelText}>⚔️ قطع زورو</Text></View>
                    </View>
                )}

                <View style={[styles.tacticalLegendaryFrame, { borderRadius: Math.round(8 * sc), borderColor: palette.frame }]} pointerEvents="none" />
                <View style={[styles.tacticalLegendaryTopRow, { top: pad, left: pad, right: pad, justifyContent: 'flex-start' }]}>
                    <View style={[styles.tacticalLegendaryRarityChip, isCompact && styles.tacticalLegendaryChipCompact, { backgroundColor: palette.chipBg, borderColor: palette.chipBorder }]}>
                        <Text style={[styles.tacticalLegendaryChipText, { color: palette.chipText, fontSize: badgeFont }]}>{palette.symbol} {palette.label}</Text>
                    </View>
                </View>
                <FactionCornerMedallion card={card} sc={sc} />

                {!!selectionLabel && (
                    <View style={[styles.tacticalContextRail, { top: pad + (isCompact ? 25 : 31), left: pad, right: pad }]}>
                        <View style={[styles.tacticalSelectionChip, { backgroundColor: palette.abilityBg, borderColor: palette.abilityBorder }]}>
                            <Text style={[styles.tacticalSelectionChipText, { color: palette.text, fontSize: Math.max(7, badgeFont - 1) }]}>{selectionLabel}</Text>
                        </View>
                    </View>
                )}

                <View style={[styles.tacticalLegendaryNameBlock, { bottom: nameBottom, paddingHorizontal: pad }]}>
                    <View style={[styles.tacticalLegendaryNamePlate, { backgroundColor: palette.nameBg }]}>
                        <Text style={[styles.tacticalLegendaryName, { color: palette.text, fontSize: nameFont, lineHeight: Math.round(nameFont * 1.18) }]} numberOfLines={isCompact ? 1 : 2} adjustsFontSizeToFit minimumFontScale={0.72}>{card.nameAr || card.name}</Text>
                        {showEnglishName && <Text style={[styles.tacticalLegendaryNameEn, { color: palette.subText, fontSize: Math.max(7, 9 * sc) }]} numberOfLines={1}>{card.nameEn}</Text>}
                        <View style={styles.tacticalLegendaryStars}>
                            {Array.from({ length: 5 }).map((_, index) => (
                                <Text key={index} style={[styles.tacticalLegendaryStar, { fontSize: Math.max(7, 10 * sc), color: index < starCount ? palette.star : palette.starEmpty }]}>{index < starCount ? '★' : '☆'}</Text>
                            ))}
                        </View>
                    </View>
                </View>

                {abilityText && (
                    <View style={[styles.tacticalLegendaryAbility, { left: pad, right: pad, bottom: abilityBottom, minHeight: abilityHeight, backgroundColor: palette.abilityBg, borderColor: palette.abilityBorder }]}>
                        <Text style={[styles.tacticalLegendaryAbilityIcon, { color: palette.star, fontSize: labelFont + 2 }]}>✦</Text>
                        <Text style={[styles.tacticalLegendaryAbilityText, { color: palette.text, fontSize: Math.max(7, labelFont - 1), lineHeight: Math.max(10, labelFont * 1.25) }]} numberOfLines={isCompact ? 1 : 2}>{abilityText}</Text>
                    </View>
                )}

                {hasMeta && (
                    <View style={[styles.tacticalLegendaryMetaRail, { left: pad, right: pad, bottom: metaBottom, minHeight: metaHeight, backgroundColor: palette.railBg, borderColor: palette.railBorder }]}>
                        {metaItems.map((item, index) => (
                            <React.Fragment key={item.key}>
                                {index > 0 && <View style={styles.tacticalLegendaryMetaDivider} />}
                                <View style={styles.tacticalLegendaryMetaItem}>
                                    <Text style={[styles.tacticalLegendaryMetaLabel, { color: palette.subText, fontSize: Math.max(8, labelFont) }]} numberOfLines={1}>{item.label}</Text>
                                </View>
                            </React.Fragment>
                        ))}
                    </View>
                )}

                <View style={[styles.tacticalLegendaryStatsDock, { left: pad, right: pad, bottom: pad, height: statsDockH, backgroundColor: palette.statBg, borderColor: palette.statBorder }]}>
                    <View style={styles.tacticalLegendaryStat}>
                        <View style={styles.tacticalLegendaryStatCaption}>
                            <Text style={[styles.tacticalLegendaryStatIcon, { fontSize: labelFont + 2 }]}>⚔️</Text>
                        </View>
                        <TacticalStatValue baseValue={baseAttack} effectiveValue={attack} color={palette.text} fontSize={statValueFont} />
                    </View>
                    <View style={styles.tacticalLegendaryDivider} />
                    <View style={styles.tacticalLegendaryStat}>
                        <View style={styles.tacticalLegendaryStatCaption}>
                            <Text style={[styles.tacticalLegendaryStatIcon, { fontSize: labelFont + 2 }]}>🛡️</Text>
                        </View>
                        <TacticalStatValue baseValue={baseDefense} effectiveValue={defense} color={palette.text} fontSize={statValueFont} />
                    </View>
                </View>
            </View>
        </View>
    );
};

// ─────────────────────────────────────────────
// ✨✨ MAIN EXPORT ✨✨
// ─────────────────────────────────────────────
export function LuxuryCharacterCardAnimated({
    card, style, imageOffsetY = 0, fitInsideBorder = false, isOpenedView = false,
    effectiveAttack, effectiveDefense, playAudio = false, winnerState, selectionLabel, slashEffect = false,
}: Props) {
    const { settings } = useSettings();
    // هذا الخيار يوقف الحركات المستمرة والفيديو المتكرر، وهي أعلى عناصر البطاقة كلفة على الأجهزة الضعيفة.
    const enableVisualEffects = settings.animationsEnabled;
    // الصور المتحركة لا تملك مساراً صوتياً؛ وصوت الفيديو يحدده صاحب الساحة (مثل الكرت الأقوى في Wi‑Fi).
    // تورين استثناء: لا يبدأ صوته أثناء التوقع أو عند خسارة/تعادل؛ يلزم تأكيد فوزه في نتيجة الجولة.
    const turinAudioAuthorized = card.id !== 'Turin_Turambar' || winnerState === 'winner';
    const videoAudioEnabled = playAudio && settings.soundEnabled && enableVisualEffects && turinAudioAuthorized;

    useEffect(() => {
        if (!videoAudioEnabled) return;
        Audio.setAudioModeAsync({
            playsInSilentModeIOS: true,
            staysActiveInBackground: false,
            shouldDuckAndroid: true,
            playThroughEarpieceAndroid: false,
            interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
            interruptionModeIOS: InterruptionModeIOS.DoNotMix,
        }).catch(() => {});
    }, [videoAudioEnabled]);
    const rarity: CardRarity = card.rarity ?? 'common';
    const theme = RARITY_THEMES[rarity] ?? RARITY_THEMES.common;
    const hasAbility = !!card.specialAbility && rarity !== 'legendary';
    const stars = rarity === 'legendary' ? 0 : (card.stars ?? 0);

    // القيم المعروضة — إذا لم تُمرَّر effectiveAttack/effectiveDefense نستخدم القيم الأصلية
    const displayAttack = effectiveAttack ?? card.attack;
    const displayDefense = effectiveDefense ?? card.defense;

    // للحفاظ على إظهار التأثير باللون الأخضر للبطاقات في وضع الغضب
    const baseAttack = (card as any).originalAttack ?? card.attack;
    const baseDefense = (card as any).originalDefense ?? card.defense;

    const themeColor = theme.color;
    const themeBorder = theme.borderColor;

    const styleW = (style as any)?.width;
    const styleH = (style as any)?.height;
    const cardW: number = typeof styleW === 'number' ? styleW : BASE_W;
    const cardH: number = typeof styleH === 'number' ? styleH : BASE_H;
    const scW = cardW / BASE_W, scH = cardH / BASE_H;
    const sc = Math.min(scW, scH);
    const INSET = Math.round(5 * sc);

    const cardImage = getCardImage(card);
    const rawVideo = card.videoUrl;
    const videoAsset: any = isLocalAsset(rawVideo) ? rawVideo : undefined;
    const videoUri: string | undefined = typeof rawVideo === 'string' ? rawVideo : undefined;
    const customUri: string | undefined = videoUri || (card as any).customImage || undefined;
    const hasVideo = !!videoAsset || !!(customUri && isVideoUri(customUri));
    const hasImage = !!cardImage || !!customUri;
    const isCustomImage = !!customUri;
    const imageFit = CARD_IMAGE_FIT_OVERRIDES[card.id] ?? 'cover';

    const statFs = Math.max(11, 14 * sc);

    const statsBottom = Math.round(8 * scH);
    const STAT_AREA_H = Math.round(38 * scH);
    const ABILITY_H = hasAbility ? Math.round((rarity === 'special' ? 50 : 42) * scH) : 0;
    const ABILITY_GAP = hasAbility ? Math.round(4 * scH) : 0;
    const abilityBottom = statsBottom + STAT_AREA_H + ABILITY_GAP;
    const showBadge = !!(winnerState === 'winner' || (!winnerState && card.winState === 'win') || winnerState === 'leading');
    const badgeBottom = hasAbility
        ? abilityBottom + ABILITY_H + Math.round(4 * scH)
        : statsBottom + STAT_AREA_H + Math.round(6 * scH);
    const nameBottom = abilityBottom + (hasAbility ? ABILITY_H + Math.round(4 * scH) : 0) + Math.round((stars > 0 ? 4 : 6) * scH) + (showBadge ? Math.round(18 * scH) : 0);

    const nameFontSize = Math.max(10, (rarity === 'legendary' || rarity === 'special' ? 18 : 17) * sc);
    const badgeFontSize = Math.max(7, 10 * sc);
    const badgePadH = Math.max(5, 10 * sc);
    const badgePadV = Math.max(2, 3 * sc);
    const badgeTop = Math.max(4, 9 * scH);
    const badgeLeft = Math.max(4, 9 * scW);

    const imgStyle = isCustomImage && fitInsideBorder
        ? { position: 'absolute' as const, top: INSET + imageOffsetY, left: INSET, right: INSET, bottom: INSET }
        : { position: 'absolute' as const, top: imageOffsetY, left: 0, right: 0, width: '100%' as const, height: '100%' as const };

    const specialRarityBadgeBg = rarity === 'special' ? 'rgba(0,0,0,0.85)' : rarity === 'legendary' ? 'rgba(30,20,0,0.75)' : rarity === 'epic' ? 'rgba(20,0,30,0.75)' : 'rgba(0,0,0,0.65)';
    const isLegendary = rarity === 'legendary';

    const bottomGradient: [string, string, string, string] = rarity === 'special'
        ? ['rgba(0,0,0,0.2)', 'transparent', 'rgba(0,0,0,0.7)', 'rgba(0,0,0,0.97)']
        : ['transparent', 'transparent', 'rgba(0,0,0,0.55)', 'rgba(0,0,0,0.94)'];

    if (TACTICAL_RARITY_PALETTES[rarity]) {
        return <TacticalRarityCard
            card={card}
            style={style}
            cardW={cardW}
            cardH={cardH}
            sc={sc}
            cardImage={cardImage}
            videoAsset={videoAsset}
            customUri={customUri}
            isCustomImage={isCustomImage}
            imageFit={imageFit}
            imgStyle={imgStyle}
            audioEnabled={videoAudioEnabled}
            shouldAnimate={enableVisualEffects}
            attack={displayAttack}
            defense={displayDefense}
            baseAttack={baseAttack}
            baseDefense={baseDefense}
            selectionLabel={selectionLabel}
            rarity={rarity}
            slashEffect={slashEffect}
        />;
    }

    return (
        <Animated.View style={[
            styles.cardContainer,
            {
                width: cardW, height: cardH, borderRadius: Math.round(14 * sc), borderColor: themeBorder, borderWidth: theme.borderWidth,
                shadowColor: theme.shadowColor,
                shadowOpacity: enableVisualEffects ? theme.shadowOpacity : Math.min(theme.shadowOpacity, 0.2),
                shadowRadius: enableVisualEffects ? theme.shadowRadius : 3,
                elevation: enableVisualEffects ? theme.elevation : 1
            },
            rarity === 'special' && styles.specialCardBase,
            style,
        ]}>
            {enableVisualEffects && rarity === 'special' && <SpecialBreathingBorder />}
            {enableVisualEffects && rarity === 'epic' && <GlowRing color={themeColor} />}

            <View style={[styles.cardInner, { borderRadius: Math.round(12 * sc) }]}>
                <LinearGradient colors={theme.bgColors} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
                {rarity === 'special' && <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.45)', zIndex: 1 }]} pointerEvents="none" />}
                {(hasImage || hasVideo) && <CardMedia cardImage={cardImage} videoAsset={videoAsset} customUri={customUri} isCustomImage={isCustomImage} imageFit={imageFit} imgStyle={imgStyle} audioEnabled={videoAudioEnabled} shouldAnimate={enableVisualEffects} />}

                <View style={styles.contentLayer}>
                    {enableVisualEffects && theme.hasFoil && <RarityShimmer cardW={cardW} foilDuration={theme.foilDuration} color={themeColor} />}
                    <View style={[styles.innerBorder, { borderColor: themeBorder + '55', borderRadius: Math.round(9 * sc) }]} pointerEvents="none" />
                    {(hasImage || hasVideo) && (
                        <LinearGradient colors={bottomGradient} style={styles.gradientOverlay} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} pointerEvents="none" />
                    )}
                    {!hasImage && !hasVideo && (
                        <View style={styles.noImageBadge} pointerEvents="none">
                            <Text style={styles.noImageIcon}>🖼️</Text>
                            <Text style={styles.noImageText}>لا توجد صورة</Text>
                        </View>
                    )}
                    {enableVisualEffects && theme.hasSideVines && <SideVines color={themeColor} />}
                    {enableVisualEffects && (theme as any).hasDarkSmoke && <DarkSmokeEffect />}
                    {enableVisualEffects && theme.hasFiligree && (
                        <>
                            <ElvenCorner position="tl" color={themeColor} rich={rarity === 'special'} scale={sc} />
                            <ElvenCorner position="tr" color={themeColor} rich={rarity === 'special'} scale={sc} />
                            {(rarity === 'epic' || rarity === 'special') && (
                                <>
                                    <ElvenCorner position="bl" color={themeColor} rich={rarity === 'special'} scale={sc} />
                                    <ElvenCorner position="br" color={themeColor} rich={rarity === 'special'} scale={sc} />
                                </>
                            )}
                        </>
                    )}

                    <View style={[styles.rarityBadge, {
                        top: badgeTop,
                        left: badgeLeft,
                        paddingHorizontal: badgePadH,
                        paddingVertical: badgePadV,
                        borderRadius: Math.round(7 * sc),
                        borderColor: themeColor + 'AA',
                        backgroundColor: specialRarityBadgeBg,
                    }]}>
                        <Text style={[styles.rarityBadgeText, { color: themeColor, fontSize: badgeFontSize }]}>
                            {rarity === 'special' ? '☠️ ' : '✦ '}{theme.label}{rarity === 'special' ? ' ☠️' : ' ✦'}
                        </Text>
                    </View>
                    <FactionCornerMedallion card={card} sc={sc} />

                    {/* name + stars */}
                    <View style={[styles.nameContainer, { bottom: nameBottom, paddingHorizontal: Math.max(4, 10 * scW) }]}>
                        {rarity === 'special' && (
                            <View style={styles.legendaryNameBar}>
                                <LinearGradient colors={['transparent', 'rgba(192,192,192,0.12)', 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
                            </View>
                        )}
                        <Text style={[styles.cardName, { textShadowColor: themeColor, fontSize: nameFontSize }]} numberOfLines={1}>{card.nameAr || card.name}</Text>
                        {stars > 0 && <StarsRow count={stars} color={theme.starColor} emptyColor={theme.starEmpty} sc={sc} />}
                    </View>

                    {/* Winner/Leading indicator in lower section */}
                    {(winnerState === 'winner' || (!winnerState && card.winState === 'win')) && (
                        <View style={{ bottom: badgeBottom, left: 0, right: 0, position: 'absolute', alignItems: 'center', zIndex: 11 }} pointerEvents="none">
                            <View style={styles.inlineWinnerBadge}>
                                <Text style={[styles.inlineWinnerBadgeText, { fontSize: Math.max(8, 9 * sc) }]}>🏆 WINNER</Text>
                            </View>
                        </View>
                    )}
                    {winnerState === 'leading' && (
                        <View style={{ bottom: badgeBottom, left: 0, right: 0, position: 'absolute', alignItems: 'center', zIndex: 11 }} pointerEvents="none">
                            <View style={styles.inlineLeadingBadge}>
                                <Text style={[styles.inlineWinnerBadgeText, { fontSize: Math.max(8, 9 * sc) }]}>👑 LEADING</Text>
                            </View>
                        </View>
                    )}

                    {/* ability */}
                    {hasAbility && (
                        <View style={[styles.abilityContainer, { bottom: abilityBottom, left: Math.max(4, 8 * scW), right: Math.max(4, 8 * scW) }]}>
                            <AbilityBanner text={card.specialAbility!} rarity={rarity} theme={theme} sc={sc} />
                        </View>
                    )}



                    {/* The legacy renderer now serves common, rare, epic and special cards only. */}
                    <View style={[styles.statsRow, { bottom: statsBottom, paddingHorizontal: Math.max(4, 8 * scW) }]}>
                        <StatBadge icon="⚔️" value={baseAttack} effectiveValue={displayAttack} isAttack={true} fs={statFs} />
                        <MetaStrip card={card} sc={sc} />
                        <StatBadge icon="🛡️" value={baseDefense} effectiveValue={displayDefense} isAttack={false} fs={statFs} />
                    </View>
                </View>
            </View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    cardContainer: { backgroundColor: '#0a0a0e', shadowOffset: { width: 0, height: 0 } },
    specialCardBase: { backgroundColor: '#000000' },
    cardInner: { flex: 1, overflow: 'hidden' },
    contentLayer: { flex: 1, position: 'relative' },

    specialBreathingBorder: { position: 'absolute', top: -8, left: -8, right: -8, bottom: -8, borderRadius: 21, borderWidth: 2, borderColor: '#3a3a3a', shadowOffset: { width: 0, height: 0 }, shadowColor: '#000', zIndex: 20 },
    glowRing: { position: 'absolute', top: -3, left: -3, right: -3, bottom: -3, borderRadius: 16, borderWidth: 1.5, shadowOffset: { width: 0, height: 0 }, shadowRadius: 14, zIndex: 19 },

    innerBorder: { position: 'absolute', top: 5, left: 5, right: 5, bottom: 5, borderWidth: 1, zIndex: 5 },
    gradientOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 2 },
    filigreeCorner: { position: 'absolute', zIndex: 6, opacity: 0.92 },

    noImageBadge: { position: 'absolute', top: '25%', left: 0, right: 0, alignItems: 'center', zIndex: 4 },
    noImageIcon: { fontSize: 36, opacity: 0.4 },
    noImageText: { fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 4 },

    rarityBadge: { position: 'absolute', borderWidth: 1, zIndex: 10 },
    rarityBadgeText: { fontWeight: '700', letterSpacing: 0.5 },
    factionCornerMedallion: { position: 'absolute', zIndex: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(2,4,12,0.76)', borderWidth: 1, borderColor: 'rgba(167,139,250,0.74)', shadowColor: '#5B4BFF', shadowOpacity: 0.65, shadowRadius: 6, elevation: 8 },
    factionFallbackChip: { position: 'absolute', zIndex: 15, flexDirection: 'row-reverse', alignItems: 'center', gap: 3, minHeight: 24, paddingHorizontal: 6, borderRadius: 14, backgroundColor: 'rgba(2,4,12,0.86)', borderWidth: 1, borderColor: 'rgba(167,139,250,0.74)', shadowColor: '#5B4BFF', shadowOpacity: 0.55, shadowRadius: 5, elevation: 7 },

    nameContainer: { position: 'absolute', left: 0, right: 0, alignItems: 'center', zIndex: 8 },
    legendaryNameBar: { position: 'absolute', top: -4, left: -10, right: -10, bottom: -4 },
    cardName: { fontWeight: '800', color: '#FFFFFF', textAlign: 'center', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 10, letterSpacing: 0.3 },

    starsRow: { flexDirection: 'row', gap: 2, marginTop: 3 },
    star: { fontWeight: 'bold' },

    abilityContainer: { position: 'absolute', zIndex: 9 },
    abilityBannerBase: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 6 },
    abilityBannerSimple: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 6, borderWidth: 0.8 },
    abilityWrapperLegendary: { gap: 0 },
    legendaryDivider: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 3, paddingHorizontal: 4 },
    dividerLine: { flex: 1, height: 0.8, opacity: 0.6 },
    dividerGem: { fontWeight: '800' },
    abilityWrapperEpic: { flexDirection: 'row', alignItems: 'stretch' },
    epicAccentBar: { width: 3, borderRadius: 2, marginRight: 0 },
    abilityIcon: {},
    abilityText: { flex: 1, fontWeight: '600', writingDirection: 'rtl' },

    statsRow: { position: 'absolute', left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', zIndex: 10, gap: 2 },
    statBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, paddingTop: 6, paddingBottom: 3, borderRadius: 20, gap: 1, minWidth: 32, justifyContent: 'center', flexWrap: 'nowrap', flexShrink: 1, overflow: 'visible' },
    attackBadge: { backgroundColor: 'rgba(20,12,0,0.88)', borderWidth: 1.5, borderColor: '#B8860B' },
    defenseBadge: { backgroundColor: 'rgba(0,10,28,0.88)', borderWidth: 1.5, borderColor: '#2563EB' },
    statValue: { fontWeight: '800', letterSpacing: 0.3 },
    attackText: { color: '#FFB830' },
    defenseText: { color: '#60A5FA' },
    struckValue: { textDecorationLine: 'line-through', opacity: 0.45 },

    smokeBlob: { position: 'absolute', zIndex: 3 },

    tacticalLegendaryCard: { backgroundColor: '#090705', borderWidth: 1, borderColor: '#D4AF37', shadowColor: '#000', shadowOpacity: 0.34, shadowOffset: { width: 0, height: 7 }, shadowRadius: 11, elevation: 7 },
    tacticalLegendaryInner: { flex: 1, overflow: 'hidden', backgroundColor: '#090705' },
    tacticalLegendaryFrame: { position: 'absolute', top: 5, right: 5, bottom: 5, left: 5, borderWidth: 1, borderColor: 'rgba(253,230,138,0.58)' },
    tacticalLegendaryTopRow: { position: 'absolute', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    tacticalLegendaryChip: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 6, borderWidth: 1, paddingHorizontal: 7, paddingVertical: 3 },
    tacticalLegendaryRarityChip: { borderRadius: 6, borderWidth: 1, borderColor: 'rgba(253,230,138,0.7)', backgroundColor: 'rgba(9,7,2,0.78)', paddingHorizontal: 8, paddingVertical: 4 },
    tacticalLegendaryChipCompact: { paddingHorizontal: 5, paddingVertical: 2 },
    tacticalLegendaryChipText: { fontWeight: '800', writingDirection: 'rtl' },
    tacticalContextRail: { position: 'absolute', zIndex: 7, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', gap: 4 },
    tacticalPowerChip: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
    tacticalPowerChipText: { fontWeight: '900', writingDirection: 'rtl' },
    tacticalSelectionChip: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
    tacticalSelectionChipText: { fontWeight: '800', writingDirection: 'rtl' },
    tacticalLegendaryNameBlock: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
    tacticalLegendaryNamePlate: { alignSelf: 'stretch', alignItems: 'center', backgroundColor: 'rgba(3,4,7,0.54)', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 3 },
    tacticalLegendaryName: { color: '#FFF7D6', fontWeight: '900', textAlign: 'center', writingDirection: 'rtl', textShadowColor: 'rgba(0,0,0,0.95)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 5 },
    tacticalLegendaryNameEn: { color: '#FDE68A', fontWeight: '800', letterSpacing: 1.1, marginTop: 1 },
    tacticalLegendaryStars: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 1, marginTop: 1 },
    tacticalLegendaryStar: { fontWeight: '900', lineHeight: 12 },
    tacticalLegendaryAbility: { position: 'absolute', flexDirection: 'row-reverse', alignItems: 'center', gap: 3, borderRadius: 6, borderWidth: 1, borderColor: 'rgba(253,230,138,0.5)', backgroundColor: 'rgba(24,17,3,0.78)', paddingHorizontal: 6, paddingVertical: 2 },
    tacticalLegendaryAbilityIcon: { color: '#FFD84D' },
    tacticalLegendaryAbilityText: { flex: 1, color: '#FFF4C9', fontWeight: '700', writingDirection: 'rtl', textAlign: 'right' },
    tacticalLegendaryMetaRail: { position: 'absolute', flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-evenly', borderRadius: 6, borderWidth: 1, borderColor: 'rgba(253,230,138,0.34)', backgroundColor: 'rgba(4,5,8,0.68)', paddingHorizontal: 4 },
    tacticalLegendaryMetaItem: { flex: 1, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 2, minWidth: 0 },
    tacticalLegendaryMetaIcon: {},
    tacticalLegendaryMetaLabel: { color: '#FDE68A', fontWeight: '700', writingDirection: 'rtl', flexShrink: 1 },
    tacticalLegendaryMetaDivider: { width: StyleSheet.hairlineWidth, alignSelf: 'stretch', marginVertical: 3, backgroundColor: 'rgba(253,230,138,0.34)' },
    tacticalLegendaryStatsDock: { position: 'absolute', flexDirection: 'row-reverse', alignItems: 'center', borderRadius: 7, borderWidth: 1, borderColor: 'rgba(253,230,138,0.7)', backgroundColor: 'rgba(8,6,2,0.9)', paddingHorizontal: 4 },
    tacticalLegendaryStat: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 0 },
    tacticalLegendaryStatCaption: { flexDirection: 'row-reverse', alignItems: 'center', gap: 2 },
    tacticalLegendaryStatIcon: {},
    tacticalLegendaryStatLabel: { color: '#FDE68A', fontWeight: '800', writingDirection: 'rtl' },
    tacticalLegendaryStatValue: { color: '#FFF7D6', fontWeight: '900' },
    tacticalLegendaryStatValueWrap: { alignItems: 'center', justifyContent: 'center', minHeight: 18 },
    tacticalLegendaryStatDelta: { fontWeight: '900', lineHeight: 9, marginTop: -1 },
    tacticalLegendaryDivider: { width: StyleSheet.hairlineWidth, alignSelf: 'stretch', backgroundColor: 'rgba(253,230,138,0.55)', marginVertical: 5 },
    videoLoadingCover: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(2,4,8,0.18)' },
    zoroSlashOverlay: { ...StyleSheet.absoluteFillObject, zIndex: 18, overflow: 'hidden' },
    zoroSlashLine: { position: 'absolute', width: '142%', height: 4, left: '-21%', backgroundColor: 'rgba(255, 70, 70, 0.88)', borderRadius: 4, shadowColor: '#ff1f1f', shadowOpacity: 0.95, shadowRadius: 8, shadowOffset: { width: 0, height: 0 }, elevation: 8 },
    zoroSlashLineOne: { top: '37%', transform: [{ rotate: '-29deg' }] },
    zoroSlashLineTwo: { top: '54%', transform: [{ rotate: '-29deg' }], backgroundColor: 'rgba(255, 190, 190, 0.72)', height: 2 },
    zoroSlashLabel: { position: 'absolute', top: '11%', alignSelf: 'center', backgroundColor: 'rgba(73, 8, 8, 0.82)', borderWidth: 1, borderColor: 'rgba(255,120,120,0.82)', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 3 },
    zoroSlashLabelText: { color: '#ffe4e6', fontWeight: '900', fontSize: 10, writingDirection: 'rtl' },
    winnerBadge: {
        position: 'absolute',
        top: '40%',
        left: '10%',
        right: '10%',
        backgroundColor: 'rgba(217, 119, 6, 0.95)',
        borderWidth: 2,
        borderColor: '#FFD700',
        borderRadius: 12,
        paddingVertical: 6,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 99,
        shadowColor: '#FFD700',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.8,
        shadowRadius: 10,
        elevation: 10,
    },
    leadingBadge: {
        position: 'absolute',
        top: '40%',
        left: '10%',
        right: '10%',
        backgroundColor: 'rgba(30, 41, 59, 0.95)',
        borderWidth: 2,
        borderColor: '#F59E0B',
        borderRadius: 12,
        paddingVertical: 6,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 99,
        shadowColor: '#F59E0B',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.8,
        shadowRadius: 10,
        elevation: 10,
    },
    winnerBadgeText: {
        color: '#FFFFFF',
        fontWeight: '900',
        fontSize: 14,
        letterSpacing: 2,
        textShadowColor: 'rgba(0, 0, 0, 0.6)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 3,
    },
    inlineWinnerBadge: {
        backgroundColor: 'rgba(217, 119, 6, 0.95)',
        borderWidth: 1,
        borderColor: '#FFD700',
        borderRadius: 6,
        paddingHorizontal: 8,
        paddingVertical: 2,
        alignItems: 'center',
        justifyContent: 'center',
    },
    inlineLeadingBadge: {
        backgroundColor: 'rgba(30, 41, 59, 0.95)',
        borderWidth: 1,
        borderColor: '#F59E0B',
        borderRadius: 6,
        paddingHorizontal: 8,
        paddingVertical: 2,
        alignItems: 'center',
        justifyContent: 'center',
    },
    inlineWinnerBadgeText: {
        color: '#FFFFFF',
        fontWeight: '900',
        letterSpacing: 1,
        textShadowColor: 'rgba(0, 0, 0, 0.6)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 2,
    },
    sideVinesWrapper: { position: 'absolute', top: '20%', left: 0, right: 0, bottom: '15%', zIndex: 3 },
    vineLeft: { position: 'absolute', left: 2 },
    vineRight: { position: 'absolute', right: 2 },
});
