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
   * 获取弹幕数据 - 主入口
   */
  static async fetchDanmaku(
    title: string, 
    episode?: string, 
    videoId?: string
  ): Promise<DanmakuItem[]> {
    try {
      console.log('🎯 开始获取弹幕:', { title, episode, videoId });
      
      // 生成缓存键
      const cacheKey = this.generateCacheKey(title, episode, videoId);
      
      // 尝试从缓存获取
      const cached = await this.getCachedDanmaku(cacheKey);
      if (cached) {
        console.log('📦 使用缓存弹幕:', cached.length, '条');
        return cached;
      }

      // 获取真实弹幕数据
      const realDanmaku = await this.fetchRealDanmaku(title, episode, videoId);
      
      if (realDanmaku.length > 0) {
        console.log('🎉 真实弹幕获取成功:', realDanmaku.length, '条');
        // 缓存结果
        await this.cacheDanmaku(cacheKey, realDanmaku);
        return realDanmaku;
      } else {
        console.log('⚠️ 未获取到真实弹幕数据');
        return [];
      }

    } catch (error) {
      console.error('❌ 弹幕获取失败:', error);
      return [];
    }
  }

  /**
   * 获取真实弹幕数据
   */
  private static async fetchRealDanmaku(
    title: string, 
    episode?: string, 
    videoId?: string
  ): Promise<DanmakuItem[]> {
    // 搜索视频链接
    const platformUrls = await this.searchVideoUrls(title, episode);
    if (platformUrls.length === 0) {
      console.log('❌ 未找到匹配的视频链接');
      return [];
    }

    console.log(`🔍 找到 ${platformUrls.length} 个平台链接:`, platformUrls.map(p => p.platform));

    // 并发获取多个平台的弹幕
    const danmakuPromises = platformUrls.map(({ platform, url }) => 
      this.fetchDanmakuFromPlatform(platform, url)
    );

    const results = await Promise.allSettled(danmakuPromises);
    
    // 合并所有成功的结果
    let allDanmaku: DanmakuItem[] = [];
    results.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value.length > 0) {
        console.log(`✅ ${platformUrls[index].platform} 获取到 ${result.value.length} 条弹幕`);
        allDanmaku = allDanmaku.concat(result.value);
      } else if (result.status === 'rejected') {
        console.log(`❌ ${platformUrls[index].platform} 弹幕获取失败:`, result.reason);
      }
    });

    if (allDanmaku.length === 0) {
      console.log('❌ 所有平台都未获取到弹幕数据');
      return [];
    }

    // 处理和过滤弹幕
    const processedDanmaku = this.processDanmakuData(allDanmaku);
    
    return processedDanmaku;
  }

  /**
   * 搜索视频链接
   */
  private static async searchVideoUrls(title: string, episode?: string): Promise<PlatformUrl[]> {
    try {
      // 构建搜索标题变体
      const searchTitles = [
        title,
        title.replace(/·/g, ''),
        title.replace(/·/g, ' '),
        title.replace(/·/g, '-'),
      ];

      const uniqueTitles = Array.from(new Set(searchTitles));
      
      for (const searchTitle of uniqueTitles) {
        console.log(`🔍 搜索标题: "${searchTitle}"`);
        
        const searchUrl = `https://www.caiji.cyou/api.php/provide/vod/?wd=${encodeURIComponent(searchTitle)}`;
        
        try {
          // 使用 AbortController 实现超时
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 10000);
          
          const response = await fetch(searchUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            },
            signal: controller.signal,
          });
          
          clearTimeout(timeoutId);

          if (!response.ok) continue;

          const data = await response.json();
          if (!data.list || data.list.length === 0) continue;

          // 选择最佳匹配
          const bestMatch = this.selectBestMatch(data.list, searchTitle, title);
          if (bestMatch) {
            return this.extractPlatformUrls(bestMatch, episode);
          }
        } catch (error) {
          console.log(`搜索 "${searchTitle}" 失败:`, error instanceof Error ? error.message : error);
          continue;
        }
      }

      return [];
    } catch (error) {
      console.error('搜索视频链接失败:', error);
      return [];
    }
  }

  /**
   * 选择最佳匹配结果
   */
  private static selectBestMatch(results: any[], searchTitle: string, originalTitle: string): any {
    // 完全匹配优先
    const exactMatch = results.find(r => 
      r.vod_name === searchTitle || r.vod_name === originalTitle
    );
    if (exactMatch) return exactMatch;

    // 过滤不合适的内容
    const filtered = results.filter(r => {
      const name = r.vod_name || '';
      return !name.includes('解说') && 
             !name.includes('预告') && 
             !name.includes('花絮') && 
             !name.includes('动态漫');
    });

    return filtered[0] || results[0];
  }

  /**
   * 提取平台链接
   */
  private static extractPlatformUrls(result: any, episode?: string): PlatformUrl[] {
    const urls: PlatformUrl[] = [];
    
    try {
      const playUrls = result.vod_play_url || '';
      const urlGroups = playUrls.split('$$$');

      for (const group of urlGroups) {
        const [source, urlList] = group.split('$');
        if (!urlList) continue;

        const episodes = urlList.split('#');
        
        // 如果指定了集数，查找对应集数
        if (episode) {
          const targetEpisode = episodes.find(ep => {
            const [epTitle] = ep.split('$');
            return epTitle.includes(episode) || 
                   epTitle.includes(`第${episode}集`) ||
                   epTitle.includes(`${episode}话`);
          });
          
          if (targetEpisode) {
            const [, url] = targetEpisode.split('$');
            if (url) {
              urls.push({
                platform: this.getPlatformName(url),
                url: this.convertToDesktopUrl(url)
              });
            }
          }
        } else {
          // 没有指定集数，取第一集
          const firstEpisode = episodes[0];
          if (firstEpisode) {
            const [, url] = firstEpisode.split('$');
            if (url) {
              urls.push({
                platform: this.getPlatformName(url),
                url: this.convertToDesktopUrl(url)
              });
            }
          }
        }
      }
    } catch (error) {
      console.error('提取平台链接失败:', error);
    }

    return urls;
  }

  /**
   * 获取平台名称
   */
  private static getPlatformName(url: string): string {
    if (url.includes('qq.com') || url.includes('v.qq.com')) return '腾讯视频';
    if (url.includes('iqiyi.com')) return '爱奇艺';
    if (url.includes('youku.com')) return '优酷';
    if (url.includes('bilibili.com')) return 'B站';
    if (url.includes('mgtv.com')) return '芒果TV';
    return '未知平台';
  }

  /**
   * 转换为桌面版链接
   */
  private static convertToDesktopUrl(url: string): string {
    return url
      .replace('m.v.qq.com', 'v.qq.com')
      .replace('m.iqiyi.com', 'www.iqiyi.com')
      .replace('m.youku.com', 'v.youku.com');
  }

  /**
   * 从平台获取弹幕
   */
  private static async fetchDanmakuFromPlatform(platform: string, url: string): Promise<DanmakuItem[]> {
    console.log(`🔄 开始从 ${platform} 获取弹幕:`, url);
    
    try {
      // 首先尝试 XML API
      let danmaku = await this.fetchFromXMLAPI(url);
      console.log(`📊 ${platform} XML API 结果: ${danmaku.length} 条弹幕`);
      
      if (danmaku.length === 0) {
        console.log(`🔄 ${platform} XML API 无结果，尝试 JSON API...`);
        // XML API 无结果，尝试 JSON API
        danmaku = await this.fetchFromJSONAPI(url);
        console.log(`📊 ${platform} JSON API 结果: ${danmaku.length} 条弹幕`);
      }

      if (danmaku.length > 0) {
        console.log(`✅ ${platform} 弹幕获取成功: ${danmaku.length} 条`);
      } else {
        console.log(`❌ ${platform} 未获取到弹幕数据`);
      }

      return danmaku;
    } catch (error) {
      console.error(`❌ 从 ${platform} 获取弹幕失败:`, error instanceof Error ? error.message : error);
      return [];
    }
  }

  /**
   * 从 XML API 获取弹幕
   */
  private static async fetchFromXMLAPI(url: string): Promise<DanmakuItem[]> {
    const xmlApiUrls = [
      'https://fc.lyz05.cn',
      'https://danmu.lyz05.cn',
    ];

    for (const apiUrl of xmlApiUrls) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 20000);
        
        const response = await fetch(`${apiUrl}/?url=${encodeURIComponent(url)}`, {
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);

        if (!response.ok) continue;

        const xmlText = await response.text();
        return this.parseXMLDanmaku(xmlText);
      } catch (error) {
        console.log(`XML API ${apiUrl} 请求失败:`, error instanceof Error ? error.message : error);
        continue;
      }
    }

    return [];
  }

  /**
   * 从 JSON API 获取弹幕
   */
  private static async fetchFromJSONAPI(url: string): Promise<DanmakuItem[]> {
    try {
      const apiUrl = `https://api.danmu.icu/?url=${encodeURIComponent(url)}`;
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 25000);
      
      const response = await fetch(apiUrl, {
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) return [];

      const data: DanmakuApiResponse = await response.json();
      
      if (data.code === 200 && data.danmuku) {
        return data.danmuku.map(item => ({
          text: item.text || item.m || '',
          time: parseFloat(item.time || item.p?.split(',')[0] || '0'),
          color: item.color || '#ffffff',
          mode: parseInt(item.mode || item.p?.split(',')[1] || '0'),
        }));
      }

      return [];
    } catch (error) {
      console.error('JSON API 请求失败:', error instanceof Error ? error.message : error);
      return [];
    }
  }

  /**
   * 解析 XML 弹幕数据
   */
  private static parseXMLDanmaku(xmlText: string): DanmakuItem[] {
    try {
      // 简单的 XML 解析，提取 <d> 标签
      const danmakuRegex = /<d p="([^"]*)"[^>]*>([^<]*)<\/d>/g;
      const danmaku: DanmakuItem[] = [];
      let match;

      while ((match = danmakuRegex.exec(xmlText)) !== null) {
        const [, p, text] = match;
        const params = p.split(',');
        
        if (params.length >= 3 && text.trim()) {
          danmaku.push({
            time: parseFloat(params[0]) || 0,
            mode: parseInt(params[1]) || 0,
            color: `#${parseInt(params[2]).toString(16).padStart(6, '0')}`,
            text: text.trim(),
          });
        }
      }

      return danmaku;
    } catch (error) {
      console.error('解析 XML 弹幕失败:', error);
      return [];
    }
  }

  /**
   * 处理弹幕数据
   */
  private static processDanmakuData(danmaku: DanmakuItem[]): DanmakuItem[] {
    // 去重
    const uniqueDanmaku = danmaku.filter((item, index, arr) => 
      arr.findIndex(d => d.text === item.text && Math.abs(d.time - item.time) < 1) === index
    );

    // 按时间排序
    uniqueDanmaku.sort((a, b) => a.time - b.time);

    // 过滤无效弹幕
    const filtered = uniqueDanmaku.filter(item => 
      item.text && 
      item.text.length > 0 && 
      item.text.length < 100 && 
      item.time >= 0
    );

    console.log(`🎯 弹幕处理完成: 原始 ${danmaku.length} 条 -> 去重 ${uniqueDanmaku.length} 条 -> 过滤 ${filtered.length} 条`);
    
    return filtered;
  }

  /**
   * 生成缓存键
   */
  private static generateCacheKey(title: string, episode?: string, videoId?: string): string {
    const key = `${title}_${episode || 'default'}_${videoId || 'unknown'}`;
    return this.CACHE_PREFIX + Buffer.from(key).toString('base64').slice(0, 50);
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