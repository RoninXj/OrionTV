import AsyncStorage from '@react-native-async-storage/async-storage';
import { DanmakuService } from '@/services/DanmakuService';

/**
 * 弹幕调试工具
 * 用于调试弹幕功能的各种问题
 */
export class DanmakuDebug {
  
  /**
   * 检查存储中的设置
   */
  static async checkStorageSettings(): Promise<void> {
    console.log('🔍 检查存储中的设置...');
    
    try {
      // 检查主要设置存储
      const settingsStr = await AsyncStorage.getItem('mytv_settings');
      if (settingsStr) {
        const settings = JSON.parse(settingsStr);
        console.log('📋 mytv_settings:', settings);
        
        if (settings.apiBaseUrl) {
          console.log('✅ 找到 apiBaseUrl:', settings.apiBaseUrl);
        } else {
          console.log('❌ mytv_settings 中没有 apiBaseUrl');
        }
      } else {
        console.log('❌ 没有找到 mytv_settings');
      }
      
      // 检查备用存储
      const apiBaseUrl = await AsyncStorage.getItem('apiBaseUrl');
      if (apiBaseUrl) {
        console.log('✅ 找到备用 apiBaseUrl:', apiBaseUrl);
      } else {
        console.log('❌ 没有找到备用 apiBaseUrl');
      }
      
      // 列出所有存储键
      const allKeys = await AsyncStorage.getAllKeys();
      console.log('📝 所有存储键:', allKeys.filter(key => key.includes('settings') || key.includes('api')));
      
    } catch (error) {
      console.error('❌ 检查存储设置失败:', error);
    }
  }
  
  /**
   * 设置测试服务器地址
   */
  static async setTestServerUrl(url: string): Promise<void> {
    console.log('🔧 设置测试服务器地址:', url);
    
    try {
      // 获取现有设置
      const settingsStr = await AsyncStorage.getItem('mytv_settings');
      const settings = settingsStr ? JSON.parse(settingsStr) : {};
      
      // 更新 apiBaseUrl
      settings.apiBaseUrl = url;
      
      // 保存设置
      await AsyncStorage.setItem('mytv_settings', JSON.stringify(settings));
      console.log('✅ 测试服务器地址设置成功');
      
    } catch (error) {
      console.error('❌ 设置测试服务器地址失败:', error);
    }
  }
  
  /**
   * 测试弹幕 API 调用
   */
  static async testDanmakuAPI(title: string, episode?: string): Promise<void> {
    console.log('🎯 测试弹幕 API 调用...');
    console.log('参数:', { title, episode });
    
    try {
      // 先检查设置
      await this.checkStorageSettings();
      
      // 调用弹幕服务
      const danmaku = await DanmakuService.fetchDanmaku(title, episode);
      
      console.log('🎉 弹幕获取结果:', {
        count: danmaku.length,
        sample: danmaku.slice(0, 3).map(d => ({
          text: d.text.substring(0, 20) + (d.text.length > 20 ? '...' : ''),
          time: d.time,
          mode: d.mode
        }))
      });
      
    } catch (error) {
      console.error('❌ 弹幕 API 测试失败:', error);
      
      if (error instanceof Error && error.message.includes('配置服务器地址')) {
        console.log('💡 提示: 请先在设置中配置 InfinityTV 服务器地址');
        console.log('💡 或者使用 DanmakuDebug.setTestServerUrl("http://your-server-url") 设置测试地址');
      }
    }
  }
  
  /**
   * 清理弹幕缓存
   */
  static async clearCache(): Promise<void> {
    console.log('🧹 清理弹幕缓存...');
    
    try {
      await DanmakuService.clearExpiredCache();
      
      // 手动清理所有弹幕缓存
      const allKeys = await AsyncStorage.getAllKeys();
      const danmakuKeys = allKeys.filter(key => key.startsWith('danmaku_cache_'));
      
      for (const key of danmakuKeys) {
        await AsyncStorage.removeItem(key);
      }
      
      console.log('✅ 弹幕缓存清理完成，清理了', danmakuKeys.length, '个缓存项');
      
    } catch (error) {
      console.error('❌ 清理弹幕缓存失败:', error);
    }
  }
  
  /**
   * 完整的弹幕功能诊断
   */
  static async diagnose(): Promise<void> {
    console.log('🏥 开始弹幕功能诊断...');
    console.log('================================');
    
    // 1. 检查存储设置
    await this.checkStorageSettings();
    
    console.log('\n');
    
    // 2. 测试网络连接
    console.log('🌐 测试网络连接...');
    try {
      const response = await fetch('https://www.baidu.com', { 
        method: 'HEAD',
        timeout: 5000 
      } as any);
      console.log('✅ 网络连接正常');
    } catch (error) {
      console.log('❌ 网络连接异常:', error);
    }
    
    console.log('\n');
    
    // 3. 测试弹幕 API（使用示例数据）
    await this.testDanmakuAPI('测试视频', '1');
    
    console.log('\n🏥 弹幕功能诊断完成');
  }
}

// 开发模式下的全局调试工具
if (__DEV__) {
  (global as any).DanmakuDebug = DanmakuDebug;
  console.log('🔧 弹幕调试工具已加载，可使用 DanmakuDebug.diagnose() 进行诊断');
}