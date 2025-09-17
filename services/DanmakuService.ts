import AsyncStorage from '@react-native-async-storage/async-storage';
import { DanmakuItem } from '@/stores/danmakuStore';

interface PlatformUrl {
  platform: string;
  url: string;
}

interface DanmakuApiResponse {
  code: number;
  name: string;
  danum: number;
  danmuku: any[];
}

export class DanmakuService {
  private static readonly CACHE_PREFIX = 'danmaku_cache_';
  private static readonly CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24小时

  /**
   * 获取弹幕数据 - 直接调用 InfinityTV API
   */
  static async fetchDanmaku(
    title: string,
    episode?: string,
    videoId?: string
  ): Promise<DanmakuItem[]> {
    try {
      console.log('🎯 开始获取弹幕 (调用 InfinityTV API):', { title, episode, videoId });

      // 生成缓存键
      const cacheKey = this.generateCacheKey(title, episode, videoId);

      // 尝试从缓存获取
      const cached = await this.getCachedDanmaku(cacheKey);
      if (cached) {
        console.log('📦 使用缓存弹幕:', cached.length, '条');
        return cached;
      }

      // 直接调用 InfinityTV 的弹幕 API
      const danmaku = await this.fetchFromInfinityTVAPI(title, episode, videoId);

      if (danmaku.length > 0) {
        console.log('🎉 InfinityTV API 弹幕获取成功:', danmaku.length, '条');
        // 缓存结果
        await this.cacheDanmaku(cacheKey, danmaku);
        return danmaku;
      } else {
        console.log('⚠️ InfinityTV API 未返回弹幕数据');
        return [];
      }

    } catch (error) {
      console.error('❌ 弹幕获取失败:', error);
      return [];
    }
  }

  /**
   * 调用 InfinityTV 的弹幕 API
   */
  private static async fetchFromInfinityTVAPI(
    title: string,
    episode?: string,
    videoId?: string
  ): Promise<DanmakuItem[]> {
    try {
      // 构建 API 请求参数
      const params = new URLSearchParams();
      params.append('title', title);

      if (episode) {
        params.append('episode', episode);
      }

      if (videoId) {
        params.append('douban_id', videoId);
      }

      // 这里需要获取 InfinityTV 的基础 URL
      // 假设从设置中获取，或者使用默认值
      const infinityTVBaseUrl = await this.getInfinityTVBaseUrl();
      const apiUrl = `${infinityTVBaseUrl}/api/danmu-external?${params.toString()}`;

      console.log('🌐 调用 InfinityTV API:', apiUrl);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30秒超时

      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'OrionTV/1.0',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        console.error('InfinityTV API 请求失败:', response.status, response.statusText);
        return [];
      }

      const data = await response.json();
      console.log('📊 InfinityTV API 响应:', {
        total: data.total || 0,
        platforms: data.platforms?.length || 0,
        danmuCount: data.danmu?.length || 0
      });

      if (data.danmu && Array.isArray(data.danmu)) {
        // 转换 InfinityTV 的弹幕格式到我们的格式
        return data.danmu.map((item: any) => ({
          text: item.text || item.m || '',
          time: parseFloat(item.time || item.p?.split(',')[0] || '0'),
          color: item.color || '#ffffff',
          mode: parseInt(item.mode || item.p?.split(',')[1] || '0'),
        })).filter((item: DanmakuItem) => item.text && item.text.trim());
      }

      return [];
    } catch (error) {
      console.error('❌ InfinityTV API 调用失败:', error instanceof Error ? error.message : error);
      return [];
    }
  }

  /**
   * 获取 InfinityTV 的基础 URL
   * 从 OrionTV 的设置中获取 apiBaseUrl
   */
  private static async getInfinityTVBaseUrl(): Promise<string> {
    try {
      // 方法1: 尝试从 AsyncStorage 获取设置
      const settingsStr = await AsyncStorage.getItem('settings');
      if (settingsStr) {
        const settings = JSON.parse(settingsStr);
        if (settings.apiBaseUrl && settings.apiBaseUrl.trim()) {
          const baseUrl = settings.apiBaseUrl.replace(/\/$/, '');
          console.log('📍 使用 OrionTV 配置的服务器地址:', baseUrl);
          return baseUrl;
        }
      }

      // 方法2: 尝试从其他可能的存储位置获取
      const apiBaseUrl = await AsyncStorage.getItem('apiBaseUrl');
      if (apiBaseUrl && apiBaseUrl.trim()) {
        const baseUrl = apiBaseUrl.replace(/\/$/, '');
        console.log('📍 使用存储的 API 地址:', baseUrl);
        return baseUrl;
      }

    } catch (error) {
      console.log('⚠️ 无法获取服务器配置:', error);
    }

    // 如果没有配置，抛出错误提示用户配置
    throw new Error('请先在 OrionTV 设置中配置服务器地址，弹幕功能需要连接到 InfinityTV 服务器');
  }

  // 移除复杂的搜索逻辑，直接使用 InfinityTV API

  /**
   * 生成缓存键
   */
  private static generateCacheKey(title: string, episode?: string, videoId?: string): string {
    const key = `${title}_${episode || 'default'}_${videoId || 'unknown'}`;
    // 使用简单的哈希函数替代 Buffer，避免 React Native 兼容性问题
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
      const char = key.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 转换为32位整数
    }
    return this.CACHE_PREFIX + Math.abs(hash).toString(36).slice(0, 20);
  }

  /**
   * 缓存弹幕数据
   */
  private static async cacheDanmaku(key: string, danmaku: DanmakuItem[]): Promise<void> {
    try {
      const cacheData = {
        data: danmaku,
        timestamp: Date.now(),
      };
      await AsyncStorage.setItem(key, JSON.stringify(cacheData));
      console.log(`💾 弹幕缓存保存成功: ${danmaku.length} 条`);
    } catch (error) {
      console.error('缓存弹幕失败:', error);
    }
  }

  /**
   * 获取缓存的弹幕数据
   */
  private static async getCachedDanmaku(key: string): Promise<DanmakuItem[] | null> {
    try {
      const cached = await AsyncStorage.getItem(key);
      if (!cached) return null;

      const cacheData = JSON.parse(cached);
      const isExpired = Date.now() - cacheData.timestamp > this.CACHE_EXPIRY;

      if (isExpired) {
        await AsyncStorage.removeItem(key);
        return null;
      }

      return cacheData.data;
    } catch (error) {
      console.error('获取缓存弹幕失败:', error);
      return null;
    }
  }

  /**
   * 清理过期缓存
   */
  static async clearExpiredCache(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const danmakuKeys = keys.filter(key => key.startsWith(this.CACHE_PREFIX));

      for (const key of danmakuKeys) {
        const cached = await AsyncStorage.getItem(key);
        if (cached) {
          const cacheData = JSON.parse(cached);
          const isExpired = Date.now() - cacheData.timestamp > this.CACHE_EXPIRY;
          if (isExpired) {
            await AsyncStorage.removeItem(key);
          }
        }
      }
    } catch (error) {
      console.error('清理弹幕缓存失败:', error);
    }
  }
}