import { View, Text, ScrollView, Pressable, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { LuxuryBackground } from '@/components/game/luxury-background';
import { useState, useEffect } from 'react';
import { loadStats, resetStats } from '@/lib/stats/storage';
import { PlayerStats } from '@/lib/stats/types';

export default function StatsScreen() {
  const router = useRouter();
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStatsData();
  }, []);

  const loadStatsData = async () => {
    setLoading(true);
    const data = await loadStats();
    setStats(data);
    setLoading(false);
  };

  const handleReset = () => {
    Alert.alert(
      'إعادة تعيين الإحصائيات',
      'هل أنت متأكد من رغبتك في حذف جميع الإحصائيات؟',
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'حذف',
          style: 'destructive',
          onPress: async () => {
            await resetStats();
            await loadStatsData();
          },
        },
      ]
    );
  };

  const winRate = stats && stats.totalMatches > 0
    ? ((stats.totalWins / stats.totalMatches) * 100).toFixed(1)
    : '0.0';

  const elementStatsArray = stats
    ? Object.values(stats.elementStats).sort((a, b) => b.timesUsed - a.timesUsed)
    : [];

  if (loading) {
    return (
      <ScreenContainer edges={['top', 'bottom', 'left', 'right']}>
        <LuxuryBackground>
          <View className="flex-1 items-center justify-center">
            <Text className="text-2xl font-bold text-yellow-400">جاري التحميل...</Text>
          </View>
        </LuxuryBackground>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer edges={['top', 'bottom', 'left', 'right']}>
      <LuxuryBackground>
        <ScrollView className="flex-1 px-6 py-8">
          {/* Title */}
          <Text className="text-4xl font-bold text-yellow-400 text-center mb-8">
            الإحصائيات
          </Text>

          {/* General Stats */}
          <View className="bg-black/30 rounded-2xl p-6 mb-6 border-2 border-yellow-600/50">
            <Text className="text-2xl font-bold text-yellow-400 mb-4 text-center">
              الإحصائيات العامة
            </Text>
            
            <View className="flex-row justify-between mb-3">
              <Text className="text-lg text-gray-300">إجمالي المباريات:</Text>
              <Text className="text-lg font-bold text-yellow-400">{stats?.totalMatches || 0}</Text>
            </View>
            
            <View className="flex-row justify-between mb-3">
              <Text className="text-lg text-gray-300">الانتصارات:</Text>
              <Text className="text-lg font-bold text-green-400">{stats?.totalWins || 0}</Text>
            </View>
            
            <View className="flex-row justify-between mb-3">
              <Text className="text-lg text-gray-300">الهزائم:</Text>
              <Text className="text-lg font-bold text-red-400">{stats?.totalLosses || 0}</Text>
            </View>
            
            <View className="flex-row justify-between mb-3">
              <Text className="text-lg text-gray-300">التعادلات:</Text>
              <Text className="text-lg font-bold text-gray-400">{stats?.totalDraws || 0}</Text>
            </View>
            
            <View className="flex-row justify-between">
              <Text className="text-lg text-gray-300">نسبة الفوز:</Text>
              <Text className="text-lg font-bold text-yellow-400">{winRate}%</Text>
            </View>
          </View>

          {/* Best Results */}
          <View className="bg-black/30 rounded-2xl p-6 mb-6 border-2 border-yellow-600/50">
            <Text className="text-2xl font-bold text-yellow-400 mb-4 text-center">
              أفضل النتائج
            </Text>
            
            <View className="flex-row justify-between mb-3">
              <Text className="text-lg text-gray-300">أطول سلسلة انتصارات:</Text>
              <Text className="text-lg font-bold text-yellow-400">{stats?.bestWinStreak || 0}</Text>
            </View>
            
            <View className="flex-row justify-between mb-3">
              <Text className="text-lg text-gray-300">السلسلة الحالية:</Text>
              <Text className="text-lg font-bold text-green-400">{stats?.currentWinStreak || 0}</Text>
            </View>
            
            <View className="flex-row justify-between">
              <Text className="text-lg text-gray-300">أعلى نتيجة:</Text>
              <Text className="text-lg font-bold text-yellow-400">{stats?.highestScore || 0}</Text>
            </View>
          </View>

          {/* Element Stats */}
          {elementStatsArray.length > 0 && (
            <View className="bg-black/30 rounded-2xl p-6 mb-6 border-2 border-yellow-600/50">
              <Text className="text-2xl font-bold text-yellow-400 mb-4 text-center">
                إحصائيات العناصر
              </Text>
              
              {elementStatsArray.map((element) => (
                <View key={element.element} className="mb-4 pb-4 border-b border-gray-700">
                  <Text className="text-xl font-bold text-yellow-400 mb-2">
                    {element.element}
                  </Text>
                  <View className="flex-row justify-between">
                    <Text className="text-sm text-gray-300">
                      الاستخدام: {element.timesUsed}
                    </Text>
                    <Text className="text-sm text-green-400">
                      الفوز: {element.wins}
                    </Text>
                    <Text className="text-sm text-red-400">
                      الخسارة: {element.losses}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Match History */}
          {stats && stats.matchHistory.length > 0 && (
            <View className="bg-black/30 rounded-2xl p-6 mb-6 border-2 border-yellow-600/50">
              <Text className="text-2xl font-bold text-yellow-400 mb-4 text-center">
                آخر المباريات
              </Text>
              
              {stats.matchHistory.map((match, index) => (
                <View key={match.id} className="mb-4 pb-4 border-b border-gray-700">
                  <View className="flex-row justify-between items-center mb-2">
                    <Text className="text-lg font-bold text-gray-300">
                      مباراة #{stats.matchHistory.length - index}
                    </Text>
                    <Text className={`text-lg font-bold ${
                      match.winner === 'player' ? 'text-green-400' :
                      match.winner === 'bot' ? 'text-red-400' : 'text-gray-400'
                    }`}>
                      {match.winner === 'player' ? 'فوز' :
                       match.winner === 'bot' ? 'هزيمة' : 'تعادل'}
                    </Text>
                  </View>
                  <Text className="text-sm text-gray-400">
                    النتيجة: {match.playerScore} - {match.botScore}
                  </Text>
                  <Text className="text-sm text-gray-400">
                    الجولات: {match.totalRounds}
                  </Text>
                  <Text className="text-sm text-gray-400">
                    الصعوبة: {match.difficulty === 'easy' ? 'سهل' : match.difficulty === 'medium' ? 'متوسط' : 'صعب'}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Buttons */}
          <View className="gap-4 mb-8">
            <Pressable
              onPress={handleReset}
              style={({ pressed }) => [
                {
                  opacity: pressed ? 0.7 : 1,
                  transform: [{ scale: pressed ? 0.97 : 1 }],
                },
              ]}
              className="bg-red-600 rounded-full py-4 px-8"
            >
              <Text className="text-white text-xl font-bold text-center">
                إعادة تعيين الإحصائيات
              </Text>
            </Pressable>

            <Pressable
              onPress={() => router.back()}
              style={({ pressed }) => [
                {
                  opacity: pressed ? 0.7 : 1,
                  transform: [{ scale: pressed ? 0.97 : 1 }],
                },
              ]}
              className="bg-gray-600 rounded-full py-4 px-8"
            >
              <Text className="text-white text-xl font-bold text-center">
                رجوع
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </LuxuryBackground>
    </ScreenContainer>
  );
}
