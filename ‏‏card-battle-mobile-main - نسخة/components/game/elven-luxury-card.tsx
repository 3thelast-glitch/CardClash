/**
 * ElvenLuxuryCard v2
 * Premium card with SVG corner filigree, gemstone decorations,
 * clean minimal stat badges, and floating sparkles.
 */
import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withTiming,
    withSequence,
    withDelay,
    Easing,
} from 'react-native-reanimated';
import Svg, {
    Path,
    Circle,
    Defs,
    LinearGradient as SvgGradient,
    Stop,
    G,
    Rect,
} from 'react-native-svg';
import { Image } from 'expo-image';
import type { ImageSourcePropType } from 'react-native';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ElvenLuxuryCardProps {
    imageSrc: ImageSourcePropType;
    name: string;
    hp: number;
    atk: number;
    rarity?: 'common' | 'rare' | 'epic' | 'legendary';
    element?: string;
    emoji?: string;
    style?: ViewStyle;
}

// ─── Rarity Theme ─────────────────────────────────────────────────────────────

const RARITY_THEMES = {
    common: {
        border: '#6366f1', glow: '#4f46e5', gem: '#818cf8',
        gradient: ['#312e81', '#4f46e5'], label: 'C',
    },
    rare: {
        border: '#f59e0b', glow: '#d97706', gem: '#fbbf24',
        gradient: ['#78350f', '#f59e0b'], label: 'R',
    },
    epic: {
        border: '#8b5cf6', glow: '#7c3aed', gem: '#a78bfa',
        gradient: ['#4c1d95', '#8b5cf6'], label: 'E',
    },
    legendary: {
        border: '#ef4444', glow: '#dc2626', gem: '#f87171',
        gradient: ['#7f1d1d', '#ef4444'], label: 'L',
    },
};

// ─── SVG Sub-components ───────────────────────────────────────────────────────

function GemStone({ color, size = 8, cx, cy }: { color: string; size?: number; cx: number; cy: number }) {
    return (
        <G>
            <Circle cx={cx} cy={cy} r={size / 2 + 2} fill={color} opacity={0.3} />
            <Circle cx={cx} cy={cy} r={size / 2} fill={color} />
            <Circle cx={cx} cy={cy - 1} r={size / 4} fill="#fff" opacity={0.6} />
        </G>
    );
}

function LuxuryCorner({ color, size = 28 }: { color: string; size?: number }) {
    return (
        <Svg width={size} height={size} viewBox="0 0 28 28">
            <Defs>
                <SvgGradient id="cornerGrad" x1="0" y1="0" x2="1" y2="1">
                    <Stop offset="0" stopColor={color} stopOpacity="1" />
                    <Stop offset="1" stopColor="#D4AF37" stopOpacity="0.6" />
                </SvgGradient>
            </Defs>
            <Path
                d="M0,2 Q0,0 2,0 L12,0 Q14,0 14,2 L14,4 Q14,6 12,6 L6,6 Q4,6 4,8 L4,12 Q4,14 2,14 L0,14 Z"
                fill="url(#cornerGrad)"
            />
            <Path
                d="M2,0 L8,0 Q10,0 10,2 L10,3 Q10,5 8,5 L5,5 Q3,5 3,7 L3,8 Q3,10 1,10 L0,10 L0,2 Q0,0 2,0"
                fill={color} opacity={0.4}
            />
            <Circle cx={3} cy={3} r={1.5} fill="#D4AF37" opacity={0.8} />
        </Svg>
    );
}

