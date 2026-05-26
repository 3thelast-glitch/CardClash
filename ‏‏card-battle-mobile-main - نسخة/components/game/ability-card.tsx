import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, ImageBackground, TouchableOpacity,
} from 'react-native';
import { ThemedText } from '@/components/ui/ThemedText';
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

function CornerOrnament({ color }: { color: string }) {
    return <View style={[styles.cornerDiamond, { borderColor: color + 'BB' }]} />;
}

function StarRow({ count, color }: { count: number; color: string }) {
    return (
        <View style={styles.starRow}>
            {Array.from({ length: 4 }).map((_, i) => (
                <Text key={i} style={[styles.star, { color: i < count ? color : color + '30' }]}>★</Text>
            ))}
        </View>
    );
}

function ShimmerSweep({ color }: { color: string }) {
    const translateX = useSharedValue(-CARD_W);
    useEffect(() => {
        translateX.value = withRepeat(
            withSequence(
                withTiming(CARD_W * 1.5, { duration: 1600, easing: Easing.inOut(Easing.quad) }),
                withTiming(-CARD_W, { duration: 0 }),
            ), -1,
        );
    }, []);
    const style = useAnimatedStyle(() => ({ transform: [{ translateX: translateX.value }] }));
    return (
        <Animated.View style={[StyleSheet.absoluteFill, style, { overflow: 'hidden', zIndex: 8 }]}>
            <View style={[styles.shimmerStreak, { shadowColor: color, borderRightColor: color + '60', borderLeftColor: color + '60' }]} />
        </Animated.View>
    );
}

