import React, { useEffect, useMemo, useState } from 'react';
import {
  AppState,
  StyleSheet,
  View,
  type ImageSourcePropType,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Sparkles } from 'lucide-react-native';
import type { Card } from '@/lib/game/types';
import { getCardMedia } from '@/lib/game/get-card-image';
import { getCardRarityVisual } from '@/lib/presentation/card-rarity-visuals';
import { useMotionPreferences } from '@/hooks/useMotionPreferences';
import { useSettings } from '@/lib/game/hooks/useSettings';
import { ThemedText } from '@/components/ui/ThemedText';
import { SEMANTIC_COLOR, SPACE } from '@/components/ui/design-tokens';

export const CARD_IMAGE_FIT_OVERRIDES: Record<string, 'cover' | 'contain'> = {
  ay_raikage: 'contain',
  bam: 'contain',
  trunks: 'contain',
  nelliel_tu: 'contain',
  emlyn_white: 'contain',
  riza_hawkeye: 'contain',
  leafa: 'contain',
  ebisu: 'contain',
  ino_yamanaka: 'contain',
  yosaku: 'contain',
  yonji: 'contain',
};

export interface CardArtworkProps {
  card: Card;
  imageSource?: ImageSourcePropType | null;
  mediaMode?: 'auto' | 'static';
  playAudio?: boolean;
  imageOffsetY?: number;
  fitInsideBorder?: boolean;
  style?: StyleProp<ViewStyle>;
}

function VideoSurface({
  source,
  contentFit,
  active,
  playAudio,
  style,
}: {
  source: string | number;
  contentFit: 'cover' | 'contain';
  active: boolean;
  playAudio: boolean;
  style: StyleProp<ViewStyle>;
}) {
  const [hasRenderedFirstFrame, setHasRenderedFirstFrame] = useState(false);
  const player = useVideoPlayer(source as never, (instance) => {
    instance.loop = true;
    instance.muted = !playAudio;
    instance.volume = playAudio ? 0.82 : 0;
    if (active) instance.play();
  });

  useEffect(() => {
    setHasRenderedFirstFrame(false);
  }, [source]);

  useEffect(() => {
    player.loop = true;
    player.muted = !playAudio;
    player.volume = playAudio ? 0.82 : 0;
    if (active) player.play();
    else player.pause();
  }, [active, playAudio, player]);

  return (
    <View style={style}>
      <VideoView
        player={player}
        style={StyleSheet.absoluteFill}
        contentFit={contentFit}
        nativeControls={false}
        surfaceType="textureView"
        useExoShutter={false}
        onFirstFrameRender={() => setHasRenderedFirstFrame(true)}
      />
      {!hasRenderedFirstFrame ? (
        <View
          testID="card-video-loading"
          pointerEvents="none"
          style={styles.videoLoadingCover}
        />
      ) : null}
    </View>
  );
}

/**
 * Media-only surface. It resolves local assets without mutating card data,
 * honors the existing image crop controls, and stops expensive video playback
 * when reduced-motion/background/static-grid policies require it.
 */
export function CardArtwork({
  card,
  imageSource,
  mediaMode = 'auto',
  playAudio = false,
  imageOffsetY = 0,
  fitInsideBorder = false,
  style,
}: CardArtworkProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const [appActive, setAppActive] = useState(AppState.currentState === 'active');
  const { reduceMotion } = useMotionPreferences();
  const { settings } = useSettings();
  const media = useMemo(() => getCardMedia(card), [
    card.id,
    card.rarity,
    card.imageUrl,
    card.finalImage,
    card.videoUrl,
    card.isRagedVersion,
    (card as Card & { customImage?: string }).customImage,
  ]);
  const resolvedImage = imageSource === undefined ? media.imageSource : imageSource;
  const contentFit = media.isCustomImage ? 'contain' : (CARD_IMAGE_FIT_OVERRIDES[card.id] ?? 'cover');
  const videoActive =
    mediaMode === 'auto' &&
    !reduceMotion &&
    settings.animationsEnabled &&
    appActive;
  const audioActive = playAudio && settings.soundEnabled && videoActive;
  const visual = getCardRarityVisual(media.rarity);

  const mediaStyle = useMemo<StyleProp<ViewStyle>>(() => {
    if (fitInsideBorder) {
      return [
        styles.absoluteMedia,
        {
          top: 5 + imageOffsetY,
          left: 5,
          right: 5,
          bottom: 5,
        },
      ];
    }
    return [styles.shiftedMedia, { top: imageOffsetY }];
  }, [fitInsideBorder, imageOffsetY]);

  useEffect(() => {
    setImageFailed(false);
  }, [card.id, imageSource, media.imageSource]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      setAppActive(state === 'active');
    });
    return () => subscription.remove();
  }, []);

  return (
    <View style={[styles.root, style]}>
      {media.videoSource && videoActive ? (
        <VideoSurface
          source={media.videoSource}
          contentFit={contentFit}
          active={videoActive}
          playAudio={audioActive}
          style={mediaStyle}
        />
      ) : resolvedImage && !imageFailed ? (
        <Image
          source={resolvedImage as never}
          style={mediaStyle as never}
          contentFit={contentFit}
          cachePolicy="memory-disk"
          transition={reduceMotion ? 0 : 140}
          onError={() => setImageFailed(true)}
          accessible={false}
        />
      ) : (
        <LinearGradient colors={visual.surfaceGradient} style={[StyleSheet.absoluteFill, styles.fallback]}>
          <Sparkles size={28} color={visual.color} />
          <ThemedText type="caption" style={styles.fallbackText}>الصورة غير متاحة</ThemedText>
        </LinearGradient>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFillObject, overflow: 'hidden' },
  absoluteMedia: { position: 'absolute' },
  shiftedMedia: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: '100%',
  },
  videoLoadingCover: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: SEMANTIC_COLOR.background.arena,
  },
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACE.sm,
  },
  fallbackText: { color: SEMANTIC_COLOR.text.secondary },
});
