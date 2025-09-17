/**
 * 弹幕性能监控工具
 * 用于监控和优化弹幕渲染性能
 */

interface PerformanceMetrics {
  renderCount: number;
  averageRenderTime: number;
  maxRenderTime: number;
  activeDanmakuCount: number;
  droppedFrames: number;
  memoryUsage: number;
}

class DanmakuPerformanceMonitor {
  private metrics: PerformanceMetrics = {
    renderCount: 0,
    averageRenderTime: 0,
    maxRenderTime: 0,
    activeDanmakuCount: 0,
    droppedFrames: 0,
    memoryUsage: 0,
  };

  private renderTimes: number[] = [];
  private lastFrameTime = 0;
  private frameCount = 0;

  /**
   * 开始性能测量
   */
  startRender(): number {
    return performance.now();
  }

  /**
   * 结束性能测量
   */
  endRender(startTime: number, activeDanmakuCount: number): void {
    const renderTime = performance.now() - startTime;
    
    this.renderTimes.push(renderTime);
    this.metrics.renderCount++;
    this.metrics.activeDanmakuCount = activeDanmakuCount;
    
    // 保持最近100次渲染的记录
    if (this.renderTimes.length > 100) {
      this.renderTimes.shift();
    }
    
    // 计算平均渲染时间
    this.metrics.averageRenderTime = this.renderTimes.reduce((a, b) => a + b, 0) / this.renderTimes.length;
    
    // 更新最大渲染时间
    if (renderTime > this.metrics.maxRenderTime) {
      this.metrics.maxRenderTime = renderTime;
    }
    
    // 检测掉帧
    const now = performance.now();
    if (this.lastFrameTime > 0) {
      const frameTime = now - this.lastFrameTime;
      if (frameTime > 16.67 * 2) { // 超过2帧的时间
        this.metrics.droppedFrames++;
      }
    }
    this.lastFrameTime = now;
    this.frameCount++;
  }

  /**
   * 获取性能指标
   */
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  /**
   * 重置性能指标
   */
  reset(): void {
    this.metrics = {
      renderCount: 0,
      averageRenderTime: 0,
      maxRenderTime: 0,
      activeDanmakuCount: 0,
      droppedFrames: 0,
      memoryUsage: 0,
    };
    this.renderTimes = [];
    this.frameCount = 0;
  }

  /**
   * 获取性能报告
   */
  getReport(): string {
    const metrics = this.getMetrics();
    const fps = this.frameCount > 0 ? (1000 / metrics.averageRenderTime).toFixed(1) : '0';
    
    return `
🎯 弹幕性能报告
================
渲染次数: ${metrics.renderCount}
平均渲染时间: ${metrics.averageRenderTime.toFixed(2)}ms
最大渲染时间: ${metrics.maxRenderTime.toFixed(2)}ms
当前活跃弹幕: ${metrics.activeDanmakuCount}
掉帧次数: ${metrics.droppedFrames}
估算FPS: ${fps}
================
`;
  }

  /**
   * 性能建议
   */
  getRecommendations(): string[] {
    const metrics = this.getMetrics();
    const recommendations: string[] = [];

    if (metrics.averageRenderTime > 16) {
      recommendations.push('⚠️ 平均渲染时间过长，建议减少同时显示的弹幕数量');
    }

    if (metrics.maxRenderTime > 50) {
      recommendations.push('⚠️ 最大渲染时间过长，可能存在性能瓶颈');
    }

    if (metrics.activeDanmakuCount > 20) {
      recommendations.push('⚠️ 活跃弹幕数量过多，建议限制最大显示数量');
    }

    if (metrics.droppedFrames > metrics.renderCount * 0.1) {
      recommendations.push('⚠️ 掉帧率过高，建议优化动画性能');
    }

    if (recommendations.length === 0) {
      recommendations.push('✅ 性能表现良好');
    }

    return recommendations;
  }
}

// 全局性能监控实例
export const danmakuPerformanceMonitor = new DanmakuPerformanceMonitor();

// 开发模式下的性能调试工具
if (__DEV__) {
  (global as any).DanmakuPerformance = {
    getReport: () => console.log(danmakuPerformanceMonitor.getReport()),
    getRecommendations: () => console.log(danmakuPerformanceMonitor.getRecommendations().join('\n')),
    reset: () => danmakuPerformanceMonitor.reset(),
  };
  
  console.log('🔧 弹幕性能监控已加载，可使用:');
  console.log('  DanmakuPerformance.getReport() - 查看性能报告');
  console.log('  DanmakuPerformance.getRecommendations() - 查看优化建议');
  console.log('  DanmakuPerformance.reset() - 重置统计');
}

/**
 * 弹幕性能优化建议
 */
export const DanmakuOptimizationTips = {
  // 推荐的配置
  RECOMMENDED_CONFIG: {
    maxLines: 5,           // 最大显示行数
    fontSize: 16,          // 字体大小
    speed: 1.0,           // 播放速度
    opacity: 0.8,         // 透明度
    density: 0.5,         // 弹幕密度
  },

  // 性能优化提示
  TIPS: [
    '减少同时显示的弹幕数量可以显著提升性能',
    '使用较小的字体大小可以减少渲染负担',
    '降低弹幕密度可以减少计算量',
    '在低端设备上建议关闭弹幕阴影效果',
    '避免在弹幕动画中使用复杂的变换',
  ],

  // 故障排除
  TROUBLESHOOTING: {
    '弹幕卡顿': [
      '检查同时显示的弹幕数量是否过多',
      '尝试降低弹幕密度设置',
      '检查设备性能是否足够',
    ],
    '弹幕不显示': [
      '检查弹幕开关是否开启',
      '确认弹幕数据是否正确加载',
      '检查弹幕时间轴是否匹配',
    ],
    '内存占用过高': [
      '定期清理过期弹幕',
      '限制弹幕缓存大小',
      '避免创建过多的动画实例',
    ],
  },
};