// ─── Main Component ─────────────────────────────────────────────────────────────────
export function AbilityCard({ ability, showActionButtons = true, onToggleDisabled }: Props) {
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
                withTiming(peak, { duration: isLegendaryOrSpecial ? 1100 : 1800, easing: Easing.inOut(Easing.sin) }),
                withTiming(base, { duration: isLegendaryOrSpecial ? 1100 : 1800, easing: Easing.inOut(Easing.sin) }),
            ), -1, true,
        );
    }, [localRarity]);

    const animatedGlow = useAnimatedStyle(() => ({ shadowOpacity: glowOpacity.value }));

    const warningText = (ability as any).descriptionWarning as string | undefined;

    return (
        <Animated.View
            style={[
                styles.outerShell,
                {
                    shadowColor:  BLACK_GLOW,
                    shadowRadius: BLACK_GLOW_RADIUS,
                    shadowOffset: { width: 0, height: 6 },
                },
                animatedGlow,
                isDisabled && { opacity: 0.45 },
            ]}
        >
            <View style={[
                styles.cardContainer,
                { borderColor: theme.border, borderWidth: theme.borderWidth },
            ]}>
                {/* 1. Artwork */}
                <ImageBackground source={imageSource} style={StyleSheet.absoluteFill} imageStyle={styles.artImage} resizeMode="cover">
                    <View style={[StyleSheet.absoluteFill, styles.blackOverlay]} />
                    {isLegendaryOrSpecial && <View style={[
                        styles.legendaryEdgeGlow,
                        { borderColor: theme.primary + '44' },
                    ]} />}
                </ImageBackground>

                {/* 2. Shimmer */}
                {theme.shimmer && <ShimmerSweep color={theme.primary} />}

                {/* 3. Corner ornaments */}
                {theme.cornerOrnament && (
                    <>
                        <View style={styles.cornerTL}><CornerOrnament color={theme.primary} /></View>
                        <View style={styles.cornerTR}><CornerOrnament color={theme.primary} /></View>
                        <View style={styles.cornerBL}><CornerOrnament color={theme.primary} /></View>
                        <View style={styles.cornerBR}><CornerOrnament color={theme.primary} /></View>
                    </>
                )}

                {/* 4. Dev / Production controls */}
                {showActionButtons && __DEV__ && (
                    <View style={styles.devControls}>
                        <TouchableOpacity
                            onPress={handleTogglePower}
                            style={[styles.devBtn, isDisabled && { backgroundColor: 'rgba(239,68,68,0.25)', borderColor: 'rgba(239,68,68,0.5)' }]}
                        >
                            <LucideIcons.Power size={10} color={isDisabled ? '#ef4444' : '#fff'} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={cycleRarity} style={styles.devBtn}>
                            <LucideIcons.RefreshCw size={10} color="#38bdf8" />
                        </TouchableOpacity>
                    </View>
                )}
                {showActionButtons && !__DEV__ && (
                    <View style={styles.devControls}>
                        <TouchableOpacity
                            onPress={handleTogglePower}
                            style={[styles.devBtn, isDisabled && { backgroundColor: 'rgba(239,68,68,0.25)', borderColor: 'rgba(239,68,68,0.5)' }]}
                        >
                            <LucideIcons.Power size={10} color={isDisabled ? '#ef4444' : '#fff'} />
                        </TouchableOpacity>
                    </View>
                )}

                {/* 5. Disabled overlay */}
                {isDisabled && (
                    <View style={styles.disabledOverlay}>
                        <View style={styles.disabledStamp}>
                            <ThemedText style={styles.disabledText}>DEACTIVATED</ThemedText>
                        </View>
                    </View>
                )}

                {/* 6. Rarity badge */}
                <View style={[styles.rarityBadge, { backgroundColor: theme.badgeBg, borderColor: theme.border }]}>
                    <Text style={[styles.rarityText, { color: theme.primary }]}>{theme.label}</Text>
                </View>

                {/* 7. Title panel */}
                <View style={styles.titlePanel}>
                    <View style={[styles.titlePanelInner, { borderColor: theme.primary + '22' }]}>
                        <Text style={styles.nameEn} numberOfLines={1}>{ability.nameEn}</Text>
                        <Text style={[styles.nameAr, { textShadowColor: theme.glow, fontSize: theme.titleSize }]} numberOfLines={1}>
                            {ability.nameAr}
                        </Text>
                        <View style={[styles.divider, { backgroundColor: theme.primary + '66' }]} />
                        <Text style={styles.description} numberOfLines={3}>{ability.description}</Text>
                        {warningText ? (
                            <Text style={styles.descriptionWarning} numberOfLines={3}>{warningText}</Text>
                        ) : null}
                    </View>
                </View>

                {/* 8. Bottom bar */}
                <View style={[styles.bottomBar, { borderTopColor: theme.border }]}>
                    <View style={[styles.iconCircle, { backgroundColor: theme.primary + '33', borderColor: theme.primary + '88' }]}>
                        {IconComponent ? <IconComponent size={14} color={theme.primary} strokeWidth={2} /> : null}
                    </View>
                    <StarRow count={theme.stars} color={theme.primary} />
                    <Text style={[styles.bottomRarityLabel, { color: theme.primary + 'CC' }]}>{localRarity}</Text>
                </View>
            </View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    outerShell:        { width: CARD_W, height: CARD_H, shadowOffset: { width: 0, height: 6 }, elevation: 18 },
    cardContainer:     { flex: 1, borderRadius: 20, overflow: 'hidden', backgroundColor: '#000000' },
    artImage:          { borderRadius: 20 },
    blackOverlay:      { backgroundColor: 'rgba(0,0,0,0.62)', borderRadius: 20 },
    legendaryEdgeGlow: { ...StyleSheet.absoluteFillObject, borderWidth: 2, borderRadius: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.9, shadowRadius: 22, elevation: 10 },
    shimmerStreak:     { position: 'absolute', top: 0, bottom: 0, width: 28, backgroundColor: 'rgba(255,255,255,0.04)', borderLeftWidth: 1, borderRightWidth: 1, transform: [{ skewX: '-18deg' }] },
    cornerTL:          { position: 'absolute', top: 8,    left: 8,  zIndex: 18 },
    cornerTR:          { position: 'absolute', top: 8,    right: 8, zIndex: 18 },
    cornerBL:          { position: 'absolute', bottom: 44, left: 8,  zIndex: 18 },
    cornerBR:          { position: 'absolute', bottom: 44, right: 8, zIndex: 18 },
    cornerDiamond:     { width: 8, height: 8, borderWidth: 1.5, transform: [{ rotate: '45deg' }] },
    devControls:       { position: 'absolute', top: 36, left: 10, zIndex: 50, flexDirection: 'row', gap: 4 },
    devBtn:            { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
    disabledOverlay:   { ...StyleSheet.absoluteFillObject, zIndex: 40, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.3)' },
    disabledStamp:     { backgroundColor: 'rgba(220,38,38,0.9)', paddingHorizontal: 14, paddingVertical: 5, borderRadius: 8, borderWidth: 2, borderColor: '#f87171', transform: [{ rotate: '-12deg' }] },
    disabledText:      { color: '#fff', fontWeight: '900', fontSize: 10, letterSpacing: 3, textTransform: 'uppercase' },
    rarityBadge:       { position: 'absolute', top: 10, right: 10, zIndex: 20, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, borderWidth: 1 },
    rarityText:        { fontSize: 8, fontWeight: '800', letterSpacing: 1.5, textTransform: 'uppercase' },
    titlePanel:        { position: 'absolute', bottom: 50, left: 12, right: 12, zIndex: 15 },
    titlePanelInner:   { backgroundColor: 'rgba(0,0,0,0.82)', borderRadius: 14, borderWidth: 1, paddingVertical: 12, paddingHorizontal: 14, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.9, shadowRadius: 10, elevation: 6 },
    nameEn:            { color: '#fff', fontSize: 12, fontWeight: '900', letterSpacing: 1.2, textTransform: 'uppercase', textAlign: 'center', textShadowColor: 'rgba(0,0,0,0.9)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
    nameAr:            { color: '#FFD700', fontWeight: '900', textAlign: 'center', marginTop: 3, textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 8, letterSpacing: 0.5 },
    divider:           { width: 36, height: 1.5, borderRadius: 1, marginVertical: 8 },
    description:       { color: 'rgba(203,213,225,0.85)', fontSize: 10, fontWeight: '500', textAlign: 'center', lineHeight: 15, writingDirection: 'rtl' },
    descriptionWarning:{ color: '#ef4444', fontSize: 9, fontWeight: '700', textAlign: 'center', lineHeight: 14, marginTop: 5, writingDirection: 'rtl' },
    bottomBar:         { position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 15, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.90)', borderTopWidth: 1, paddingVertical: 7, paddingHorizontal: 10, gap: 6 },
    iconCircle:        { width: 28, height: 28, borderRadius: 14, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
    starRow:           { flex: 1, flexDirection: 'row', gap: 2 },
    star:              { fontSize: 10 },
    bottomRarityLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase' },
});
