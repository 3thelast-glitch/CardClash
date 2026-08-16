import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, Image, TouchableOpacity, ScrollView,
} from 'react-native';
import { ThemedText } from '@/components/ui/ThemedText';
import { LinearGradient } from 'expo-linear-gradient';
import * as LucideIcons from 'lucide-react-native';
import Animated, {
    useSharedValue, useAnimatedStyle,
    withRepeat, withSequence, withTiming, Easing,
} from 'react-native-reanimated';

export interface AbilityData {
    id: string | number;
    nameEn: string;
    nameAr: string;
    description: string;
    descriptionWarning?: string;
    icon: any;
    rarity: string;
    imageUrl?: string;
    isActive?: boolean;
}

interface Props {
    ability: AbilityData;
    showActionButtons?: boolean;
    onToggleDisabled?: (nowDisabled: boolean) => void;
    style?: any;
}

const CARD_W = 220;
const CARD_H = 330;

// ─── Art map ─────────────────────────────────────────────────────────────────
export const ABILITY_IMAGES: Record<string, any> = {
    'default': require('../../assets/abilities/Add_Element_Art.png'),
    'Add_Element_Art': require('../../assets/abilities/Add_Element_Art.png'),
    'Arise_Art': require('../../assets/abilities/Arise_Art.png'),
    'Avatar_Art': require('../../assets/abilities/Avatar_Art.png'),
    'Cancel_Ability_Art': require('../../assets/abilities/Cancel_Ability_Art.png'),
    'Compensation_Art': require('../../assets/abilities/Compensation_Art.png'),
    'Consecutive_Loss_Buff_Art': require('../../assets/abilities/Consecutive_Loss_Buff_Art.png'),
    'Conversion_Art': require('../../assets/abilities/Conversion_Art.png'),
    'Convert_Debuffs_Art': require('../../assets/abilities/Convert_Debuffs_Art.png'),
    'Deprivation_(Ability)_Art': require('../../assets/abilities/Deprivation_(Ability)_Art.png'),
    'Dilemma_Art': require('../../assets/abilities/Dilemma_Art.png'),
    'Disaster_Art': require('../../assets/abilities/Disaster_Art.png'),
    'Double_Or_Nothing_Art': require('../../assets/abilities/Double Or Nothing_Art.png'),
    'Double_Points_Art': require('../../assets/abilities/Double Points_Art.png'),
    'Double_Your_Buffs_Art': require('../../assets/abilities/Double Your Buffs_Art.png'),
    'Double_Next_Cards_Art': require('../../assets/abilities/Double_Next_Cards_Art.png'),
    'Eclipse_Art': require('../../assets/abilities/Eclipse_Art.png'),
    'Elemental_Mastery_Art': require('../../assets/abilities/Elemental Mastery_Art.png'),
    'Explosion_Art': require('../../assets/abilities/Explosion_Art.png'),
    'Greed_Art': require('../../assets/abilities/Greed_Art.png'),
    'Halve_Points_Art': require('../../assets/abilities/Halve_Points_Art.png.png'),
    'LOGICAL_ENCOUNTER_Art': require('../../assets/abilities/LOGICAL ENCOUNTER_Art.png'),
    'Lifesteal_Art': require('../../assets/abilities/Lifesteal_Art.png'),
    'Merge_Art': require('../../assets/abilities/Merge_Art.png'),
    'Misdirection_Art': require('../../assets/abilities/Misdirection_Art.png'),
    'Penetration_Art': require('../../assets/abilities/Penetration_Art.png'),
    'Pool_Art': require('../../assets/abilities/Pool_Art.png'),
    'Propaganda_Art': require('../../assets/abilities/Propaganda_Art.png'),
    'Protection_Art': require('../../assets/abilities/Protection_Art.png'),
    'Purge_Art': require('../../assets/abilities/Purge_Art.png'),
    'Recall_Art': require('../../assets/abilities/Recall_Art.png'),
    'Reduction_Art': require('../../assets/abilities/Reduction_Art.png'),
    'Reinforcement_Art': require('../../assets/abilities/Reinforcement_Art.png'),
    'Rescue_Art': require('../../assets/abilities/Rescue_Art.png'),
    'Revenge_Art': require('../../assets/abilities/Revenge_Art.png'),
    'Revive_Art': require('../../assets/abilities/Revive_Art.png'),
    'Sacrifice_Art': require('../../assets/abilities/Sacrifice_Art.png'),
    'Seal_Art': require('../../assets/abilities/Seal_Art.png'),
    'Shield_Art': require('../../assets/abilities/Shield_Art.png'),
    'Skip_Art': require('../../assets/abilities/Skip_Art.png'),
    'Sniping_Art': require('../../assets/abilities/Sniping_Art.png'),
    'Star_Superiority_Art': require('../../assets/abilities/Star Superiority_Art.png'),
    'Steal_Ability_Art': require('../../assets/abilities/Steal Ability_Art.png'),
    'Subhan_Art': require('../../assets/abilities/Subhan_Art.png'),
    'Suicide_Art': require('../../assets/abilities/Suicide_Art.png'),
    'Take_It_Art': require('../../assets/abilities/Take It_Art.png'),
    'Trap_Art': require('../../assets/abilities/Trap_Art.png'),
    'Weakening_Art': require('../../assets/abilities/Weakening_Art.png'),
    'Wipe_Art': require('../../assets/abilities/Wipe_Art.png'),
};

