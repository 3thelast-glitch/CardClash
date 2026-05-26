/**
 * BattleHUD — Animated Heads-Up Display for the battle screen.
 *
 * Shows:
 *  - Player + Bot HP bars (animated color shift, flash pulse)
 *  - Score display (player score vs bot score)
 *  - Round counter with progress dots
 *  - Turn indicator badge
 */

import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    withSequence,
    interpolateColor,
    Easing,
} from 'react-native-reanimated';
import { ANIM_DURATION, HP_COLORS, hpColor } from '@/constants/animationConfig';

// ─── HP Bar ───────────────────────────────────────────────────────────────────

interface HpBarProps {
    current: number;
    max: number;
    label: string;
    width?: number;
    height?: number;
    direction?: 'ltr' | 'rtl';
}

function HpBar({ current, max, label, width = 130, height = 12, direction = 'ltr' }: HpBarProps) {
    const fraction = max > 0 ? Math.max(0, Math.min(1, current / max)) : 0;
    const fillWidth = useSharedValue(fraction * width);
    const colorProgress = useSharedValue(fraction);
    const pulseOpacity = useSharedValue(0);

    useEffect(() => {
        fillWidth.value = withTiming(fraction * width, {
            duration: ANIM_DURATION.HP_BAR,
            easing: Easing.out(Easing.quad),
        });
        colorProgress.value = withTiming(fraction, { duration: ANIM_DURATION.HP_BAR });
        pulseOpacity.value = withSequence(
            withTiming(0.5, { duration: 80 }),
            withTiming(0, { duration: 300 })
        );
    }, [current, fraction, width]);

    const fillStyle = useAnimatedStyle(() => {
        const bg = interpolateColor(
            colorProgress.value,
            [0, 0.3, 0.6, 1],
            [HP_COLORS.LOW, HP_COLORS.HALF, HP_COLORS.FULL, HP_COLORS.FULL]
        );
        return {
            width: fillWidth.value,
            backgroundColor: bg,
        };
    });

    const pulseStyle = useAnimatedStyle(() => ({
        opacity: pulseOpacity.value,
    }));

    return (
        <View style={[styles.hpBarWrapper, { width }]}>
            <Text style={styles.hpLabel}>{label}</Text>
            <View style={[styles.hpTrack, { width, height, borderRadius: height / 2 }]}>
                <Animated.View
                    style={[
                        styles.hpFill,
                        { height, borderRadius: height / 2 },
                        direction === 'rtl' ? { right: 0 } : { left: 0 },
                        fillStyle,
                    ]}
                />
                <Animated.View
                    style={[StyleSheet.absoluteFillObject, { borderRadius: height / 2, backgroundColor: '#fff' }, pulseStyle]}
                />
                <View style={styles.hpTextWrap}>
                    <Text style={[styles.hpText, { fontSize: height * 0.75 }]}>
                        {current}/{max}
                    </Text>
                </View>
            </View>
        </View>
    );
}

// ─── Score Display ────────────────────────────────────────────────────────────

interface ScoreDisplayProps {
    playerScore: number;
    botScore: number;
    maxScore: number;
}

function ScoreDisplay({ playerScore, botScore, maxScore }: ScoreDisplayProps) {
    return (
        <View style={styles.scoreWrapper}>
            <Text style={[styles.scoreNum, { color: '#4ade80' }]}>{playerScore}</Text>
            <Text style={styles.scoreSep}>•</Text>
            <Text style={[styles.scoreNum, { color: '#f87171' }]}>{botScore}</Text>
        </View>
    );
}

// ─── Round Dots ───────────────────────────────────────────────────────────────

function RoundDots({ current, total }: { current: number; total: number }) {
    return (
        <View style={styles.dotsRow}>
            {Array.from({ length: Math.min(total, 10) }).map((_, i) => (
                <View
                    key={i}
                    style={[
                        styles.dot,
                        i < current
                            ? styles.dotDone
                            : i === current
                                ? styles.dotCurrent
                                : styles.dotFuture,
                    ]}
                />
            ))}
        </View>
    );
}

// ─── Main HUD ─────────────────────────────────────────────────────────────────

interface BattleHUDProps {
    playerScore: number;
    botScore: number;
    maxScore: number;
    currentRound: number;
    totalRounds: number;
    turn?: 'player' | 'bot' | 'none';
}

export function BattleHUD({
    playerScore,
    botScore,
    maxScore,
    currentRound,
    totalRounds,
    turn = 'none',
}: BattleHUDProps) {
    return (
        <View style={styles.container}>
            {/* Player HP */}
            <HpBar
                current={playerScore}
                max={maxScore}
                label="👤 أنت"
                width={130}
                height={13}
                direction="ltr"
            />

            {/* Center: score + round */}
            <View style={styles.centerCol}>
                <Text style={styles.roundLabel}>
                    جولة {Math.min(currentRound + 1, totalRounds)} / {totalRounds}
                </Text>
                <ScoreDisplay playerScore={playerScore} botScore={botScore} maxScore={maxScore} />
                <RoundDots current={currentRound} total={totalRounds} />
                {turn !== 'none' && (
                    <View style={[styles.turnBadge, { backgroundColor: turn === 'player' ? '#22c55e33' : '#ef444433' }]}>
                        <Text style={[styles.turnText, { color: turn === 'player' ? '#4ade80' : '#f87171' }]}>
                            {turn === 'player' ? '🎯 دورك' : '🤖 دور البوت'}
                        </Text>
                    </View>
                )}
            </View>

            {/* Bot HP */}
            <HpBar
                current={botScore}
                max={maxScore}
                label="🤖 البوت"
                width={130}
                height={13}
                direction="rtl"
            />
        </View>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 12,
        paddingVertical: 10,
        backgroundColor: 'rgba(0,0,0,0.55)',
        borderRadius: 16,
        gap: 8,
    },
    hpBarWrapper: {
        alignItems: 'flex-start',
        gap: 4,
    },
    hpLabel: {
        color: '#9ca3af',
        fontSize: 10,
        fontWeight: '600',
        letterSpacing: 0.4,
    },
    hpTrack: {
        backgroundColor: HP_COLORS.TRACK,
        overflow: 'hidden',
        position: 'relative',
    },
    hpFill: {
        position: 'absolute',
        top: 0, bottom: 0,
    },
    hpTextWrap: {
        ...StyleSheet.absoluteFillObject,
        alignItems: 'center',
        justifyContent: 'center',
    },
    hpText: {
        color: '#fff',
        fontWeight: '800',
        textShadowColor: 'rgba(0,0,0,0.6)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
    },
    centerCol: {
        alignItems: 'center',
        gap: 4,
        flex: 1,
    },
    roundLabel: {
        color: '#9ca3af',
        fontSize: 9,
        fontWeight: '600',
        letterSpacing: 0.5,
    },
    scoreWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    scoreNum: {
        fontSize: 26,
        fontWeight: '900',
        textShadowColor: 'rgba(0,0,0,0.5)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 4,
    },
    scoreSep: {
        color: '#6b7280',
        fontSize: 20,
        fontWeight: '300',
    },
    dotsRow: {
        flexDirection: 'row',
        gap: 4,
        alignItems: 'center',
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    dotDone: {
        backgroundColor: '#4ade80',
    },
    dotCurrent: {
        backgroundColor: '#facc15',
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    dotFuture: {
        backgroundColor: '#374151',
    },
    turnBadge: {
        paddingHorizontal: 10,
        paddingVertical: 3,
        borderRadius: 12,
    },
    turnText: {
        fontSize: 11,
        fontWeight: '700',
    },
});
