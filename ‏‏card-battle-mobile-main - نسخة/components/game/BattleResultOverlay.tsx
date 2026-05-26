/**
 * BattleResultOverlay — Cinematic win/lose/draw result screen.
 *
 * Full-screen overlay with a heavy dark blurred background.
 * Massive, glowing typography for Victory/Defeat.
 * Contains the content perfectly in the center.
 */

import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, useWindowDimensions } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withTiming,
    withDelay,
    withSequence,
    runOnJS,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';
import { ANIM_DURATION } from '@/constants/animationConfig';

// ─── Types ────────────────────────────────────────────────────────────────────

type RoundOutcome = 'player' | 'bot' | 'draw';

interface BattleResultOverlayProps {
    visible: boolean;
    winner: RoundOutcome | null;
    playerScore?: number;
    botScore?: number;
    onPlayAgain?: () => void;
    onHome?: () => void;
}

// ─── Config ───────────────────────────────────────────────────────────────────

const OUTCOME_CONFIG: Record<RoundOutcome, {
    icon: string;
    titleAr: string;
    color: string;
    shadowColor: string;
    bgColor: string;
}> = {
    player: {
        icon: '🎉',
        titleAr: 'فوز اللاعب',
        color: '#FFD700', // Gold/Amber
        shadowColor: '#FFD700',
        bgColor: 'rgba(212,175,55,0.15)',
    },
    bot: {
        icon: '💀',
        titleAr: 'فوز البوت',
        color: '#FF003C', // Crimson/Dark Red
        shadowColor: '#FF003C',
        bgColor: 'rgba(255,0,60,0.15)',
    },
    draw: {
        icon: '🤝',
        titleAr: 'تعادل',
        color: '#FBBF24',
        shadowColor: '#FBBF24',
        bgColor: 'rgba(251,191,36,0.15)',
    },
};

// ─── Component ────────────────────────────────────────────────────────────────

export function BattleResultOverlay({
    visible,
    winner,
    playerScore,
    botScore,
    onPlayAgain,
    onHome,
}: BattleResultOverlayProps) {
    const { width, height } = useWindowDimensions();

    // The strict 30% height banner
    const bannerHeight = height * 0.3;

    // Calculate a safer scale factor so that elements shrink gracefully inside the 30% block
    // We base it roughly on a standard 300px height for optimal proportion
    const scaleFactor = Math.max(0.5, Math.min(1.0, bannerHeight / 300));

    const scale = useSharedValue(0.8);
    const opacity = useSharedValue(0);
    const iconScale = useSharedValue(0);
    const textOpacity = useSharedValue(0);

    useEffect(() => {
        if (visible && winner) {
            // Fade in and scale up the overlay wrapper
            opacity.value = withTiming(1, { duration: ANIM_DURATION.CINEMATIC });
            scale.value = withSpring(1, { damping: 20, stiffness: 200 });

            // Spring pop icon
            iconScale.value = withDelay(
                150,
                withSequence(
                    withSpring(1.3, { damping: 8, stiffness: 300 }),
                    withSpring(1.0, { damping: 12, stiffness: 200 })
                )
            );

            // Fade text after icon
            textOpacity.value = withDelay(300, withTiming(1, { duration: 300 }));

            // Haptics
            if (Platform.OS !== 'web') {
                if (winner === 'player') {
                    runOnJS(triggerHaptic)('success');
                } else if (winner === 'bot') {
                    runOnJS(triggerHaptic)('error');
                } else {
                    runOnJS(triggerHaptic)('warning');
                }
            }
        } else {
            opacity.value = withTiming(0, { duration: 200 });
            scale.value = withTiming(0.9, { duration: 200 });
            iconScale.value = 0;
            textOpacity.value = 0;
        }
    }, [visible, winner]);

    const containerStyle = useAnimatedStyle(() => ({
        opacity: opacity.value,
    }));

    const cardStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    const iconStyle = useAnimatedStyle(() => ({
        transform: [{ scale: iconScale.value }],
    }));

    const textStyle = useAnimatedStyle(() => ({
        opacity: textOpacity.value,
    }));

    if (!winner) return null;

    const cfg = OUTCOME_CONFIG[winner];

    return (
        <Animated.View
            style={[styles.overlay, containerStyle]}
            pointerEvents={visible ? "auto" : "none"}
        >
            <Animated.View style={[
                styles.card,
                {
                    backgroundColor: cfg.bgColor,
                    borderColor: cfg.color,
                    height: bannerHeight
                },
                cardStyle
            ]}>
                <View style={styles.internalContainer}>

                    {/* Header Row (Icon + Title) */}
                    <View style={styles.headerRow}>
                        <Animated.Text style={[styles.icon, { fontSize: 48 * scaleFactor }, iconStyle]}>
                            {cfg.icon}
                        </Animated.Text>

                        <Animated.View style={textStyle}>
                            <Text style={[
                                styles.title,
                                {
                                    color: cfg.color,
                                    textShadowColor: cfg.shadowColor,
                                    fontSize: 34 * scaleFactor
                                }
                            ]}>
                                {cfg.titleAr}
                            </Text>
                        </Animated.View>
                    </View>

                    {/* Points stats */}
                    {(playerScore !== undefined || botScore !== undefined) && (
                        <View style={{ alignItems: 'center', marginTop: 10 * scaleFactor }}>
                            <Text style={{ color: '#94a3b8', fontSize: 13 * scaleFactor, letterSpacing: 1.5, marginBottom: 8 * scaleFactor, fontWeight: 'bold' }}>النقاط النهائية</Text>
                            <Animated.View style={[styles.statsRow, textStyle, { paddingVertical: 8 * scaleFactor, paddingHorizontal: 16 * scaleFactor, gap: 16 * scaleFactor, backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 12 }]}>
                                {playerScore !== undefined && (
                                    <View style={[styles.statItem, { flexDirection: 'row', alignItems: 'center', gap: 6 }]}>
                                        <Text style={[styles.statLabel, { fontSize: 14 * scaleFactor }]}>أنت</Text>
                                        <Text style={[styles.statValue, { color: '#fbbf24', fontSize: 26 * scaleFactor, textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 2 }]}>{playerScore}</Text>
                                        <Text style={{ fontSize: 18 * scaleFactor }}>⭐</Text>
                                    </View>
                                )}
                                <Text style={[styles.vsText, { fontSize: 20 * scaleFactor, opacity: 0.5 }]}>-</Text>
                                {botScore !== undefined && (
                                    <View style={[styles.statItem, { flexDirection: 'row', alignItems: 'center', gap: 6 }]}>
                                        <Text style={{ fontSize: 18 * scaleFactor }}>⭐</Text>
                                        <Text style={[styles.statValue, { color: '#fbbf24', fontSize: 26 * scaleFactor, textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 2 }]}>{botScore}</Text>
                                        <Text style={[styles.statLabel, { fontSize: 14 * scaleFactor }]}>البوت</Text>
                                    </View>
                                )}
                            </Animated.View>
                        </View>
                    )}

                    {/* CTA Buttons */}
                    <Animated.View style={[styles.actionsContainer, textStyle]}>
                        <View style={[styles.finalActionsRow, { gap: 12 * scaleFactor }]}>
                            <Pressable
                                style={[styles.actionBtn, styles.homeBtn, { paddingVertical: 12 * scaleFactor }]}
                                onPress={onHome}
                                accessibilityRole="button"
                            >
                                <Text style={[styles.homeBtnText, { fontSize: 13 * scaleFactor }]}>القائمة الرئيسية</Text>
                            </Pressable>

                            <Pressable
                                style={[styles.actionBtn, styles.playAgainBtn, { backgroundColor: cfg.color, paddingVertical: 12 * scaleFactor }]}
                                onPress={onPlayAgain}
                                accessibilityRole="button"
                            >
                                <Text style={[styles.playAgainBtnText, { fontSize: 13 * scaleFactor }]}>العب مرة أخرى</Text>
                            </Pressable>
                        </View>
                    </Animated.View>

                </View>
            </Animated.View>
        </Animated.View>
    );
}

