# OrionTV 项目设置说明

## 当前问题
项目缺少 `node_modules` 目录，导致 TypeScript 无法找到 React 等依赖的类型声明。

## 解决步骤

### 1. 安装项目依赖
在 OrionTV-master 目录下运行以下命令之一：

```bash
# 使用 yarn (推荐)
yarn install

# 或使用 npm
npm install
```

### 2. 清理缓存（如果需要）
如果安装后仍有问题，可以清理缓存：

```bash
# yarn 用户
yarn cache clean

# npm 用户  
npm cache clean --force
```

### 3. 重启开发服务器
```bash
# 启动 Expo 开发服务器
yarn start

# 或
npm start
```

### 4. 重启 TypeScript 服务器
在 VS Code 中：
1. 按 `Ctrl+Shift+P` (Windows/Linux) 或 `Cmd+Shift+P` (Mac)
2. 输入 "TypeScript: Restart TS Server"
3. 选择该选项

## 临时修复
我已经创建了临时的类型声明文件 `types/react.d.ts` 来解决当前的 TypeScript 错误。
安装依赖后，可以删除这个文件。

## 弹幕功能
弹幕相关的代码已经暂时注释掉，等依赖安装完成后，我们可以：
1. 创建弹幕组件
2. 实现弹幕服务
3. 集成到播放器中

## 验证修复
依赖安装完成后，检查：
- [ ] TypeScript 错误消失
- [ ] 项目可以正常编译
- [ ] 可以启动开发服务器

## 下一步
依赖安装完成后，我们将继续实现弹幕功能集成。