function ElvenFrame({ color, width, height }: { color: string; width: number; height: number }) {
    return (
        <>
            <View style={[frameStyles.corner, { top: -1, left: -1 }]}><LuxuryCorner color={color} /></View>
            <View style={[frameStyles.corner, { top: -1, right: -1, transform: [{ scaleX: -1 }] }]}><LuxuryCorner color={color} /></View>
            <View style={[frameStyles.corner, { bottom: -1, left: -1, transform: [{ scaleY: -1 }] }]}><LuxuryCorner color={color} /></View>
            <View style={[frameStyles.corner, { bottom: -1, right: -1, transform: [{ scaleX: -1 }, { scaleY: -1 }] }]}><LuxuryCorner color={color} /></View>
            <View style={frameStyles.topGem}>
                <Svg width={20} height={12} viewBox="0 0 20 12">
                    <GemStone color={color} cx={10} cy={6} size={10} />
                </Svg>
            </View>
            <View style={frameStyles.bottomLine}>
                <Svg width={60} height={4} viewBox="0 0 60 4">
                    <Rect x={0} y={1.5} width={60} height={1} rx={0.5} fill={color} opacity={0.4} />
                    <Circle cx={30} cy={2} r={2} fill="#D4AF37" />
                    <Circle cx={15} cy={2} r={1} fill={color} opacity={0.5} />
                    <Circle cx={45} cy={2} r={1} fill={color} opacity={0.5} />
                </Svg>
            </View>
        </>
    );
}

const frameStyles = StyleSheet.create({
    corner: { position: 'absolute', zIndex: 10 },
    topGem: { position: 'absolute', top: -6, alignSelf: 'center', zIndex: 10 },
    bottomLine: { position: 'absolute', bottom: 4, alignSelf: 'center', zIndex: 10 },
});

// ─── Floating Sparkle ─────────────────────────────────────────────────────────

