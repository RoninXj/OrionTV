import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface DanmakuItem {
  text: string;
  time: number;
  color?: string;
  mode?: number; // 0: 滚动, 1: 顶部, 2: 底部
  size?: number;
  id?: string;
}

export interface DanmakuConfig {
  enabled: boolean;
  opacity: number;
  fontSize: number;
  speed: number;
  density: number; // 弹幕密度 0-1
  showTop: boolean; // 显示顶部弹幕
  showBottom: boolean; // 显示底部弹幕
  showScroll: boolean; // 显示滚动弹幕
  filterLevel: number; // 过滤等级 0-3
  maxLines: number; // 最大显示行数
}

interface DanmakuStore {
  // 状态
  danmakuList: DanmakuItem[];
  config: DanmakuConfig;
  showConfigPanel: boolean;
  isLoading: boolean;
  
  // 动作
  setDanmakuList: (list: DanmakuItem[]) => void;
  addDanmaku: (danmaku: DanmakuItem) => void;
  clearDanmaku: () => void;
  updateConfig: (config: Partial<DanmakuConfig>) => void;
  setShowConfigPanel: (show: boolean) => void;
  setLoading: (loading: boolean) => void;
  loadConfig: () => Promise<void>;
  saveConfig: () => Promise<void>;
}

const defaultConfig: DanmakuConfig = {
  enabled: true,
  opacity: 0.8,
  fontSize: 16,
  speed: 1.0,
  density: 0.8,
  showTop: true,
  showBottom: true,
  showScroll: true,
  filterLevel: 1,
  maxLines: 10,
};

const STORAGE_KEY = 'danmaku_config';

export const useDanmakuStore = create<DanmakuStore>((set, get) => ({
  // 初始状态
  danmakuList: [],
  config: defaultConfig,
  showConfigPanel: false,
  isLoading: false,

  // 动作实现
  setDanmakuList: (list) => set({ danmakuList: list }),
  
  addDanmaku: (danmaku) => set((state) => ({
    danmakuList: [...state.danmakuList, danmaku]
  })),
  
  clearDanmaku: () => set({ danmakuList: [] }),
  
  updateConfig: (newConfig) => {
    const updatedConfig = { ...get().config, ...newConfig };
    set({ config: updatedConfig });
    get().saveConfig();
  },
  
  setShowConfigPanel: (show) => set({ showConfigPanel: show }),
  
  setLoading: (loading) => set({ isLoading: loading }),
  
  loadConfig: async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const config = JSON.parse(stored);
        set({ config: { ...defaultConfig, ...config } });
      }
    } catch (error) {
      console.error('加载弹幕配置失败:', error);
    }
  },
  
  saveConfig: async () => {
    try {
      const { config } = get();
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    } catch (error) {
      console.error('保存弹幕配置失败:', error);
    }
  },
}));