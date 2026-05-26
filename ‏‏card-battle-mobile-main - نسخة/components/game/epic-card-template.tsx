/**
 * EpicCardTemplate — Elegant Premium Trading Card
 *
 * Architecture (bottom → top in z-order):
 *   1. Dark base fill (#0a0a0f)
 *   2. Full-bleed artwork (object-fit: cover)
 *   3. SVG gradient overlays (vignette, top shadow, bottom shadow)
 *   4. Thin elegant rarity-colored border (1px)
 *   5. Top-left sleek badge (stars + Arabic rarity label)
 *   6. Center typography block (Arabic subtitle, English title italic, description box)
 *   7. Bottom stat badges — Clean minimal pill style
 *   8. Selected checkmark overlay
 */

import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withSequence,
    withTiming,
    Easing,
} from 'react-native-reanimated';
import Svg, {
    Defs,
    LinearGradient as SvgGrad,
    RadialGradient as SvgRadial,
    Stop,
    Rect,
} from 'react-native-svg';
import { Image } from 'expo-image';
import type { ImageSourcePropType } from 'react-native';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface EpicCardProps {
    imageSrc: ImageSourcePropType;
    nameAr: string;
    nameEn: string;
    hp?: number;
    attack: number;
    defense?: number;
    rarity?: 'common' | 'rare' | 'epic' | 'legendary';
    element?: string;
    emoji?: string;
    scale?: number;
    style?: ViewStyle;
    selected?: boolean;
}

// ─── Rarity config ────────────────────────────────────────────────────────────

const RARITY = {
    common: { stars: 1, color: '#9CA3AF', glow: '#888', label: 'عادي', borderColor: '#9CA3AF' },
    rare: { stars: 2, color: '#60A5FA', glow: '#60A5FA', label: 'نادر', borderColor: '#3B82F6' },
    epic: { stars: 3, color: '#C084FC', glow: '#C084FC', label: 'ملحمي', borderColor: '#A855F7' },
    legendary: { stars: 4, color: '#FFD700', glow: '#FCD34D', label: 'أسطوري', borderColor: '#FFD700' },
} as const;

function starsString(count: number): string {
    return Array.from({ length: count }, () => '★').join('');
}

// ─── SVG Overlay ──────────────────────────────────────────────────────────────

function CardOverlay({ w, h }: { w: number; h: number }) {
    const r = 14;
    return (
        <Svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={StyleSheet.absoluteFill as any}>
            <Defs>
                <SvgRadial id="co_vign" cx="50%" cy="45%" r="70%" fx="50%" fy="45%">
                    <Stop offset="40%" stopColor="#000" stopOpacity="0" />
                    <Stop offset="100%" stopColor="#000" stopOpacity="0.55" />
                </SvgRadial>
                <SvgGrad id="co_top" x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0" stopColor="#000" stopOpacity="0.6" />
                    <Stop offset="1" stopColor="#000" stopOpacity="0" />
                </SvgGrad>
                <SvgGrad id="co_bot" x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0" stopColor="#000" stopOpacity="0" />
                    <Stop offset="0.4" stopColor="#000" stopOpacity="0.5" />
                    <Stop offset="0.7" stopColor="#000" stopOpacity="0.78" />
                    <Stop offset="1" stopColor="#000" stopOpacity="0.95" />
                </SvgGrad>
            </Defs>
            <Rect x={0} y={0} width={w} height={h} rx={r} ry={r} fill="url(#co_vign)" />
            <Rect x={0} y={0} width={w} height={h * 0.22} rx={r} ry={r} fill="url(#co_top)" />
            <Rect x={0} y={h * 0.42} width={w} height={h * 0.58} rx={r} ry={r} fill="url(#co_bot)" />
        </Svg>
    );
}

// ─── Clean Minimal Stat Badge ─────────────────────────────────────────────────

function StatBadge({
    value, icon, isAttack, scale,
}: {
    value: number;
    icon: string;
    isAttack: boolean;
    scale: number;
}) {
    const sz = Math.max(scale, 0.4);
    const fs = Math.round(13 * sz);
    return (
        <View
            style={[
                badgeStyles.badge,
                isAttack ? badgeStyles.attackBadge : badgeStyles.defenseBadge,
                {
                    position: 'absolute',
                    bottom: Math.round(12 * scale),
                    [isAttack ? 'left' : 'right']: Math.round(12 * scale),
                },
            ]}
        >
            <Text style={{ fontSize: fs }}>{icon}</Text>
            <Text style={[badgeStyles.val, { fontSize: fs }, isAttack ? badgeStyles.attackText : badgeStyles.defenseText]}>
                {value}
            </Text>
        </View>
    );
}

const badgeStyles = StyleSheet.create({
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 20,
        gap: 4,
        zIndex: 20,
    },
    attackBadge: {
        backgroundColor: 'rgba(20, 12, 0, 0.88)',
        borderWidth: 1.5,
        borderColor: '#B8860B',
    },
    defenseBadge: {
        backgroundColor: 'rgba(0, 10, 28, 0.88)',
        borderWidth: 1.5,
        borderColor: '#2563EB',
    },
    val: {
        fontWeight: '800',
        textShadowColor: 'rgba(0,0,0,0.9)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
    },
    attackText: { color: '#FFB830' },
    defenseText: { color: '#60A5FA' },
});

// ─── Main component ───────────────────────────────────────────────────────────

