# 快速开始指南

## 项目概述

提示词优化&图片反推 是一个提示词优化工具，支持:
- ✅ 文生图提示词优化（支持多种风格）
- ✅ 图片反推提示词（使用 Vision 模型）
- ✅ 多厂商模型对接（OpenAI、Gemini、DeepSeek 等）
- ✅ React 19.2.1+ 技术栈（安全版本）
- ✅ 可扩展架构（支持打包成智能体、插件、Mac 软件）

## 安装

```bash
# 安装依赖
pnpm install
```

## 开发

```bash
# 启动开发服务器
pnpm dev
```

访问 http://localhost:3000

## 使用说明

### 1. 配置模型

在使用前，需要配置模型 API 密钥。在 Web 应用中，可以通过界面配置，或通过环境变量配置。

#### 环境变量配置

创建 `.env` 文件:
```env
VITE_OPENAI_API_KEY=your_openai_key
VITE_GEMINI_API_KEY=your_gemini_key
VITE_DEEPSEEK_API_KEY=your_deepseek_key
```

#### 代码中配置

```typescript
import { MemoryModelManager } from '@text-image-prompt-tools/core';

const modelManager = new MemoryModelManager();

// 添加 OpenAI 模型配置
await modelManager.saveModel({
  id: 'openai-gpt-4o',
  name: 'GPT-4o',
  enabled: true,
  providerMeta: { /* OpenAI Provider */ },
  modelMeta: { /* GPT-4o Model */ },
  connectionConfig: {
    apiKey: 'your-api-key',
  },
});
```

### 2. 提示词优化

1. 选择"提示词优化"标签页
2. 输入模型 ID（例如: `openai-gpt-4o`）
3. 选择优化风格（通用、创意、摄影、设计、中国美学）
4. 输入原始提示词
5. 点击"优化提示词"按钮

### 3. 图片反推提示词

1. 选择"图片反推提示词"标签页
2. 输入支持 Vision 的模型 ID（例如: `openai-gpt-4o`）
3. 上传图片
4. 点击"提取提示词"按钮

## 项目结构

```
text-image-prompt-tools/
├── packages/
│   ├── core/          # 核心服务层
│   │   ├── services/  # 服务实现
│   │   └── adapters/  # 模型适配器
│   ├── ui/            # React UI 组件
│   └── web/           # Web 应用
├── ARCHITECTURE.md    # 架构设计文档
├── BUILD.md           # 打包指南
└── README.md          # 项目说明
```

## 核心功能

### 多厂商模型对接

项目采用 Provider-Adapter-Registry 架构，支持轻松添加新模型:

```typescript
import { TextAdapterRegistry, CustomAdapter } from '@text-image-prompt-tools/core';

const registry = new TextAdapterRegistry();
registry.register(new CustomAdapter());
```

### 提示词优化风格

支持以下优化风格:
- **通用优化**: 适合大多数场景
- **创意优化**: 解构式创意提示词
- **摄影风格**: 摄影场景优化
- **设计风格**: 设计场景优化
- **中国美学**: 中国传统文化风格

### 图片反推

使用支持 Vision 的模型（如 GPT-4o、Gemini 1.5 Pro）从图片中提取提示词。

## 扩展开发

### 添加新模型适配器

1. 在 `packages/core/src/services/llm/adapters/` 创建新适配器
2. 实现 `ITextProviderAdapter` 接口
3. 在 Registry 中注册

### 添加新优化风格

1. 在 `packages/core/src/services/template/default-templates/` 创建新模板
2. 在模板管理器中注册
3. 在 UI 中添加选项

## 常见问题

### Q: 如何解决 CORS 问题？

A: Web 应用可能遇到 CORS 问题。解决方案:
1. 使用桌面应用（无跨域限制）
2. 配置 API 代理
3. 使用支持 CORS 的 API 服务

### Q: 如何添加自定义模型？

A: 参考 `packages/core/src/services/llm/adapters/` 中的示例，创建新的适配器类。

### Q: 如何打包成桌面应用？

A: 参考 `BUILD.md` 文档中的"桌面应用打包"部分。

## 技术支持

如有问题，请查看:
- [架构设计文档](./ARCHITECTURE.md)
- [打包指南](./BUILD.md)
- [项目 README](./README.md)

