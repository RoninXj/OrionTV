import { DanmakuService } from '@/services/DanmakuService';

/**
 * 弹幕功能测试工具
 * 用于验证 InfinityTV API 调用是否正常
 */
export class DanmakuTest {
  /**
   * 测试弹幕 API 调用
   */
  static async testDanmakuAPI(title: string, episode?: string): Promise<void> {
    console.log('🧪 开始测试弹幕 API...');
    console.log('📝 测试参数:', { title, episode });

    try {
      const startTime = Date.now();
      const danmaku = await DanmakuService.fetchDanmaku(title, episode);
      const endTime = Date.now();

      console.log('✅ 弹幕 API 测试成功!');
      console.log('📊 测试结果:', {
        弹幕数量: danmaku.length,
        耗时: `${endTime - startTime}ms`,
        示例弹幕: danmaku.slice(0, 3).map(d => ({
          时间: d.time,
          内容: d.text,
          颜色: d.color,
          模式: d.mode
        }))
      });

      if (danmaku.length > 0) {
        console.log('🎯 弹幕时间范围:', {
          最早: `${Math.min(...danmaku.map(d => d.time))}秒`,
          最晚: `${Math.max(...danmaku.map(d => d.time))}秒`
        });
      }

    } catch (error) {
      console.error('❌ 弹幕 API 测试失败:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('配置服务器地址')) {
          console.log('💡 解决方案: 请在 OrionTV 设置中配置 InfinityTV 服务器地址');
        } else if (error.message.includes('网络')) {
          console.log('💡 解决方案: 检查网络连接和服务器状态');
        } else {
          console.log('💡 错误详情:', error.message);
        }
      }
    }
  }

  /**
   * 测试常见视频的弹幕获取
   */
  static async runCommonTests(): Promise<void> {
    const testCases = [
      { title: '狂飙', episode: '1' },
      { title: '三体', episode: '1' },
      { title: '庆余年', episode: '1' },
    ];

    console.log('🧪 开始批量测试常见视频弹幕...');

    for (const testCase of testCases) {
      console.log(`\n--- 测试: ${testCase.title} 第${testCase.episode}集 ---`);
      await this.testDanmakuAPI(testCase.title, testCase.episode);
      
      // 避免请求过于频繁
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log('\n🎉 批量测试完成!');
  }
}