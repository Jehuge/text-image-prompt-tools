# 数据存储说明

## 存储位置

### Web 应用（浏览器）

所有数据都存储在浏览器的 **localStorage** 中，数据会持久化保存，即使关闭浏览器也不会丢失。

### 桌面应用（Electron）

在 Electron 桌面应用中，数据同样使用 **localStorage** API，但实际存储位置不同：

**macOS 存储位置：**
```
~/Library/Application Support/提示词优化工具/Local Storage/leveldb/
```

**Windows 存储位置：**
```
%APPDATA%\提示词优化工具\Local Storage\leveldb\
```

**Linux 存储位置：**
```
~/.config/提示词优化工具/Local Storage/leveldb/
```

> **注意**：Electron 的 localStorage 数据存储在 LevelDB 格式的数据库中，这是 Chromium 的底层存储机制。数据会持久化保存，即使关闭应用也不会丢失。

### 查看 Electron 应用的数据

1. **通过应用界面**：与应用内查看方式相同
2. **通过文件系统**：直接访问上述目录（需要显示隐藏文件）
3. **通过开发者工具**：
   - 在 Electron 应用中按 `Cmd+Option+I` (macOS) 或 `Ctrl+Shift+I` (Windows/Linux) 打开开发者工具
   - 切换到 "Application" 标签页
   - 展开 "Local Storage" → `file://`
   - 可以看到存储的 key-value 数据

### 查看 Electron 数据存储路径

在 Electron 应用的开发者工具控制台中运行：

```javascript
// 获取用户数据目录路径
if (window.electron && window.electron.getUserDataPath) {
  window.electron.getUserDataPath().then(path => {
    console.log('数据存储路径:', path);
    console.log('LocalStorage 路径:', path + '/Local Storage');
  });
}
```

或者查看应用启动时的控制台输出（开发模式）。

## 存储的数据类型

### 1. 模型配置 (`text-image-prompt-tools:models`)

存储用户配置的模型信息，包括：
- 模型 ID 和名称
- API Key
- Base URL
- 模型参数配置

**存储格式：**
```json
[
  {
    "id": "openai-gpt-4o",
    "name": "GPT-4o",
    "enabled": true,
    "providerMeta": { ... },
    "modelMeta": { ... },
    "connectionConfig": {
      "apiKey": "sk-...",
      "baseURL": "https://api.openai.com/v1"
    }
  }
]
```

### 2. 历史记录 (`text-image-prompt-tools:history`)

存储提示词优化和图片反推的历史记录，最多保存 100 条。

**存储格式：**
```json
[
  {
    "id": "prompt-1234567890-abc123",
    "type": "prompt-optimize",
    "originalPrompt": "原始提示词",
    "optimizedPrompt": "优化后的提示词",
    "modelKey": "openai-gpt-4o",
    "modelName": "GPT-4o",
    "style": "general",
    "timestamp": 1234567890000
  },
  {
    "id": "image-1234567890-xyz789",
    "type": "image-to-prompt",
    "imageUrl": "data:image/jpeg;base64,...",
    "prompt": "提取的提示词",
    "modelKey": "openai-gpt-4o",
    "modelName": "GPT-4o",
    "timestamp": 1234567890000
  }
]
```

## 查看存储的数据

### 在浏览器中查看

1. 打开浏览器开发者工具（F12）
2. 切换到 "Application" 或 "存储" 标签页
3. 展开 "Local Storage"
4. 选择你的网站域名
5. 可以看到两个 key：
   - `text-image-prompt-tools:models` - 模型配置
   - `text-image-prompt-tools:history` - 历史记录

### 在 Electron 桌面应用中查看

1. 在应用中按 `Cmd+Option+I` (macOS) 或 `Ctrl+Shift+I` (Windows/Linux) 打开开发者工具
2. 切换到 "Application" 标签页
3. 展开 "Local Storage" → `file://`
4. 可以看到两个 key：
   - `text-image-prompt-tools:models` - 模型配置
   - `text-image-prompt-tools:history` - 历史记录

### 手动导出数据

在浏览器控制台中运行：

```javascript
// 导出模型配置
const models = JSON.parse(localStorage.getItem('text-image-prompt-tools:models') || '[]');
console.log(JSON.stringify(models, null, 2));

// 导出历史记录
const history = JSON.parse(localStorage.getItem('text-image-prompt-tools:history') || '[]');
console.log(JSON.stringify(history, null, 2));
```

### 手动导入数据

在浏览器控制台中运行：

```javascript
// 导入模型配置
const models = [/* 你的模型配置数据 */];
localStorage.setItem('text-image-prompt-tools:models', JSON.stringify(models));

// 导入历史记录
const history = [/* 你的历史记录数据 */];
localStorage.setItem('text-image-prompt-tools:history', JSON.stringify(history));
```

## 清除数据

### 在应用界面中清除

- **历史记录页面**：点击"清空"按钮
- **模型配置页面**：删除单个模型配置

### 在浏览器控制台中清除

```javascript
localStorage.removeItem('text-image-prompt-tools:models');
localStorage.removeItem('text-image-prompt-tools:history');
```

### 在 Electron 应用中清除

**方式一：通过应用界面**（推荐）
- 使用应用内的清空功能

**方式二：通过开发者工具**
- 按 `Cmd+Option+I` (macOS) 打开开发者工具
- 在控制台中运行上述 JavaScript 代码

**方式三：删除数据目录**（完全清除）
- **macOS**: 删除 `~/Library/Application Support/提示词优化工具/` 目录
- **Windows**: 删除 `%APPDATA%\提示词优化工具\` 目录
- **Linux**: 删除 `~/.config/提示词优化工具/` 目录

## 数据限制

- **历史记录**: 最多保存 100 条，超过后会自动删除最旧的记录
- **localStorage 大小限制**: 通常为 5-10MB，对于模型配置和历史记录来说足够使用

## 数据安全

⚠️ **重要提示**：
- API Key 存储在 localStorage 中，是**明文存储**的
- 不要在公共电脑或不信任的设备上使用
- 建议定期清理数据
- 如果担心安全，可以考虑使用浏览器扩展来加密存储

### Electron 应用的数据安全

- Electron 应用的数据存储在用户数据目录中，只有当前用户有访问权限
- 数据以 LevelDB 格式存储，但仍然是明文存储
- 卸载应用时，数据目录可能不会被自动删除（取决于卸载方式）
- 如需完全清除数据，需要手动删除用户数据目录

## 未来改进

计划添加的功能：
1. 数据导出/导入功能（JSON 文件）
2. 数据加密存储
3. 云端同步（可选）
4. 数据备份和恢复

