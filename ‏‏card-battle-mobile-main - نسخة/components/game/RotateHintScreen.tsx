import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

/**
 * Full-screen prompt shown whenever the app is in portrait mode.
 * Replaces any game screen so players know to rotate their device.
 */
export const RotateHintScreen: React.FC = () => (
    <SafeAreaView style={styles.root}>
        <View style={styles.inner}>
            <Text style={styles.icon}>📱</Text>
            <Text style={styles.arrow}>↺</Text>
            <Text style={styles.title}>أدر الشاشة</Text>
            <Text style={styles.subtitle}>Rotate your device to landscape</Text>
            <Text style={styles.hint}>
                هذه اللعبة تعمل في الوضع الأفقي فقط
            </Text>
        </View>
    </SafeAreaView>
);

export default RotateHintScreen;

const styles = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: '#0E0812',
        justifyContent: 'center',
        alignItems: 'center',
    },
    inner: {
        alignItems: 'center',
        gap: 12,
    },
    icon: {
        fontSize: 56,
    },
    arrow: {
        fontSize: 64,
        color: '#E4A52A',
        fontWeight: '700',
        lineHeight: 70,
    },
    title: {
        fontSize: 28,
        fontWeight: '700',
        color: '#E4A52A',
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 16,
        color: 'rgba(255,255,255,0.7)',
        textAlign: 'center',
    },
    hint: {
        fontSize: 13,
        color: 'rgba(255,255,255,0.4)',
        textAlign: 'center',
        marginTop: 8,
        paddingHorizontal: 32,
    },
});
