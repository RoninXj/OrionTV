# OrionTV 弹幕功能集成文档

## 概述

本文档记录了将 InfinityTV 项目的弹幕功能成功集成到 OrionTV (React Native TV 应用) 的完整过程。

## 技术架构

### 核心组件

1. **弹幕状态管理** (`stores/danmakuStore.ts`)
   - 使用 Zustand 管理弹幕配置和数据
   - 支持弹幕开关、透明度、字体大小、速度等配置
   - 持久化存储用户设置

2. **弹幕数据服务** (`services/DanmakuService.ts`)
   - 直接调用 InfinityTV API 获取弹幕数据
   - 实现 24 小时缓存机制
   - 自动获取 OrionTV 配置的服务器地址

3. **弹幕渲染组件** (`components/danmaku/ArtPlayerStyleDanmaku.tsx`)
   - ArtPlayer 风格的弹幕渲染系统
   - 支持滚动、顶部、底部三种弹幕模式
   - 智能轨道分配和防重叠算法
   - 使用 react-native-reanimated 实现流畅动画

4. **弹幕配置面板** (`components/danmaku/DanmakuConfigPanel.tsx`)
   - 完整的弹幕设置界面
   - 实时预览配置效果
   - 支持透明度、字体大小、速度、显示行数等调整

5. **弹幕控制按钮** (`components/danmaku/DanmakuControls.tsx`)
   - 集成到播放器控制面板
   - 弹幕开关和设置按钮
   - 响应式设计支持

## 功能特性

### ✅ 已实现功能

- **弹幕渲染**
  - ArtPlayer 风格的弹幕显示
  - 三种弹幕模式：滚动、顶部固定、底部固定
  - 智能轨道分配，避免弹幕重叠
  - 流畅的动画效果

- **弹幕配置**
  - 弹幕开关控制
  - 透明度调节 (0-100%)
  - 字体大小调节 (12-24px)
  - 弹幕速度调节 (0.5x-2x)
  - 显示行数限制 (1-10行)
  - 配置持久化存储

- **数据管理**
  - 直接调用 InfinityTV API
  - 24小时智能缓存
  - 自动清理过期缓存
  - 错误处理和重试机制

- **用户体验**
  - 响应式设计，支持手机、平板、TV
  - 实时配置预览
  - Toast 提示信息
  - 开发模式下的调试功能

### 🔧 技术优化

- **性能优化**
  - 使用 React.memo 避免不必要的重渲染
  - 弹幕数据缓存减少网络请求
  - 智能轨道管理算法

- **兼容性处理**
  - React Native 环境下的 Buffer 替代方案
  - AsyncStorage 类型声明修复
  - 跨平台网络请求处理

- **代码质量**
  - TypeScript 类型安全
  - 完整的错误处理
  - 详细的日志记录

## 使用说明

### 1. 配置服务器地址

在 OrionTV 设置中配置 InfinityTV 服务器地址，弹幕功能需要连接到 InfinityTV 服务器获取数据。

### 2. 播放视频

播放视频时，弹幕会自动根据视频标题和集数加载。

### 3. 控制弹幕

- 点击播放器控制面板中的弹幕按钮开启/关闭弹幕
- 点击设置按钮打开弹幕配置面板
- 在配置面板中调整弹幕参数

### 4. 弹幕配置

可调整的参数包括：
- 弹幕开关
- 透明度 (0-100%)
- 字体大小 (12-24px)
- 弹幕速度 (0.5x-2x)
- 显示行数 (1-10行)

## 文件结构

```
OrionTV-master/
├── stores/
│   └── danmakuStore.ts              # 弹幕状态管理
├── services/
│   └── DanmakuService.ts            # 弹幕数据服务
├── components/danmaku/
│   ├── ArtPlayerStyleDanmaku.tsx    # 弹幕渲染组件
│   ├── DanmakuConfigPanel.tsx       # 弹幕配置面板
│   └── DanmakuControls.tsx          # 弹幕控制按钮
├── types/
│   └── async-storage.d.ts           # AsyncStorage 类型声明
├── utils/
│   └── danmakuTest.ts               # 弹幕测试工具
├── app/
│   └── play.tsx                     # 播放页面 (已集成弹幕)
└── components/
    └── PlayerControls.tsx           # 播放器控制面板 (已集成弹幕控制)
```

## API 接口

### InfinityTV 弹幕 API

```
GET /api/danmu-external?title={title}&episode={episode}&douban_id={id}
```

**参数说明：**
- `title`: 视频标题 (必需)
- `episode`: 集数 (可选)
- `douban_id`: 豆瓣ID (可选)

**响应格式：**
```json
{
  "total": 1000,
  "platforms": [...],
  "danmu": [
    {
      "text": "弹幕内容",
      "time": 120.5,
      "color": "#ffffff",
      "mode": 0
    }
  ]
}
```

## 开发调试

### 开发模式功能

在开发模式下 (`__DEV__ = true`)，播放页面会显示"测试弹幕API"按钮，可以直接测试弹幕数据获取功能。

### 日志记录

弹幕系统包含详细的日志记录，可以通过控制台查看：
- 弹幕数据加载过程
- API 调用状态
- 缓存操作
- 错误信息

### 测试脚本

运行测试脚本检查弹幕功能状态：
```bash
node scripts/test-danmaku.js
```

## 故障排除

### 常见问题

1. **弹幕不显示**
   - 检查是否已配置 InfinityTV 服务器地址
   - 确认弹幕开关已开启
   - 查看控制台日志确认数据加载状态

2. **网络请求失败**
   - 检查服务器地址配置是否正确
   - 确认网络连接正常
   - 查看 API 响应状态

3. **弹幕重叠**
   - 调整显示行数设置
   - 检查弹幕速度配置
   - 确认轨道分配算法正常工作

## 更新日志

### v1.0.0 (2024-12-XX)
- ✅ 完成弹幕系统基础架构
- ✅ 实现 ArtPlayer 风格弹幕渲染
- ✅ 集成弹幕配置面板
- ✅ 添加弹幕数据缓存机制
- ✅ 完成播放页面集成
- ✅ 修复 React Native 兼容性问题
- ✅ 优化性能和用户体验

## 贡献指南

如需对弹幕功能进行修改或扩展，请参考以下指南：

1. 保持代码风格一致
2. 添加适当的类型声明
3. 包含错误处理逻辑
4. 更新相关文档
5. 进行充分测试

## 许可证

本弹幕功能集成遵循 OrionTV 项目的许可证条款。