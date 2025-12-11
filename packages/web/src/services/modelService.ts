import type {
  TextAdapterRegistry,
  TextModelConfig,
  TextProvider,
  TextModel,
} from '@text-image-prompt-tools/core';

/**
 * 模型服务 - 封装 registry 调用，提供类似 API 的接口
 */
export class ModelService {
  constructor(private registry: TextAdapterRegistry) {}

  /**
   * 获取所有提供商
   */
  getProviders(): TextProvider[] {
    // 从 registry 中获取所有已注册的提供商
    const providers: TextProvider[] = [];
    
    // 已知的提供商 ID 列表
    const providerIds = ['openai', 'gemini', 'anthropic', 'deepseek', 'siliconflow', 'zhipu', 'ollama'];
    
    for (const id of providerIds) {
      try {
        const provider = this.registry.getProvider(id);
        if (provider) {
          providers.push(provider);
        }
      } catch (e) {
        // 忽略未注册的提供商
      }
    }
    
    return providers;
  }

  /**
   * 获取模型列表
   */
  async getModelList(config: {
    provider: string;
    api_key: string;
    base_url?: string;
  }): Promise<{ code: number; data: Array<{ id: string; name: string; provider: string }>; msg?: string }> {
    try {
      // 构建临时配置用于查询模型
      const provider = this.registry.getProvider(config.provider);
      if (!provider) {
        return {
          code: 400,
          data: [],
          msg: `提供商 ${config.provider} 不存在`,
        };
      }

      // 创建一个临时模型用于查询（不依赖静态模型）
      const tempModel: TextModel = {
        id: 'temp-model',
        name: 'temp',
        description: 'temp',
        providerId: config.provider,
        capabilities: { supportsTools: false },
      };

      const tempConfig: TextModelConfig = {
        id: 'temp',
        name: 'temp',
        enabled: true,
        providerMeta: provider,
        modelMeta: tempModel,
        connectionConfig: {
          apiKey: config.api_key,
          ...(config.base_url && { baseURL: config.base_url }),
        },
      };

      // 尝试动态获取模型
      const models = await this.registry.getModels(config.provider, tempConfig);

      return {
        code: 200,
        data: models.map((m) => ({
          id: m.id,
          name: m.name,
          provider: config.provider,
          supportsVision: m.capabilities?.supportsVision || false,
        })),
      };
    } catch (error: any) {
      console.error('获取模型列表失败:', error);
      return {
        code: 500,
        data: [],
        msg: error.message || '获取模型列表失败',
      };
    }
  }

  /**
   * 测试模型连接
   */
  async testModelConnection(config: {
    provider: string;
    api_key: string;
    base_url?: string;
  }): Promise<{ code: number; msg: string }> {
    try {
      const provider = this.registry.getProvider(config.provider);
      if (!provider) {
        return {
          code: 400,
          msg: `提供商 ${config.provider} 不存在`,
        };
      }

      // 创建一个临时模型用于测试（不依赖静态模型）
      const tempModel: TextModel = {
        id: 'temp-model',
        name: 'temp',
        description: 'temp',
        providerId: config.provider,
        capabilities: { supportsTools: false },
      };

      const tempConfig: TextModelConfig = {
        id: 'temp',
        name: 'temp',
        enabled: true,
        providerMeta: provider,
        modelMeta: tempModel,
        connectionConfig: {
          apiKey: config.api_key,
          ...(config.base_url && { baseURL: config.base_url }),
        },
      };

      // 尝试获取模型列表来测试连接
      await this.registry.getModels(config.provider, tempConfig);

      return {
        code: 200,
        msg: '连接成功',
      };
    } catch (error: any) {
      console.error('测试连接失败:', error);
      return {
        code: 500,
        msg: error.message || '连接失败',
      };
    }
  }
}

