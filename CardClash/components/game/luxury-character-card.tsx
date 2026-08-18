/**
 * LuxuryCharacterCard — Premium card with dynamic rarity theming
 * Features:
 * - Dynamic rarity colors (Legendary: Gold, Epic: Silver/Purple, Rare: Bronze, Common: Dark/Grey)
 * - ImageBackground with gradient overlay (or gradient placeholder if no image)
 * - Top-left badge with rarity name
 * - Centered titles (Arabic + English)
 * - Frosted glass description box
 * - Bottom stat badges (Attack: Gold, Defense: Blue) — Clean minimal style
 */
import React from 'react';
import { View, Text, StyleSheet, ImageBackground, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Card, CardRarity } from '@/lib/game/types';
import { getCardImage } from '../../lib/game/get-card-image';

interface LuxuryCharacterCardProps {
    card: Card;
    style?: ViewStyle;
}

const RARITY_THEMES = {
    common: {
        label: 'عادي',
        color: '#9CA3AF',
        borderColor: '#6B7280',
        badgeBg: 'rgba(20, 20, 20, 0.9)',
        badgeBorder: '#6B7280',
        badgeText: '#9CA3AF',
        shadowColor: '#6B7280',
        shadowOpacity: 0.15,
        shadowRadius: 6,
        elevation: 4,
        hasShine: false,
        titleGlowRadius: 4,
        placeholderColors: ['#1a1a2e', '#2d2d44', '#1a1a2e'] as const,
    },
    rare: {
        label: 'نادر',
        color: '#CD7F32',
        borderColor: '#CD7F32',
        badgeBg: 'rgba(20, 20, 20, 0.9)',
        badgeBorder: '#CD7F32',
        badgeText: '#D97706',
        shadowColor: '#CD7F32',
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 6,
        hasShine: false,
        titleGlowRadius: 6,
        placeholderColors: ['#1a1200', '#2d2000', '#1a1200'] as const,
    },
    epic: {
        label: 'ملحمي',
        color: '#A855F7',
        borderColor: '#A855F7',
        badgeBg: 'rgba(20, 20, 20, 0.9)',
        badgeBorder: '#A855F7',
        badgeText: '#A78BFA',
        shadowColor: '#A855F7',
        shadowOpacity: 0.5,
        shadowRadius: 14,
        elevation: 8,
        hasShine: true,
        titleGlowRadius: 8,
        placeholderColors: ['#1a0030', '#2d0050', '#1a0030'] as const,
    },
    legendary: {
        label: 'أسطوري',
        color: '#FFD700',
        borderColor: '#FFD700',
        badgeBg: 'rgba(20, 20, 20, 0.9)',
        badgeBorder: '#FFD700',
        badgeText: '#FBBF24',
        shadowColor: '#FFD700',
        shadowOpacity: 0.8,
        shadowRadius: 18,
        elevation: 10,
        hasShine: true,
        titleGlowRadius: 10,
        placeholderColors: ['#1a1400', '#2d2400', '#1a1400'] as const,
    },
  special: { label: 'SPECIAL', color: '#06b6d4', borderColor: '#22d3ee', badgeBg: '#164e63', badgeBorder: '#06b6d4', badgeText: '#67e8f9', shadowColor: '#06b6d4', shadowOpacity: 1, shadowRadius: 20, elevation: 15, hasShine: true, titleGlowRadius: 10, placeholderColors: ['#083344', '#164e63', '#083344'] as const },
};

