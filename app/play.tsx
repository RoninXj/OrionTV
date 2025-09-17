import React, { useEffect, useRef, useCallback, memo, useMemo } from "react";
import { StyleSheet, TouchableOpacity, BackHandler, AppState, AppStateStatus, View, Text } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Video } from "expo-av";
import { useKeepAwake } from "expo-keep-awake";
import { ThemedView } from "@/components/ThemedView";
import { PlayerControls } from "@/components/PlayerControls";
import { EpisodeSelectionModal } from "@/components/EpisodeSelectionModal";
import { SourceSelectionModal } from "@/components/SourceSelectionModal";
import { SpeedSelectionModal } from "@/components/SpeedSelectionModal";
import { SeekingBar } from "@/components/SeekingBar";
// import { NextEpisodeOverlay } from "@/components/NextEpisodeOverlay";
import VideoLoadingAnimation from "@/components/VideoLoadingAnimation";
import { SimpleDanmakuOverlay } from "@/components/danmaku/SimpleDanmakuOverlay";
import { DanmakuDebugInfo } from "@/components/danmaku/DanmakuDebugInfo";
import { BasicDanmakuTest } from "@/components/danmaku/BasicDanmakuTest";
import { DanmakuConfigPanel } from "@/components/danmaku/DanmakuConfigPanel";
import useDetailStore from "@/stores/detailStore";
import { useTVRemoteHandler } from "@/hooks/useTVRemoteHandler";
import Toast from "react-native-toast-message";
import usePlayerStore, { selectCurrentEpisode } from "@/stores/playerStore";
import { useResponsiveLayout } from "@/hooks/useResponsiveLayout";
import { useVideoHandlers } from "@/hooks/useVideoHandlers";
import { useDanmakuStore } from "@/stores/danmakuStore";
import { DanmakuService } from "@/services/DanmakuService";
import Logger from '@/utils/Logger';

const logger = Logger.withTag('PlayScreen');

// 优化的加载动画组件
const LoadingContainer = memo(
  ({ style, currentEpisode }: { style: any; currentEpisode: { url: string; title: string } | undefined }) => {
    logger.info(
      `[PERF] Video component NOT rendered - waiting for valid URL. currentEpisode: ${!!currentEpisode}, url: ${currentEpisode?.url ? "exists" : "missing"
      }`
    );
    return (
      <View style={style}>
        <VideoLoadingAnimation showProgressBar />
      </View>
    );
  }
);

LoadingContainer.displayName = "LoadingContainer";

// 移到组件外部避免重复创建
const createResponsiveStyles = (deviceType: string) => {
  const isMobile = deviceType === "mobile";
  const isTablet = deviceType === "tablet";

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: "black",
      // 移动端和平板端可能需要状态栏处理
      ...(isMobile || isTablet ? { paddingTop: 0 } : {}),
    },
    videoContainer: {
      ...StyleSheet.absoluteFillObject,
      // 为触摸设备添加更多的交互区域
      ...(isMobile || isTablet ? { zIndex: 1 } : {}),
    },
    videoPlayer: {
      ...StyleSheet.absoluteFillObject,
    },
    loadingContainer: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(0, 0, 0, 0.8)",
      justifyContent: "center",
      alignItems: "center",
      zIndex: 10,
    },
  });
};

