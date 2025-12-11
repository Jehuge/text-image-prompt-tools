# 数据存储说明

## 存储位置

所有数据都存储在浏览器的 **localStorage** 中，数据会持久化保存，即使关闭浏览器也不会丢失。

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

### 清除所有数据

在浏览器控制台中运行：

```javascript
localStorage.removeItem('text-image-prompt-tools:models');
localStorage.removeItem('text-image-prompt-tools:history');
```

或者在应用界面中：
- 历史记录页面点击"清空"按钮
- 模型配置页面删除单个模型配置

## 数据限制

- **历史记录**: 最多保存 100 条，超过后会自动删除最旧的记录
- **localStorage 大小限制**: 通常为 5-10MB，对于模型配置和历史记录来说足够使用

## 数据安全

⚠️ **重要提示**：
- API Key 存储在 localStorage 中，是**明文存储**的
- 不要在公共电脑或不信任的设备上使用
- 建议定期清理浏览器数据
- 如果担心安全，可以考虑使用浏览器扩展来加密存储

## 未来改进

计划添加的功能：
1. 数据导出/导入功能（JSON 文件）
2. 数据加密存储
3. 云端同步（可选）
4. 数据备份和恢复

