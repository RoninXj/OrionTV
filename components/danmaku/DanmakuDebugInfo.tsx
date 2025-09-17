import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useDanmakuStore } from '@/stores/danmakuStore';

export const DanmakuDebugInfo: React.FC = () => {
  const { danmakuList, config, isLoading } = useDanmakuStore();

  return (
    <View style={styles.container}>
      <Text style={styles.text}>弹幕调试信息</Text>
      <Text style={styles.text}>启用: {config.enabled ? '是' : '否'}</Text>
      <Text style={styles.text}>数量: {danmakuList.length}</Text>
      <Text style={styles.text}>加载中: {isLoading ? '是' : '否'}</Text>
      <Text style={styles.text}>透明度: {Math.round(config.opacity * 100)}%</Text>
      <Text style={styles.text}>字体: {config.fontSize}px</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    padding: 10,
    borderRadius: 8,
    zIndex: 100,
  },
  text: {
    color: '#00ff00',
    fontSize: 12,
    fontFamily: 'monospace',
    marginBottom: 2,
  },
});