export default function PlayScreen() {
  const videoRef = useRef<Video>(null);
  const router = useRouter();
  useKeepAwake();

  // 响应式布局配置
  const { deviceType } = useResponsiveLayout();

  const {
    episodeIndex: episodeIndexStr,
    position: positionStr,
    source: sourceStr,
    id: videoId,
    title: videoTitle,
  } = useLocalSearchParams<{
    episodeIndex: string;
    position?: string;
    source?: string;
    id?: string;
    title?: string;
  }>();
  const episodeIndex = parseInt(episodeIndexStr || "0", 10);
  const position = positionStr ? parseInt(positionStr, 10) : undefined;

  const { detail } = useDetailStore();
  const source = sourceStr || detail?.source;
  const id = videoId || detail?.id.toString();
  const title = videoTitle || detail?.title;
  const {
    isLoading,
    showControls,
    // showNextEpisodeOverlay,
    initialPosition,
    introEndTime,
    playbackRate,
    status,
    setVideoRef,
    handlePlaybackStatusUpdate,
    setShowControls,
    // setShowNextEpisodeOverlay,
    reset,
    loadVideo,
  } = usePlayerStore();
  const currentEpisode = usePlayerStore(selectCurrentEpisode);

  // 弹幕相关状态
  const {
    danmakuList,
    config: danmakuConfig,
    showConfigPanel,
    isLoading: danmakuLoading,
    setDanmakuList,
    setLoading: setDanmakuLoading,
    setShowConfigPanel,
    updateConfig: updateDanmakuConfig,
    loadConfig: loadDanmakuConfig,
    clearDanmaku,
  } = useDanmakuStore();

  // 使用Video事件处理hook
  const { videoProps } = useVideoHandlers({
    videoRef,
    currentEpisode,
    initialPosition,
    introEndTime,
    playbackRate,
    handlePlaybackStatusUpdate,
    deviceType,
    detail: detail || undefined,
  });

  // TV遥控器处理 - 总是调用hook，但根据设备类型决定是否使用结果
  const tvRemoteHandler = useTVRemoteHandler();

  // 优化的动态样式 - 使用useMemo避免重复计算
  const dynamicStyles = useMemo(() => createResponsiveStyles(deviceType), [deviceType]);

  // 加载弹幕配置
  useEffect(() => {
    loadDanmakuConfig();
  }, [loadDanmakuConfig]);

  // 加载弹幕数据
  useEffect(() => {
    const loadDanmaku = async () => {
      if (!title || !danmakuConfig.enabled) {
        clearDanmaku();
        return;
      }

      setDanmakuLoading(true);
      try {
        const episodeStr = currentEpisode?.title || (episodeIndex > 0 ? String(episodeIndex + 1) : undefined);
        logger.info(`🎯 开始加载弹幕: ${title}, 集数: ${episodeStr}`);

        let danmaku = await DanmakuService.fetchDanmaku(title, episodeStr, id);

        // 如果没有获取到弹幕，添加测试数据
        if (danmaku.length === 0) {
          logger.info('🎯 未获取到弹幕，使用测试数据');
          danmaku = [
            { text: '测试弹幕1 - 开始播放', time: 10, color: '#ffffff', mode: 0 },
            { text: '测试弹幕2 - 精彩片段', time: 30, color: '#ff6b6b', mode: 0 },
            { text: '测试弹幕3 - 顶部弹幕', time: 60, color: '#4ecdc4', mode: 1 },
            { text: '测试弹幕4 - 底部弹幕', time: 90, color: '#45b7d1', mode: 2 },
            { text: '测试弹幕5 - 中间段落', time: 120, color: '#96ceb4', mode: 0 },
          ];
        }

        setDanmakuList(danmaku);
        logger.info(`🎯 弹幕加载完成: ${danmaku.length} 条`);
      } catch (error) {
        logger.error('弹幕加载失败:', error);

        // 加载失败时也提供测试数据
        const testDanmaku = [
          { text: '网络错误 - 测试弹幕', time: 5, color: '#ff4757', mode: 0 },
          { text: '这是测试弹幕数据', time: 15, color: '#ffa502', mode: 0 },
        ];
        setDanmakuList(testDanmaku);

        Toast.show({ type: 'info', text1: '使用测试弹幕数据' });
      } finally {
        setDanmakuLoading(false);
      }
    };

    loadDanmaku();
  }, [title, episodeIndex, currentEpisode?.title, id, danmakuConfig.enabled, setDanmakuList, setDanmakuLoading, clearDanmaku]);

  useEffect(() => {
    const perfStart = performance.now();
    logger.info(`[PERF] PlayScreen useEffect START - source: ${source}, id: ${id}, title: ${title}`);

    setVideoRef(videoRef);
    if (source && id && title) {
      logger.info(`[PERF] Calling loadVideo with episodeIndex: ${episodeIndex}, position: ${position}`);
      loadVideo({ source, id, episodeIndex, position, title });
    } else {
      logger.info(`[PERF] Missing required params - source: ${!!source}, id: ${!!id}, title: ${!!title}`);
    }

    const perfEnd = performance.now();
    logger.info(`[PERF] PlayScreen useEffect END - took ${(perfEnd - perfStart).toFixed(2)}ms`);

    return () => {
      logger.info(`[PERF] PlayScreen unmounting - calling reset()`);
      reset(); // Reset state when component unmounts
      clearDanmaku(); // 清理弹幕数据
    };
  }, [episodeIndex, source, position, setVideoRef, reset, loadVideo, id, title, clearDanmaku]);

  // 优化的屏幕点击处理
  const onScreenPress = useCallback(() => {
    if (deviceType === "tv") {
      tvRemoteHandler.onScreenPress();
    } else {
      setShowControls(!showControls);
    }
  }, [deviceType, tvRemoteHandler, setShowControls, showControls]);

  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === "background" || nextAppState === "inactive") {
        videoRef.current?.pauseAsync();
      }
    };

    const subscription = AppState.addEventListener("change", handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    const backAction = () => {
      if (showControls) {
        setShowControls(false);
        return true;
      }
      router.back();
      return true;
    };

    const backHandler = BackHandler.addEventListener("hardwareBackPress", backAction);

    return () => backHandler.remove();
  }, [showControls, setShowControls, router]);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout | null = null;

    if (isLoading) {
      timeoutId = setTimeout(() => {
        if (usePlayerStore.getState().isLoading) {
          usePlayerStore.setState({ isLoading: false });
          Toast.show({ type: "error", text1: "播放超时，请重试" });
        }
      }, 60000); // 1 minute
    }

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [isLoading]);

  if (!detail) {
    return <VideoLoadingAnimation showProgressBar />;
  }

  return (
    <ThemedView focusable style={dynamicStyles.container}>
      <TouchableOpacity
        activeOpacity={1}
        style={dynamicStyles.videoContainer}
        onPress={onScreenPress}
        disabled={deviceType !== "tv" && showControls} // 移动端和平板端在显示控制条时禁用触摸
      >
        {/* 条件渲染Video组件：只有在有有效URL时才渲染 */}
        {currentEpisode?.url ? (
          <Video ref={videoRef} style={dynamicStyles.videoPlayer} {...videoProps} />
        ) : (
          <LoadingContainer style={dynamicStyles.loadingContainer} currentEpisode={currentEpisode} />
        )}

        {showControls && (
          <PlayerControls showControls={showControls} setShowControls={setShowControls} />
        )}

        <SeekingBar />

        {/* 弹幕渲染层 - 使用简化版本进行测试 */}
        <SimpleDanmakuOverlay
          danmakuList={danmakuList}
          currentTime={status?.positionMillis ? status.positionMillis / 1000 : 0}
          isPlaying={status?.isPlaying || false}
          config={danmakuConfig}
        />

        {/* 弹幕调试信息 */}
        <DanmakuDebugInfo />

        {/* 基础弹幕测试 - 确保渲染层正常工作 */}
        <BasicDanmakuTest />

        {/* 只在Video组件存在且正在加载时显示加载动画覆盖层 */}
        {currentEpisode?.url && isLoading && (
          <View style={dynamicStyles.loadingContainer}>
            <VideoLoadingAnimation showProgressBar />
          </View>
        )}

        {/* <NextEpisodeOverlay visible={showNextEpisodeOverlay} onCancel={() => setShowNextEpisodeOverlay(false)} /> */}
      </TouchableOpacity>

      <EpisodeSelectionModal />
      <SourceSelectionModal />
      <SpeedSelectionModal />

      {/* 弹幕配置面板 */}
      <DanmakuConfigPanel
        visible={showConfigPanel}
        config={danmakuConfig}
        onConfigChange={updateDanmakuConfig}
        onClose={() => setShowConfigPanel(false)}
      />
    </ThemedView>
  );
}
