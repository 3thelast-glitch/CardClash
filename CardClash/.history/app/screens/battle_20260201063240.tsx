import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Modal, ScrollView, PanResponder, Animated as RNAnimated, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
} from 'react-native-reanimated';
import { ScreenContainer } from '@/components/screen-container';
import { CardItem } from '@/components/game/card-item';
import { ElementEffect } from '@/components/game/element-effect';
import { LuxuryBackground } from '@/components/game/luxury-background';
import { useGame } from '@/lib/game/game-context';
import { ELEMENT_EMOJI, ElementAdvantage } from '@/lib/game/types';
import { getAbilityNameAr } from '@/lib/game/ability-names';

type BattlePhase = 'showing' | 'fighting' | 'result' | 'waiting';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CENTER_X = SCREEN_WIDTH / 2;
const CENTER_Y = SCREEN_HEIGHT / 2;

const getAdvantageColor = (advantage: ElementAdvantage): string => {
  switch (advantage) {
    case 'strong':
      return '#4ade80';
    case 'weak':
      return '#f87171';
    default:
      return '#a0a0a0';
  }
};

const getAdvantageText = (advantage: ElementAdvantage): string => {
  switch (advantage) {
    case 'strong':
      return '⬆️ قوي';
    case 'weak':
      return '⬇️ ضعيف';
    default:
      return '';
  }
};

// ✅ حدود الصفحة
const PageBorders = () => {
  return (
    <View style={styles.pageBorders} pointerEvents="none">
      <View style={styles.borderTop} />
      <View style={styles.borderBottom} />
      <View style={styles.borderLeft} />
      <View style={styles.borderRight} />
      
      <View style={[styles.corner, styles.cornerTopLeft]} />
      <View style={[styles.corner, styles.cornerTopRight]} />
      <View style={[styles.corner, styles.cornerBottomLeft]} />
      <View style={[styles.corner, styles.cornerBottomRight]} />
    </View>
  );
};

// ✅ شبكة إرشادية
const GridOverlay = () => {
  return (
    <View style={styles.gridContainer} pointerEvents="none">
      <View style={styles.verticalLine} />
      <View style={styles.horizontalLine} />
      <View style={[styles.verticalLineThin, { left: '25%' }]} />
      <View style={[styles.verticalLineThin, { left: '75%' }]} />
      <View style={[styles.horizontalLineThin, { top: '25%' }]} />
      <View style={[styles.horizontalLineThin, { top: '75%' }]} />
      <View style={styles.centerDot} />
      
      <View style={[styles.quadrantLabel, { left: '25%', top: '25%' }]}>
        <Text style={styles.quadrantText}>↖</Text>
      </View>
      <View style={[styles.quadrantLabel, { left: '75%', top: '25%' }]}>
        <Text style={styles.quadrantText}>↗</Text>
      </View>
      <View style={[styles.quadrantLabel, { left: '25%', top: '75%' }]}>
        <Text style={styles.quadrantText}>↙</Text>
      </View>
      <View style={[styles.quadrantLabel, { left: '75%', top: '75%' }]}>
        <Text style={styles.quadrantText}>↘</Text>
      </View>
    </View>
  );
};

