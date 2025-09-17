import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { View, StyleSheet, Dimensions, Text } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    Easing,
    runOnJS,
    cancelAnimation,
} from 'react-native-reanimated';
import { DanmakuItem, DanmakuConfig } from '@/stores/danmakuStore';

interface ArtPlayerStyleDanmakuProps {
    danmakuList: DanmakuItem[];
    currentTime: number;
    isPlaying: boolean;
    config: DanmakuConfig;
}

interface ProcessedDanmaku extends DanmakuItem {
    id: string;
    lane: number;
    startTime: number;
    width: number;
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export const ArtPlayerStyleDanmaku: React.FC<ArtPlayerStyleDanmakuProps> = ({
    danmakuList,
    currentTime,
    isPlaying,
    config,
}) => {
    const [activeDanmaku, setActiveDanmaku] = useState<ProcessedDanmaku[]>([]);
    const laneManager = useRef<{ [key: number]: number }>({});
    const lastCheckTime = useRef(0);
    const updateTimer = useRef<NodeJS.Timeout | null>(null);

    // 使用 useMemo 优化计算
    const maxLanes = useMemo(() => {
        const laneHeight = config.fontSize + 6;
        const scrollAreaHeight = screenHeight * 0.25; // 四分之一区域用于滚动弹幕
        const calculatedMaxLanes = Math.floor(scrollAreaHeight / laneHeight);

        // 确保至少有3行，最多不超过配置的最大行数
        return Math.min(config.maxLines, Math.max(calculatedMaxLanes, 3));
    }, [config.maxLines, config.fontSize]);

    // 预处理弹幕数据，避免重复过滤
    const filteredDanmaku = useMemo(() => {
        if (!danmakuList.length) return [];

        return danmakuList.filter(item => {
            if (!item.text || !item.text.trim()) return false;
            const text = item.text.trim();

            // 基础过滤
            if (text.length > 30 || text.length < 2) return false;

            // 简化的低质量过滤
            if (/^[666好哈啊牛强!！.。？?]+$/.test(text)) return false;
            if (/^\d+$/.test(text)) return false;

            return true;
        }).sort((a, b) => a.time - b.time); // 预排序
    }, [danmakuList]);

    // 估算文本宽度 - 简化版本
    const estimateTextWidth = useCallback((text: string, fontSize: number): number => {
        return text.length * fontSize * 0.8 + 16;
    }, []);

    // 轨道分配 - 简化版本
    const assignLane = useCallback((): number => {
        const now = Date.now();

        // 寻找空闲轨道
        for (let i = 0; i < maxLanes; i++) {
            if (!laneManager.current[i] || now - laneManager.current[i] > 4000) {
                laneManager.current[i] = now;
                return i;
            }
        }

        // 随机分配
        const randomLane = Math.floor(Math.random() * maxLanes);
        laneManager.current[randomLane] = now;
        return randomLane;
    }, [maxLanes]);

    // 优化的弹幕更新逻辑 - 使用定时器而不是 useEffect
    useEffect(() => {
        if (!config.enabled || !isPlaying || !filteredDanmaku.length) {
            setActiveDanmaku([]);
            if (updateTimer.current) {
                clearInterval(updateTimer.current);
                updateTimer.current = null;
            }
            return;
        }

        // 使用定时器定期检查，而不是每次 currentTime 变化都检查
        updateTimer.current = setInterval(() => {
            const now = Date.now();

            // 清理过期弹幕
            setActiveDanmaku(prev => prev.filter(item => now - item.startTime < 8000));

            // 检查是否有新弹幕需要显示
            const timeWindow = 1.0; // 增大时间窗口
            const newDanmaku = filteredDanmaku.filter(item => {
                return item.time >= lastCheckTime.current &&
                    item.time < currentTime + timeWindow &&
                    item.time >= currentTime - 0.5;
            });

            if (newDanmaku.length > 0) {
                // 限制同时显示的弹幕数量
                const maxConcurrent = Math.min(newDanmaku.length, 3);
                const selectedDanmaku = newDanmaku.slice(0, maxConcurrent);

                const processedDanmaku = selectedDanmaku.map(item => ({
                    ...item,
                    id: `${item.time}_${Math.random().toString(36).substr(2, 9)}`,
                    lane: assignLane(),
                    startTime: now,
                    width: estimateTextWidth(item.text, config.fontSize),
                }));

                setActiveDanmaku(prev => [...prev, ...processedDanmaku]);
                console.log(`🎯 显示弹幕: ${selectedDanmaku.length} 条`);
            }

            lastCheckTime.current = currentTime;
        }, 500); // 每500ms检查一次

        return () => {
            if (updateTimer.current) {
                clearInterval(updateTimer.current);
                updateTimer.current = null;
            }
        };
    }, [config.enabled, isPlaying, filteredDanmaku, currentTime, assignLane, estimateTextWidth, config.fontSize]);

    // 清理函数
    useEffect(() => {
        return () => {
            if (updateTimer.current) {
                clearInterval(updateTimer.current);
            }
        };
    }, []);

    if (!config.enabled) {
        return null;
    }

    return (
        <View style={styles.container} pointerEvents="none">
            {/* 简化的调试信息 */}
            {__DEV__ && (
                <View style={styles.debugInfo}>
                    <Text style={styles.debugText}>
                        弹幕: {filteredDanmaku.length} | 活跃: {activeDanmaku.length}
                    </Text>
                </View>
            )}

            {/* 渲染弹幕 - 限制最大数量 */}
            {activeDanmaku.slice(0, 10).map(item => (
                <DanmakuItemRenderer
                    key={item.id}
                    item={item}
                    config={config}
                    isPlaying={isPlaying}
                    onComplete={() => {
                        setActiveDanmaku(prev => prev.filter(d => d.id !== item.id));
                    }}
                />
            ))}
        </View>
    );
};

interface DanmakuItemRendererProps {
    item: ProcessedDanmaku;
    config: DanmakuConfig;
    isPlaying: boolean;
    onComplete: () => void;
}

const DanmakuItemRenderer = React.memo<DanmakuItemRendererProps>(({
    item,
    config,
    isPlaying,
    onComplete,
}) => {
    const translateX = useSharedValue(screenWidth);
    const opacity = useSharedValue(0);
    const completedRef = useRef(false);

    const handleComplete = useCallback(() => {
        if (!completedRef.current) {
            completedRef.current = true;
            onComplete();
        }
    }, [onComplete]);

    useEffect(() => {
        if (!isPlaying || completedRef.current) return;

        // 简化的动画逻辑
        opacity.value = withTiming(config.opacity, { duration: 200 });

        if (item.mode === 0 || !item.mode) {
            // 滚动弹幕 - 简化计算
            const duration = Math.max(6000 / config.speed, 4000); // 最少4秒

            translateX.value = withTiming(
                -item.width,
                {
                    duration,
                    easing: Easing.linear,
                },
                (finished) => {
                    if (finished) {
                        runOnJS(handleComplete)();
                    }
                }
            );
        } else {
            // 固定弹幕
            translateX.value = withTiming((screenWidth - item.width) / 2, { duration: 200 });

            // 3秒后自动完成
            const timer = setTimeout(() => {
                opacity.value = withTiming(0, { duration: 300 }, (finished) => {
                    if (finished) {
                        runOnJS(handleComplete)();
                    }
                });
            }, 3000);

            return () => clearTimeout(timer);
        }
    }, [isPlaying, config.speed, config.opacity, item.width, item.mode, handleComplete]);

    // 清理动画
    useEffect(() => {
        return () => {
            cancelAnimation(translateX);
            cancelAnimation(opacity);
        };
    }, []);

    const animatedStyle = useAnimatedStyle(() => {
        const laneHeight = config.fontSize + 6;
        let topPosition: number;

        // 弹幕位置计算
        if (item.mode === 1) {
            // 顶部固定弹幕 - 在视频顶部
            topPosition = 60 + item.lane * laneHeight;
        } else if (item.mode === 2) {
            // 底部固定弹幕 - 在视频底部
            topPosition = screenHeight - 120 - (item.lane + 1) * laneHeight;
        } else {
            // 滚动弹幕 - 显示在视频画面的上半部分（四分之一区域）
            const videoTopStart = screenHeight * 0.1;  // 视频顶部留白
            const scrollAreaHeight = screenHeight * 0.25; // 四分之一区域用于滚动弹幕
            const maxLanesInScrollArea = Math.floor(scrollAreaHeight / laneHeight);

            // 确保至少有3行弹幕空间
            const actualMaxLanes = Math.max(maxLanesInScrollArea, 3);
            topPosition = videoTopStart + (item.lane % actualMaxLanes) * laneHeight;
        }

        return {
            transform: [{ translateX: translateX.value }],
            opacity: opacity.value,
            top: topPosition,
        };
    });

    return (
        <Animated.View style={[styles.danmakuItem, animatedStyle]}>
            <Text
                style={[
                    styles.danmakuText,
                    {
                        color: item.color || '#ffffff',
                        fontSize: config.fontSize,
                    },
                ]}
                numberOfLines={1}
            >
                {item.text}
            </Text>
        </Animated.View>
    );
});

const styles = StyleSheet.create({
    container: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 5,
    },
    debugInfo: {
        position: 'absolute',
        top: 40,
        right: 20,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        padding: 6,
        borderRadius: 4,
        zIndex: 10,
    },
    debugText: {
        color: '#00ff00',
        fontSize: 10,
        fontFamily: 'monospace',
    },
    danmakuItem: {
        position: 'absolute',
        paddingHorizontal: 6,
        paddingVertical: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
        borderRadius: 10,
        maxWidth: screenWidth * 0.7,
    },
    danmakuText: {
        fontWeight: '600',
        textShadowColor: 'rgba(0, 0, 0, 0.8)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 2,
    },
});