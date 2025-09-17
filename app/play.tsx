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
import { ArtPlayerStyleDanmaku } from "@/components/danmaku/ArtPlayerStyleDanmaku";
// 调试信息已集成到滚动弹幕组件中
// 移除基础测试组件导入
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

        const danmaku = await DanmakuService.fetchDanmaku(title, episodeStr, id);
        setDanmakuList(danmaku);
        logger.info(`🎯 弹幕加载完成: ${danmaku.length} 条`);
        
        if (danmaku.length > 0) {
          Toast.show({ 
            type: 'success', 
            text1: `弹幕加载成功`, 
            text2: `获取到 ${danmaku.length} 条弹幕数据` 
          });
        } else {
          Toast.show({ 
            type: 'info', 
            text1: '未找到弹幕数据', 
            text2: '该视频可能暂无弹幕' 
          });
        }
      } catch (error) {
        logger.error('弹幕加载失败:', error);
        const errorMessage = error instanceof Error ? error.message : '弹幕加载失败';
        
        if (errorMessage.includes('配置服务器地址')) {
          Toast.show({ 
            type: 'error', 
            text1: '弹幕功能需要配置', 
            text2: '请在设置中配置 InfinityTV 服务器地址' 
          });
        } else {
          Toast.show({ 
            type: 'error', 
            text1: '弹幕加载失败', 
            text2: errorMessage 
          });
        }
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

        {/* 弹幕渲染层 - ArtPlayer 风格弹幕系统 */}
        <ArtPlayerStyleDanmaku
          danmakuList={danmakuList}
          currentTime={status?.positionMillis ? status.positionMillis / 1000 : 0}
          isPlaying={status?.isPlaying || false}
          config={danmakuConfig}
        />

        {/* 开发模式下的弹幕测试按钮 */}
        {__DEV__ && (
          <View style={{ 
            position: 'absolute', 
            top: 100, 
            left: 20, 
            zIndex: 999 
          }}>
            <TouchableOpacity
              style={{
                backgroundColor: 'rgba(0, 255, 0, 0.8)',
                padding: 10,
                borderRadius: 5,
              }}
              onPress={async () => {
                const { DanmakuTest } = await import('@/utils/danmakuTest');
                DanmakuTest.testDanmakuAPI(title || '测试视频', '1');
              }}
            >
              <Text style={{ color: 'white', fontSize: 12 }}>
                测试弹幕API
              </Text>
            </TouchableOpacity>
          </View>
        )}

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