// ─── Rarity config ─────────────────────────────────────────────────────────────────
const RARITY_THEMES: Record<string, {
    primary: string; glow: string; border: string; badgeBg: string; label: string;
    borderWidth: number; artOpacity: number;
    stars: number; cornerOrnament: boolean; shimmer: boolean; titleSize: number;
}> = {
    Common:    { primary: '#10b981', glow: '#10b981', border: 'rgba(16,185,129,0.40)',  badgeBg: 'rgba(16,185,129,0.18)',  label: 'COMMON',    borderWidth: 1,   artOpacity: 0.18, stars: 1, cornerOrnament: false, shimmer: false, titleSize: 15 },
    Rare:      { primary: '#3b82f6', glow: '#60a5fa', border: 'rgba(59,130,246,0.55)',  badgeBg: 'rgba(59,130,246,0.22)',  label: 'RARE',      borderWidth: 1.5, artOpacity: 0.12, stars: 2, cornerOrnament: false, shimmer: false, titleSize: 16 },
    Epic:      { primary: '#a855f7', glow: '#c084fc', border: 'rgba(168,85,247,0.65)', badgeBg: 'rgba(168,85,247,0.25)', label: 'EPIC',      borderWidth: 2,   artOpacity: 0.06, stars: 3, cornerOrnament: true,  shimmer: false, titleSize: 17 },
    Legendary: { primary: '#f59e0b', glow: '#fcd34d', border: 'rgba(245,158,11,0.80)', badgeBg: 'rgba(245,158,11,0.28)', label: 'LEGENDARY', borderWidth: 2.5, artOpacity: 0.0,  stars: 4, cornerOrnament: true,  shimmer: true,  titleSize: 18 },
    Special:   { primary: '#e879f9', glow: '#f0abfc', border: 'rgba(232,121,249,0.70)', badgeBg: 'rgba(232,121,249,0.20)', label: 'SPECIAL',  borderWidth: 2.5, artOpacity: 0.0,  stars: 4, cornerOrnament: true,  shimmer: true,  titleSize: 18 },
};

// ─── لون الهالة الخارجية — دائماً أسود ───
const BLACK_GLOW       = '#000000';
const BLACK_GLOW_RADIUS = 28;
const BLACK_GLOW_PEAK   = 0.85;

function CornerOrnament({ color, size = 8 }: { color: string; size?: number }) {
    return <View style={[styles.cornerDiamond, { borderColor: color + 'BB', width: size, height: size }]} />;
}

function StarRow({ count, color, size = 8 }: { count: number; color: string; size?: number }) {
    return (
        <View style={styles.starRow}>
            {Array.from({ length: 4 }).map((_, i) => (
                <Text key={i} style={[styles.star, { color: i < count ? color : color + '30', fontSize: size }]}>★</Text>
            ))}
        </View>
    );
}

