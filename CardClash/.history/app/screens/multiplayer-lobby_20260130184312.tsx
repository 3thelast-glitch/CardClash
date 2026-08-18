import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { LuxuryBackground } from '@/components/game/luxury-background';
import { useMultiplayer } from '@/lib/multiplayer/multiplayer-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PLAYER_NAME_KEY = '@player_name';

export default function MultiplayerLobbyScreen() {
  const router = useRouter();
  const { state, connect, createRoom, joinRoom } = useMultiplayer();
  
  const [playerName, setPlayerName] = useState('');
  const [roomId, setRoomId] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [mode, setMode] = useState<'menu' | 'create' | 'join'>('menu');
  
  // تحميل اسم اللاعب المحفوظ
  useEffect(() => {
    loadPlayerName();
  }, []);
  
  // الاتصال بالخادم عند التحميل
  useEffect(() => {
    connectToServer();
  }, []);
  
  // الانتقال لشاشة الانتظار عند إنشاء/الانضمام للغرفة
  useEffect(() => {
    if (state.roomId && state.status === 'waiting') {
      router.push('/screens/multiplayer-waiting' as any);
    }
  }, [state.roomId, state.status]);
  
  const loadPlayerName = async () => {
    try {
      const saved = await AsyncStorage.getItem(PLAYER_NAME_KEY);
      if (saved) {
        setPlayerName(saved);
      }
    } catch (error) {
      console.error('Error loading player name:', error);
    }
  };
  
  const savePlayerName = async (name: string) => {
    try {
      await AsyncStorage.setItem(PLAYER_NAME_KEY, name);
    } catch (error) {
      console.error('Error saving player name:', error);
    }
  };
  
  const connectToServer = async () => {
    if (state.isConnected) return;
    
    setIsConnecting(true);
    try {
      await connect();
    } catch (error) {
      Alert.alert('خطأ في الاتصال', 'فشل الاتصال بالخادم. تحقق من اتصال الإنترنت.');
    } finally {
      setIsConnecting(false);
    }
  };
  
  const handleCreateRoom = () => {
    if (!playerName.trim()) {
      Alert.alert('خطأ', 'الرجاء إدخال اسمك');
      return;
    }
    
    if (!state.isConnected) {
      Alert.alert('خطأ', 'غير متصل بالخادم');
      return;
    }
    
    savePlayerName(playerName);
    createRoom(playerName);
  };
  
  const handleJoinRoom = () => {
    if (!playerName.trim()) {
      Alert.alert('خطأ', 'الرجاء إدخال اسمك');
      return;
    }
    
    if (!roomId.trim()) {
      Alert.alert('خطأ', 'الرجاء إدخال رمز الغرفة');
      return;
    }
    
    if (!state.isConnected) {
      Alert.alert('خطأ', 'غير متصل بالخادم');
      return;
    }
    
    savePlayerName(playerName);
    joinRoom(roomId.toUpperCase(), playerName);
  };
  
  if (isConnecting) {
    return (
      <ScreenContainer edges={['top', 'bottom', 'left', 'right']}>
        <LuxuryBackground>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FFD700" />
            <Text style={styles.loadingText}>جاري الاتصال بالخادم...</Text>
          </View>
        </LuxuryBackground>
      </ScreenContainer>
    );
  }
  
  return (
    <ScreenContainer edges={['top', 'bottom', 'left', 'right']}>
      <LuxuryBackground>
        <View style={styles.container}>
          {/* Title */}
          <Text style={styles.title}>اللعب الجماعي</Text>
          
          {/* Connection Status */}
          <View style={styles.statusContainer}>
            <View style={[styles.statusDot, state.isConnected && styles.statusDotConnected]} />
            <Text style={styles.statusText}>
              {state.isConnected ? 'متصل' : 'غير متصل'}
            </Text>
          </View>
          
          {/* Main Menu */}
          {mode === 'menu' && (
            <View style={styles.menuContainer}>
              <TouchableOpacity
                style={styles.button}
                onPress={() => setMode('create')}
                disabled={!state.isConnected}
              >
                <Text style={styles.buttonText}>إنشاء غرفة</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.button}
                onPress={() => setMode('join')}
                disabled={!state.isConnected}
              >
                <Text style={styles.buttonText}>الانضمام لغرفة</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => router.back()}
              >
                <Text style={styles.backButtonText}>رجوع</Text>
              </TouchableOpacity>
            </View>
          )}
          
          {/* Create Room */}
          {mode === 'create' && (
            <View style={styles.formContainer}>
              <Text style={styles.label}>اسمك:</Text>
              <TextInput
                style={styles.input}
                value={playerName}
                onChangeText={setPlayerName}
                placeholder="أدخل اسمك"
                placeholderTextColor="#999"
                maxLength={20}
              />
              
              <TouchableOpacity
                style={styles.button}
                onPress={handleCreateRoom}
              >
                <Text style={styles.buttonText}>إنشاء</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => setMode('menu')}
              >
                <Text style={styles.backButtonText}>رجوع</Text>
              </TouchableOpacity>
            </View>
          )}
          
          {/* Join Room */}
          {mode === 'join' && (
            <View style={styles.formContainer}>
              <Text style={styles.label}>اسمك:</Text>
              <TextInput
                style={styles.input}
                value={playerName}
                onChangeText={setPlayerName}
                placeholder="أدخل اسمك"
                placeholderTextColor="#999"
                maxLength={20}
              />
              
              <Text style={styles.label}>رمز الغرفة:</Text>
              <TextInput
                style={styles.input}
                value={roomId}
                onChangeText={(text) => setRoomId(text.toUpperCase())}
                placeholder="أدخل رمز الغرفة (مثال: ABC123)"
                placeholderTextColor="#999"
                maxLength={6}
                autoCapitalize="characters"
              />
              
              <TouchableOpacity
                style={styles.button}
                onPress={handleJoinRoom}
              >
                <Text style={styles.buttonText}>انضم</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => setMode('menu')}
              >
                <Text style={styles.backButtonText}>رجوع</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </LuxuryBackground>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 20,
    fontSize: 18,
    color: '#FFD700',
  },
  title: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#FFD700',
    textAlign: 'center',
    marginBottom: 20,
    textShadowColor: '#000',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#ff4444',
    marginRight: 8,
  },
  statusDotConnected: {
    backgroundColor: '#44ff44',
  },
  statusText: {
    fontSize: 16,
    color: '#ccc',
  },
  menuContainer: {
    gap: 20,
  },
  formContainer: {
    gap: 15,
  },
  label: {
    fontSize: 18,
    color: '#FFD700',
    marginBottom: 5,
  },
  input: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderWidth: 2,
    borderColor: '#FFD700',
    borderRadius: 10,
    padding: 15,
    fontSize: 18,
    color: '#fff',
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#FFD700',
    borderRadius: 15,
    padding: 18,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#000',
  },
  backButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 15,
    borderWidth: 2,
    borderColor: '#FFD700',
    padding: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  backButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFD700',
  },
});
