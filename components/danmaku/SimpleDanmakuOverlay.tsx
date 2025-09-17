import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { DanmakuItem, DanmakuConfig } from '@/stores/danmakuStore';

interface SimpleDanmakuOverlayProps {
  danmakuList: DanmakuItem[];
  currentTime: number;
  isPlaying: boolean;
  config: DanmakuConfig;
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export const SimpleDanmakuOverlay: React.FC<SimpleDanmakuOverlayProps> = ({
  danmakuList,
  currentTime,
  isPlaying,
  config,
}) => {
  const [visibleDanmaku, setVisibleDanmaku] = useState<DanmakuItem[]>([]);

  useEffect(() => {
    console.log('🎯 SimpleDanmakuOverlay 更新:', {
      danmakuCount: danmakuList.length,
      currentTime,
      isPlaying,
      enabled: config.enabled
    });

    if (!config.enabled) {
      setVisibleDanmaku([]);
      return;
    }

    // 如果有弹幕数据，直接显示前几条用于测试
    if (danmakuList.length > 0) {
      console.log('🎯 显示测试弹幕:', danmakuList.length);
      setVisibleDanmaku(danmakuList.slice(0, 5)); // 显示前5条
      return;
    }

    // 如果没有弹幕数据，创建一些测试弹幕
    const testDanmaku = [
      { text: '测试弹幕 - 这是第一条', time: 0, color: '#ffffff', mode: 0 },
      { text: '测试弹幕 - 这是第二条', time: 0, color: '#ff6b6b', mode: 0 },
      { text: '测试弹幕 - 这是第三条', time: 0, color: '#4ecdc4', mode: 0 },
    ];
    
    console.log('🎯 使用默认测试弹幕');
    setVisibleDanmaku(testDanmaku);
  }, [danmakuList, currentTime, isPlaying, config.enabled]);

  if (!config.enabled) {
    return (
      <View style={styles.container} pointerEvents="none">
        <View style={styles.debugInfo}>
          <Text style={styles.debugText}>弹幕已禁用</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container} pointerEvents="none">
      {/* 显示调试信息 */}
      <View style={styles.debugInfo}>
        <Text style={styles.debugText}>
          弹幕: {danmakuList.length} | 可见: {visibleDanmaku.length} | 时间: {currentTime.toFixed(1)}s
        </Text>
      </View>

      {/* 渲染弹幕 */}
      {visibleDanmaku.map((item, index) => (
        <View
          key={`${item.time}_${index}`}
          style={[
            styles.danmakuItem,
            {
              top: 100 + (index * 30), // 简单的垂直排列
              left: screenWidth - 200, // 固定在右侧
            }
          ]}
        >
          <Text
            style={[
              styles.danmakuText,
              {
                color: item.color || '#ffffff',
                fontSize: config.fontSize,
                opacity: config.opacity,
              }
            ]}
            numberOfLines={1}
          >
            {item.text}
          </Text>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 5,
  },
  debugInfo: {
    position: 'absolute',
    top: 20,
    left: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 8,
    borderRadius: 4,
    zIndex: 10,
  },
  debugText: {
    color: '#00ff00',
    fontSize: 12,
    fontFamily: 'monospace',
  },
  danmakuItem: {
    position: 'absolute',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    maxWidth: screenWidth * 0.6,
  },
  danmakuText: {
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
});