import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    Easing,
    runOnJS,
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
    const lastProcessedTime = useRef(0);
    const danmakuQueue = useRef<DanmakuItem[]>([]);

    // 计算可用轨道数
    const maxLanes = Math.min(config.maxLines, Math.floor((screenHeight * 0.6) / (config.fontSize + 4)));

    // 弹幕过滤器 - 参考 InfinityTV 的过滤逻辑
    const filterDanmaku = useCallback((danmu: DanmakuItem): boolean => {
        if (!danmu.text || !danmu.text.trim()) return false;

        const text = danmu.text.trim();

        // 长度限制
        if (text.length > 50) return false;
        if (text.length < 2) return false;

        // 特殊字符过滤
        const specialCharCount = (text.match(/[^\u4e00-\u9fa5a-zA-Z0-9\s.,!?；，。！？]/g) || []).length;
        if (specialCharCount > 5) return false;

        // 过滤纯数字或纯符号
        if (/^\d+$/.test(text)) return false;
        if (/^[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]+$/.test(text)) return false;

        // 过滤低质量弹幕
        const lowQualityPatterns = [
            /^666+$/, /^好+$/, /^哈+$/, /^啊+$/,
            /^[!！.。？?]+$/, /^牛+$/, /^强+$/
        ];

        return !lowQualityPatterns.some(pattern => pattern.test(text));
    }, []);

    // 智能分段加载 - 参考 InfinityTV 的 5 分钟分段策略
    const loadDanmakuSegment = useCallback((startTime: number, endTime: number) => {
        const segmentDanmaku = danmakuList.filter(item => {
            return item.time >= startTime &&
                item.time < endTime &&
                filterDanmaku(item);
        });

        // 按密度控制过滤
        const maxDanmakuPerSegment = Math.floor(config.density * 20); // 每段最多20条
        return segmentDanmaku.slice(0, maxDanmakuPerSegment);
    }, [danmakuList, config.density, filterDanmaku]);

    // 轨道分配算法 - 参考 InfinityTV 的防重叠逻辑
    const assignLane = useCallback((danmu: DanmakuItem): number => {
        const now = Date.now();

        // 清理过期轨道
        Object.keys(laneManager.current).forEach(key => {
            const laneKey = parseInt(key);
            if (now - laneManager.current[laneKey] > 8000) {
                delete laneManager.current[laneKey];
            }
        });

        // 寻找空闲轨道
        for (let i = 0; i < maxLanes; i++) {
            if (!laneManager.current[i] || now - laneManager.current[i] > 3000) {
                laneManager.current[i] = now;
                return i;
            }
        }

        // 随机分配
        const randomLane = Math.floor(Math.random() * maxLanes);
        laneManager.current[randomLane] = now;
        return randomLane;
    }, [maxLanes]);

    // 估算文本宽度
    const estimateTextWidth = useCallback((text: string, fontSize: number): number => {
        // 中文字符宽度约等于字体大小，英文字符约为字体大小的0.6倍
        const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
        const otherChars = text.length - chineseChars;
        return chineseChars * fontSize + otherChars * fontSize * 0.6 + 16; // 加上padding
    }, []);

    // 主要的弹幕处理逻辑
    useEffect(() => {
        if (!config.enabled || !isPlaying) {
            setActiveDanmaku([]);
            return;
        }

        const now = Date.now();

        // 移除过期弹幕
        setActiveDanmaku(prev => prev.filter(item => now - item.startTime < 12000));

        // 5分钟分段加载策略
        const segmentSize = 300; // 5分钟
        const currentSegment = Math.floor(currentTime / segmentSize);
        const segmentStart = currentSegment * segmentSize;
        const segmentEnd = segmentStart + segmentSize;

        // 加载当前段的弹幕到队列
        if (lastProcessedTime.current < segmentStart) {
            const segmentDanmaku = loadDanmakuSegment(segmentStart, segmentEnd);
            danmakuQueue.current = [...danmakuQueue.current, ...segmentDanmaku];
            lastProcessedTime.current = segmentStart;
            console.log(`🎯 加载弹幕段 ${currentSegment}: ${segmentDanmaku.length} 条`);
        }

        // 从队列中取出当前时间应该显示的弹幕
        const timeWindow = 0.5;
        const newDanmaku = danmakuQueue.current.filter(item => {
            return Math.abs(item.time - currentTime) <= timeWindow;
        });

        if (newDanmaku.length > 0) {
            const processedDanmaku = newDanmaku.map(item => ({
                ...item,
                id: `${item.time}_${item.text}_${Math.random()}`,
                lane: assignLane(item),
                startTime: now,
                width: estimateTextWidth(item.text, config.fontSize),
            }));

            setActiveDanmaku(prev => [...prev, ...processedDanmaku]);

            // 从队列中移除已处理的弹幕
            danmakuQueue.current = danmakuQueue.current.filter(item =>
                !newDanmaku.some(newItem => newItem.time === item.time && newItem.text === item.text)
            );

            console.log(`🎯 显示弹幕: ${newDanmaku.length} 条，当前时间: ${currentTime.toFixed(1)}s`);
        }
    }, [currentTime, isPlaying, config, loadDanmakuSegment, assignLane, estimateTextWidth]);

    return (
        <View style={styles.container} pointerEvents="none">
            {/* 调试信息 */}
            <View style={styles.debugInfo}>
                <Animated.Text style={styles.debugText}>
                    弹幕: {danmakuList.length} | 活跃: {activeDanmaku.length} | 队列: {danmakuQueue.current.length}
                </Animated.Text>
                <Animated.Text style={styles.debugText}>
                    时间: {currentTime.toFixed(1)}s | 轨道: {maxLanes}
                </Animated.Text>
            </View>

            {/* 渲染弹幕 */}
            {activeDanmaku.map(item => (
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

const DanmakuItemRenderer: React.FC<DanmakuItemRendererProps> = ({
    item,
    config,
    isPlaying,
    onComplete,
}) => {
    const translateX = useSharedValue(screenWidth);
    const opacity = useSharedValue(0);

    useEffect(() => {
        if (!isPlaying) return;

        // 淡入动画
        opacity.value = withTiming(config.opacity, { duration: 300 });

        // 根据弹幕模式设置动画
        if (item.mode === 0) {
            // 滚动弹幕 - 参考 ArtPlayer 的滚动逻辑
            const totalDistance = screenWidth + item.width;
            const baseSpeed = 100; // 基础速度 px/s
            const duration = (totalDistance / (baseSpeed * config.speed)) * 1000;

            translateX.value = withTiming(
                -item.width,
                {
                    duration: Math.max(duration, 6000), // 最少6秒
                    easing: Easing.linear,
                },
                (finished) => {
                    if (finished) {
                        runOnJS(onComplete)();
                    }
                }
            );
        } else {
            // 顶部或底部固定弹幕
            translateX.value = withTiming((screenWidth - item.width) / 2, { duration: 300 });

            // 3秒后淡出
            setTimeout(() => {
                opacity.value = withTiming(0, { duration: 500 }, (finished) => {
                    if (finished) {
                        runOnJS(onComplete)();
                    }
                });
            }, 3000);
        }
    }, [isPlaying, config.speed, config.opacity, item.width, item.mode]);

    const animatedStyle = useAnimatedStyle(() => {
        const laneHeight = config.fontSize + 4;
        let topPosition: number;

        if (item.mode === 1) {
            // 顶部弹幕
            topPosition = 60 + item.lane * laneHeight;
        } else if (item.mode === 2) {
            // 底部弹幕
            topPosition = screenHeight - 120 - (item.lane + 1) * laneHeight;
        } else {
            // 滚动弹幕 - 分布在中间区域
            const middleStart = screenHeight * 0.25;
            const middleEnd = screenHeight * 0.75;
            const middleHeight = middleEnd - middleStart;
            const lanesInMiddle = Math.floor(middleHeight / laneHeight);
            topPosition = middleStart + (item.lane % lanesInMiddle) * laneHeight;
        }

        return {
            transform: [{ translateX: translateX.value }],
            opacity: opacity.value,
            top: topPosition,
        };
    });

    return (
        <Animated.View style={[styles.danmakuItem, animatedStyle]}>
            <Animated.Text
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
            </Animated.Text>
        </Animated.View>
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
        right: 20,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: 8,
        borderRadius: 4,
        zIndex: 10,
    },
    debugText: {
        color: '#00ff00',
        fontSize: 11,
        fontFamily: 'monospace',
    },
    danmakuItem: {
        position: 'absolute',
        paddingHorizontal: 8,
        paddingVertical: 2,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        borderRadius: 12,
        maxWidth: screenWidth * 0.8,
    },
    danmakuText: {
        fontWeight: 'bold',
        textShadowColor: 'rgba(0, 0, 0, 0.9)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 3,
    },
});