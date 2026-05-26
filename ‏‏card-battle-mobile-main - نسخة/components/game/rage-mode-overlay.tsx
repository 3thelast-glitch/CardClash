/**
 * RageModeOverlay.tsx
 * شاشة Overlay تظهر لحظة تفعيل وضع الغضب
 * — تعرض فيديو التحول إن وُجد، وإلا تعرض صورة الغضب مع تأثير بصري
 * — زر "تفعيل الغضب" يُفعّل handleRageActivate عبر onConfirm
 * — زر "تخطي" يُغلق الـ overlay بدون تفعيل
 */
import React, { useEffect, useRef } from 'react';
import {
  View,
  Image,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Text,
  Platform,
} from 'react-native';
import type { RageTriggerEvent } from '@/lib/game/rage-engine';
import type { Card } from '@/lib/game/types';
import { getCardImage } from '@/lib/game/get-card-image';

interface Props {
  event: RageTriggerEvent | null;
  onDismiss: () => void;
  /** Called when the player confirms rage activation — receives the boosted rage card */
  onConfirm?: (rageCard: Card) => void;
}

export function RageModeOverlay({ event, onDismiss, onConfirm }: Props) {
  const opacity  = useRef(new Animated.Value(0)).current;
  const scale    = useRef(new Animated.Value(0.75)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const btnPulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!event) {
      // ريسيت عند الإغلاق
      opacity.setValue(0);
      scale.setValue(0.75);
      glowAnim.setValue(0);
      btnPulse.setValue(1);
      return;
    }
    // انتر
    Animated.parallel([
      Animated.spring(opacity, { toValue: 1, useNativeDriver: true, damping: 18, stiffness: 200 }),
      Animated.spring(scale,   { toValue: 1, useNativeDriver: true, damping: 14, stiffness: 180 }),
    ]).start();

    // توهج لا نهائي
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0, duration: 700, useNativeDriver: true }),
      ])
    ).start();

    // نبض زر التفعيل
    Animated.loop(
      Animated.sequence([
        Animated.timing(btnPulse, { toValue: 1.06, duration: 600, useNativeDriver: true }),
        Animated.timing(btnPulse, { toValue: 1,    duration: 600, useNativeDriver: true }),
      ])
    ).start();
  }, [event]);

  if (!event) return null;

  const glowOpacity = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.85] });

  const handleConfirmPress = () => {
    if (onConfirm) {
      onConfirm(event.rageCard);
    } else {
      // fallback: إغلاق فقط إذا لم يُمرَّر onConfirm
      onDismiss();
    }
  };

  return (
    <View style={s.backdrop}>
      {/* توهج الخلفية */}
      <Animated.View style={[s.glow, { opacity: glowOpacity }]} />

      <Animated.View style={[s.card, { opacity, transform: [{ scale }] }]}>
        {/* اسم وضع الغضب */}
        <Text style={s.rageName}>
          {event.rageCard.nameAr ?? event.rageCard.name}
        </Text>
        <Text style={s.rageTag}>⚡ وضع الغضب ⚡</Text>

        {/* فيديو أو صورة */}
        {(() => {
          const imageSrc = getCardImage(event.rageCard);
          const videoSrc = event.videoUrl || (event.rageCard as any).videoUrl;
          
          if (videoSrc) {
            return <VideoPlayer uri={videoSrc} onEnd={() => {}} />;
          }
          if (imageSrc) {
            return (
              <Image
                source={imageSrc}
                style={s.rageImage}
                resizeMode="contain"
              />
            );
          }
          return null;
        })()}

        {/* مؤشر الزيادة */}
        <View style={s.boostRow}>
          {event.rageCard.attack !== event.card.attack && (
            <View style={[s.boostBadge, { borderColor: '#f87171' }]}>
              <Text style={[s.boostIcon]}>⚔️</Text>
              <Text style={[s.boostVal, { color: '#f87171' }]}>
                {event.card.attack} → {event.rageCard.attack}
              </Text>
            </View>
          )}
          {event.rageCard.defense !== event.card.defense && (
            <View style={[s.boostBadge, { borderColor: '#60a5fa' }]}>
              <Text style={s.boostIcon}>🛡️</Text>
              <Text style={[s.boostVal, { color: '#60a5fa' }]}>
                {event.card.defense} → {event.rageCard.defense}
              </Text>
            </View>
          )}
        </View>

        {/* أزرار: تفعيل الغضب + تخطي */}
        <View style={s.btnRow}>
          <Animated.View style={{ transform: [{ scale: btnPulse }] }}>
            <TouchableOpacity style={s.confirmBtn} onPress={handleConfirmPress} activeOpacity={0.75}>
              <Text style={s.confirmTxt}>😡 تفعيل الغضب ⚡</Text>
            </TouchableOpacity>
          </Animated.View>

          <TouchableOpacity style={s.dismissBtn} onPress={onDismiss} activeOpacity={0.75}>
            <Text style={s.dismissTxt}>تخطي ▸</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
}

// ── مشغّل الفيديو (web only placeholder) ──
function VideoPlayer({ uri, onEnd }: { uri: string; onEnd: () => void }) {
  if (Platform.OS === 'web') {
    return (
      <video
        src={uri}
        autoPlay
        playsInline
        muted={false}
        style={{ width: 220, height: 280, borderRadius: 14, objectFit: 'contain', background: '#000' }}
        onEnded={onEnd}
      />
    );
  }
  // React Native — استخدم expo-av إذا أردت دعم نيتف
  return (
    <View style={{ width: 220, height: 280, backgroundColor: '#111', borderRadius: 14, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: '#a78bfa', fontSize: 36 }}>🎦</Text>
      <Text style={{ color: '#888', fontSize: 11, marginTop: 6 }}>فيديو التحول</Text>
    </View>
  );
}

const RAGE_COLOR = '#f59e0b';

const s = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.88)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  glow: {
    position: 'absolute',
    width: 380,
    height: 380,
    borderRadius: 190,
    backgroundColor: RAGE_COLOR,
    shadowColor: RAGE_COLOR,
    shadowOpacity: 1,
    shadowRadius: 80,
    shadowOffset: { width: 0, height: 0 },
  },
  card: {
    backgroundColor: 'rgba(12,10,6,0.97)',
    borderRadius: 24,
    borderWidth: 2,
    borderColor: RAGE_COLOR,
    padding: 22,
    alignItems: 'center',
    gap: 12,
    width: 300,
    shadowColor: RAGE_COLOR,
    shadowOpacity: 0.8,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 0 },
    elevation: 20,
  },
  rageName: {
    fontSize: 22,
    fontWeight: '900',
    color: RAGE_COLOR,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  rageTag: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff7e6',
    letterSpacing: 2,
    opacity: 0.8,
  },
  rageImage: {
    width: 220,
    height: 280,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: RAGE_COLOR + '55',
  },
  boostRow: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  boostBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  boostIcon: { fontSize: 14 },
  boostVal: {
    fontSize: 14,
    fontWeight: '800',
  },
  btnRow: {
    flexDirection: 'column',
    gap: 8,
    alignItems: 'center',
    marginTop: 4,
    width: '100%',
  },
  confirmBtn: {
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: '#ef4444',
    backgroundColor: 'rgba(239,68,68,0.25)',
    shadowColor: '#ef4444',
    shadowOpacity: 0.7,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  confirmTxt: {
    color: '#fca5a5',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1,
    textAlign: 'center',
  },
  dismissBtn: {
    paddingHorizontal: 24,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  dismissTxt: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
});
