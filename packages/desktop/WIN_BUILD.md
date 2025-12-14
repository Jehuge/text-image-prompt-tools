# Windows EXE 打包指南

## 快速开始

### 前置要求

- Windows 系统（推荐 Windows 10/11）
- Node.js 18+ 
- pnpm 10.6.1+
- 已安装所有依赖 (`pnpm install`)

### 一键打包

在项目根目录执行：

```bash
# 打包 Windows 安装程序（NSIS）和便携版
pnpm build:win

# 只打包 NSIS 安装程序
pnpm build:win:nsis

# 只打包便携版（Portable）
pnpm build:win:portable
```

生成的 exe 文件位于：`packages/desktop/release/`

## 打包格式说明

### NSIS 安装程序
- 文件格式：`.exe` 安装程序
- 特点：
  - 可以自定义安装目录
  - 自动创建桌面快捷方式
  - 自动创建开始菜单快捷方式
  - 支持卸载
- 文件位置：`packages/desktop/release/提示词优化工具 Setup 1.0.0.exe`

### 便携版（Portable）
- 文件格式：`.exe` 可执行文件
- 特点：
  - 无需安装，直接运行
  - 可以放在任意位置运行
  - 不会在系统中创建快捷方式
- 文件位置：`packages/desktop/release/提示词优化工具 1.0.0.exe`

## 详细步骤

### 1. 安装依赖

```bash
# 在项目根目录
pnpm install
```

### 2. 构建应用

```bash
# 方式一：使用根目录脚本（推荐）
pnpm build:win

# 方式二：进入 desktop 目录
cd packages/desktop
pnpm build:win
```

### 3. 分发应用

打包完成后，将生成的 exe 文件分发给用户即可。

## 构建过程说明

打包过程会自动执行以下步骤：

1. ✅ **构建 core** - 核心服务层
2. ✅ **构建 ui** - React UI 组件库
3. ✅ **构建渲染进程** - Web 应用（Vite 构建）
4. ✅ **构建主进程** - Electron 主进程（TypeScript 编译）
5. ✅ **打包** - 使用 electron-builder 生成 Windows 安装包

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

### 修改图标

1. 准备 `.ico` 格式的图标文件（推荐 256x256 或更大）
2. 将图标文件放在 `packages/desktop/build/` 目录
3. 在 `packages/desktop/package.json` 中更新：

```json
{
  "build": {
    "win": {
      "icon": "build/your-icon.ico"
    }
  }
}
```

### 修改安装选项

编辑 `packages/desktop/package.json` 的 `nsis` 配置：

```json
{
  "build": {
    "nsis": {
      "oneClick": false,                              // false = 显示安装向导
      "allowToChangeInstallationDirectory": true,     // 允许选择安装目录
      "createDesktopShortcut": true,                   // 创建桌面快捷方式
      "createStartMenuShortcut": true,                 // 创建开始菜单快捷方式
      "shortcutName": "提示词优化工具"                 // 快捷方式名称
    }
  }
}
```

### 只打包一种格式

如果只想打包 NSIS 安装程序：

```json
{
  "build": {
    "win": {
      "target": [
        {
          "target": "nsis",
          "arch": ["x64"]
        }
      ]
    }
  }
}
```

如果只想打包便携版：

```json
{
  "build": {
    "win": {
      "target": [
        {
          "target": "portable",
          "arch": ["x64"]
        }
      ]
    }
  }
}
```

## 常见问题

### Q: 构建失败，提示找不到模块？

**A:** 确保在项目根目录执行了 `pnpm install`，这会安装所有 workspace 包的依赖。

### Q: 生成的 exe 文件很大？

**A:** 这是正常的，Electron 应用包含完整的 Chromium 运行时。通常 exe 文件大小在 100-200MB 左右。

### Q: 如何代码签名？

**A:** 在 `packages/desktop/package.json` 的 `build.win` 中添加：

```json
{
  "build": {
    "win": {
      "certificateFile": "path/to/certificate.pfx",
      "certificatePassword": "your-password"
    }
  }
}
```

需要有效的代码签名证书。

### Q: 支持哪些架构？

**A:** 默认支持 x64 (64位)。如果需要支持 ia32 (32位)，可以修改配置：

```json
{
  "build": {
    "win": {
      "target": [
        {
          "target": "nsis",
          "arch": ["x64", "ia32"]
        }
      ]
    }
  }
}
```

### Q: 如何在 macOS/Linux 上打包 Windows 应用？

**A:** 理论上可以使用 Wine，但推荐在 Windows 系统上打包，以确保兼容性。

## 文件位置

- **构建输出**: `packages/desktop/dist/`
- **打包输出**: `packages/desktop/release/`
- **配置文件**: `packages/desktop/package.json`
- **主进程代码**: `packages/desktop/src/main.ts`
- **预加载脚本**: `packages/desktop/src/preload.ts`
- **图标文件**: `packages/desktop/build/large_8-31-7.ico`

## 更多信息

- macOS 打包说明：查看 [PKG_BUILD.md](./PKG_BUILD.md)
- 详细构建说明：查看 [BUILD.md](./BUILD.md)
- 桌面应用说明：查看 [packages/desktop/README.md](./packages/desktop/README.md)

