# 打包指南

本文档说明如何将项目打包成不同形式的应用。

## 前置要求

- Node.js 18+ 
- pnpm 10.6.1+
- 已安装所有依赖 (`pnpm install`)

## Web 应用打包

### 开发模式
```bash
pnpm dev
```
访问 http://localhost:3000

### 生产构建
```bash
pnpm build:web
```
输出目录: `packages/web/dist/`

### 部署
可以将 `dist` 目录部署到:
- Vercel
- Netlify
- GitHub Pages
- 任何静态托管服务

## 桌面应用打包 (Electron)

### 前置要求

- macOS 系统（用于打包 macOS pkg）
- 已安装所有依赖 (`pnpm install`)

### 安装 Electron 依赖

在项目根目录执行：
```bash
pnpm install
```

这会自动安装 desktop 包的依赖。

### 开发模式

```bash
# 从项目根目录
pnpm dev:desktop
```

这会启动开发服务器并打开 Electron 窗口。

### 构建 macOS PKG 安装包

#### 方式一：使用根目录脚本（推荐）

```bash
# 从项目根目录执行
pnpm build:pkg
```

这会：
1. 构建所有依赖（core、ui、web）
2. 构建 Electron 应用
3. 生成 macOS pkg 安装包

生成的 pkg 文件位于：`packages/desktop/release/`

#### 方式二：在 desktop 目录执行

```bash
cd packages/desktop
pnpm build:pkg
```

### 图标配置

在打包前，建议准备应用图标：

1. 准备一个 1024x1024 的 PNG 图标文件
2. 转换为 `.icns` 格式（参考 `packages/desktop/build/README.md`）
3. 将 `icon.icns` 放在 `packages/desktop/build/` 目录下

如果没有图标，electron-builder 会使用默认图标。

### 打包配置说明

打包配置在 `packages/desktop/package.json` 的 `build` 字段中：

- **appId**: 应用唯一标识符
- **productName**: 应用显示名称
- **mac.target**: 目标格式（pkg）
- **pkg.installLocation**: 安装位置（/Applications）

### 其他平台打包

```bash
# macOS DMG
pnpm -F @text-image-prompt-tools/desktop build:electron --mac

# Windows
pnpm -F @text-image-prompt-tools/desktop build:electron --win

# Linux
pnpm -F @text-image-prompt-tools/desktop build:electron --linux
```

## 浏览器插件打包

### 开发模式
```bash
pnpm dev:ext
```

### 打包
```bash
pnpm build:ext
```

### 加载到浏览器
1. Chrome: 打开 `chrome://extensions/`，启用"开发者模式"，点击"加载已解压的扩展程序"，选择 `packages/extension/dist` 目录
2. Firefox: 打开 `about:debugging`，点击"此 Firefox"，点击"临时载入附加组件"，选择 `packages/extension/dist/manifest.json`

## 作为 NPM 包发布

### 构建核心包
```bash
pnpm build:core
```

### 发布
```bash
cd packages/core
npm publish
```

其他项目可以通过以下方式使用:
```bash
npm install @text-image-prompt-tools/core
```

## 智能体集成

核心服务层可以独立使用，集成到其他项目中:

```typescript
import {
  TextAdapterRegistry,
  LLMService,
  PromptService,
  OpenAIAdapter,
} from '@text-image-prompt-tools/core';

// 初始化
const registry = new TextAdapterRegistry();
registry.register(new OpenAIAdapter());

const llmService = new LLMService(registry, modelManager);
const promptService = new PromptService(llmService, modelManager, templateManager);

// 使用
const result = await promptService.optimizePrompt({
  targetPrompt: 'a cat',
  modelKey: 'openai-gpt-4o',
  style: 'general',
});
```

## Docker 部署

### 构建镜像
```bash
docker build -t text-image-prompt-tools .
```

### 运行容器
```bash
docker run -p 3000:3000 text-image-prompt-tools
```

## 环境变量配置

创建 `.env` 文件:
```env
VITE_OPENAI_API_KEY=your_key
VITE_GEMINI_API_KEY=your_key
VITE_DEEPSEEK_API_KEY=your_key
```

注意: Web 应用的环境变量需要以 `VITE_` 开头。

