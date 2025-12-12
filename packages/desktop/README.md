# 桌面应用打包说明

## 快速开始

### 1. 安装依赖

在项目根目录执行：
```bash
pnpm install
```

### 2. 构建 macOS PKG

从项目根目录执行：
```bash
pnpm build:pkg
```

生成的 pkg 文件位于：`packages/desktop/release/`

### 3. 安装应用

双击生成的 `.pkg` 文件，按照安装向导完成安装。应用将安装到 `/Applications` 目录。

## 开发模式

```bash
# 从项目根目录
pnpm dev:desktop
```

这会：
1. 启动 Web 开发服务器（http://localhost:3000）
2. 打开 Electron 窗口
3. 支持热重载

## 自定义图标

1. 准备 1024x1024 的 PNG 图标
2. 转换为 `.icns` 格式（参考 `build/README.md`）
3. 将 `icon.icns` 放在 `build/` 目录
4. 在 `package.json` 的 `build.mac` 中添加：
   ```json
   "icon": "build/icon.icns"
   ```

## 构建流程

1. **构建 core** - 核心服务层
2. **构建 ui** - React UI 组件
3. **构建渲染进程** - Web 应用（使用 Vite）
4. **构建主进程** - Electron 主进程（使用 TypeScript）
5. **打包** - 使用 electron-builder 生成 pkg

## 目录结构

```
packages/desktop/
├── src/
│   ├── main.ts          # Electron 主进程
│   └── preload.ts       # 预加载脚本
├── build/
│   ├── icon.icns        # 应用图标（可选）
│   └── README.md        # 图标说明
├── dist/                # 构建输出
│   ├── main.js          # 编译后的主进程
│   ├── preload.js       # 编译后的预加载脚本
│   └── renderer/        # 渲染进程文件
├── release/             # 打包输出（pkg 文件）
├── build.js             # 构建脚本
├── vite.config.ts       # Vite 配置
├── tsconfig.json        # TypeScript 配置
└── package.json         # 包配置
```

## 常见问题

### Q: 构建失败，提示找不到模块？

A: 确保在项目根目录执行了 `pnpm install`，这会安装所有 workspace 包的依赖。

### Q: 生成的 pkg 文件很大？

A: 这是正常的，Electron 应用包含完整的 Chromium 运行时。可以使用 `electron-builder` 的压缩选项来减小体积。

### Q: 如何代码签名？

A: 在 `package.json` 的 `build.mac` 中添加：
```json
"identity": "Developer ID Application: Your Name (TEAM_ID)"
```

### Q: 如何创建 DMG 而不是 PKG？

A: 修改 `package.json` 中的 `build.mac.target`：
```json
"target": ["dmg"]
```

