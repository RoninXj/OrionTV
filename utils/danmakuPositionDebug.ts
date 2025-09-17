import { Dimensions } from 'react-native';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

/**
 * 弹幕位置调试工具
 * 用于可视化和调试弹幕显示位置
 */
export class DanmakuPositionDebug {
  
  /**
   * 计算弹幕区域信息
   */
  static calculateDanmakuAreas(fontSize: number = 16) {
    const laneHeight = fontSize + 6;
    
    // 滚动弹幕区域（视频上半部分的四分之一）
    const scrollArea = {
      name: '滚动弹幕区域',
      startY: screenHeight * 0.1,  // 10% 处开始
      height: screenHeight * 0.25, // 25% 高度
      endY: screenHeight * 0.35,   // 35% 处结束
      maxLanes: Math.floor((screenHeight * 0.25) / laneHeight),
      color: 'rgba(0, 255, 0, 0.3)' // 绿色半透明
    };
    
    // 顶部固定弹幕区域
    const topArea = {
      name: '顶部固定弹幕区域',
      startY: 60,
      height: laneHeight * 3, // 最多3行
      endY: 60 + laneHeight * 3,
      maxLanes: 3,
      color: 'rgba(255, 0, 0, 0.3)' // 红色半透明
    };
    
    // 底部固定弹幕区域
    const bottomArea = {
      name: '底部固定弹幕区域',
      startY: screenHeight - 120 - laneHeight * 3,
      height: laneHeight * 3, // 最多3行
      endY: screenHeight - 120,
      maxLanes: 3,
      color: 'rgba(0, 0, 255, 0.3)' // 蓝色半透明
    };
    
    return {
      scroll: scrollArea,
      top: topArea,
      bottom: bottomArea,
      screen: {
        width: screenWidth,
        height: screenHeight
      }
    };
  }
  
  /**
   * 生成位置报告
   */
  static generatePositionReport(fontSize: number = 16): string {
    const areas = this.calculateDanmakuAreas(fontSize);
    
    return `
🎯 弹幕位置布局报告
====================
屏幕尺寸: ${areas.screen.width} x ${areas.screen.height}
字体大小: ${fontSize}px
轨道高度: ${fontSize + 6}px

📍 滚动弹幕区域 (模式 0):
  位置: ${areas.scroll.startY.toFixed(0)}px - ${areas.scroll.endY.toFixed(0)}px
  高度: ${areas.scroll.height.toFixed(0)}px (${(areas.scroll.height / areas.screen.height * 100).toFixed(1)}% 屏幕高度)
  最大轨道数: ${areas.scroll.maxLanes}
  覆盖范围: 视频画面上半部分的四分之一区域

📍 顶部固定弹幕区域 (模式 1):
  位置: ${areas.top.startY}px - ${areas.top.endY}px
  高度: ${areas.top.height}px
  最大轨道数: ${areas.top.maxLanes}
  覆盖范围: 视频顶部

📍 底部固定弹幕区域 (模式 2):
  位置: ${areas.bottom.startY.toFixed(0)}px - ${areas.bottom.endY}px
  高度: ${areas.bottom.height}px
  最大轨道数: ${areas.bottom.maxLanes}
  覆盖范围: 视频底部

💡 布局说明:
- 滚动弹幕主要显示在屏幕上方 10%-35% 区域
- 顶部固定弹幕在最顶部
- 底部固定弹幕在最底部
- 中间区域 (35%-80%) 保持清洁，不遮挡重要内容
====================
`;
  }
  
  /**
   * 计算特定轨道的Y位置
   */
  static calculateLanePosition(mode: number, lane: number, fontSize: number = 16): number {
    const laneHeight = fontSize + 6;
    
    switch (mode) {
      case 1: // 顶部固定
        return 60 + lane * laneHeight;
        
      case 2: // 底部固定
        return screenHeight - 120 - (lane + 1) * laneHeight;
        
      default: // 滚动弹幕 (mode 0)
        const videoTopStart = screenHeight * 0.1;
        const scrollAreaHeight = screenHeight * 0.25;
        const maxLanesInScrollArea = Math.floor(scrollAreaHeight / laneHeight);
        const actualMaxLanes = Math.max(maxLanesInScrollArea, 3);
        
        return videoTopStart + (lane % actualMaxLanes) * laneHeight;
    }
  }
  
