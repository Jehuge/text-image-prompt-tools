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

### 安装 Electron 依赖
```bash
cd packages/desktop
pnpm install
```

### 开发模式
```bash
pnpm dev:desktop
```

### 打包
```bash
pnpm build:desktop
```

### 平台特定打包
```bash
# Mac
pnpm build:desktop --mac

# Windows
pnpm build:desktop --win

# Linux
pnpm build:desktop --linux
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