// ✅ Sidebar جانبي
const EditSidebar = ({ 
  visible, 
  onClose, 
  elements, 
  onElementUpdate,
  showGrid,
  onToggleGrid,
  snapToGrid,
  onToggleSnap,
  onResetLayout 
}: any) => {
  const slideAnim = useRef(new RNAnimated.Value(-300)).current;

  useEffect(() => {
    RNAnimated.timing(slideAnim, {
      toValue: visible ? 0 : -300,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [visible]);

  return (
    <RNAnimated.View style={[
      styles.sidebar,
      { transform: [{ translateX: slideAnim }] }
    ]}>
      <View style={styles.sidebarHeader}>
        <Text style={styles.sidebarTitle}>🎨 أدوات التحرير</Text>
        <TouchableOpacity onPress={onClose} style={styles.sidebarCloseButton}>
          <Text style={styles.sidebarCloseButtonText}>✕</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.sidebarContent}>
        <View style={styles.sidebarSection}>
          <Text style={styles.sidebarSectionTitle}>⚙️ إعدادات الشبكة</Text>
          
          <TouchableOpacity
            style={[styles.sidebarOption, showGrid && styles.sidebarOptionActive]}
            onPress={onToggleGrid}
          >
            <Text style={styles.sidebarOptionText}>
              {showGrid ? '✓' : '○'} إظهار الشبكة
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.sidebarOption, snapToGrid && styles.sidebarOptionActive]}
            onPress={onToggleSnap}
          >
            <Text style={styles.sidebarOptionText}>
              {snapToGrid ? '✓' : '○'} التقاط تلقائي
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.sidebarSection}>
          <Text style={styles.sidebarSectionTitle}>📦 العناصر</Text>
          
          {Object.entries(elements).map(([key, value]: [string, any]) => (
            <View key={key} style={styles.elementItem}>
              <Text style={styles.elementItemLabel}>
                {key === 'playerCard' ? '👤 بطاقة اللاعب' :
                 key === 'botCard' ? '🤖 بطاقة البوت' :
                 key === 'vs' ? '⚔️ VS' :
                 key === 'score' ? '📊 النقاط' :
                 key === 'round' ? '🔢 الجولة' :
                 key === 'result' ? '🏆 النتيجة' :
                 key === 'abilities' ? '🎮 القدرات' : key}
              </Text>
              <View style={styles.elementItemControls}>
                <Text style={styles.elementItemValue}>
                  الحجم: {Math.round(value.scale * 100)}%
                </Text>
                <Text style={styles.elementItemValue}>
                  X: {value.x.toFixed(0)} Y: {value.y.toFixed(0)}
                </Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.sidebarSection}>
          <Text style={styles.sidebarSectionTitle}>⚡ إجراءات سريعة</Text>
          
          <TouchableOpacity
            style={styles.sidebarActionButton}
            onPress={onResetLayout}
          >
            <Text style={styles.sidebarActionButtonText}>🔄 إعادة ضبط الكل</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.sidebarActionButton, styles.sidebarActionButtonSecondary]}
            onPress={() => {
              const newElements = { ...elements };
              newElements.playerCard.y = 0;
              newElements.botCard.y = 0;
              newElements.vs.y = 0;
              Object.keys(newElements).forEach(key => {
                onElementUpdate(key, newElements[key as keyof typeof newElements]);
              });
            }}
          >
            <Text style={styles.sidebarActionButtonText}>↔️ محاذاة أفقية</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.sidebarActionButton, styles.sidebarActionButtonSecondary]}
            onPress={() => {
              const newElements = { ...elements };
              newElements.score.x = 0;
              newElements.round.x = 0;
              newElements.vs.x = 0;
              Object.keys(newElements).forEach(key => {
                onElementUpdate(key, newElements[key as keyof typeof newElements]);
              });
            }}
          >
            <Text style={styles.sidebarActionButtonText}>↕️ محاذاة عمودية</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.sidebarSection}>
          <Text style={styles.sidebarSectionTitle}>🎮 ترتيب القدرات</Text>
          
          <TouchableOpacity
            style={[styles.sidebarActionButton, styles.sidebarActionButtonSecondary]}
            onPress={() => {
              const abilities = elements.abilities;
              const newX = -abilities.y;
              const newY = abilities.x;
              onElementUpdate('abilities', { ...abilities, x: newX, y: newY });
            }}
          >
            <Text style={styles.sidebarActionButtonText}>🔄 تدوير 90°</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.sidebarActionButton, styles.sidebarActionButtonSecondary]}
            onPress={() => {
              const abilities = elements.abilities;
              onElementUpdate('abilities', { ...abilities, x: 0, y: 300 });
            }}
          >
            <Text style={styles.sidebarActionButtonText}>↔️ ترتيب أفقي (أسفل)</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.sidebarActionButton, styles.sidebarActionButtonSecondary]}
            onPress={() => {
              const abilities = elements.abilities;
              onElementUpdate('abilities', { ...abilities, x: -300, y: 0 });
            }}
          >
            <Text style={styles.sidebarActionButtonText}>↕️ ترتيب عمودي (يسار)</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.sidebarSection}>
          <Text style={styles.sidebarInfoText}>
            💡 اسحب العناصر بحرية{'\n'}
            📐 استخدم الشبكة للتوزيع المتوازن{'\n'}
            🎯 احفظ التخطيط عند الانتهاء
          </Text>
        </View>
      </ScrollView>
    </RNAnimated.View>
  );
};

// ✅ مقبض تكبير واحد
const ResizeHandle = ({ 
  position, 
  onResizeStart, 
  onResizeMove, 
  onResizeEnd 
}: any) => {
  const initialScale = useRef(1);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      
      onPanResponderGrant: (evt) => {
        evt.stopPropagation();
        initialScale.current = onResizeStart();
      },
      
      onPanResponderMove: (evt, gestureState) => {
        evt.stopPropagation();
        
        let scaleDelta = 0;
        
        if (position.includes('corner')) {
          const distance = Math.sqrt(
            gestureState.dx ** 2 + gestureState.dy ** 2
          );
          const direction = gestureState.dx + gestureState.dy > 0 ? 1 : -1;
          scaleDelta = (distance * direction) / 200;
        } else if (position === 'top' || position === 'bottom') {
          scaleDelta = gestureState.dy / 200;
        } else {
          scaleDelta = gestureState.dx / 200;
        }
        
        onResizeMove(position, initialScale.current + scaleDelta);
      },
      
      onPanResponderRelease: () => {
        onResizeEnd();
      },
    })
  ).current;

  return (
    <View
      {...panResponder.panHandlers}
      style={[
        styles.resizeHandle,
        styles[`resizeHandle_${position.replace('-', '')}`],
      ]}
    >
      <View style={styles.resizeHandleInner} />
    </View>
  );
};

// ✅ مقابض التحويل
const TransformHandles = ({ 
  scale, 
  onScaleChange, 
  onResizeStart,
  onResizeMove,
  onResizeEnd,
  minScale, 
  maxScale 
}: any) => {
  const positions = [
    'top-left',
    'top-right',
    'bottom-left',
    'bottom-right',
    'top',
    'bottom',
    'left',
    'right',
  ];

  return (
    <View style={styles.transformHandlesContainer} pointerEvents="box-none">
      {positions.map((pos) => (
        <ResizeHandle
          key={pos}
          position={pos}
          onResizeStart={onResizeStart}
          onResizeMove={onResizeMove}
          onResizeEnd={onResizeEnd}
        />
      ))}
      
      <View style={styles.centerDotHandle} pointerEvents="none">
        <View style={styles.centerDotInner} />
      </View>
    </View>
  );
};