export function EpicCardTemplate({
    imageSrc,
    nameAr,
    nameEn,
    hp,
    attack,
    defense,
    rarity = 'common',
    element = 'fire',
    emoji,
    scale = 1,
    style,
    selected = false,
}: EpicCardProps) {
    const rCfg = RARITY[rarity] ?? RARITY.common;
    const stars = starsString(rCfg.stars);
    const sz = Math.max(scale, 0.4);
    const W = Math.round(350 * scale);
    const H = Math.round(480 * scale);

    const glowAlpha = useSharedValue(0.3);
    React.useEffect(() => {
        const peak = rarity === 'legendary' ? 0.85
            : rarity === 'epic' ? 0.7
                : rarity === 'rare' ? 0.55
                    : 0.35;
        const base = peak * 0.5;
        glowAlpha.value = withRepeat(
            withSequence(
                withTiming(peak, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
                withTiming(base, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
            ),
            -1,
            true,
        );
    }, [rarity]);

    const glowStyle = useAnimatedStyle(() => ({
        shadowOpacity: glowAlpha.value,
    }));

    return (
        <Animated.View
            style={[
                {
                    width: W, height: H,
                    shadowColor: rCfg.glow,
                    shadowOffset: { width: 0, height: 0 },
                    shadowRadius: rarity === 'legendary' ? 24 : 14,
                    elevation: 12,
                },
                glowStyle,
                style,
            ]}
        >
            <View
                style={[
                    s.shell,
                    {
                        borderColor: selected ? rCfg.color : rCfg.borderColor,
                        borderWidth: selected ? 2 : 1,
                    },
                ]}
            >
                <Image
                    source={imageSrc}
                    style={s.art}
                    contentFit="cover"
                    contentPosition="top"
                    cachePolicy="memory-disk"
                    transition={200}
                />

                <CardOverlay w={W} h={H} />

                {/* Top-left badge */}
                <View
                    style={[
                        s.badge,
                        {
                            borderColor: rCfg.borderColor,
                            paddingVertical: Math.round(4 * sz),
                            paddingHorizontal: Math.round(12 * sz),
                        },
                    ]}
                >
                    <Text style={[s.badgeText, { fontSize: Math.round(10 * sz), color: rCfg.color }]} numberOfLines={1}>
                        {stars} {rCfg.label}
                    </Text>
                </View>

                {/* Center typography */}
                <View style={[s.centerBlock, { bottom: Math.round(70 * scale) }]}>
                    <Text
                        style={[s.arabicName, { fontSize: Math.round(12 * sz), color: rCfg.color }]}
                        numberOfLines={1}
                        adjustsFontSizeToFit
                        minimumFontScale={0.7}
                    >
                        {nameAr}
                    </Text>
                    <Text
                        style={[s.englishTitle, { fontSize: Math.round(24 * sz) }]}
                        numberOfLines={1}
                        adjustsFontSizeToFit
                        minimumFontScale={0.5}
                    >
                        {nameEn}
                    </Text>
                    <View style={[s.descBox, { borderColor: rCfg.borderColor + '4D' }]}>
                        <Text style={[s.descText, { fontSize: Math.round(10 * sz), lineHeight: Math.round(16 * sz) }]}>
                            {emoji ? `${emoji} ` : ''}بطاقة {nameAr} — قوة الهجوم {attack} ⚔️ ، الدفاع {defense ?? 0} 🛡️
                        </Text>
                    </View>
                </View>

                {/* Clean Minimal Stat Badges */}
                <StatBadge value={attack} icon="⚔️" isAttack={true} scale={scale} />
                <StatBadge value={defense ?? 0} icon="🛡️" isAttack={false} scale={scale} />

                {selected && (
                    <View style={s.selectedOverlay}>
                        <Text style={[s.checkmark, { fontSize: Math.round(32 * sz) }]}>✓</Text>
                    </View>
                )}
            </View>
        </Animated.View>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
    shell: { flex: 1, borderRadius: 14, overflow: 'hidden', position: 'relative', backgroundColor: '#0a0a0f' },
    art: { ...StyleSheet.absoluteFillObject },
    badge: {
        position: 'absolute', top: 0, left: 0, zIndex: 15,
        backgroundColor: 'rgba(20, 20, 20, 0.9)',
        borderBottomRightRadius: 10, borderWidth: 1,
        borderTopWidth: 0, borderLeftWidth: 0,
    },
    badgeText: { fontWeight: '700', letterSpacing: 1 },
    centerBlock: {
        position: 'absolute', left: 0, right: 0,
        alignItems: 'center', zIndex: 10, paddingHorizontal: 12,
    },
    arabicName: {
        fontWeight: '700', textAlign: 'center', letterSpacing: 0.5, marginBottom: 2,
        textShadowColor: 'rgba(0,0,0,0.8)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 4,
    },
    englishTitle: {
        color: '#FFFFFF', fontWeight: '800', fontStyle: 'italic',
        textAlign: 'center', letterSpacing: 0.3,
        textShadowColor: 'rgba(0,0,0,0.8)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 4, marginBottom: 8,
    },
    descBox: {
        backgroundColor: 'rgba(15, 15, 15, 0.75)',
        borderRadius: 6, borderWidth: 1, padding: 10,
        alignSelf: 'center', width: '90%',
    },
    descText: { color: '#e0e0e0', textAlign: 'center', fontWeight: '500' },
    selectedOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(255,215,0,0.12)',
        alignItems: 'center', justifyContent: 'center', zIndex: 25,
    },
    checkmark: {
        color: '#FFD700', fontWeight: '900',
        textShadowColor: '#000',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 6,
    },
});

export default EpicCardTemplate;