function FloatingSparkle({ x, y, delay: d, size = 3 }: { x: number; y: number; delay: number; size?: number }) {
    const translateY = useSharedValue(0);
    const opacity = useSharedValue(0.55);

    React.useEffect(() => {
        translateY.value = withDelay(d, withRepeat(
            withSequence(
                withTiming(-8, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
                withTiming(0, { duration: 1500, easing: Easing.inOut(Easing.ease) })
            ), -1, true
        ));
        opacity.value = withDelay(d, withRepeat(
            withSequence(
                withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
                withTiming(0.55, { duration: 1500, easing: Easing.inOut(Easing.ease) })
            ), -1, true
        ));
    }, []);

    const animStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: translateY.value }],
        opacity: opacity.value,
    }));

    return (
        <Animated.View
            style={[{
                position: 'absolute', left: x, top: y,
                width: size, height: size, borderRadius: size / 2,
                backgroundColor: '#D4AF37',
            }, animStyle]}
        />
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function ElvenLuxuryCard({
    imageSrc, name, hp, atk,
    rarity = 'common', element, emoji, style,
}: ElvenLuxuryCardProps) {
    const theme = RARITY_THEMES[rarity];

    const glowOpacity = useSharedValue(0.3);
    React.useEffect(() => {
        if (rarity === 'epic' || rarity === 'legendary') {
            glowOpacity.value = withRepeat(
                withSequence(
                    withTiming(1.0, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
                    withTiming(0.5, { duration: 1200, easing: Easing.inOut(Easing.ease) })
                ), -1, true
            );
        }
    }, [rarity]);

    const glowStyle = useAnimatedStyle(() => ({ shadowOpacity: glowOpacity.value }));

    return (
        <Animated.View
            style={[
                styles.outerWrapper,
                {
                    shadowColor: theme.glow,
                    shadowOffset: { width: 0, height: 4 },
                    shadowRadius: rarity === 'legendary' ? 32 : rarity === 'epic' ? 24 : 16,
                    elevation: 16,
                },
                glowStyle, style,
            ]}
        >
            <View style={[styles.card, { borderColor: theme.border, borderWidth: rarity === 'legendary' ? 2.5 : 2 }]}>
                <View style={styles.darkBase} />

                <Image
                    source={imageSrc}
                    style={styles.cardArt}
                    contentFit="cover"
                    cachePolicy="memory-disk"
                    transition={200}
                />

                <View style={styles.artOverlay} />

                <ElvenFrame color={theme.border} width={160} height={220} />

                <FloatingSparkle x={12} y={20} delay={0} size={2.5} />
                <FloatingSparkle x={130} y={35} delay={400} size={3} />
                <FloatingSparkle x={25} y={140} delay={800} size={2} />
                <FloatingSparkle x={120} y={160} delay={1200} size={2.5} />
                {rarity === 'legendary' && (
                    <>
                        <FloatingSparkle x={70} y={15} delay={600} size={3} />
                        <FloatingSparkle x={90} y={180} delay={1000} size={2} />
                    </>
                )}

                <View style={[styles.rarityBadge, { backgroundColor: theme.border }]}>
                    <Text style={styles.rarityText}>{theme.label}</Text>
                </View>

                {emoji && (
                    <View style={styles.elementBadge}>
                        <Text style={styles.elementEmoji}>{emoji}</Text>
                    </View>
                )}

                {/* Bottom bar with name + Clean Minimal Stat Badges */}
                <View style={styles.bottomBar}>
                    <Text style={styles.cardName} numberOfLines={1}>{name}</Text>
                    <View style={styles.statsRow}>
                        <View style={[styles.statBadge, styles.hpBadge]}>
                            <Text style={styles.statIcon}>❤️</Text>
                            <Text style={[styles.statValue, styles.hpText]}>{hp}</Text>
                        </View>
                        <View style={[styles.statBadge, styles.atkBadge]}>
                            <Text style={styles.statIcon}>⚔️</Text>
                            <Text style={[styles.statValue, styles.atkText]}>{atk}</Text>
                        </View>
                    </View>
                </View>
            </View>
        </Animated.View>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    outerWrapper: { width: '100%', height: '100%' },
    card: {
        flex: 1, borderRadius: 14, overflow: 'hidden',
        position: 'relative', alignItems: 'center',
    },
    darkBase: { ...StyleSheet.absoluteFillObject, backgroundColor: '#0a0a14' },
    cardArt: { ...StyleSheet.absoluteFillObject, opacity: 0.85 },
    artOverlay: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        height: '55%', backgroundColor: 'transparent', borderTopWidth: 0,
    },
    rarityBadge: {
        position: 'absolute', top: 6, left: 6,
        width: 20, height: 20, borderRadius: 10,
        alignItems: 'center', justifyContent: 'center', zIndex: 5,
    },
    rarityText: { fontSize: 9, fontWeight: '900', color: '#fff' },
    elementBadge: { position: 'absolute', top: 6, right: 6, zIndex: 5 },
    elementEmoji: { fontSize: 16 },
    bottomBar: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        backgroundColor: 'rgba(5, 5, 15, 0.85)',
        paddingTop: 6, paddingBottom: 10, paddingHorizontal: 8,
        alignItems: 'center',
        borderTopWidth: 1, borderTopColor: 'rgba(212, 175, 55, 0.2)',
    },
    cardName: {
        fontSize: 12, fontWeight: '800', color: '#f0e6d2',
        textAlign: 'center', marginBottom: 6,
        textShadowColor: 'rgba(0,0,0,0.8)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
    },
    statsRow: { flexDirection: 'row', justifyContent: 'center', gap: 10 },
    // Clean Minimal Stat Badges
    statBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 18,
        gap: 4,
    },
    hpBadge: {
        backgroundColor: 'rgba(28, 5, 5, 0.9)',
        borderWidth: 1.5,
        borderColor: '#b91c1c',
    },
    atkBadge: {
        backgroundColor: 'rgba(20, 12, 0, 0.9)',
        borderWidth: 1.5,
        borderColor: '#B8860B',
    },
    statIcon: { fontSize: 12 },
    statValue: { fontSize: 13, fontWeight: '800' },
    hpText: { color: '#fca5a5' },
    atkText: { color: '#FFB830' },
});

export default ElvenLuxuryCard;