// ✅ Component قابل للسحب والتكبير مع زر ثابت الحجم
const DraggableResizable = ({ 
  children, 
  id, 
  initialX = 0, 
  initialY = 0, 
  initialScale = 1, 
  onUpdate, 
  minScale = 0.5, 
  maxScale = 2.5, 
  snapToGrid = false 
}: any) => {
  const [scale, setScale] = useState(initialScale);
  const [isResizing, setIsResizing] = useState(false);
  
  const position = useRef({ x: CENTER_X + initialX, y: CENTER_Y + initialY });
  const pan = useRef(new RNAnimated.ValueXY(position.current)).current;
  
  useEffect(() => {
    const newPos = { x: CENTER_X + initialX, y: CENTER_Y + initialY };
    position.current = newPos;
    pan.setValue(newPos);
    setScale(initialScale);
  }, [initialX, initialY, initialScale]);

  const handleResizeStart = () => {
    setIsResizing(true);
    return scale;
  };

  const handleResizeMove = (position: string, newScale: number) => {
    const clampedScale = Math.max(minScale, Math.min(maxScale, newScale));
    setScale(clampedScale);
  };

  const handleResizeEnd = () => {
    setIsResizing(false);
    if (onUpdate) {
      onUpdate(id, {
        x: position.current.x - CENTER_X,
        y: position.current.y - CENTER_Y,
        scale,
      });
    }
  };

  const handleScaleChange = (delta: number) => {
    const newScale = Math.max(minScale, Math.min(maxScale, scale + delta));
    setScale(newScale);
    if (onUpdate) {
      onUpdate(id, {
        x: position.current.x - CENTER_X,
        y: position.current.y - CENTER_Y,
        scale: newScale,
      });
    }
  };

  const calculateBounds = () => {
    const margin = 100;
    return {
      minX: margin,
      maxX: SCREEN_WIDTH - margin,
      minY: margin,
      maxY: SCREEN_HEIGHT - margin,
    };
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !isResizing,
      onMoveShouldSetPanResponder: () => !isResizing,
      
      onPanResponderGrant: () => {
        pan.setOffset({
          x: position.current.x,
          y: position.current.y,
        });
        pan.setValue({ x: 0, y: 0 });
      },
      
      onPanResponderMove: RNAnimated.event(
        [null, { dx: pan.x, dy: pan.y }],
        { useNativeDriver: false }
      ),
      
      onPanResponderRelease: (evt, gestureState) => {
        pan.flattenOffset();
        
        let finalX = position.current.x + gestureState.dx;
        let finalY = position.current.y + gestureState.dy;

        const bounds = calculateBounds();
        finalX = Math.max(bounds.minX, Math.min(bounds.maxX, finalX));
        finalY = Math.max(bounds.minY, Math.min(bounds.maxY, finalY));

        if (snapToGrid) {
          const gridSize = 50;
          finalX = Math.round(finalX / gridSize) * gridSize;
          finalY = Math.round(finalY / gridSize) * gridSize;
        }

        position.current = { x: finalX, y: finalY };
        
        RNAnimated.spring(pan, {
          toValue: { x: finalX, y: finalY },
          useNativeDriver: false,
          friction: 8,
          tension: 40,
        }).start();

        if (onUpdate) {
          onUpdate(id, {
            x: finalX - CENTER_X,
            y: finalY - CENTER_Y,
            scale,
          });
        }
      },
    })
  ).current;

  return (
    <RNAnimated.View
      style={[{ position: 'absolute', left: 0, top: 0 }]}
      {...panResponder.panHandlers}
    >
      {/* ✅ المحتوى المُكبَّر */}
      <RNAnimated.View
        style={{
          transform: [
            { translateX: pan.x },
            { translateY: pan.y },
            { translateX: -50 },
            { translateY: -50 },
            { scale },
          ],
        }}
      >
        <View style={styles.draggableContainer}>
          {children}
          
          <TransformHandles
            scale={scale}
            onScaleChange={handleScaleChange}
            onResizeStart={handleResizeStart}
            onResizeMove={handleResizeMove}
            onResizeEnd={handleResizeEnd}
            minScale={minScale}
            maxScale={maxScale}
          />
        </View>
      </RNAnimated.View>
      
      {/* ✅ الزر الثابت خارج Scale */}
      <RNAnimated.View
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          transform: [
            { translateX: pan.x },
            { translateY: pan.y },
          ],
        }}
        pointerEvents="box-none"
      >
        <View style={styles.fixedScaleControls} pointerEvents="auto">
          <TouchableOpacity
            style={[styles.scaleControlButton, scale <= minScale && styles.scaleControlButtonDisabled]}
            onPress={(e) => {
              e.stopPropagation();
              handleScaleChange(-0.1);
            }}
            disabled={scale <= minScale}
          >
            <Text style={styles.scaleControlButtonText}>−</Text>
          </TouchableOpacity>
          
          <View style={styles.scaleControlDisplay}>
            <Text style={styles.scaleControlText}>{Math.round(scale * 100)}%</Text>
          </View>
          
          <TouchableOpacity
            style={[styles.scaleControlButton, scale >= maxScale && styles.scaleControlButtonDisabled]}
            onPress={(e) => {
              e.stopPropagation();
              handleScaleChange(0.1);
            }}
            disabled={scale >= maxScale}
          >
            <Text style={styles.scaleControlButtonText}>+</Text>
          </TouchableOpacity>
        </View>
      </RNAnimated.View>
    </RNAnimated.View>
  );
};
// ✅ Main BattleScreen Component
export default function BattleScreen() {
  const router = useRouter();
  const {
    state,
    playRound,
    isGameOver,
    currentPlayerCard,
    currentBotCard,
    lastRoundResult,
    useAbility,
  } = useGame();

  const [phase, setPhase] = useState<BattlePhase>('showing');
  const [showResult, setShowResult] = useState(false);
  const [showPlayerEffect, setShowPlayerEffect] = useState(false);
  const [showBotEffect, setShowBotEffect] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  const [editMode, setEditMode] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [snapToGrid, setSnapToGrid] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  
  const [elements, setElements] = useState({
    playerCard: { x: -150, y: 150, scale: 1, minScale: 0.5, maxScale: 2 },
    botCard: { x: 150, y: 150, scale: 1, minScale: 0.5, maxScale: 2 },
    vs: { x: 0, y: 150, scale: 1, minScale: 0.5, maxScale: 2.5 },
    score: { x: 0, y: -200, scale: 1, minScale: 0.6, maxScale: 2 },
    round: { x: 0, y: -250, scale: 1, minScale: 0.6, maxScale: 2 },
    result: { x: 0, y: 250, scale: 1, minScale: 0.7, maxScale: 2.5 },
    abilities: { x: -300, y: 0, scale: 1, minScale: 0.5, maxScale: 1.8 },
  });

  const playerCardScale = useSharedValue(0);
  const botCardScale = useSharedValue(0);
  const vsOpacity = useSharedValue(0);
  const resultOpacity = useSharedValue(0);

  useEffect(() => {
    if (currentPlayerCard && currentBotCard && phase === 'showing' && !editMode) {
      playerCardScale.value = 0;
      botCardScale.value = 0;
      vsOpacity.value = 0;
      resultOpacity.value = 0;
      setShowResult(false);
      setShowPlayerEffect(false);
      setShowBotEffect(false);

      playerCardScale.value = withDelay(100, withTiming(1, { duration: 300 }));
      botCardScale.value = withDelay(300, withTiming(1, { duration: 300 }));
      vsOpacity.value = withDelay(500, withTiming(1, { duration: 200 }));

      setTimeout(() => {
        setPhase('fighting');
      }, 800);
    }
  }, [currentPlayerCard, currentBotCard, phase, state.currentRound, editMode]);

  useEffect(() => {
    if (phase === 'fighting' && !editMode) {
      setShowPlayerEffect(true);
      setShowBotEffect(true);

      setTimeout(() => {
        playRound();
        setPhase('result');
        setShowPlayerEffect(false);
        setShowBotEffect(false);
      }, 700);
    }
  }, [phase, playRound, editMode]);

  useEffect(() => {
    if (phase === 'result' && lastRoundResult && !editMode) {
      setShowResult(true);
      resultOpacity.value = withTiming(1, { duration: 300 });

      if (Platform.OS !== 'web') {
        if (lastRoundResult.winner === 'player') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } else if (lastRoundResult.winner === 'bot') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        } else {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }
      }

      setPhase('waiting');
    }
  }, [phase, lastRoundResult, resultOpacity, editMode]);

  useEffect(() => {
    if (editMode) {
      setShowSidebar(true);
    } else {
      setShowSidebar(false);
    }
  }, [editMode]);

  const handleNextRound = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    if (isGameOver) {
      router.push('/screens/battle-results' as any);
    } else {
      setPhase('showing');
    }
  }, [isGameOver, router]);

  const playerCardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: playerCardScale.value }],
  }));

  const botCardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: botCardScale.value }],
  }));

  const vsAnimatedStyle = useAnimatedStyle(() => ({
    opacity: vsOpacity.value,
  }));

  const resultAnimatedStyle = useAnimatedStyle(() => ({
    opacity: resultOpacity.value,
  }));

  const getResultMessage = () => {
    if (!lastRoundResult) return '';
    switch (lastRoundResult.winner) {
      case 'player':
        return '🎉 أنت الفائز!';
      case 'bot':
        return '😢 البوت يفوز!';
      default:
        return '🤝 تعادلاً!';
    }
  };

  const getResultColor = () => {
    if (!lastRoundResult) return '#a0a0a0';
    switch (lastRoundResult.winner) {
      case 'player':
        return '#4ade80';
      case 'bot':
        return '#f87171';
      default:
        return '#fbbf24';
    }
  };

  const displayPlayerCard = showResult && lastRoundResult
    ? lastRoundResult.playerCard
    : currentPlayerCard;

  const displayBotCard = showResult && lastRoundResult
    ? lastRoundResult.botCard
    : currentBotCard;

  const updateElement = (id: string, data: any) => {
    setElements((prev) => ({
      ...prev,
      [id]: { ...prev[id as keyof typeof prev], ...data },
    }));
  };

  const resetLayout = () => {
    setElements({
      playerCard: { x: -150, y: 150, scale: 1, minScale: 0.5, maxScale: 2 },
      botCard: { x: 150, y: 150, scale: 1, minScale: 0.5, maxScale: 2 },
      vs: { x: 0, y: 150, scale: 1, minScale: 0.5, maxScale: 2.5 },
      score: { x: 0, y: -200, scale: 1, minScale: 0.6, maxScale: 2 },
      round: { x: 0, y: -250, scale: 1, minScale: 0.6, maxScale: 2 },
      result: { x: 0, y: 250, scale: 1, minScale: 0.7, maxScale: 2.5 },
      abilities: { x: -300, y: 0, scale: 1, minScale: 0.5, maxScale: 1.8 },
    });
  };

  if (!displayPlayerCard || !displayBotCard) {
    return (
      <ScreenContainer>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>جاري التحميل...</Text>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <View style={styles.backgroundWrapper}>
        <LuxuryBackground />
      </View>

      <PageBorders />

      {editMode && showGrid && <GridOverlay />}

      <EditSidebar
        visible={showSidebar}
        onClose={() => setShowSidebar(false)}
        elements={elements}
        onElementUpdate={updateElement}
        showGrid={showGrid}
        onToggleGrid={() => setShowGrid(!showGrid)}
        snapToGrid={snapToGrid}
        onToggleSnap={() => setSnapToGrid(!snapToGrid)}
        onResetLayout={resetLayout}
      />

      <View style={styles.mainControls}>
        <TouchableOpacity
          style={[styles.editModeButton, editMode && styles.editModeButtonActive]}
          onPress={() => setEditMode(!editMode)}
        >
          <Text style={styles.editModeButtonText}>
            {editMode ? '✓ حفظ' : '✏️ تعديل'}
          </Text>
        </TouchableOpacity>

        {editMode && (
          <TouchableOpacity
            style={styles.sidebarToggleButton}
            onPress={() => setShowSidebar(!showSidebar)}
          >
            <Text style={styles.sidebarToggleButtonText}>
              {showSidebar ? '◀ إخفاء الأدوات' : '▶ إظهار الأدوات'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {editMode && !showSidebar && (
        <View style={styles.editInstructions}>
          <Text style={styles.editInstructionsText}>
            💡 اسحب للتحريك • المقابض للتكبير • + و − للتحكم الدقيق
          </Text>
        </View>
      )}

      <View style={styles.battleContainer} pointerEvents={editMode ? 'auto' : 'box-none'}>
        
        {editMode ? (
          <>
            <DraggableResizable
              id="playerCard"
              initialX={elements.playerCard.x}
              initialY={elements.playerCard.y}
              initialScale={elements.playerCard.scale}
              minScale={elements.playerCard.minScale}
              maxScale={elements.playerCard.maxScale}
              snapToGrid={snapToGrid}
              onUpdate={updateElement}
            >
              <View style={styles.editElement}>
                <Text style={styles.elementLabel}>👤 بطاقة اللاعب</Text>
                <View style={{ transform: [{ scale: 0.8 }] }}>
                  <CardItem card={displayPlayerCard} size="large" />
                </View>
              </View>
            </DraggableResizable>

            <DraggableResizable
              id="botCard"
              initialX={elements.botCard.x}
              initialY={elements.botCard.y}
              initialScale={elements.botCard.scale}
              minScale={elements.botCard.minScale}
              maxScale={elements.botCard.maxScale}
              snapToGrid={snapToGrid}
              onUpdate={updateElement}
            >
              <View style={styles.editElement}>
                <Text style={styles.elementLabel}>🤖 بطاقة البوت</Text>
                <View style={{ transform: [{ scale: 0.8 }] }}>
                  <CardItem card={displayBotCard} size="large" />
                </View>
              </View>
            </DraggableResizable>

            <DraggableResizable
              id="vs"
              initialX={elements.vs.x}
              initialY={elements.vs.y}
              initialScale={elements.vs.scale}
              minScale={elements.vs.minScale}
              maxScale={elements.vs.maxScale}
              snapToGrid={snapToGrid}
              onUpdate={updateElement}
            >
              <View style={styles.editElement}>
                <Text style={styles.elementLabel}>⚔️ VS</Text>
                <Text style={styles.vsEditText}>⚔️ VS ⚔️</Text>
              </View>
            </DraggableResizable>

            <DraggableResizable
              id="score"
              initialX={elements.score.x}
              initialY={elements.score.y}
              initialScale={elements.score.scale}
              minScale={elements.score.minScale}
              maxScale={elements.score.maxScale}
              snapToGrid={snapToGrid}
              onUpdate={updateElement}
            >
              <View style={styles.editElement}>
                <Text style={styles.elementLabel}>📊 النقاط</Text>
                <Text style={styles.scoreEditText}>
                  {state.playerScore} - {state.botScore}
                </Text>
              </View>
            </DraggableResizable>

            <DraggableResizable
              id="round"
              initialX={elements.round.x}
              initialY={elements.round.y}
              initialScale={elements.round.scale}
              minScale={elements.round.minScale}
              maxScale={elements.round.maxScale}
              snapToGrid={snapToGrid}
              onUpdate={updateElement}
            >
              <View style={styles.editElement}>
                <Text style={styles.elementLabel}>🔢 الجولة</Text>
                <Text style={styles.roundEditText}>
                  الجولة {state.currentRound + 1}/{state.totalRounds}
                </Text>
              </View>
            </DraggableResizable>

            <DraggableResizable
              id="abilities"
              initialX={elements.abilities.x}
              initialY={elements.abilities.y}
              initialScale={elements.abilities.scale}
              minScale={elements.abilities.minScale}
              maxScale={elements.abilities.maxScale}
              snapToGrid={snapToGrid}
              onUpdate={updateElement}
            >
              <View style={styles.editElement}>
                <Text style={styles.elementLabel}>🎮 القدرات</Text>
                <View style={styles.abilitiesEditBox}>
                  {state.playerAbilities.map((ability, index) => (
                    <View key={index} style={styles.abilityEditItem}>
                      <Text style={styles.abilityEditText}>
                        {ability.used ? '✗' : '✓'} {getAbilityNameAr(ability.type)}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            </DraggableResizable>

            <DraggableResizable
              id="result"
              initialX={elements.result.x}
              initialY={elements.result.y}
              initialScale={elements.result.scale}
              minScale={elements.result.minScale}
              maxScale={elements.result.maxScale}
              snapToGrid={snapToGrid}
              onUpdate={updateElement}
            >
              <View style={styles.editElement}>
                <Text style={styles.elementLabel}>🏆 النتيجة</Text>
                <Text style={[styles.resultEditText, { color: '#fbbf24' }]}>
                  🤝 تعادلاً!
                </Text>
              </View>
            </DraggableResizable>
          </>
        ) : (
          <View style={styles.normalPlayContainer}>
            
            <View style={[
              styles.absolutePositionFixed,
              {
                left: CENTER_X + elements.playerCard.x,
                top: CENTER_Y + elements.playerCard.y,
                transform: [{ scale: elements.playerCard.scale }],
              }
            ]}>
              <Text style={styles.playerLabel}>👤 أنت</Text>
              <Animated.View style={playerCardAnimatedStyle}>
                <CardItem card={displayPlayerCard} size="large" />
                {showPlayerEffect && displayPlayerCard && (
                  <ElementEffect element={displayPlayerCard.element} style={styles.elementEffect} />
                )}
              </Animated.View>
              
              {showResult && lastRoundResult && (
                <View style={styles.damageContainer}>
                  <Text style={styles.damageText}>الضرر: {lastRoundResult.playerDamage}</Text>
                  {lastRoundResult.playerElementAdvantage !== 'neutral' && (
                    <Text style={[styles.advantageText, { color: getAdvantageColor(lastRoundResult.playerElementAdvantage) }]}>
                      {ELEMENT_EMOJI[lastRoundResult.playerCard.element]} {getAdvantageText(lastRoundResult.playerElementAdvantage)}
                    </Text>
                  )}
                </View>
              )}
            </View>

            <View style={[
              styles.absolutePositionFixed,
              {
                left: CENTER_X + elements.botCard.x,
                top: CENTER_Y + elements.botCard.y,
                transform: [{ scale: elements.botCard.scale }],
              }
            ]}>
              <Text style={styles.playerLabel}>🤖 البوت</Text>
              <Animated.View style={botCardAnimatedStyle}>
                <CardItem card={displayBotCard} size="large" />
                {showBotEffect && displayBotCard && (
                  <ElementEffect element={displayBotCard.element} style={styles.elementEffect} />
                )}
              </Animated.View>
              
              {showResult && lastRoundResult && (
                <View style={styles.damageContainer}>
                  <Text style={styles.damageText}>الضرر: {lastRoundResult.botDamage}</Text>
                  {lastRoundResult.botElementAdvantage !== 'neutral' && (
                    <Text style={[styles.advantageText, { color: getAdvantageColor(lastRoundResult.botElementAdvantage) }]}>
                      {ELEMENT_EMOJI[lastRoundResult.botCard.element]} {getAdvantageText(lastRoundResult.botElementAdvantage)}
                    </Text>
                  )}
                </View>
              )}
            </View>

            <Animated.View style={[
              styles.absolutePositionFixed,
              vsAnimatedStyle,
              {
                left: CENTER_X + elements.vs.x,
                top: CENTER_Y + elements.vs.y,
                transform: [{ scale: elements.vs.scale }],
              }
            ]}>
              <Text style={styles.vsText}>⚔️ VS ⚔️</Text>
            </Animated.View>

            <View style={[
              styles.absolutePositionFixed,
              {
                left: CENTER_X + elements.score.x,
                top: CENTER_Y + elements.score.y,
                transform: [{ scale: elements.score.scale }],
              }
            ]}>
              <View style={styles.scoreBoard}>
                <Text style={[styles.score, { color: '#4ade80' }]}>{state.playerScore}</Text>
                <Text style={styles.scoreSeparator}>-</Text>
                <Text style={[styles.score, { color: '#f87171' }]}>{state.botScore}</Text>
              </View>
            </View>

            <View style={[
              styles.absolutePositionFixed,
              {
                left: CENTER_X + elements.round.x,
                top: CENTER_Y + elements.round.y,
                transform: [{ scale: elements.round.scale }],
              }
            ]}>
              <Text style={styles.roundText}>
                الجولة {showResult ? lastRoundResult?.round : state.currentRound + 1}/{state.totalRounds}
              </Text>
            </View>

            <View style={[
              styles.absolutePositionFixed,
              {
                left: CENTER_X + elements.abilities.x,
                top: CENTER_Y + elements.abilities.y,
                transform: [{ scale: elements.abilities.scale }],
              }
            ]}>
              <View style={styles.abilitiesSidebar}>
                <Text style={styles.abilitiesTitle}>قدرات اللعب</Text>
                {state.playerAbilities.map((ability, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.abilityButtonVertical,
                      ability.used && styles.abilityButtonDisabled
                    ]}
                    onPress={() => {
                      if (!ability.used) {
                        useAbility(ability.type);
                        if (Platform.OS !== 'web') {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        }
                      }
                    }}
                    disabled={ability.used}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.abilityButtonTextVertical}>
                      {ability.used ? '✗ ' : '✓ '}
                      {getAbilityNameAr(ability.type)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {showResult && (
              <Animated.View style={[
                styles.absolutePositionFixed,
                resultAnimatedStyle,
                {
                  left: CENTER_X + elements.result.x,
                  top: CENTER_Y + elements.result.y,
                  transform: [{ scale: elements.result.scale }],
                }
              ]}>
                <View style={styles.resultContainer}>
                  <Text style={[styles.resultText, { color: getResultColor() }]}>
                    {getResultMessage()}
                  </Text>
                </View>
              </Animated.View>
            )}

            {phase === 'waiting' && (
              <View style={styles.bottomControlsFixed}>
                <TouchableOpacity
                  style={styles.historyButton}
                  onPress={() => setShowHistoryModal(true)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.historyButtonText}>📋 السجل</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.nextButtonLarge}
                  onPress={handleNextRound}
                  activeOpacity={0.8}
                >
                  <Text style={styles.nextButtonText}>
                    {isGameOver ? '🏆 عرض النتائج' : '➡️ الجولة التالية'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </View>

      <Modal
        visible={showHistoryModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowHistoryModal(false)}
      >
        <View style={styles.historyModalOverlay}>
          <View style={styles.historyModalContent}>
            <View style={styles.historyModalHeader}>
              <Text style={styles.historyModalTitle}>سجل البطاقات</Text>
              <TouchableOpacity onPress={() => setShowHistoryModal(false)}>
                <Text style={styles.historyModalCloseButton}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.historyScroll}>
              {state.roundResults.map((result) => (
                <View key={result.round} style={styles.historyRoundItem}>
                  <Text style={styles.historyRoundNumber}>الجولة {result.round}</Text>
                  <View style={styles.historyCardsRow}>
                    <View style={styles.historyCardSection}>
                      <Text style={styles.historyCardLabel}>👤 أنت</Text>
                      <Text style={styles.historyCardName}>{result.playerCard.nameAr}</Text>
                      <Text style={styles.historyCardStats}>الضرر: {result.playerDamage}</Text>
                    </View>
                    <View style={styles.historyVS}>
                      <Text style={styles.historyVSText}>VS</Text>
                    </View>
                    <View style={styles.historyCardSection}>
                      <Text style={styles.historyCardLabel}>🤖 البوت</Text>
                      <Text style={styles.historyCardName}>{result.botCard.nameAr}</Text>
                      <Text style={styles.historyCardStats}>الضرر: {result.botDamage}</Text>
                    </View>
                  </View>
                  <Text style={[styles.historyWinner, { color: result.winner === 'player' ? '#4ade80' : result.winner === 'bot' ? '#f87171' : '#fbbf24' }]}>
                    {result.winner === 'player' ? '✓ أنت الفائز' : result.winner === 'bot' ? '✗ البوت يفوز' : '= تعادل'}
                  </Text>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

// ✅ STYLES
const styles = StyleSheet.create({
  backgroundWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0,
  },

  pageBorders: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
  },

  borderTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: '#d4af37',
    shadowColor: '#d4af37',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
  },

  borderBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: '#d4af37',
    shadowColor: '#d4af37',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
  },

  borderLeft: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: 3,
    backgroundColor: '#d4af37',
    shadowColor: '#d4af37',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
  },

  borderRight: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: 3,
    backgroundColor: '#d4af37',
    shadowColor: '#d4af37',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
  },

  corner: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderColor: '#d4af37',
    backgroundColor: 'rgba(212, 175, 55, 0.3)',
  },

  cornerTopLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 5,
    borderLeftWidth: 5,
  },

  cornerTopRight: {
    top: 0,
    right: 0,
    borderTopWidth: 5,
    borderRightWidth: 5,
  },

  cornerBottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 5,
    borderLeftWidth: 5,
  },

  cornerBottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 5,
    borderRightWidth: 5,
  },

  sidebar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 300,
    backgroundColor: 'rgba(26, 26, 26, 0.98)',
    zIndex: 300,
    borderRightWidth: 3,
    borderRightColor: '#d4af37',
    shadowColor: '#000',
    shadowOffset: { width: 5, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
  },

  sidebarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 2,
    borderBottomColor: '#d4af37',
    backgroundColor: 'rgba(212, 175, 55, 0.1)',
  },

  sidebarTitle: {
    color: '#d4af37',
    fontSize: 16,
    fontWeight: 'bold',
  },

  sidebarCloseButton: {
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(248, 113, 113, 0.2)',
    borderRadius: 15,
  },

  sidebarCloseButtonText: {
    color: '#f87171',
    fontSize: 18,
    fontWeight: 'bold',
  },

  sidebarContent: {
    flex: 1,
    padding: 16,
  },

  sidebarSection: {
    marginBottom: 20,
    padding: 12,
    backgroundColor: 'rgba(212, 175, 55, 0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.2)',
  },

  sidebarSectionTitle: {
    color: '#d4af37',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 12,
  },

  sidebarOption: {
    padding: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.2)',
  },

  sidebarOptionActive: {
    backgroundColor: 'rgba(212, 175, 55, 0.2)',
    borderColor: '#d4af37',
  },

  sidebarOptionText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '500',
  },

  elementItem: {
    padding: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#d4af37',
  },

  elementItemLabel: {
    color: '#d4af37',
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 6,
  },

  elementItemControls: {
    gap: 4,
  },

  elementItemValue: {
    color: '#aaa',
    fontSize: 11,
  },

  sidebarActionButton: {
    padding: 12,
    backgroundColor: '#d4af37',
    borderRadius: 8,
    marginBottom: 8,
    alignItems: 'center',
  },

  sidebarActionButtonSecondary: {
    backgroundColor: 'rgba(212, 175, 55, 0.3)',
  },

  sidebarActionButtonText: {
    color: '#1a1a1a',
    fontSize: 13,
    fontWeight: 'bold',
  },

  sidebarInfoText: {
    color: '#888',
    fontSize: 11,
    lineHeight: 18,
  },

  gridContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 2,
  },

  verticalLine: {
    position: 'absolute',
    left: '50%',
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: 'rgba(212, 175, 55, 0.5)',
    shadowColor: '#d4af37',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },

  horizontalLine: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: 'rgba(212, 175, 55, 0.5)',
    shadowColor: '#d4af37',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },

  verticalLineThin: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: 'rgba(212, 175, 55, 0.2)',
  },

  horizontalLineThin: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(212, 175, 55, 0.2)',
  },

  centerDot: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#d4af37',
    marginLeft: -6,
    marginTop: -6,
    shadowColor: '#d4af37',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 8,
    borderWidth: 2,
    borderColor: '#1a1a1a',
  },

  quadrantLabel: {
    position: 'absolute',
    width: 30,
    height: 30,
    marginLeft: -15,
    marginTop: -15,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(212, 175, 55, 0.2)',
    borderRadius: 15,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.4)',
  },

  quadrantText: {
    color: '#d4af37',
    fontSize: 16,
    fontWeight: 'bold',
  },

  mainControls: {
    position: 'absolute',
    top: 20,
    right: 20,
    zIndex: 200,
    flexDirection: 'row',
    gap: 10,
  },

  editModeButton: {
    backgroundColor: '#d4af37',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },

  editModeButtonActive: {
    backgroundColor: '#4ade80',
  },

  editModeButtonText: {
    color: '#1a1a1a',
    fontSize: 14,
    fontWeight: 'bold',
  },

  sidebarToggleButton: {
    backgroundColor: '#666',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },

  sidebarToggleButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },

  editInstructions: {
    position: 'absolute',
    top: 80,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(212, 175, 55, 0.95)',
    padding: 12,
    borderRadius: 12,
    zIndex: 199,
  },

  editInstructionsText: {
    color: '#1a1a1a',
    fontSize: 13,
    fontWeight: 'bold',
    textAlign: 'center',
  },

  battleContainer: {
    flex: 1,
    zIndex: 1,
  },

  draggableContainer: {
    position: 'relative',
  },

  // ✅ مقابض التكبير
  transformHandlesContainer: {
    position: 'absolute',
    top: -30,
    left: -30,
    right: -30,
    bottom: -30,
  },

  resizeHandle: {
    position: 'absolute',
    width: 12,
    height: 12,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#2196F3',
    borderRadius: 2,
    zIndex: 10,
  },

  resizeHandleInner: {
    width: '100%',
    height: '100%',
    backgroundColor: '#2196F3',
  },

  resizeHandle_topleft: { top: 0, left: 0 },
  resizeHandle_topright: { top: 0, right: 0 },
  resizeHandle_bottomleft: { bottom: 50, left: 0 },
  resizeHandle_bottomright: { bottom: 50, right: 0 },
  resizeHandle_top: { top: 0, left: '50%', marginLeft: -6 },
  resizeHandle_bottom: { bottom: 50, left: '50%', marginLeft: -6 },
  resizeHandle_left: { top: '50%', left: 0, marginTop: -6 },
  resizeHandle_right: { top: '50%', right: 0, marginTop: -6 },

  centerDotHandle: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    width: 16,
    height: 16,
    marginLeft: -8,
    marginTop: -8,
    justifyContent: 'center',
    alignItems: 'center',
  },

  centerDotInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2196F3',
    borderWidth: 2,
    borderColor: '#fff',
  },

  // ✅ أزرار التكبير الثابتة
  fixedScaleControls: {
    position: 'absolute',
    bottom: -60,
    left: '50%',
    transform: [{ translateX: -85 }],
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(33, 33, 33, 0.95)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 10,
    borderWidth: 2,
    borderColor: '#2196F3',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 10,
  },

  scaleControlButton: {
    backgroundColor: '#2196F3',
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#2196F3',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
  },

  scaleControlButtonDisabled: {
    backgroundColor: '#555',
    opacity: 0.5,
    shadowOpacity: 0,
  },

  scaleControlButtonText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    lineHeight: 24,
  },

  scaleControlDisplay: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    minWidth: 60,
    alignItems: 'center',
  },

  scaleControlText: {
    color: '#4ade80',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },

  editElement: {
    alignItems: 'center',
  },

  elementLabel: {
    color: '#d4af37',
    fontSize: 13,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },

  vsEditText: {
    color: '#e94560',
    fontSize: 24,
    fontWeight: 'bold',
    padding: 12,
  },

  scoreEditText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
    padding: 8,
  },

  roundEditText: {
    color: '#d4af37',
    fontSize: 15,
    fontWeight: 'bold',
    padding: 8,
  },

  abilitiesEditBox: {
    gap: 6,
    minHeight: 300,
  },

  abilityEditItem: {
    backgroundColor: '#d4af37',
    padding: 10,
    borderRadius: 12,
    minWidth: 120,
  },

  abilityEditText: {
    color: '#1a1a1a',
    fontSize: 11,
    fontWeight: 'bold',
    textAlign: 'center',
  },

  resultEditText: {
    fontSize: 20,
    fontWeight: 'bold',
    padding: 12,
  },

  normalPlayContainer: {
    flex: 1,
  },

  absolutePositionFixed: {
    position: 'absolute',
    alignItems: 'center',
  },

  playerLabel: {
    fontSize: 14,
    color: '#d4af37',
    marginBottom: 8,
    fontWeight: 'bold',
    textAlign: 'center',
  },

  elementEffect: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },

  damageContainer: {
    alignItems: 'center',
    marginTop: 12,
  },

  damageText: {
    fontSize: 14,
    color: '#e94560',
    fontWeight: 'bold',
  },

  advantageText: {
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 4,
  },

  vsText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#e94560',
  },

  scoreBoard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  score: {
    fontSize: 32,
    fontWeight: 'bold',
  },

  scoreSeparator: {
    fontSize: 28,
    color: '#a0a0a0',
  },

  roundText: {
    fontSize: 18,
    color: '#d4af37',
    fontWeight: 'bold',
  },

  abilitiesSidebar: {
    gap: 12,
    padding: 8,
  },

  abilitiesTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#d4af37',
    textAlign: 'center',
    marginBottom: 8,
  },

  abilityButtonVertical: {
    backgroundColor: '#d4af37',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignItems: 'center',
    minHeight: 60,
    justifyContent: 'center',
    minWidth: 120,
  },

  abilityButtonDisabled: {
    backgroundColor: '#666',
    opacity: 0.5,
  },

  abilityButtonTextVertical: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#1a1a1a',
    textAlign: 'center',
  },

  resultContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#d4af37',
  },

  resultText: {
    fontSize: 22,
    fontWeight: 'bold',
  },

  bottomControlsFixed: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    zIndex: 100,
  },

  historyButton: {
    backgroundColor: '#666',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    marginBottom: 8,
    alignSelf: 'flex-start',
  },

  historyButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
  },

  nextButtonLarge: {
    backgroundColor: '#d4af37',
    borderRadius: 24,
    paddingVertical: 16,
    alignItems: 'center',
    width: '100%',
  },

  nextButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  loadingText: {
    fontSize: 18,
    color: '#a0a0a0',
  },

  historyModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'flex-end',
  },

  historyModalContent: {
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    borderTopWidth: 2,
    borderTopColor: '#d4af37',
  },

  historyModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },

  historyModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#d4af37',
  },

  historyModalCloseButton: {
    fontSize: 24,
    color: '#a0a0a0',
  },

  historyScroll: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },

  historyRoundItem: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#d4af37',
  },

  historyRoundNumber: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#d4af37',
    marginBottom: 8,
  },

  historyCardsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },

  historyCardSection: {
    flex: 1,
    alignItems: 'center',
  },

  historyCardLabel: {
    fontSize: 12,
    color: '#a0a0a0',
    marginBottom: 4,
  },

  historyCardName: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#eee',
    marginBottom: 4,
  },

  historyCardStats: {
    fontSize: 11,
    color: '#888',
  },

  historyVS: {
    marginHorizontal: 8,
  },

  historyVSText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#d4af37',
  },

  historyWinner: {
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 8,
  },
});