function ShimmerSweep({ color, cardWidth }: { color: string; cardWidth: number }) {
    const translateX = useSharedValue(-cardWidth);
    useEffect(() => {
        translateX.value = withRepeat(
            withSequence(
                withTiming(cardWidth * 1.5, { duration: 1600, easing: Easing.inOut(Easing.quad) }),
                withTiming(-cardWidth, { duration: 0 }),
            ), -1,
        );
    }, [cardWidth, translateX]);
    const style = useAnimatedStyle(() => ({ transform: [{ translateX: translateX.value }] }));
    return (
        <Animated.View style={[StyleSheet.absoluteFill, style, { overflow: 'hidden', zIndex: 8 }]}>
            <View style={[styles.shimmerStreak, { shadowColor: color, borderRightColor: color + '60', borderLeftColor: color + '60' }]} />
        </Animated.View>
    );
}

// ─── Main Component ─────────────────────────────────────────────────────────────────
export function AbilityCard({ ability, showActionButtons = true, onToggleDisabled, style }: Props) {
    const IconComponent = ability.icon;
    const [localRarity, setLocalRarity] = useState(ability.rarity);
    const [isDisabled, setIsDisabled] = useState(ability.isActive === false);

    useEffect(() => {
        setIsDisabled(ability.isActive === false);
    }, [ability.isActive]);

    const theme = RARITY_THEMES[localRarity] ?? RARITY_THEMES.Common;
    const isLegendaryOrSpecial = localRarity === 'Legendary' || localRarity === 'Special';

    const cycleRarity = () => {
        const rarities = ['Common', 'Rare', 'Epic', 'Legendary', 'Special'];
        setLocalRarity(rarities[(rarities.indexOf(localRarity) + 1) % rarities.length]);
    };

    const handleTogglePower = () => {
        const next = !isDisabled;
        setIsDisabled(next);
        onToggleDisabled?.(next);
    };

    const formattedName = ability.nameEn.replaceAll(' ', '_') + '_Art';
    if (!ABILITY_IMAGES[formattedName]) {
        console.warn(`[Missing Art] "${ability.nameEn}" → key: "${formattedName}"`);
    }
    const imageSource = ABILITY_IMAGES[formattedName] || ABILITY_IMAGES['default'];

    // ─── الهالة الخارجية — أسود نبض ثابت ───
    const glowOpacity = useSharedValue(BLACK_GLOW_PEAK * 0.5);
    useEffect(() => {
        const peak = BLACK_GLOW_PEAK;
        const base = peak * 0.4;
        glowOpacity.value = withRepeat(
            withSequence(
                withTiming(peak, { duration: 1600, easing: Easing.inOut(Easing.sin) }),
                withTiming(base, { duration: 1600, easing: Easing.inOut(Easing.sin) }),
            ), -1, true,
        );
    }, [localRarity, glowOpacity]);

    const animatedGlow = useAnimatedStyle(() => ({ shadowOpacity: glowOpacity.value }));

    const warningText = (ability as any).descriptionWarning as string | undefined;

    // Viewport-aware responsive calculation
    const flattenedStyle = StyleSheet.flatten(style) || {};
    const actualWidth = (flattenedStyle.width as number) || CARD_W;
    const actualHeight = (flattenedStyle.height as number) || CARD_H;
    const scaleFactor = Math.min(1, actualHeight / CARD_H);

    // Responsive styling properties
    const bottomBarHeight = Math.max(24, Math.round(38 * scaleFactor));
    const iconCircleSize = Math.max(16, Math.round(22 * scaleFactor));
    const iconSize = Math.max(8, Math.round(12 * scaleFactor));
    const nameEnSize = Math.max(7, Math.round(10 * scaleFactor));
    const nameArSize = Math.max(10, Math.round(Math.min(theme.titleSize + 1, 16) * scaleFactor));
    const dividerMargin = Math.max(2, Math.round(6 * scaleFactor));
    const descSize = Math.max(8, Math.round(9.5 * scaleFactor));
    const descLineHeight = Math.round(descSize * 1.35);
    const warningSize = Math.max(7, Math.round(8.5 * scaleFactor));
    const warningLineHeight = Math.round(warningSize * 1.35);
    const starSize = Math.max(5, Math.round(8 * scaleFactor));
    const bottomRarityLabelSize = Math.max(6, Math.round(8 * scaleFactor));
    const infoPaddingV = Math.max(2, Math.round(8 * scaleFactor));
    const infoPaddingH = Math.max(4, Math.round(12 * scaleFactor));
    const rarityTextSize = Math.max(5.5, Math.round(7 * scaleFactor));
    const rarityBadgePaddingV = Math.max(1.5, Math.round(2 * scaleFactor));
    const rarityBadgePaddingH = Math.max(3.5, Math.round(6 * scaleFactor));
    const rarityBadgeRadius = Math.max(4, Math.round(8 * scaleFactor));
    const cornerDiamondSize = Math.max(5, Math.round(8 * scaleFactor));
    const cornerPos = Math.max(4, Math.round(8 * scaleFactor));
    const badgeDevTop = Math.max(6, Math.round(10 * scaleFactor));
    const devBtnSize = Math.max(16, Math.round(22 * scaleFactor));

    // Dynamic section flex ratios
    const artworkFlex = actualHeight < 200 ? 0.8 : 1.1;
    const infoFlex = actualHeight < 200 ? 1.2 : 1;

    return (
        <Animated.View
            style={[
                styles.outerShell,
                {
                    shadowColor:  BLACK_GLOW,
                    shadowRadius: BLACK_GLOW_RADIUS,
                    shadowOffset: { width: 0, height: Math.max(2, Math.round(6 * scaleFactor)) },
                    width: actualWidth,
                    height: actualHeight,
                },
                animatedGlow,
                isDisabled && { opacity: 0.45 },
                style,
            ]}
        >
            <View style={[
                styles.cardContainer,
                { borderColor: theme.border, borderWidth: theme.borderWidth },
            ]}>
                {/* Section 1: Artwork (Top portion) */}
                <View style={[styles.artworkSection, { flex: artworkFlex }]}>
                    <Image
                        source={imageSource}
                        style={[StyleSheet.absoluteFillObject, styles.artworkImage]}
                        resizeMode="contain"
                        accessibilityLabel={`${ability.nameAr} artwork`}
                    />
                    <View style={[StyleSheet.absoluteFillObject, styles.blackOverlay]} />
                    <LinearGradient
                        pointerEvents="none"
                        colors={['rgba(4,8,18,0.08)', 'rgba(4,8,18,0.02)', 'rgba(4,8,18,0.82)']}
                        locations={[0, 0.48, 1]}
                        style={StyleSheet.absoluteFillObject}
                    />
                    {isLegendaryOrSpecial && <View style={[
                        styles.legendaryEdgeGlow,
                        { borderColor: theme.primary + '44' },
                    ]} />}

                    {/* Shimmer sweep */}
                    {theme.shimmer && <ShimmerSweep color={theme.primary} cardWidth={actualWidth} />}

                    {/* Rarity badge */}
                    <View style={[
                        styles.rarityBadge,
                        {
                            backgroundColor: theme.badgeBg,
                            borderColor: theme.border,
                            paddingVertical: rarityBadgePaddingV,
                            paddingHorizontal: rarityBadgePaddingH,
                            borderRadius: rarityBadgeRadius,
                            top: badgeDevTop,
                            right: badgeDevTop,
                        }
                    ]}>
                        <Text style={[styles.rarityText, { color: theme.primary, fontSize: rarityTextSize }]}>{theme.label}</Text>
                    </View>

                    {/* Dev / Production controls */}
                    {showActionButtons && (
                        <View style={[styles.devControls, { top: badgeDevTop, left: badgeDevTop }]}>
                            <TouchableOpacity
                                onPress={handleTogglePower}
                                style={[
                                    styles.devBtn,
                                    { width: devBtnSize, height: devBtnSize, borderRadius: devBtnSize / 2 },
                                    isDisabled && { backgroundColor: 'rgba(239,68,68,0.25)', borderColor: 'rgba(239,68,68,0.5)' }
                                ]}
                            >
                                <LucideIcons.Power size={iconSize - 2} color={isDisabled ? '#ef4444' : '#fff'} />
                            </TouchableOpacity>
                            {__DEV__ && (
                                <TouchableOpacity
                                    onPress={cycleRarity}
                                    style={[styles.devBtn, { width: devBtnSize, height: devBtnSize, borderRadius: devBtnSize / 2 }]}
                                >
                                    <LucideIcons.RefreshCw size={iconSize - 2} color="#38bdf8" />
                                </TouchableOpacity>
                            )}
                        </View>
                    )}
                </View>

                {/* Section 2: Info Panel (Middle portion) */}
                <View style={[
                    styles.infoSection,
                    {
                        borderColor: theme.primary + '15',
                        paddingVertical: infoPaddingV,
                        paddingHorizontal: infoPaddingH,
                        flex: infoFlex,
                    }
                ]}>
                    <Text style={[styles.nameEn, { fontSize: nameEnSize }]} numberOfLines={1}>{ability.nameEn}</Text>
                    <View style={[styles.namePlate, { borderColor: theme.primary + '35', backgroundColor: theme.primary + '0D' }]}>
                        <Text style={[styles.nameAr, { textShadowColor: theme.glow, fontSize: nameArSize }]} numberOfLines={1}>
                            {ability.nameAr}
                        </Text>
                    </View>
                    <View style={[styles.divider, { backgroundColor: theme.primary + '66', marginVertical: dividerMargin }]} />
                    
                    <ScrollView 
                        style={styles.descriptionScroll} 
                        contentContainerStyle={styles.descriptionScrollContent}
                        nestedScrollEnabled
                    >
                        <Text style={[styles.description, { fontSize: descSize, lineHeight: descLineHeight }]}>
                            {ability.description}
                        </Text>
                        {warningText ? (
                            <Text style={[styles.descriptionWarning, { fontSize: warningSize, lineHeight: warningLineHeight }]}>
                                {warningText}
                            </Text>
                        ) : null}
                    </ScrollView>
                </View>

                {/* Section 3: Bottom Bar (Bottom portion) */}
                <View style={[styles.bottomBar, { borderTopColor: theme.border, height: bottomBarHeight }]}>
                    <View style={[
                        styles.iconCircle,
                        {
                            backgroundColor: theme.primary + '33',
                            borderColor: theme.primary + '88',
                            width: iconCircleSize,
                            height: iconCircleSize,
                            borderRadius: iconCircleSize / 2,
                        }
                    ]}>
                        {IconComponent ? <IconComponent size={iconSize} color={theme.primary} strokeWidth={2} /> : null}
                    </View>
                    <StarRow count={theme.stars} color={theme.primary} size={starSize} />
                    <Text style={[styles.bottomRarityLabel, { color: theme.primary + 'CC', fontSize: bottomRarityLabelSize }]}>{localRarity}</Text>
                </View>

                {/* Corner ornaments */}
                {theme.cornerOrnament && (
                    <>
                        <View style={{ position: 'absolute', top: cornerPos, left: cornerPos, zIndex: 18 }}>
                            <CornerOrnament color={theme.primary} size={cornerDiamondSize} />
                        </View>
                        <View style={{ position: 'absolute', top: cornerPos, right: cornerPos, zIndex: 18 }}>
                            <CornerOrnament color={theme.primary} size={cornerDiamondSize} />
                        </View>
                        <View style={{ position: 'absolute', bottom: bottomBarHeight + cornerPos - 2, left: cornerPos, zIndex: 18 }}>
                            <CornerOrnament color={theme.primary} size={cornerDiamondSize} />
                        </View>
                        <View style={{ position: 'absolute', bottom: bottomBarHeight + cornerPos - 2, right: cornerPos, zIndex: 18 }}>
                            <CornerOrnament color={theme.primary} size={cornerDiamondSize} />
                        </View>
                    </>
                )}

                {/* Disabled overlay */}
                {isDisabled && (
                    <View style={styles.disabledOverlay}>
                        <View style={[
                            styles.disabledStamp,
                            {
                                paddingHorizontal: Math.max(6, Math.round(12 * scaleFactor)),
                                paddingVertical: Math.max(2, Math.round(4 * scaleFactor)),
                            }
                        ]}>
                            <ThemedText style={[styles.disabledText, { fontSize: Math.max(6.5, Math.round(9 * scaleFactor)) }]}>DEACTIVATED</ThemedText>
                        </View>
                    </View>
                )}
            </View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    outerShell:        { width: CARD_W, height: CARD_H, shadowOffset: { width: 0, height: 6 }, elevation: 18 },
    cardContainer:     { flex: 1, borderRadius: 20, overflow: 'hidden', backgroundColor: '#090d16', flexDirection: 'column' },
    artworkSection:    { flex: 1.1, position: 'relative', overflow: 'hidden', backgroundColor: '#0b1324' },
    artworkImage:      { width: '100%', height: '100%', backgroundColor: '#0b1324' },
    blackOverlay:      { backgroundColor: 'rgba(0,0,0,0.22)' },
    legendaryEdgeGlow: { ...StyleSheet.absoluteFillObject, borderWidth: 1.5, borderRadius: 18, shadowColor: '#000', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.9, shadowRadius: 12, elevation: 5 },
    shimmerStreak:     { position: 'absolute', top: 0, bottom: 0, width: 28, backgroundColor: 'rgba(255,255,255,0.04)', borderLeftWidth: 1, borderRightWidth: 1, transform: [{ skewX: '-18deg' }] },
    
    cornerTL:          { position: 'absolute', top: 8,    left: 8,  zIndex: 18 },
    cornerTR:          { position: 'absolute', top: 8,    right: 8, zIndex: 18 },
    cornerBL:          { position: 'absolute', bottom: 44, left: 8,  zIndex: 18 },
    cornerBR:          { position: 'absolute', bottom: 44, right: 8, zIndex: 18 },
    cornerDiamond:     { width: 8, height: 8, borderWidth: 1.5, transform: [{ rotate: '45deg' }] },
    
    devControls:       { position: 'absolute', top: 10, left: 10, zIndex: 50, flexDirection: 'row', gap: 4 },
    devBtn:            { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.6)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
    
    disabledOverlay:   { ...StyleSheet.absoluteFillObject, zIndex: 40, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
    disabledStamp:     { backgroundColor: 'rgba(220,38,38,0.95)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 6, borderWidth: 1.5, borderColor: '#f87171', transform: [{ rotate: '-12deg' }] },
    disabledText:      { color: '#fff', fontWeight: '900', fontSize: 9, letterSpacing: 2, textTransform: 'uppercase' },
    
    rarityBadge:       { position: 'absolute', top: 10, right: 10, zIndex: 20, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, borderWidth: 1 },
    rarityText:        { fontSize: 7, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase' },
    
    infoSection:       { flex: 1, backgroundColor: 'rgba(5,10,22,0.97)', paddingVertical: 8, paddingHorizontal: 12, alignItems: 'center', borderTopWidth: 1 },
    nameEn:            { color: '#e2e8f0', fontSize: 10, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', textAlign: 'center', opacity: 0.9 },
    namePlate:         { minWidth: '72%', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 7, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
    nameAr:            { color: '#FFF4B8', fontWeight: '900', textAlign: 'center', marginTop: 1, textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 7, letterSpacing: 0.5, writingDirection: 'rtl' },
    divider:           { width: 24, height: 1, borderRadius: 0.5, marginVertical: 6 },
    
    descriptionScroll: { flex: 1, width: '100%' },
    descriptionScrollContent: { alignItems: 'center', paddingBottom: 4 },
    description:       { color: '#f1f5f9', fontSize: 9.5, fontWeight: '600', textAlign: 'center', lineHeight: 13, writingDirection: 'rtl', textAlignVertical: 'center' },
    descriptionWarning:{ color: '#fda4af', fontSize: 8.5, fontWeight: '700', textAlign: 'center', lineHeight: 12, marginTop: 4, writingDirection: 'rtl', textAlignVertical: 'center' },
    
    bottomBar:         { height: 38, flexDirection: 'row', alignItems: 'center', backgroundColor: '#060a12', borderTopWidth: 1, paddingHorizontal: 10, gap: 6 },
    iconCircle:        { width: 22, height: 22, borderRadius: 11, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
    starRow:           { flex: 1, flexDirection: 'row', gap: 1.5 },
    star:              { fontSize: 8 },
    bottomRarityLabel: { fontSize: 8, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' },
});
