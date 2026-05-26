import "@/global.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from 'expo-splash-screen';
import { useFonts, NotoKufiArabic_400Regular, NotoKufiArabic_600SemiBold, NotoKufiArabic_900Black } from '@expo-google-fonts/noto-kufi-arabic';
import { RobotoCondensed_400Regular, RobotoCondensed_700Bold } from '@expo-google-fonts/roboto-condensed';

SplashScreen.preventAutoHideAsync();

import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useMemo, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "react-native-reanimated";
import { Platform } from "react-native";
import "@/lib/_core/nativewind-pressable";
import { ThemeProvider } from "@/lib/theme-provider";
import { GameProvider } from "@/lib/game/game-context";
import { MultiplayerProvider } from "@/lib/multiplayer/multiplayer-context";
import {
  SafeAreaFrameContext,
  SafeAreaInsetsContext,
  SafeAreaProvider,
  initialWindowMetrics,
} from "react-native-safe-area-context";
import type { EdgeInsets, Metrics, Rect } from "react-native-safe-area-context";

import { trpc, createTRPCClient } from "@/lib/trpc";
import { initManusRuntime, subscribeSafeAreaInsets } from "@/lib/_core/manus-runtime";

const DEFAULT_WEB_INSETS: EdgeInsets = { top: 0, right: 0, bottom: 0, left: 0 };
const DEFAULT_WEB_FRAME: Rect = { x: 0, y: 0, width: 0, height: 0 };

export default function RootLayout() {
  const initialInsets = initialWindowMetrics?.insets ?? DEFAULT_WEB_INSETS;
  const initialFrame = initialWindowMetrics?.frame ?? DEFAULT_WEB_FRAME;

  const [insets, setInsets] = useState<EdgeInsets>(initialInsets);
  const [frame, setFrame] = useState<Rect>(initialFrame);

  useEffect(() => {
    initManusRuntime();
  }, []);

  const [fontsLoaded] = useFonts({
    'DG-Bold': require('../assets/fonts/DG-Bold.ttf'),
    NotoKufiArabic_400Regular,
    NotoKufiArabic_600SemiBold,
    NotoKufiArabic_900Black,
    RobotoCondensed_400Regular,
    RobotoCondensed_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  const handleSafeAreaUpdate = useCallback((metrics: Metrics) => {
    setInsets(metrics.insets);
    setFrame(metrics.frame);
  }, []);

  useEffect(() => {
    if (Platform.OS !== "web") return;
    const unsubscribe = subscribeSafeAreaInsets(handleSafeAreaUpdate);
    return () => unsubscribe();
  }, [handleSafeAreaUpdate]);

  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      }),
  );
  const [trpcClient] = useState(() => createTRPCClient());

  const providerInitialMetrics = useMemo(() => {
    const metrics = initialWindowMetrics ?? { insets: initialInsets, frame: initialFrame };
    return {
      ...metrics,
      insets: {
        ...metrics.insets,
        top: Math.max(metrics.insets.top, 16),
        bottom: Math.max(metrics.insets.bottom, 12),
      },
    };
  }, [initialInsets, initialFrame]);

  if (!fontsLoaded) {
    return null;
  }

  const content = (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <GameProvider>
        <MultiplayerProvider>
          <trpc.Provider client={trpcClient} queryClient={queryClient}>
            <QueryClientProvider client={queryClient}>
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="screens/splash" options={{ animation: 'slide_from_right' }} />
                <Stack.Screen name="screens/game-mode" options={{ animation: 'slide_from_right' }} />
                <Stack.Screen name="screens/rounds-config" options={{ animation: 'slide_from_right' }} />
                <Stack.Screen name="screens/leaderboard" options={{ animation: 'slide_from_right' }} />
                <Stack.Screen name="screens/card-selection" options={{ animation: 'slide_from_right' }} />
                <Stack.Screen name="screens/battle" options={{ animation: 'slide_from_right' }} />
                <Stack.Screen name="screens/battle-results" options={{ animation: 'slide_from_right' }} />
                <Stack.Screen name="screens/difficulty" options={{ animation: 'slide_from_right' }} />
                <Stack.Screen name="screens/multiplayer-lobby" options={{ animation: 'slide_from_right' }} />
                <Stack.Screen name="screens/multiplayer-waiting" options={{ animation: 'slide_from_right' }} />
                <Stack.Screen name="screens/multiplayer-battle" options={{ animation: 'slide_from_right' }} />
                <Stack.Screen name="screens/multiplayer-results" options={{ animation: 'slide_from_right' }} />
                <Stack.Screen name="screens/stats" options={{ animation: 'slide_from_right' }} />
                <Stack.Screen name="screens/collection" options={{ animation: 'slide_from_right' }} />
                <Stack.Screen name="screens/cards-gallery" options={{ animation: 'slide_from_right' }} />
                <Stack.Screen name="screens/abilities" options={{ animation: 'slide_from_right' }} />
                <Stack.Screen name="screens/edit-ability" options={{ animation: 'slide_from_right' }} />
                <Stack.Screen name="screens/add-card" options={{ animation: 'slide_from_bottom' }} />
                <Stack.Screen name="oauth/callback" />
              </Stack>
              <StatusBar style="auto" />
            </QueryClientProvider>
          </trpc.Provider>
        </MultiplayerProvider>
      </GameProvider>
    </GestureHandlerRootView>
  );

  const shouldOverrideSafeArea = Platform.OS === "web";

  if (shouldOverrideSafeArea) {
    return (
      <ThemeProvider>
        <SafeAreaProvider initialMetrics={providerInitialMetrics}>
          <SafeAreaFrameContext.Provider value={frame}>
            <SafeAreaInsetsContext.Provider value={insets}>
              {content}
            </SafeAreaInsetsContext.Provider>
          </SafeAreaFrameContext.Provider>
        </SafeAreaProvider>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <SafeAreaProvider initialMetrics={providerInitialMetrics}>{content}</SafeAreaProvider>
    </ThemeProvider>
  );
}