export function LuxuryCharacterCard({ card, style }: LuxuryCharacterCardProps) {
    const rarity: CardRarity = card.rarity ?? 'common';
    const theme = RARITY_THEMES[rarity];
    const cardImage = getCardImage(card);

    const cardContent = (
        <>
            {!cardImage && (
                <LinearGradient
                    colors={theme.placeholderColors}
                    style={StyleSheet.absoluteFillObject}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                />
            )}

            {theme.hasShine && (
                <LinearGradient
                    colors={['rgba(255,255,255, 0.0)', 'rgba(255,255,255, 0.15)', 'rgba(255,255,255, 0.0)']}
                    style={styles.shineOverlay}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                />
            )}

            <View style={[styles.innerBorder, { borderColor: theme.borderColor }]} />

            {cardImage && (
                <LinearGradient
                    colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.7)', 'rgba(0,0,0,0.9)']}
                    style={styles.gradientOverlay}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 0, y: 1 }}
                />
            )}

            {!cardImage && (
                <View style={styles.noImageBadge}>
                    <Text style={styles.noImageIcon}>🖼️</Text>
                    <Text style={styles.noImageText}>لا توجد صورة</Text>
                </View>
            )}

            <View style={[styles.rarityBadge, { backgroundColor: theme.badgeBg, borderColor: theme.badgeBorder }]}>
                <Text style={[styles.rarityBadgeText, { color: theme.badgeText }]}>
                    {theme.label} ✦
                </Text>
            </View>

            <View style={styles.titlesContainer}>
                <Text style={styles.subtitle} numberOfLines={1}>
                    {card.nameAr}
                </Text>
                <Text style={[styles.title, {
                    textShadowColor: theme.color,
                    textShadowRadius: theme.titleGlowRadius,
                }]} numberOfLines={2}>
                    {card.nameEn || card.name}
                </Text>
            </View>

            <View style={styles.descriptionBox}>
                <Text style={styles.descriptionText} numberOfLines={3}>
                    {card.nameAr} - {card.race} {card.cardClass}
                </Text>
            </View>

            {/* ─ Clean Minimal Stat Badges ─ */}
            <View style={styles.statsContainer}>
                <View style={[styles.statBadge, styles.attackBadge]}>
                    <Text style={styles.statIcon}>⚔️</Text>
                    <Text style={[styles.statValue, styles.attackText]}>{card.attack}</Text>
                </View>
                <View style={[styles.statBadge, styles.defenseBadge]}>
                    <Text style={styles.statIcon}>🛡️</Text>
                    <Text style={[styles.statValue, styles.defenseText]}>{card.defense}</Text>
                </View>
            </View>
        </>
    );

    return (
        <View style={[styles.cardContainer, style, {
            shadowColor: theme.shadowColor,
            shadowOpacity: theme.shadowOpacity,
            shadowRadius: theme.shadowRadius,
            elevation: theme.elevation,
        }]}>
            {cardImage ? (
                <ImageBackground
                    source={cardImage}
                    style={styles.cardBackground}
                    imageStyle={{ borderRadius: 12 }}
                >
                    {cardContent}
                </ImageBackground>
            ) : (
                <View style={[styles.cardBackground, { borderRadius: 12, overflow: 'hidden' }]}>
                    {cardContent}
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    cardContainer: {
        width: 220, height: 320, borderRadius: 12,
        borderWidth: 1.5, backgroundColor: '#111',
        shadowOffset: { width: 0, height: 0 },
    },
    cardBackground: { width: '100%', height: '100%', justifyContent: 'space-between' },
    shineOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1 },
    innerBorder: {
        position: 'absolute', top: 4, left: 4, right: 4, bottom: 4,
        borderRadius: 8, borderWidth: 1, zIndex: 5,
    },
    gradientOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 2 },
    noImageBadge: {
        position: 'absolute', top: '25%', left: 0, right: 0,
        alignItems: 'center', zIndex: 4,
    },
    noImageIcon: { fontSize: 36, opacity: 0.4 },
    noImageText: { fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 4 },
    rarityBadge: {
        position: 'absolute', top: 8, left: 8,
        paddingHorizontal: 12, paddingVertical: 4,
        borderBottomRightRadius: 10, borderWidth: 1, zIndex: 10,
    },
    rarityBadgeText: { fontSize: 11, fontWeight: '600' },
    titlesContainer: {
        position: 'absolute', top: '40%', left: 0, right: 0,
        alignItems: 'center', paddingHorizontal: 16, zIndex: 5,
    },
    subtitle: {
        fontSize: 12, fontWeight: '500', color: '#FFD700',
        marginBottom: 4, textAlign: 'center',
        textShadowColor: 'rgba(0,0,0,0.8)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
    },
    title: {
        fontSize: 24, fontWeight: '900', fontStyle: 'italic',
        color: '#FFFFFF', textAlign: 'center',
        textShadowColor: 'rgba(0,0,0,0.8)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 4,
    },
    descriptionBox: {
        position: 'absolute', top: '58%', left: 16, right: 16,
        backgroundColor: 'rgba(15, 15, 15, 0.75)',
        borderWidth: 1, borderColor: 'rgba(255, 215, 0, 0.3)',
        borderRadius: 6, padding: 10, alignSelf: 'center',
        marginBottom: 60, zIndex: 5,
    },
    descriptionText: { fontSize: 10, color: '#FFF', lineHeight: 16, textAlign: 'center' },

    // Stat Badges
    statsContainer: {
        position: 'absolute',
        bottom: 10,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 12,
        zIndex: 10,
    },
    statBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 20,
        gap: 4,
        minWidth: 52,
        justifyContent: 'center',
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
    statIcon: { fontSize: 13 },
    statValue: { fontSize: 15, fontWeight: '800', letterSpacing: 0.5 },
    attackText: { color: '#FFB830' },
    defenseText: { color: '#60A5FA' },
});