  /**
   * 验证弹幕位置是否合理
   */
  static validateDanmakuPosition(mode: number, lane: number, fontSize: number = 16): {
    isValid: boolean;
    position: number;
    warnings: string[];
  } {
    const position = this.calculateLanePosition(mode, lane, fontSize);
    const warnings: string[] = [];
    let isValid = true;
    
    // 检查是否超出屏幕范围
    if (position < 0) {
      warnings.push('位置超出屏幕顶部');
      isValid = false;
    }
    
    if (position > screenHeight - fontSize) {
      warnings.push('位置超出屏幕底部');
      isValid = false;
    }
    
    // 检查是否在合理的显示区域
    if (mode === 0) { // 滚动弹幕
      const expectedStart = screenHeight * 0.1;
      const expectedEnd = screenHeight * 0.35;
      
      if (position < expectedStart || position > expectedEnd) {
        warnings.push('滚动弹幕位置不在预期的四分之一区域内');
      }
    }
    
    return {
      isValid,
      position,
      warnings
    };
  }
  
  /**
   * 生成位置测试数据
   */
  static generateTestPositions(fontSize: number = 16) {
    const testCases = [];
    
    // 测试滚动弹幕的前5个轨道
    for (let i = 0; i < 5; i++) {
      const validation = this.validateDanmakuPosition(0, i, fontSize);
      testCases.push({
        mode: 0,
        modeName: '滚动',
        lane: i,
        ...validation
      });
    }
    
    // 测试顶部固定弹幕的前3个轨道
    for (let i = 0; i < 3; i++) {
      const validation = this.validateDanmakuPosition(1, i, fontSize);
      testCases.push({
        mode: 1,
        modeName: '顶部',
        lane: i,
        ...validation
      });
    }
    
    // 测试底部固定弹幕的前3个轨道
    for (let i = 0; i < 3; i++) {
      const validation = this.validateDanmakuPosition(2, i, fontSize);
      testCases.push({
        mode: 2,
        modeName: '底部',
        lane: i,
        ...validation
      });
    }
    
    return testCases;
  }
}

// 开发模式下的调试工具
if (__DEV__) {
  (global as any).DanmakuPosition = {
    report: (fontSize = 16) => console.log(DanmakuPositionDebug.generatePositionReport(fontSize)),
    test: (fontSize = 16) => {
      const testCases = DanmakuPositionDebug.generateTestPositions(fontSize);
      console.log('🧪 弹幕位置测试结果:');
      testCases.forEach(test => {
        const status = test.isValid ? '✅' : '❌';
        const warnings = test.warnings.length > 0 ? ` (${test.warnings.join(', ')})` : '';
        console.log(`${status} ${test.modeName} 轨道${test.lane}: ${test.position.toFixed(0)}px${warnings}`);
      });
    },
    calculate: (mode, lane, fontSize = 16) => {
      const result = DanmakuPositionDebug.validateDanmakuPosition(mode, lane, fontSize);
      console.log(`弹幕位置: 模式${mode} 轨道${lane} = ${result.position.toFixed(0)}px`);
      if (result.warnings.length > 0) {
        console.log(`警告: ${result.warnings.join(', ')}`);
      }
      return result.position;
    }
  };
  
  console.log('🔧 弹幕位置调试工具已加载，可使用:');
  console.log('  DanmakuPosition.report() - 查看位置布局报告');
  console.log('  DanmakuPosition.test() - 测试各轨道位置');
  console.log('  DanmakuPosition.calculate(mode, lane, fontSize) - 计算特定位置');
}