function triggerHaptic(type: 'success' | 'error' | 'warning') {
    const map = {
        success: Haptics.NotificationFeedbackType.Success,
        error: Haptics.NotificationFeedbackType.Error,
        warning: Haptics.NotificationFeedbackType.Warning,
    };
    Haptics.notificationAsync(map[type]).catch(() => { });
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.85)',
        zIndex: 1000,
        justifyContent: 'center',
        alignItems: 'center',
        flex: 1,
    },
    card: {
        width: '90%',
        maxWidth: 400,
        borderRadius: 24,
        borderWidth: 2,
        backgroundColor: 'rgba(15,15,15,0.95)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.8,
        shadowRadius: 20,
        elevation: 20,
    },
    internalContainer: {
        flex: 1,
        width: '100%',
        justifyContent: 'space-evenly', // Perfect distribution
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 12,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
    },
    icon: {
        // dynamically scaled
    },
    title: {
        fontWeight: '900',
        letterSpacing: 1.0,
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 15, // Glowing effect
        textAlign: 'center',
    },
    statsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0,0,0,0.4)',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        width: '100%',
    },
    statItem: {
        alignItems: 'center',
        flex: 1,
        gap: 2,
    },
    statLabel: {
        color: '#9ca3af',
        fontWeight: '600',
    },
    statValue: {
        fontWeight: '900',
    },
    vsText: {
        fontWeight: '900',
        color: 'rgba(255,255,255,0.3)',
        fontStyle: 'italic',
    },
    actionsContainer: {
        width: '100%',
        alignItems: 'center',
    },
    nextButton: {
        width: '100%',
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
        elevation: 8,
    },
    nextButtonText: {
        color: '#1a1a1a', // Dark text on bright button
        fontWeight: '900',
        letterSpacing: 0.5,
    },
    finalActionsRow: {
        flexDirection: 'row',
        width: '100%',
        justifyContent: 'center',
    },
    actionBtn: {
        flex: 1,
        borderRadius: 100, // Pill shaped
        alignItems: 'center',
        justifyContent: 'center',
    },
    homeBtn: {
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    homeBtnText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    playAgainBtn: {
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
        elevation: 8,
    },
    playAgainBtnText: {
        color: '#1a1a1a',
        fontWeight: 'bold',
    },
});

