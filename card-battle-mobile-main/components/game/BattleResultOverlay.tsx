/**
 * BattleResultOverlay — Cinematic win/lose/draw result screen.
 *
 * Full-screen overlay with a heavy dark blurred background.
 * Massive, glowing typography for Victory/Defeat.
 * Contains the content perfectly in the center.
 */

import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Platform, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withTiming,
    withDelay,
    withSequence,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { ANIM_DURATION } from '@/constants/animationConfig';
import { useSettings } from '@/lib/game/hooks/useSettings';

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
        color: '#39E6D0',
        shadowColor: '#39E6D0',
        bgColor: 'rgba(57,230,208,0.14)',
    },
    bot: {
        icon: '💀',
        titleAr: 'فوز البوت',
        color: '#FB7185',
        shadowColor: '#FB7185',
        bgColor: 'rgba(251,113,133,0.14)',
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
    const { height } = useWindowDimensions();
    const { settings } = useSettings();

    // حد أدنى آمن يمنع تزاحم النتيجة والأزرار في العرض الأفقي القصير.
    const bannerHeight = Math.min(height * 0.62, Math.max(156, height * 0.3));

    // Calculate a safer scale factor so that elements shrink gracefully inside the 30% block
    // We base it roughly on a standard 300px height for optimal proportion
    const scaleFactor = Math.max(0.5, Math.min(1.0, bannerHeight / 300));

    const scale = useSharedValue(0.8);
    const opacity = useSharedValue(0);
    const iconScale = useSharedValue(0);
    const textOpacity = useSharedValue(0);

    useEffect(() => {
        if (visible && winner) {
            if (settings.animationsEnabled) {
                opacity.value = withTiming(1, { duration: ANIM_DURATION.CINEMATIC });
                scale.value = withSpring(1, { damping: 20, stiffness: 200 });
                iconScale.value = withDelay(
                    150,
                    withSequence(
                        withSpring(1.3, { damping: 8, stiffness: 300 }),
                        withSpring(1.0, { damping: 12, stiffness: 200 })
                    )
                );
                textOpacity.value = withDelay(300, withTiming(1, { duration: 300 }));
            } else {
                opacity.value = 1;
                scale.value = 1;
                iconScale.value = 1;
                textOpacity.value = 1;
            }

            if (settings.vibration && Platform.OS !== 'web') {
                triggerHaptic(winner === 'player' ? 'success' : winner === 'bot' ? 'error' : 'warning');
            }
        } else {
            const duration = settings.animationsEnabled ? 200 : 0;
            opacity.value = withTiming(0, { duration });
            scale.value = withTiming(0.9, { duration });
            iconScale.value = 0;
            textOpacity.value = 0;
        }
    }, [visible, winner, settings.animationsEnabled, settings.vibration, opacity, scale, iconScale, textOpacity]);

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
                <LinearGradient
                    pointerEvents="none"
                    colors={[cfg.bgColor, 'rgba(5,15,20,0.98)']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFill}
                />
                <View style={[styles.resultAccent, { backgroundColor: cfg.color }]} />
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
                            <Text style={{ color: 'rgba(226,247,242,0.78)', fontSize: 13 * scaleFactor, letterSpacing: 1.5, marginBottom: 8 * scaleFactor, fontWeight: 'bold', writingDirection: 'rtl' }}>النقاط النهائية</Text>
                            <Animated.View style={[styles.statsRow, textStyle, { paddingVertical: 8 * scaleFactor, paddingHorizontal: 16 * scaleFactor, gap: 16 * scaleFactor, backgroundColor: 'rgba(3,13,18,0.78)', borderColor: cfg.color + '44', borderRadius: 12 }]}>
                                {playerScore !== undefined && (
                                    <View style={[styles.statItem, { flexDirection: 'row', alignItems: 'center', gap: 6 }]}>
                                        <Text style={[styles.statLabel, { fontSize: 14 * scaleFactor }]}>أنت</Text>
                                        <Text style={[styles.statValue, { color: cfg.color, fontSize: 26 * scaleFactor, textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 2 }]}>{playerScore}</Text>
                                        <Text style={{ fontSize: 18 * scaleFactor }}>⭐</Text>
                                    </View>
                                )}
                                <Text style={[styles.vsText, { fontSize: 20 * scaleFactor, opacity: 0.5 }]}>-</Text>
                                {botScore !== undefined && (
                                    <View style={[styles.statItem, { flexDirection: 'row', alignItems: 'center', gap: 6 }]}>
                                        <Text style={{ fontSize: 18 * scaleFactor }}>⭐</Text>
                                        <Text style={[styles.statValue, { color: cfg.color, fontSize: 26 * scaleFactor, textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 2 }]}>{botScore}</Text>
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
                                style={({ pressed }) => [styles.actionBtn, styles.homeBtn, { paddingVertical: 12 * scaleFactor }, pressed && styles.actionPressed]}
                                onPress={onHome}
                                accessibilityRole="button"
                            >
                                <Text style={[styles.homeBtnText, { fontSize: 13 * scaleFactor }]}>القائمة الرئيسية</Text>
                            </Pressable>

                            <Pressable
                                style={({ pressed }) => [styles.actionBtn, styles.playAgainBtn, { backgroundColor: cfg.color, paddingVertical: 12 * scaleFactor }, pressed && styles.actionPressed]}
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
        backgroundColor: 'rgba(2,8,12,0.88)',
        zIndex: 1000,
        justifyContent: 'center',
        alignItems: 'center',
        flex: 1,
    },
    card: {
        width: '90%',
        maxWidth: 400,
        borderRadius: 18,
        overflow: 'hidden',
        borderWidth: 2,
        backgroundColor: 'rgba(7,20,27,0.96)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.8,
        shadowRadius: 20,
        elevation: 20,
    },
    resultAccent: {
        position: 'absolute',
        top: 0,
        left: '18%',
        right: '18%',
        height: 2,
        borderBottomLeftRadius: 2,
        borderBottomRightRadius: 2,
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
        writingDirection: 'rtl',
    },
    statsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(3,13,18,0.76)',
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
        color: 'rgba(226,247,242,0.68)',
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
    actionPressed: {
        opacity: 0.78,
        transform: [{ scale: 0.97 }],
    },
    actionBtn: {
        flex: 1,
        borderRadius: 100, // Pill shaped
        alignItems: 'center',
        justifyContent: 'center',
    },
    homeBtn: {
        backgroundColor: 'rgba(203,221,221,0.09)',
        borderWidth: 1,
        borderColor: 'rgba(57,230,208,0.28)',
    },
    homeBtnText: {
        color: '#EAFBF7',
        fontWeight: 'bold',
    },
    playAgainBtn: {
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
        elevation: 8,
    },
    playAgainBtnText: {
        color: '#062126',
        fontWeight: 'bold',
    },
});
