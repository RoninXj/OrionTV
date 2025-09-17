import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export const BasicDanmakuTest: React.FC = () => {
  return (
    <View style={styles.container} pointerEvents="none">
      {/* 固定位置的测试弹幕 */}
      <View style={[styles.danmaku, { top: 100, left: 50 }]}>
        <Text style={styles.text}>🎯 测试弹幕1 - 左上角</Text>
      </View>
      
      <View style={[styles.danmaku, { top: 150, right: 50 }]}>
        <Text style={styles.text}>🎯 测试弹幕2 - 右上角</Text>
      </View>
      
      <View style={[styles.danmaku, { bottom: 150, left: 100 }]}>
        <Text style={styles.text}>🎯 测试弹幕3 - 左下角</Text>
      </View>
      
      <View style={[styles.danmaku, { top: 200, left: '50%', marginLeft: -100 }]}>
        <Text style={styles.text}>🎯 测试弹幕4 - 居中</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
  },
  danmaku: {
    position: 'absolute',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#00ff00',
  },
  text: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
});