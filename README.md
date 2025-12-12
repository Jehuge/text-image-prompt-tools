# 提示词优化&图片反推

一个强大的提示词优化工具，支持文生图提示词优化和图片反推提示词功能。

## 核心特性

- **智能优化**: 一键优化提示词，支持多种风格
- **多厂商模型对接**: 支持 OpenAI、Gemini、DeepSeek、智谱AI、SiliconFlow 等主流AI模型
- **图片反推提示词**: 使用 Vision 模型从图片中提取提示词
- **多种优化风格**: 支持通用、创意、摄影、设计等多种优化风格
- **数据持久化**: 使用 localStorage 保存模型配置和历史记录
- **历史记录**: 自动记录所有优化和反推操作
- **React 技术栈**: 使用 React 19.2.1+ (安全版本)
- **多端支持**: 架构设计支持打包成智能体、插件、Mac 软件

## 快速开始

### 方式一：使用启动脚本（推荐）

```bash
cd text-image-prompt-tools
./dev.sh
```

### 方式二：使用 npx

```bash
cd text-image-prompt-tools
npx pnpm@10.6.1 dev
```

### 方式三：安装 pnpm 后使用

如果已安装 pnpm：

```bash
cd text-image-prompt-tools
pnpm install
pnpm dev
```

## 安装 pnpm

如果系统没有安装 pnpm，可以使用以下方式安装：

### 使用 corepack（推荐，Node.js 16.9+ 内置）

```bash
corepack enable
corepack prepare pnpm@10.6.1 --activate
```

### 使用 npm（需要权限）

```bash
npm install -g pnpm@10.6.1
```

### 使用 Homebrew (macOS)

```bash
brew install pnpm
```

## 项目结构

```
text-image-prompt-tools/
├── packages/
│   ├── core/          # 核心服务层 (Provider-Adapter-Registry 架构)
│   ├── ui/            # React UI 组件库
│   └── web/           # Web 应用
├── package.json
└── pnpm-workspace.yaml
```

## 使用说明

### 1. 配置模型

1. 点击"模型配置"标签页
2. 选择提供商（OpenAI/Gemini/DeepSeek）
3. 选择具体模型
4. 输入 API Key
5. 点击"保存配置"

### 2. 提示词优化

1. 点击"提示词优化"标签页
2. 从下拉框选择已配置的模型
3. 选择优化风格
4. 输入原始提示词
5. 点击"优化提示词"

### 3. 图片反推提示词

1. 点击"图片反推提示词"标签页
2. 选择支持 Vision 的模型
3. 上传图片
4. 点击"提取提示词"

### 4. 查看历史记录

1. 点击"历史记录"标签页
2. 查看所有优化和反推记录
3. 可以按类型筛选
4. 可以删除单条记录或清空所有记录

## 数据存储

所有数据存储在浏览器的 **localStorage** 中：

- **模型配置**: `text-image-prompt-tools:models`
- **历史记录**: `text-image-prompt-tools:history`

详细说明请查看 [STORAGE.md](./STORAGE.md)

## 技术栈

- **React**: 19.2.1+ (安全版本)
- **TypeScript**: 5.8.2
- **Vite**: 最新版本
- **pnpm**: 10.6.1

## 架构设计

采用 **Provider-Adapter-Registry** 三层架构，支持灵活的多厂商模型对接：

1. **Provider 层**: 定义模型提供商的元数据和能力
2. **Adapter 层**: 封装特定 SDK 的调用逻辑
3. **Registry 层**: 统一管理所有 Adapter，提供统一接口

详细说明请查看 [ARCHITECTURE.md](./ARCHITECTURE.md)

## 开发

```bash
# 安装依赖
npx pnpm@10.6.1 install

# 启动开发服务器
npx pnpm@10.6.1 dev

# 构建
npx pnpm@10.6.1 build
```

## 许可证

MIT
