/**
 * Lightweight SVG Particle System for Legendary card fire effect.
 * Uses react-native-svg + Reanimated v4 — no external particle library needed.
 */

import React, { useEffect } from 'react';
import Svg, { Circle } from 'react-native-svg';
import Animated, {
    useSharedValue,
    useAnimatedProps,
    withRepeat,
    withSequence,
    withTiming,
    withDelay,
    Easing,
} from 'react-native-reanimated';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface ParticleProps {
    x: number;
    initialY: number;
    targetY: number;
    radius: number;
    color: string;
    delay: number;
    duration: number;
}

function FireParticle({ x, initialY, targetY, radius, color, delay, duration }: ParticleProps) {
    const cy = useSharedValue(initialY);
    const opacity = useSharedValue(0);
    const r = useSharedValue(radius);

    useEffect(() => {
        cy.value = withDelay(
            delay,
            withRepeat(
                withSequence(
                    withTiming(targetY, { duration, easing: Easing.out(Easing.quad) }),
                    withTiming(initialY, { duration: 0 })
                ),
                -1,
                false
            )
        );
        opacity.value = withDelay(
            delay,
            withRepeat(
                withSequence(
                    withTiming(0.9, { duration: duration * 0.15 }),
                    withTiming(0, { duration: duration * 0.85 })
                ),
                -1,
                false
            )
        );
        r.value = withDelay(
            delay,
            withRepeat(
                withSequence(
                    withTiming(radius * 1.4, { duration: duration * 0.3 }),
                    withTiming(radius * 0.4, { duration: duration * 0.7 })
                ),
                -1,
                false
            )
        );
    }, []);

    const animatedProps = useAnimatedProps(() => ({
        cy: cy.value,
        opacity: opacity.value,
        r: r.value,
    }));

    return <AnimatedCircle cx={x} animatedProps={animatedProps} fill={color} />;
}

// ─── Particle definitions ─────────────────────────────────────────────────────

const PARTICLES = [
    { x: 12, initialY: 200, targetY: 140, radius: 4, color: '#fbbf24', delay: 0, duration: 900 },
    { x: 28, initialY: 210, targetY: 130, radius: 3, color: '#f97316', delay: 120, duration: 1100 },
    { x: 44, initialY: 215, targetY: 150, radius: 5, color: '#ef4444', delay: 240, duration: 950 },
    { x: 60, initialY: 205, targetY: 135, radius: 3, color: '#fbbf24', delay: 60, duration: 1050 },
    { x: 76, initialY: 200, targetY: 145, radius: 4, color: '#f97316', delay: 300, duration: 850 },
    { x: 92, initialY: 210, targetY: 130, radius: 3, color: '#ef4444', delay: 180, duration: 1000 },
    { x: 108, initialY: 215, targetY: 140, radius: 5, color: '#fbbf24', delay: 90, duration: 920 },
    { x: 124, initialY: 205, targetY: 150, radius: 3, color: '#f97316', delay: 210, duration: 1080 },
    { x: 140, initialY: 200, targetY: 135, radius: 4, color: '#ef4444', delay: 330, duration: 870 },
    { x: 150, initialY: 210, targetY: 145, radius: 3, color: '#fbbf24', delay: 150, duration: 1020 },
];

// ─── Exported Component ───────────────────────────────────────────────────────

interface FireParticlesProps {
    width: number;
    height: number;
}

/**
 * Fire particle overlay for Legendary cards.
 * Render absolutely on top of the card, pointerEvents="none".
 */
export function FireParticles({ width, height }: FireParticlesProps) {
    const scaled = PARTICLES.map((p) => ({
        ...p,
        x: (p.x / 160) * width,
        initialY: (p.initialY / 240) * height,
        targetY: (p.targetY / 240) * height,
    }));

    return (
        <Svg
            width={width}
            height={height}
            style={{ position: 'absolute', top: 0, left: 0 }}
            pointerEvents="none"
        >
            {scaled.map((p, i) => (
                <FireParticle key={i} {...p} />
            ))}
        </Svg>
    );
}
