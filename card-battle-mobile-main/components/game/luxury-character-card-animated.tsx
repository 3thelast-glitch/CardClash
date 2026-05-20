/**
 * LuxuryCharacterCardAnimated
 * ✨ MetaStrip: sits BETWEEN attack & defense badges (same row)
 * ✨ Chips = icon only, no background, no border — pure clean icons
 * ✨ Element has NO visual effect on card colors — rarity theme only
 * ✨ StatBadge shows effective value with ▲/▼ diff indicator when buffs/debuffs active
 */
import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Image, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Video, ResizeMode } from 'expo-av';
import Animated, {
    useSharedValue, useAnimatedStyle, withRepeat, withTiming,
    withSequence, interpolate, Easing, withDelay, cancelAnimation,
} from 'react-native-reanimated';
import { Svg, Circle, Line, Ellipse, Path, Defs, RadialGradient, Stop } from 'react-native-svg';
import { Card, CardRarity, Element, ELEMENT_EMOJI, ELEMENT_COLORS, Race, RACE_EMOJI, CardClass, CLASS_EMOJI } from '@/lib/game/types';
import { getCardImage } from '../../lib/game/get-card-image';

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
    /** هل يتم تشغيل الصوت (للفيديو)؟ الافتراضي false */
    playAudio?: boolean;
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

// Tag elements removed as per user request to rely purely on Element, Race, and Class

// ─────────────────────────────────────────────
// MetaStrip — icon-only, no bg/border, sits BETWEEN atk & def
// ─────────────────────────────────────────────
const MetaStrip = ({ card, sc }: { card: Card; sc: number }) => {
    const iconFs = Math.max(9, Math.min(15, 12 * sc));
    const gap = Math.max(2, Math.min(6, 4 * sc));

    const icons: string[] = [];
    const el = card.element;
    if (el && ELEMENT_EMOJI[el]) icons.push(ELEMENT_EMOJI[el]);
    const race = card.race;
    if (race && RACE_EMOJI[race]) icons.push(RACE_EMOJI[race]);
    const cls = card.cardClass;
    if (cls && CLASS_EMOJI[cls]) icons.push(CLASS_EMOJI[cls]);

    if (!icons.length) return null;

    return (
        <View style={[ms.row, { gap }]}>
            {icons.map((ico, i) => (
                <Text key={i} style={{ fontSize: iconFs, lineHeight: iconFs * 1.3 }}>{ico}</Text>
            ))}
        </View>
    );
};
const ms = StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
});

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
        hasFoil: true, hasFiligree: true, hasSideVines: false, hasDarkSmoke: false,
        hasParticles: true, foilDuration: 2400,
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
// LegendaryGlowBorder
// ─────────────────────────────────────────────
const LegendaryGlowBorder = ({ color }: { color: string }) => {
    const glow = useSharedValue(0);
    useEffect(() => {
        glow.value = withRepeat(
            withSequence(
                withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.sin) }),
                withTiming(0, { duration: 1600, easing: Easing.inOut(Easing.sin) }),
            ), -1, false
        );
        return () => cancelAnimation(glow);
    }, []);
    const o = useAnimatedStyle(() => ({ opacity: interpolate(glow.value, [0, 1], [0.55, 1.0]), transform: [{ scale: interpolate(glow.value, [0, 1], [1.0, 1.008]) }] }));
    const i = useAnimatedStyle(() => ({ opacity: interpolate(glow.value, [0, 1], [0.25, 0.7]), transform: [{ scale: interpolate(glow.value, [0, 1], [1.004, 1.012]) }] }));
    return (
        <>
            <Animated.View pointerEvents="none" style={[styles.legendGlowOuter, { borderColor: color }, o]} />
            <Animated.View pointerEvents="none" style={[styles.legendGlowInner, { borderColor: color }, i]} />
        </>
    );
};

