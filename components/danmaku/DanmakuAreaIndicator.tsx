import React from 'react';
import { View, StyleSheet, Dimensions, Text } from 'react-native';
import { DanmakuConfig } from '@/stores/danmakuStore';

interface DanmakuAreaIndicatorProps {
  config: DanmakuConfig;
  visible?: boolean;
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

/**
 * 弹幕区域可视化指示器
 * 仅在开发模式下显示，用于调试弹幕位置
 */
export const DanmakuAreaIndicator: React.FC<DanmakuAreaIndicatorProps> = ({
  config,
  visible = __DEV__
}) => {
  if (!visible) return null;

  const laneHeight = config.fontSize + 6;
  
  // 计算各个弹幕区域
  const scrollArea = {
    top: screenHeight * 0.1,
    height: screenHeight * 0.25,
    maxLanes: Math.floor((screenHeight * 0.25) / laneHeight)
  };
  
  const topArea = {
    top: 60,
    height: laneHeight * 3
  };
  
  const bottomArea = {
    top: screenHeight - 120 - laneHeight * 3,
    height: laneHeight * 3
  };

  return (
    <View style={styles.container} pointerEvents="none">
      {/* 滚动弹幕区域指示器 */}
      <View 
        style={[
          styles.areaIndicator,
          styles.scrollArea,
          {
            top: scrollArea.top,
            height: scrollArea.height,
          }
        ]}
      >
        <Text style={styles.areaLabel}>
          滚动弹幕区域 ({scrollArea.maxLanes}轨道)
        </Text>
        <Text style={styles.areaInfo}>
          {scrollArea.top.toFixed(0)}px - {(scrollArea.top + scrollArea.height).toFixed(0)}px
        </Text>
        
        {/* 轨道线指示器 */}
        {Array.from({ length: Math.min(scrollArea.maxLanes, 8) }, (_, i) => (
          <View
            key={i}
            style={[
              styles.laneIndicator,
              { top: i * laneHeight }
            ]}
          />
        ))}
      </View>

      {/* 顶部固定弹幕区域指示器 */}
      <View 
        style={[
          styles.areaIndicator,
          styles.topArea,
          {
            top: topArea.top,
            height: topArea.height,
          }
        ]}
      >
        <Text style={styles.areaLabel}>顶部固定</Text>
        
        {/* 轨道线指示器 */}
        {Array.from({ length: 3 }, (_, i) => (
          <View
            key={i}
            style={[
              styles.laneIndicator,
              { top: i * laneHeight }
            ]}
          />
        ))}
      </View>

      {/* 底部固定弹幕区域指示器 */}
      <View 
        style={[
          styles.areaIndicator,
          styles.bottomArea,
          {
            top: bottomArea.top,
            height: bottomArea.height,
          }
        ]}
      >
        <Text style={styles.areaLabel}>底部固定</Text>
        
        {/* 轨道线指示器 */}
        {Array.from({ length: 3 }, (_, i) => (
          <View
            key={i}
            style={[
              styles.laneIndicator,
              { top: i * laneHeight }
            ]}
          />
        ))}
      </View>

      {/* 屏幕分割线指示器 */}
      <View style={[styles.dividerLine, { top: screenHeight * 0.1 }]}>
        <Text style={styles.dividerLabel}>10% (滚动区域开始)</Text>
      </View>
      
      <View style={[styles.dividerLine, { top: screenHeight * 0.35 }]}>
        <Text style={styles.dividerLabel}>35% (滚动区域结束)</Text>
      </View>
      
      <View style={[styles.dividerLine, { top: screenHeight * 0.5 }]}>
        <Text style={styles.dividerLabel}>50% (屏幕中心)</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1, // 在弹幕下方，视频上方
  },
  areaIndicator: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderWidth: 2,
    borderStyle: 'dashed',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  scrollArea: {
    borderColor: 'rgba(0, 255, 0, 0.8)',
    backgroundColor: 'rgba(0, 255, 0, 0.1)',
  },
  topArea: {
    borderColor: 'rgba(255, 0, 0, 0.8)',
    backgroundColor: 'rgba(255, 0, 0, 0.1)',
  },
  bottomArea: {
    borderColor: 'rgba(0, 0, 255, 0.8)',
    backgroundColor: 'rgba(0, 0, 255, 0.1)',
  },
  areaLabel: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  areaInfo: {
    color: 'white',
    fontSize: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 2,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  laneIndicator: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderStyle: 'dotted',
  },
  dividerLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255, 255, 0, 0.6)',
    flexDirection: 'row',
    alignItems: 'center',
  },
  dividerLabel: {
    color: 'yellow',
    fontSize: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 2,
    marginLeft: 10,
  },
});