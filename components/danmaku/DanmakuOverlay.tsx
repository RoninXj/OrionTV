import React, { useEffect, useRef, useMemo } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { DanmakuItem, DanmakuConfig } from '@/stores/danmakuStore';

interface DanmakuOverlayProps {
  danmakuList: DanmakuItem[];
  currentTime: number;
  isPlaying: boolean;
  config: DanmakuConfig;
}

interface ActiveDanmaku extends DanmakuItem {
  id: string;
  startTime: number;
  lane?: number;
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export const DanmakuOverlay: React.FC<DanmakuOverlayProps> = ({
  danmakuList,
  currentTime,
  isPlaying,
  config,
}) => {
  const activeDanmakuRef = useRef<ActiveDanmaku[]>([]);
  const laneManagerRef = useRef<{ [key: number]: number }>({});
  const lastTimeRef = useRef(currentTime);

  // 计算当前应该显示的弹幕
  const currentDanmaku = useMemo(() => {
    if (!config.enabled || !isPlaying) return [];

    const timeWindow = 5; // 5秒时间窗口
    const startTime = Math.max(0, currentTime - 1);
    const endTime = currentTime + timeWindow;

    return danmakuList
      .filter(item => {
        // 时间过滤
        if (item.time < startTime || item.time > endTime) return false;
        
        // 类型过滤
        if (item.mode === 1 && !config.showTop) return false;
        if (item.mode === 2 && !config.showBottom) return false;
        if (item.mode === 0 && !config.showScroll) return false;
        
        // 内容过滤
        if (config.filterLevel > 0) {
          const text = item.text.toLowerCase();
          // 简单的内容过滤逻辑
          if (config.filterLevel >= 2 && (text.includes('666') || text.includes('哈哈'))) {
            return false;
          }
          if (config.filterLevel >= 3 && text.length < 3) {
            return false;
          }
        }
        
        return true;
      })
      .slice(0, Math.floor(config.density * 100)); // 密度控制
  }, [danmakuList, currentTime, isPlaying, config]);

  // 更新活跃弹幕列表
  useEffect(() => {
    if (!isPlaying) return;

    const now = Date.now();
    
    // 移除过期的弹幕
    activeDanmakuRef.current = activeDanmakuRef.current.filter(
      item => now - item.startTime < 10000 // 10秒后移除
    );

    // 添加新弹幕
    currentDanmaku.forEach(item => {
      const exists = activeDanmakuRef.current.some(
        active => active.text === item.text && Math.abs(active.time - item.time) < 0.5
      );
      
      if (!exists && Math.abs(item.time - currentTime) < 0.5) {
        const newDanmaku: ActiveDanmaku = {
          ...item,
          id: `${item.time}_${item.text}_${Math.random()}`,
          startTime: now,
          lane: assignLane(item.mode || 0),
        };
        
        activeDanmakuRef.current.push(newDanmaku);
      }
    });

    lastTimeRef.current = currentTime;
  }, [currentDanmaku, currentTime, isPlaying]);

  // 分配弹幕轨道
  const assignLane = (mode: number): number => {
    const maxLanes = Math.min(config.maxLines, Math.floor(screenHeight / (config.fontSize + 4)));
    
    if (mode === 1 || mode === 2) {
      // 顶部或底部弹幕
      for (let i = 0; i < maxLanes; i++) {
        const laneKey = mode === 1 ? i : maxLanes + i;
        if (!laneManagerRef.current[laneKey] || Date.now() - laneManagerRef.current[laneKey] > 3000) {
          laneManagerRef.current[laneKey] = Date.now();
          return i;
        }
      }
    } else {
      // 滚动弹幕
      for (let i = 0; i < maxLanes; i++) {
        if (!laneManagerRef.current[i] || Date.now() - laneManagerRef.current[i] > 8000) {
          laneManagerRef.current[i] = Date.now();
          return i;
        }
      }
    }
    
    return Math.floor(Math.random() * maxLanes);
  };

  return (
    <View style={styles.container} pointerEvents="none">
      {activeDanmakuRef.current.map(item => (
        <DanmakuItemComponent
          key={item.id}
          item={item}
          config={config}
          isPlaying={isPlaying}
        />
      ))}
    </View>
  );
};

interface DanmakuItemComponentProps {
  item: ActiveDanmaku;
  config: DanmakuConfig;
  isPlaying: boolean;
}

const DanmakuItemComponent: React.FC<DanmakuItemComponentProps> = ({
  item,
  config,
  isPlaying,
}) => {
  const translateX = useSharedValue(screenWidth);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (!isPlaying) return;

    opacity.value = withTiming(config.opacity, { duration: 300 });

    if (item.mode === 0) {
      // 滚动弹幕
      const duration = 8000 / config.speed; // 基础8秒，根据速度调整
      translateX.value = screenWidth;
      translateX.value = withTiming(-200, {
        duration,
        easing: Easing.linear,
      });
    } else {
      // 顶部或底部弹幕
      translateX.value = withTiming(0, { duration: 300 });
      
      // 3秒后淡出
      setTimeout(() => {
        opacity.value = withTiming(0, { duration: 500 });
      }, 3000);
    }
  }, [isPlaying, config.speed, config.opacity]);

  const animatedStyle = useAnimatedStyle(() => {
    const laneHeight = config.fontSize + 4;
    const topPosition = item.mode === 2 
      ? screenHeight - (item.lane || 0) * laneHeight - 100 // 底部弹幕
      : (item.lane || 0) * laneHeight + 50; // 顶部和滚动弹幕

    return {
      transform: [{ translateX: translateX.value }],
      opacity: opacity.value,
      top: topPosition,
    };
  });

  const textStyle = {
    fontSize: config.fontSize,
    color: item.color || '#ffffff',
  };

  return (
    <Animated.View style={[styles.danmakuItem, animatedStyle]}>
      <Animated.Text style={[styles.danmakuText, textStyle]} numberOfLines={1}>
        {item.text}
      </Animated.Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 5,
  },
  danmakuItem: {
    position: 'absolute',
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 12,
    maxWidth: screenWidth * 0.8,
  },
  danmakuText: {
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
});