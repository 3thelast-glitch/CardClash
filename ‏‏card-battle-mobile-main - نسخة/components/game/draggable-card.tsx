/**
 * DraggableCard — Card with Gesture Handler v2 + Reanimated v4 Pan Gesture.
 *
 * Drag behaviour:
 *  - Smooth follow-finger via GestureDetector + Gesture.Pan()
 *  - Shadow increases during drag (radius 16 → 30)
 *  - Spring snap-back on release if no valid drop
 *  - Green highlight overlay when over a drop zone
 */

import React from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withTiming,
    runOnJS,
} from 'react-native-reanimated';
import { Card } from '@/lib/game/types';
import { CardItem } from './card-item';
import { ANIMATION_VALUES } from '@/constants/game-config';

// ─── Props ────────────────────────────────────────────────────────────────────

interface DraggableCardProps {
    card: Card;
    /** Called when finger lifts — return true to accept drop, false to snap back */
    onDrop?: (x: number, y: number) => boolean;
    onDragStart?: () => void;
    /** Whether this card is hovering over a valid drop zone */
    isOverDropZone?: boolean;
    size?: 'small' | 'medium' | 'large';
    style?: ViewStyle;
    disabled?: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function DraggableCard({
    card,
    onDrop,
    onDragStart,
    isOverDropZone = false,
    size = 'medium',
    style,
    disabled = false,
}: DraggableCardProps) {
    const translateX = useSharedValue(0);
    const translateY = useSharedValue(0);
    const offsetX = useSharedValue(0);
    const offsetY = useSharedValue(0);
    const isDragging = useSharedValue(false);
    const shadowRadius = useSharedValue(16);
    const shadowOpacity = useSharedValue(0.44);
    const zIndex = useSharedValue(1);

    // ── Pan Gesture (Reanimated v4 + GH v2) ──
    const pan = Gesture.Pan()
        .enabled(!disabled)
        .minDistance(5)
        .onStart(() => {
            offsetX.value = translateX.value;
            offsetY.value = translateY.value;
            isDragging.value = true;
            shadowRadius.value = withTiming(ANIMATION_VALUES.dragShadowRadius, { duration: 80 });
            shadowOpacity.value = withTiming(0.65, { duration: 80 });
            zIndex.value = 999;
            if (onDragStart) runOnJS(onDragStart)();
        })
        .onUpdate((event) => {
            translateX.value = offsetX.value + event.translationX;
            translateY.value = offsetY.value + event.translationY;
        })
        .onEnd((event) => {
            isDragging.value = false;
            shadowRadius.value = withTiming(16, { duration: 200 });
            shadowOpacity.value = withTiming(0.44, { duration: 200 });
            zIndex.value = 1;

            const dropX = event.absoluteX;
            const dropY = event.absoluteY;

            let accepted = false;
            if (onDrop) {
                accepted = runOnJS(tryDrop)(dropX, dropY) as unknown as boolean;
            }

            if (!accepted) {
                translateX.value = withSpring(0, { damping: 15, stiffness: 220 });
                translateY.value = withSpring(0, { damping: 15, stiffness: 220 });
            }
        });

    function tryDrop(x: number, y: number): boolean {
        return onDrop ? onDrop(x, y) : false;
    }

    // ── Animated styles ──
    const containerStyle = useAnimatedStyle(() => ({
        transform: [
            { translateX: translateX.value },
            { translateY: translateY.value },
        ],
        shadowRadius: shadowRadius.value,
        shadowOpacity: shadowOpacity.value,
        zIndex: zIndex.value,
    }));

    const dropHighlightStyle = useAnimatedStyle(() => ({
        opacity: isOverDropZone
            ? withTiming(0.3, { duration: 150 })
            : withTiming(0, { duration: 150 }),
    }));

    return (
        <GestureDetector gesture={pan}>
            <Animated.View
                style={[
                    styles.wrapper,
                    containerStyle,
                    style,
                ]}
            >
                <CardItem card={card} size={size} disabled={disabled} showStats />

                {/* Drop zone highlight overlay */}
                <Animated.View
                    style={[StyleSheet.absoluteFillObject, styles.dropHighlight, dropHighlightStyle]}
                    pointerEvents="none"
                />
            </Animated.View>
        </GestureDetector>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    wrapper: {
        position: 'relative',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
    },
    dropHighlight: {
        backgroundColor: '#22c55e',
        borderRadius: 14,
    },
});
