import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { MessageSquare, Settings } from 'lucide-react-native';
import { ThemedText } from '@/components/ThemedText';
import { MediaButton } from '@/components/MediaButton';
import { useDanmakuStore } from '@/stores/danmakuStore';

interface DanmakuControlsProps {
  enabled?: boolean;
  onToggle?: () => void;
  onOpenSettings?: () => void;
  danmakuCount?: number;
}

export const DanmakuControls: React.FC<DanmakuControlsProps> = ({
  enabled,
  onToggle,
  onOpenSettings,
  danmakuCount = 0
}) => {
  const { config, setShowConfigPanel, updateConfig } = useDanmakuStore();

  const isEnabled = enabled !== undefined ? enabled : config.enabled;

  const toggleDanmaku = () => {
    if (onToggle) {
      onToggle();
    } else {
      updateConfig({ enabled: !config.enabled });
    }
  };

  const openSettings = () => {
    if (onOpenSettings) {
      onOpenSettings();
    } else {
      setShowConfigPanel(true);
    }
  };

  return (
    <View style={styles.container}>
      {/* 弹幕开关按钮 */}
      <MediaButton
        onPress={toggleDanmaku}
        timeLabel={config.enabled ? `${danmakuCount}` : undefined}
      >
        <MessageSquare
          color={isEnabled ? "#007AFF" : "#666"}
          size={24}
          fill={isEnabled ? "#007AFF" : "transparent"}
        />
      </MediaButton>

      {/* 弹幕设置按钮 */}
      <MediaButton onPress={openSettings}>
        <Settings color="white" size={24} />
      </MediaButton>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
});