import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Switch,
  ScrollView,
} from 'react-native';
// 使用简化的滑块组件，避免额外依赖
import { DanmakuConfig } from '@/stores/danmakuStore';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';

interface DanmakuConfigPanelProps {
  visible: boolean;
  config: DanmakuConfig;
  onConfigChange: (config: Partial<DanmakuConfig>) => void;
  onClose: () => void;
}

export const DanmakuConfigPanel: React.FC<DanmakuConfigPanelProps> = ({
  visible,
  config,
  onConfigChange,
  onClose,
}) => {
  const ConfigItem: React.FC<{
    title: string;
    children: React.ReactNode;
  }> = ({ title, children }) => (
    <View style={styles.configItem}>
      <ThemedText style={styles.configTitle}>{title}</ThemedText>
      {children}
    </View>
  );

  const SliderItem: React.FC<{
    title: string;
    value: number;
    min: number;
    max: number;
    step?: number;
    onValueChange: (value: number) => void;
    formatValue?: (value: number) => string;
  }> = ({ title, value, min, max, step = 0.1, onValueChange, formatValue }) => {
    const handleDecrease = () => {
      const newValue = Math.max(min, value - step);
      onValueChange(newValue);
    };

    const handleIncrease = () => {
      const newValue = Math.min(max, value + step);
      onValueChange(newValue);
    };

    return (
      <ConfigItem title={`${title}: ${formatValue ? formatValue(value) : value.toFixed(1)}`}>
        <View style={styles.sliderContainer}>
          <TouchableOpacity onPress={handleDecrease} style={styles.sliderButton}>
            <ThemedText style={styles.sliderButtonText}>-</ThemedText>
          </TouchableOpacity>
          <View style={styles.sliderTrack}>
            <View 
              style={[
                styles.sliderFill, 
                { width: `${((value - min) / (max - min)) * 100}%` }
              ]} 
            />
          </View>
          <TouchableOpacity onPress={handleIncrease} style={styles.sliderButton}>
            <ThemedText style={styles.sliderButtonText}>+</ThemedText>
          </TouchableOpacity>
        </View>
      </ConfigItem>
    );
  };

  const SwitchItem: React.FC<{
    title: string;
    value: boolean;
    onValueChange: (value: boolean) => void;
  }> = ({ title, value, onValueChange }) => (
    <ConfigItem title={title}>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: '#767577', true: '#007AFF' }}
        thumbColor={value ? '#ffffff' : '#f4f3f4'}
      />
    </ConfigItem>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <ThemedView style={styles.container}>
        <View style={styles.header}>
          <ThemedText style={styles.headerTitle}>弹幕设置</ThemedText>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <ThemedText style={styles.closeButtonText}>完成</ThemedText>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* 基础设置 */}
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>基础设置</ThemedText>
            
            <SwitchItem
              title="启用弹幕"
              value={config.enabled}
              onValueChange={(value) => onConfigChange({ enabled: value })}
            />

            <SliderItem
              title="透明度"
              value={config.opacity}
              min={0.1}
              max={1.0}
              onValueChange={(value) => onConfigChange({ opacity: value })}
              formatValue={(value) => `${Math.round(value * 100)}%`}
            />

            <SliderItem
              title="字体大小"
              value={config.fontSize}
              min={12}
              max={24}
              step={1}
              onValueChange={(value) => onConfigChange({ fontSize: value })}
              formatValue={(value) => `${value}px`}
            />

            <SliderItem
              title="滚动速度"
              value={config.speed}
              min={0.5}
              max={2.0}
              onValueChange={(value) => onConfigChange({ speed: value })}
              formatValue={(value) => `${value}x`}
            />

            <SliderItem
              title="弹幕密度"
              value={config.density}
              min={0.1}
              max={1.0}
              onValueChange={(value) => onConfigChange({ density: value })}
              formatValue={(value) => `${Math.round(value * 100)}%`}
            />

            <SliderItem
              title="最大行数"
              value={config.maxLines}
              min={3}
              max={15}
              step={1}
              onValueChange={(value) => onConfigChange({ maxLines: value })}
              formatValue={(value) => `${value}行`}
            />
          </View>

          {/* 显示类型 */}
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>显示类型</ThemedText>
            
            <SwitchItem
              title="滚动弹幕"
              value={config.showScroll}
              onValueChange={(value) => onConfigChange({ showScroll: value })}
            />

            <SwitchItem
              title="顶部弹幕"
              value={config.showTop}
              onValueChange={(value) => onConfigChange({ showTop: value })}
            />

            <SwitchItem
              title="底部弹幕"
              value={config.showBottom}
              onValueChange={(value) => onConfigChange({ showBottom: value })}
            />
          </View>

          {/* 过滤设置 */}
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>过滤设置</ThemedText>
            
            <ConfigItem title={`过滤等级: ${getFilterLevelText(config.filterLevel)}`}>
              <View style={styles.filterButtons}>
                {[0, 1, 2, 3].map((level) => (
                  <TouchableOpacity
                    key={level}
                    style={[
                      styles.filterButton,
                      config.filterLevel === level && styles.filterButtonActive,
                    ]}
                    onPress={() => onConfigChange({ filterLevel: level })}
                  >
                    <Text
                      style={[
                        styles.filterButtonText,
                        config.filterLevel === level && styles.filterButtonTextActive,
                      ]}
                    >
                      {getFilterLevelText(level)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ConfigItem>
          </View>

          {/* 预设方案 */}
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>预设方案</ThemedText>
            
            <View style={styles.presetButtons}>
              <TouchableOpacity
                style={styles.presetButton}
                onPress={() => applyPreset('performance', onConfigChange)}
              >
                <ThemedText style={styles.presetButtonText}>性能优先</ThemedText>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.presetButton}
                onPress={() => applyPreset('balanced', onConfigChange)}
              >
                <ThemedText style={styles.presetButtonText}>平衡模式</ThemedText>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.presetButton}
                onPress={() => applyPreset('quality', onConfigChange)}
              >
                <ThemedText style={styles.presetButtonText}>效果优先</ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </ThemedView>
    </Modal>
  );
};

