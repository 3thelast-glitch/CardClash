/**
 * CardPreview — Gallery wrapper for EpicCardTemplate
 * - Press-in: scale down to 0.95 + lift shadow
 * - Press-out: spring back to 1.0
 * - Hover: scale 1.05 (on web/pointer platforms via Pressable hovered state)
 */
import React, { useState } from 'react';
import { Pressable, ViewStyle, View, TouchableOpacity } from 'react-native';
import * as LucideIcons from 'lucide-react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
} from 'react-native-reanimated';
import { Card } from '@/lib/game/types';
import { EpicCardTemplate } from './epic-card-template';
import { getCardImage } from '@/lib/game/get-card-image';

// Gallery scale: ~160×220 from 350×480 base
const GALLERY_SCALE = 0.46;

interface CardPreviewProps {
    card: Card;
    onPress?: () => void;
    style?: ViewStyle;
    selected?: boolean;
}

export function CardPreview({ card, onPress, style, selected }: CardPreviewProps) {
    const scale = useSharedValue(1);

    // State for dev testing admin controls
    const [localRarity, setLocalRarity] = useState(card.rarity ?? 'common');
    const [isActive, setIsActive] = useState(true);

    const cycleRarity = () => {
        const rarities = ['common', 'rare', 'epic', 'legendary'];
        const currentIndex = rarities.indexOf(localRarity.toLowerCase());
        setLocalRarity(rarities[(currentIndex + 1) % rarities.length] as any);
    };

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    // Resolve image via centralised helper (returns null when no image)
    const cardImage = getCardImage(card);

    return (
        <Animated.View style={[animatedStyle, style, !isActive && { opacity: 0.5 }]}>
            <View className={!isActive ? "grayscale" : ""}>
                <Pressable
                    onPress={isActive ? onPress : undefined}
                    onPressIn={() => { if (isActive) scale.value = withSpring(0.94, { damping: 16, stiffness: 320 }); }}
                    onPressOut={() => { if (isActive) scale.value = withSpring(1.0, { damping: 12, stiffness: 220 }); }}
                    onHoverIn={() => { if (isActive) scale.value = withSpring(1.05, { damping: 14, stiffness: 260 }); }}
                    onHoverOut={() => { if (isActive) scale.value = withSpring(1.0, { damping: 12, stiffness: 220 }); }}
                    accessibilityRole="button"
                    accessibilityLabel={`${card.nameAr} card`}
                >
                    <EpicCardTemplate
                        imageSrc={cardImage}
                        nameAr={card.nameAr}
                        nameEn={card.nameEn ?? card.name}
                        hp={card.hp}
                        attack={card.attack}
                        defense={card.defense}
                        rarity={localRarity}
                        element={card.element}
                        emoji={card.emoji}
                        scale={GALLERY_SCALE}
                        selected={selected}
                    />
                </Pressable>

                {/* ─── DEV ADMIN CONTROLS ─── */}
                {__DEV__ && (
                    <View className="absolute top-4 left-4 right-4 z-50 flex-row justify-between pointer-events-auto">
                        <TouchableOpacity
                            onPress={() => setIsActive(!isActive)}
                            className={`w-8 h-8 rounded-full items-center justify-center border ${
                                !isActive ? 'bg-red-500/20 border-red-500/50' : 'bg-black/80 border-white/20'
                            }`}
                        >
                            <LucideIcons.Power size={14} color={!isActive ? '#ef4444' : '#fff'} />
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={cycleRarity}
                            className="w-8 h-8 rounded-full items-center justify-center bg-black/80 border border-white/20"
                        >
                            <LucideIcons.RefreshCw size={14} color="#38bdf8" />
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        </Animated.View>
    );
}
