import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Wifi, WifiOff, LoaderCircle, CircleCheck, Radio } from 'lucide-react-native';
import { ThemedText } from './ThemedText';
import {
  RADIUS,
  SEMANTIC_COLOR,
  SPACE,
} from './design-tokens';

export type ConnectionBadgeState =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'waiting'
  | 'ready'
  | 'reconnecting'
  | 'disconnected'
  | 'failed'
  | 'discovering'
  | 'hosting';

export const CONNECTION_STATE_COPY: Record<ConnectionBadgeState, string> = {
  idle: 'غير متصل',
  connecting: 'جارٍ الاتصال',
  connected: 'متصل',
  waiting: 'انتظار الخصم',
  ready: 'جاهز',
  reconnecting: 'إعادة الاتصال',
  disconnected: 'انقطع الاتصال',
  failed: 'تعذر الاتصال',
  discovering: 'بحث محلي',
  hosting: 'غرفة محلية مفتوحة',
};

export function ConnectionBadge({
  state,
  label,
}: {
  state: ConnectionBadgeState;
  label?: string;
}) {
  const color =
    state === 'connected' || state === 'ready'
      ? SEMANTIC_COLOR.status.success
      : state === 'failed' || state === 'disconnected'
        ? SEMANTIC_COLOR.status.danger
        : state === 'connecting' || state === 'reconnecting' || state === 'discovering'
          ? SEMANTIC_COLOR.status.warning
          : SEMANTIC_COLOR.accent.secondary;

  const Icon =
    state === 'failed' || state === 'disconnected'
      ? WifiOff
      : state === 'connected' || state === 'ready'
        ? CircleCheck
        : state === 'connecting' || state === 'reconnecting'
          ? LoaderCircle
          : state === 'hosting' || state === 'discovering'
            ? Radio
            : Wifi;

  return (
    <View
      style={[styles.badge, { borderColor: `${color}88`, backgroundColor: `${color}16` }]}
      accessibilityLabel={label ?? CONNECTION_STATE_COPY[state]}
    >
      <Icon size={14} color={color} />
      <ThemedText type="caption" style={{ color }}>
        {label ?? CONNECTION_STATE_COPY[state]}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    minHeight: 32,
    paddingHorizontal: SPACE.sm,
    paddingVertical: SPACE.xs,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.xs,
    alignSelf: 'flex-start',
  },
});