// ─────────────────────────────────────────────
// RarityShimmer — foil using rarity color only
// ─────────────────────────────────────────────
const RarityShimmer = ({ cardW, foilDuration, color }: { cardW: number; foilDuration: number; color: string }) => {
    const x = useSharedValue(-cardW * 0.7);
    useEffect(() => {
        x.value = withRepeat(withTiming(cardW * 1.7, { duration: foilDuration, easing: Easing.inOut(Easing.quad) }), -1, false);
        return () => cancelAnimation(x);
    }, [cardW, foilDuration]);
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
// LegendaryParticles
// ─────────────────────────────────────────────
const PARTICLE_CONFIGS = [
    { x: 28, startY: 240, delay: 0, dur: 2800 }, { x: 75, startY: 270, delay: 500, dur: 3200 },
    { x: 130, startY: 255, delay: 900, dur: 2600 }, { x: 170, startY: 265, delay: 300, dur: 3000 },
    { x: 55, startY: 285, delay: 1200, dur: 2400 }, { x: 155, startY: 275, delay: 700, dur: 3400 },
];
const SingleParticle = ({ x, startY, delay, dur, color }: { x: number; startY: number; delay: number; dur: number; color: string }) => {
    const p = useSharedValue(0);
    useEffect(() => {
        p.value = withDelay(delay, withRepeat(withTiming(1, { duration: dur, easing: Easing.out(Easing.quad) }), -1, false));
        return () => cancelAnimation(p);
    }, []);
    const style = useAnimatedStyle(() => ({
        opacity: interpolate(p.value, [0, 0.15, 0.75, 1], [0, 0.9, 0.6, 0]),
        transform: [{ translateX: x + Math.sin(p.value * Math.PI * 2) * 6 }, { translateY: startY - p.value * 85 }, { scale: interpolate(p.value, [0, 0.3, 1], [0.4, 1.0, 0.6]) }],
    }));
    return <Animated.View pointerEvents="none" style={[styles.particle, { backgroundColor: color }, style]} />;
};
const LegendaryParticles = ({ color }: { color: string }) => (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {PARTICLE_CONFIGS.map((cfg, i) => <SingleParticle key={i} {...cfg} color={color} />)}
    </View>
);

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
                    <Text style={[styles.statValue, { fontSize: fs, color: diffColor, fontWeight: 'bold', flexShrink: 1 }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
                        {effectiveValue}
                    </Text>
                    <Text style={{ fontSize: Math.max(8, fs - 6), color: diffColor, fontWeight: 'bold', flexShrink: 1 }} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
                        ({diff > 0 ? `+${diff}▲` : `${diff}▼`})
                    </Text>
                </>
            ) : (
                <Text style={[styles.statValue, { fontSize: fs, flexShrink: 1 }, isAttack ? styles.attackText : styles.defenseText]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
                    {value}
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
    }, []);
    const mk = (sv: any, fx: number, fy: number, tx: number, sc: number) => useAnimatedStyle(() => ({
        opacity: interpolate(sv.value, [0, 0.2, 0.7, 1], [0, 0.55, 0.3, 0]),
        transform: [{ translateX: fx + (tx - fx) * sv.value }, { translateY: fy + (-60 * sv.value) }, { scale: interpolate(sv.value, [0, 1], [sc * 0.6, sc * 1.8]) }],
    }));
    const a1 = mk(s1, 30, 280, 10, 0.9), a2 = mk(s2, 160, 260, 185, 1.1), a3 = mk(s3, 90, 300, 70, 0.7);
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
    useEffect(() => { p.value = withRepeat(withTiming(1, { duration: 3500, easing: Easing.inOut(Easing.quad) }), -1, true); return () => cancelAnimation(p); }, []);
    const s = useAnimatedStyle(() => ({ opacity: interpolate(p.value, [0, 1], [0.3, 0.9]), transform: [{ scale: interpolate(p.value, [0, 1], [0.997, 1.007]) }] }));
    return <Animated.View style={[styles.specialBreathingBorder, s]} pointerEvents="none" />;
};
const GlowRing = ({ color }: { color: string }) => {
    const op = useSharedValue(0.4);
    useEffect(() => { op.value = withRepeat(withSequence(withTiming(1, { duration: 1800 }), withTiming(0.4, { duration: 1800 })), -1, false); return () => cancelAnimation(op); }, []);
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
const CardMedia = ({ cardImage, videoAsset, customUri, isCustomImage, imgStyle, playAudio }: {
    cardImage: ReturnType<typeof getCardImage>; videoAsset?: any; customUri?: string;
    isCustomImage: boolean; imgStyle: object; playAudio: boolean;
}) => {
    if (videoAsset) return <Video source={videoAsset} style={imgStyle as any} resizeMode={ResizeMode.COVER} shouldPlay isLooping isMuted={!playAudio} volume={1.0} useNativeControls={false} />;
    if (customUri && isVideoUri(customUri)) return <Video source={{ uri: customUri }} style={imgStyle as any} resizeMode={ResizeMode.COVER} shouldPlay isLooping isMuted={!playAudio} volume={1.0} useNativeControls={false} />;
    const uri: string | undefined = cardImage && typeof cardImage === 'object' && 'uri' in cardImage ? (cardImage as any).uri : undefined;
    const animated = uri ? isAnimatedUri(uri) : false;
    const source = animated ? { uri, headers: {} } : (cardImage as any);
    return <Image source={source} style={imgStyle as any} resizeMode={isCustomImage ? 'contain' : 'cover'} />;
};

// ─────────────────────────────────────────────
// ✨✨ MAIN EXPORT ✨✨
// ─────────────────────────────────────────────
export function LuxuryCharacterCardAnimated({
    card, style, imageOffsetY = 0, fitInsideBorder = false, isOpenedView = false,
    effectiveAttack, effectiveDefense, playAudio = false,
}: Props) {
    const rarity: CardRarity = card.rarity ?? 'common';
    const theme = RARITY_THEMES[rarity] ?? RARITY_THEMES.common;
    const hasAbility = !!card.specialAbility;
    const stars = card.stars ?? 0;

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

    const statFs = Math.max(11, 14 * sc);

    const statsBottom = Math.round(8 * scH);
    const STAT_AREA_H = Math.round(38 * scH);
    const ABILITY_H = hasAbility ? Math.round((rarity === 'legendary' || rarity === 'special' ? 50 : 42) * scH) : 0;
    const ABILITY_GAP = hasAbility ? Math.round(4 * scH) : 0;
    const abilityBottom = statsBottom + STAT_AREA_H + ABILITY_GAP;
    const nameBottom = abilityBottom + (hasAbility ? ABILITY_H + Math.round(4 * scH) : 0) + Math.round((stars > 0 ? 4 : 6) * scH);

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

    return (
        <Animated.View style={[
            styles.cardContainer,
            {
                width: cardW, height: cardH, borderRadius: Math.round(14 * sc), borderColor: themeBorder, borderWidth: theme.borderWidth,
                shadowColor: theme.shadowColor, shadowOpacity: theme.shadowOpacity, shadowRadius: theme.shadowRadius, elevation: theme.elevation
            },
            rarity === 'special' && styles.specialCardBase,
            style,
        ]}>
            {isLegendary && <LegendaryGlowBorder color={themeColor} />}
            {rarity === 'special' && <SpecialBreathingBorder />}
            {rarity === 'epic' && <GlowRing color={themeColor} />}

            <View style={[styles.cardInner, { borderRadius: Math.round(12 * sc) }]}>
                <LinearGradient colors={theme.bgColors} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
                {rarity === 'special' && <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.45)', zIndex: 1 }]} pointerEvents="none" />}
                {(hasImage || hasVideo) && <CardMedia cardImage={cardImage} videoAsset={videoAsset} customUri={customUri} isCustomImage={isCustomImage} imgStyle={imgStyle} playAudio={playAudio} />}

                <View style={styles.contentLayer}>
                    {theme.hasFoil && <RarityShimmer cardW={cardW} foilDuration={theme.foilDuration} color={themeColor} />}
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
                    {isLegendary && theme.hasParticles && <LegendaryParticles color={themeColor} />}
                    {theme.hasSideVines && <SideVines color={themeColor} />}
                    {(theme as any).hasDarkSmoke && <DarkSmokeEffect />}
                    {theme.hasFiligree && (
                        <>
                            <ElvenCorner position="tl" color={themeColor} rich={rarity === 'legendary' || rarity === 'special'} scale={sc} />
                            <ElvenCorner position="tr" color={themeColor} rich={rarity === 'legendary' || rarity === 'special'} scale={sc} />
                            {(rarity === 'legendary' || rarity === 'epic' || rarity === 'special') && (
                                <>
                                    <ElvenCorner position="bl" color={themeColor} rich={rarity === 'legendary' || rarity === 'special'} scale={sc} />
                                    <ElvenCorner position="br" color={themeColor} rich={rarity === 'legendary' || rarity === 'special'} scale={sc} />
                                </>
                            )}
                        </>
                    )}

                    {/* rarity badge */}
                    <View style={[styles.rarityBadge, { top: badgeTop, left: badgeLeft, paddingHorizontal: badgePadH, paddingVertical: badgePadV, borderRadius: Math.round(7 * sc), borderColor: themeColor + 'AA', backgroundColor: specialRarityBadgeBg }]}>
                        <Text style={[styles.rarityBadgeText, { color: themeColor, fontSize: badgeFontSize }]}>
                            {rarity === 'legendary' ? '✧ ' : rarity === 'special' ? '☠️ ' : '✦ '}{theme.label}{rarity === 'legendary' ? ' ✧' : rarity === 'special' ? ' ☠️' : ' ✦'}
                        </Text>
                    </View>

                    {/* name + stars */}
                    <View style={[styles.nameContainer, { bottom: nameBottom, paddingHorizontal: Math.max(4, 10 * scW) }]}>
                        {isLegendary && (
                            <View style={styles.legendaryNameBar}>
                                <LinearGradient colors={['transparent', 'rgba(255,215,0,0.18)', 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
                            </View>
                        )}
                        {rarity === 'special' && (
                            <View style={styles.legendaryNameBar}>
                                <LinearGradient colors={['transparent', 'rgba(192,192,192,0.12)', 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
                            </View>
                        )}
                        <Text style={[styles.cardName, { textShadowColor: themeColor, fontSize: nameFontSize }]} numberOfLines={1}>{card.nameAr || card.name}</Text>
                        {stars > 0 && <StarsRow count={stars} color={theme.starColor} emptyColor={theme.starEmpty} sc={sc} />}
                    </View>

                    {/* ability */}
                    {hasAbility && (
                        <View style={[styles.abilityContainer, { bottom: abilityBottom, left: Math.max(4, 8 * scW), right: Math.max(4, 8 * scW) }]}>
                            <AbilityBanner text={card.specialAbility!} rarity={rarity} theme={theme} sc={sc} />
                        </View>
                    )}

                    {/* Stats row: [ ⚔️ 18 ] [ icons ] [ 🛡️ 16 ] */}
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

    legendGlowOuter: { position: 'absolute', top: -8, left: -8, right: -8, bottom: -8, borderRadius: 22, borderWidth: 2.5, shadowOffset: { width: 0, height: 0 }, shadowRadius: 20, shadowColor: '#FFD700', zIndex: 20 },
    legendGlowInner: { position: 'absolute', top: -4, left: -4, right: -4, bottom: -4, borderRadius: 18, borderWidth: 1.5, shadowOffset: { width: 0, height: 0 }, shadowRadius: 10, shadowColor: '#FFD700', zIndex: 19 },
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

    particle: { position: 'absolute', width: 5, height: 5, borderRadius: 3 },
    smokeBlob: { position: 'absolute', zIndex: 3 },
    sideVinesWrapper: { position: 'absolute', top: '20%', left: 0, right: 0, bottom: '15%', zIndex: 3 },
    vineLeft: { position: 'absolute', left: 2 },
    vineRight: { position: 'absolute', right: 2 },
});
