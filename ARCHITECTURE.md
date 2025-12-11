# 架构设计文档

## 概述

本项目采用 **Provider-Adapter-Registry** 三层架构，支持灵活的多厂商模型对接，方便后续打包成智能体、插件、Mac 软件等多种形式。

## 核心架构

### 1. Provider-Adapter-Registry 模式

```
┌─────────────────────────────────────────┐
│           应用层 (UI/Web)                │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│         Service 层                       │
│  - PromptService (提示词优化)            │
│  - ImageService (图片反推)               │
│  - LLMService (LLM 调用)                │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│      Registry 层 (统一管理)              │
│  - TextAdapterRegistry                   │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│      Adapter 层 (SDK 封装)               │
│  - OpenAIAdapter                        │
│  - GeminiAdapter                       │
│  - DeepSeekAdapter                      │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│      SDK 层 (第三方库)                    │
│  - OpenAI SDK                            │
│  - Google Generative AI                  │
└─────────────────────────────────────────┘
```

### 2. 模块划分

```
text-image-prompt-tools/
├── packages/
│   ├── core/              # 核心服务层
│   │   ├── services/
│   │   │   ├── llm/       # LLM 服务
│   │   │   ├── prompt/     # 提示词优化
│   │   │   ├── image/     # 图片反推
│   │   │   ├── template/  # 模板管理
│   │   │   └── model/     # 模型管理
│   │   └── adapters/      # 模型适配器
│   ├── ui/                # React UI 组件库
│   ├── web/               # Web 应用
│   ├── desktop/           # 桌面应用 (Electron)
│   └── extension/         # 浏览器插件
```

## 多端支持架构

### Web 应用
- 使用 Vite + React
- 纯前端应用，数据存储在浏览器本地
- 支持直接部署到 Vercel、Netlify 等平台

### 桌面应用 (Electron)
- 基于 Electron 框架
- 无跨域限制，可直接连接任何 API
- 支持自动更新
- 可打包为 Mac、Windows、Linux 应用

### 浏览器插件
- 基于 Web Extension API
- 可在任何网页中使用
- 支持 Chrome、Firefox、Edge 等浏览器

### 智能体/插件
- 核心服务层可独立使用
- 支持作为 NPM 包发布
- 可集成到其他项目中

## 扩展性设计

### 添加新模型提供商

1. 创建新的 Adapter 类，实现 `ITextProviderAdapter` 接口
2. 在 Registry 中注册新的 Adapter
3. 无需修改其他代码

示例：
```typescript
export class CustomAdapter implements ITextProviderAdapter {
  getProvider(): TextProvider { ... }
  getModels(): TextModel[] { ... }
  sendMessage(...): Promise<LLMResponse> { ... }
}

// 注册
registry.register(new CustomAdapter());
```

### 添加新优化风格

1. 在 `packages/core/src/services/template/default-templates/` 创建新模板
2. 在模板管理器中注册
3. 在 UI 中添加风格选项

## 数据流

### 提示词优化流程

```
用户输入提示词
    ↓
PromptOptimizer 组件
    ↓
usePromptOptimizer Hook
    ↓
PromptService.optimizePrompt()
    ↓
LLMService.sendMessage()
    ↓
Adapter.sendMessage()
    ↓
第三方 SDK (OpenAI/Gemini/etc.)
    ↓
返回优化后的提示词
```

### 图片反推流程

```
用户上传图片
    ↓
ImageToPrompt 组件
    ↓
useImageToPrompt Hook
    ↓
ImageService.imageToPrompt()
    ↓
构建多模态消息 (文本 + 图片)
    ↓
LLMService.sendMessage() (使用 Vision 模型)
    ↓
Adapter.sendMessage()
    ↓
第三方 SDK (支持 Vision 的模型)
    ↓
返回提取的提示词
```

## 打包配置

### Web 应用打包
```bash
pnpm build:web
```
输出到 `packages/web/dist/`，可直接部署到静态托管服务。

### 桌面应用打包
```bash
pnpm build:desktop
```
使用 Electron Builder 打包为可执行文件。

### 插件打包
```bash
pnpm build:extension
```
打包为 `.crx` (Chrome) 或 `.xpi` (Firefox) 格式。

## 安全考虑

1. **API 密钥管理**: 存储在浏览器本地存储，不发送到服务器
2. **CORS 处理**: 桌面应用无跨域限制，Web 应用需要配置代理或使用支持 CORS 的 API
3. **数据隐私**: 所有数据在客户端处理，不经过中间服务器

## 性能优化

1. **代码分割**: 使用动态导入按需加载
2. **缓存策略**: 模板和模型配置缓存
3. **流式响应**: 支持流式输出，提升用户体验