const getFilterLevelText = (level: number): string => {
  switch (level) {
    case 0: return '关闭';
    case 1: return '低';
    case 2: return '中';
    case 3: return '高';
    default: return '未知';
  }
};

const applyPreset = (
  preset: 'performance' | 'balanced' | 'quality',
  onConfigChange: (config: Partial<DanmakuConfig>) => void
) => {
  const presets = {
    performance: {
      opacity: 0.6,
      fontSize: 14,
      speed: 1.5,
      density: 0.5,
      maxLines: 5,
      filterLevel: 2,
    },
    balanced: {
      opacity: 0.8,
      fontSize: 16,
      speed: 1.0,
      density: 0.8,
      maxLines: 8,
      filterLevel: 1,
    },
    quality: {
      opacity: 0.9,
      fontSize: 18,
      speed: 0.8,
      density: 1.0,
      maxLines: 12,
      filterLevel: 0,
    },
  };

  onConfigChange(presets[preset]);
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    backgroundColor: '#007AFF',
    borderRadius: 8,
  },
  closeButtonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginVertical: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 15,
    color: '#007AFF',
  },
  configItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  configTitle: {
    fontSize: 14,
    flex: 1,
  },
  sliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 120,
  },
  sliderButton: {
    width: 30,
    height: 30,
    backgroundColor: '#007AFF',
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sliderButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  sliderTrack: {
    flex: 1,
    height: 4,
    backgroundColor: '#E5E5E5',
    borderRadius: 2,
    marginHorizontal: 8,
    overflow: 'hidden',
  },
  sliderFill: {
    height: '100%',
    backgroundColor: '#007AFF',
  },
  filterButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    backgroundColor: '#F8F8F8',
  },
  filterButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  filterButtonText: {
    fontSize: 12,
    color: '#666666',
  },
  filterButtonTextActive: {
    color: '#ffffff',
  },
  presetButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  presetButton: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: '#F0F0F0',
    borderRadius: 8,
    alignItems: 'center',
  },
  presetButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
});