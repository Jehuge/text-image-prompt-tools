# macOS PKG 打包指南

## 快速开始

### 一键打包

在项目根目录执行：

```bash
pnpm install    # 首次使用需要安装依赖
pnpm build:pkg  # 打包成 macOS pkg
```

生成的 pkg 文件位于：`packages/desktop/release/`

## 详细步骤

### 1. 安装依赖

```bash
# 在项目根目录
pnpm install
```

这会安装所有依赖，包括 Electron 相关包。

### 2. 构建应用

```bash
# 方式一：使用根目录脚本（推荐）
pnpm build:pkg

# 方式二：进入 desktop 目录
cd packages/desktop
pnpm build:pkg
```

### 3. 安装应用

双击生成的 `.pkg` 文件，按照安装向导完成安装。

应用将安装到 `/Applications` 目录，名称为"提示词优化工具"。

## 构建过程说明

打包过程会自动执行以下步骤：

1. ✅ **构建 core** - 核心服务层
2. ✅ **构建 ui** - React UI 组件库
3. ✅ **构建渲染进程** - Web 应用（Vite 构建）
4. ✅ **构建主进程** - Electron 主进程（TypeScript 编译）
5. ✅ **打包** - 使用 electron-builder 生成 pkg 安装包

## 自定义配置

### 修改应用名称

编辑 `packages/desktop/package.json`：

```json
{
  "build": {
    "productName": "你的应用名称"
  }
}
```

### 添加应用图标

1. 准备 1024x1024 的 PNG 图标
2. 转换为 `.icns` 格式（参考 `packages/desktop/build/README.md`）
3. 将 `icon.icns` 放在 `packages/desktop/build/` 目录
4. 在 `packages/desktop/package.json` 中添加：

```json
{
  "build": {
    "mac": {
      "icon": "build/icon.icns"
    }
  }
}
```

### 修改安装位置

编辑 `packages/desktop/package.json`：

```json
{
  "build": {
    "pkg": {
      "installLocation": "/Applications/你的目录"
    }
  }
}
```

## 开发模式

```bash
pnpm dev:desktop
```

这会启动开发服务器并打开 Electron 窗口，支持热重载。

## 常见问题

### Q: 构建失败，提示找不到模块？

**A:** 确保在项目根目录执行了 `pnpm install`，这会安装所有 workspace 包的依赖。

### Q: 生成的 pkg 文件很大？

**A:** 这是正常的，Electron 应用包含完整的 Chromium 运行时。通常 pkg 文件大小在 100-200MB 左右。

### Q: 如何代码签名？

**A:** 在 `packages/desktop/package.json` 的 `build.mac` 中添加：

```json
{
  "build": {
    "mac": {
      "identity": "Developer ID Application: Your Name (TEAM_ID)"
    }
  }
}
```

需要 Apple Developer 账号。

### Q: 如何创建 DMG 而不是 PKG？

**A:** 修改 `packages/desktop/package.json`：

```json
{
  "build": {
    "mac": {
      "target": ["dmg"]
    }
  }
}
```

然后执行：
```bash
pnpm -F @text-image-prompt-tools/desktop build:electron
```

### Q: 支持哪些架构？

**A:** 默认支持 x64 (Intel) 和 arm64 (Apple Silicon)。可以在 `package.json` 中修改：

```json
{
  "build": {
    "mac": {
      "target": [{
        "target": "pkg",
        "arch": ["x64", "arm64"]  // 或只选择其中一个
      }]
    }
  }
}
```

## 文件位置

- **构建输出**: `packages/desktop/dist/`
- **打包输出**: `packages/desktop/release/`
- **配置文件**: `packages/desktop/package.json`
- **主进程代码**: `packages/desktop/src/main.ts`
- **预加载脚本**: `packages/desktop/src/preload.ts`

## 更多信息

- 详细构建说明：查看 [BUILD.md](./BUILD.md)
- 桌面应用说明：查看 [packages/desktop/README.md](./packages/desktop/README.md)
- 图标制作说明：查看 [packages/desktop/build/README.md](./packages/desktop/build/README.md)

