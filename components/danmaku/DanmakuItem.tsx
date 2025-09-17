import React, { useEffect, useRef } from 'react';
import { Text, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  runOnJS,
} from 'react-native-reanimated';

export interface DanmakuItemData {
  id: string;
  text: string;
  time: number;
  color?: string;
  mode?: number; // 0: 滚动, 1: 顶部, 2: 底部
  fontSize?: number;
}

interface DanmakuItemProps {
  danmaku: DanmakuItemData;
  screenWidth: number;
  screenHeight: number;
  lane: number; // 弹幕轨道
  speed: number; // 滚动速度
  onComplete: (id: string) => void;
}

// 移除未使用的常量

export const DanmakuItem: React.FC<DanmakuItemProps> = ({
  danmaku,
  screenWidth,
  screenHeight,
  lane,
  speed,
  onComplete,
}) => {
  const translateX = useSharedValue(screenWidth);
  const opacity = useSharedValue(1);
  const textRef = useRef<Text>(null);
  const textWidth = useRef(0);

  // 测量文本宽度
  const onTextLayout = (event: any) => {
    textWidth.current = event.nativeEvent.layout.width;
  };

  useEffect(() => {
    // 根据弹幕模式设置动画
    if (danmaku.mode === 1 || danmaku.mode === 2) {
      // 顶部或底部固定弹幕
      translateX.value = (screenWidth - textWidth.current) / 2; // 居中
      
      // 3秒后淡出
      setTimeout(() => {
        opacity.value = withTiming(0, { duration: 500 }, () => {
          runOnJS(onComplete)(danmaku.id);
        });
      }, 3000);
    } else {
      // 滚动弹幕
      const duration = ((screenWidth + textWidth.current) / speed) * 1000;
      
      translateX.value = withTiming(
        -textWidth.current,
        {
          duration,
          easing: Easing.linear,
        },
        () => {
          runOnJS(onComplete)(danmaku.id);
        }
      );
    }
  }, [danmaku, screenWidth, speed, onComplete]);

  const animatedStyle = useAnimatedStyle(() => {
    const laneHeight = 30; // 每个轨道的高度
    let top = 0;

    if (danmaku.mode === 1) {
      // 顶部弹幕
      top = lane * laneHeight + 50;
    } else if (danmaku.mode === 2) {
      // 底部弹幕
      top = screenHeight - (lane + 1) * laneHeight - 100;
    } else {
      // 滚动弹幕，分布在中间区域
      const middleStart = screenHeight * 0.2;
      const middleEnd = screenHeight * 0.8;
      const middleHeight = middleEnd - middleStart;
      const lanesInMiddle = Math.floor(middleHeight / laneHeight);
      top = middleStart + (lane % lanesInMiddle) * laneHeight;
    }

    return {
      transform: [{ translateX: translateX.value }],
      opacity: opacity.value,
      top,
    };
  });

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      <Text
        ref={textRef}
        style={[
          styles.text,
          {
            color: danmaku.color || '#FFFFFF',
            fontSize: danmaku.fontSize || 16,
          },
        ]}
        onLayout={onTextLayout}
        numberOfLines={1}
      >
        {danmaku.text}
      </Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    zIndex: 100,
  },
  text: {
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
    includeFontPadding: false,
  },
});