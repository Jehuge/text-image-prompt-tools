import OpenAI from 'openai';
import type {
  ITextProviderAdapter,
  TextProvider,
  TextModel,
  TextModelConfig,
  Message,
  LLMResponse,
  StreamHandlers,
} from '../types';

/**
 * Zhipu Provider 定义
 */
const ZHIPU_PROVIDER: TextProvider = {
  id: 'zhipu',
  name: 'Zhipu AI',
  description: 'Zhipu GLM OpenAI-compatible models',
  requiresApiKey: true,
  defaultBaseURL: 'https://open.bigmodel.cn/api/paas/v4',
  supportsDynamicModels: true,
  connectionSchema: {
    required: ['apiKey'],
    optional: ['baseURL'],
    fieldTypes: {
      apiKey: 'string',
      baseURL: 'string',
    },
  },
};

/**
 * Zhipu 静态模型列表
 */
const ZHIPU_MODELS: TextModel[] = [
  {
    id: 'glm-4-plus',
    name: 'GLM-4 Plus',
    description: 'Zhipu GLM-4 Plus',
    providerId: 'zhipu',
    capabilities: {
      supportsTools: true,
      supportsVision: true,
      maxContextLength: 128000,
    },
  },
  {
    id: 'glm-4',
    name: 'GLM-4',
    description: 'Zhipu GLM-4',
    providerId: 'zhipu',
    capabilities: {
      supportsTools: true,
      supportsVision: true,
      maxContextLength: 128000,
    },
  },
  {
    id: 'glm-4-flash',
    name: 'GLM-4 Flash',
    description: 'Zhipu GLM-4 Flash',
    providerId: 'zhipu',
    capabilities: {
      supportsTools: true,
      supportsVision: true,
      maxContextLength: 128000,
    },
  },
  {
    id: 'glm-4-air',
    name: 'GLM-4 Air',
    description: 'Zhipu GLM-4 Air',
    providerId: 'zhipu',
    capabilities: {
      supportsTools: true,
      supportsVision: false,
      maxContextLength: 128000,
    },
  },
  {
    id: 'glm-4-airx',
    name: 'GLM-4 AirX',
    description: 'Zhipu GLM-4 AirX',
    providerId: 'zhipu',
    capabilities: {
      supportsTools: true,
      supportsVision: false,
      maxContextLength: 128000,
    },
  },
];

/**
 * Zhipu Adapter 实现 (使用 OpenAI 兼容接口)
 */
export class ZhipuAdapter implements ITextProviderAdapter {
  getProvider(): TextProvider {
    return ZHIPU_PROVIDER;
  }

  getModels(): TextModel[] {
    return ZHIPU_MODELS;
  }

  async getModelsAsync(config: TextModelConfig): Promise<TextModel[]> {
    const client = new OpenAI({
      apiKey: config.connectionConfig.apiKey,
      baseURL: config.connectionConfig.baseURL || ZHIPU_PROVIDER.defaultBaseURL,
    });

    try {
      console.log('[ZhipuAdapter] 开始获取模型列表...');
      const response = await client.models.list();
      console.log(`[ZhipuAdapter] API 返回 ${response.data.length} 个模型`);
      
      // 只返回真实从 API 获取的模型
      const dynamicModels = response.data.map((model) => {
        // 从真实 API 返回的模型 ID 中判断视觉支持
        const supportsVision = model.id.includes('glm-4') && !model.id.includes('air');
        
        return {
          id: model.id,
          name: model.id,
          description: model.id,
          providerId: 'zhipu',
          capabilities: {
            supportsTools: true,
            supportsVision,
            maxContextLength: 128000,
          },
        };
      });
      
      console.log(`[ZhipuAdapter] 从真实 API 获取 ${dynamicModels.length} 个模型`);
      
      // 只返回真实获取的模型，不合并静态模型
      return dynamicModels;
    } catch (error) {
      console.error('[ZhipuAdapter] 动态获取模型失败:', error);
      // 获取失败时抛出错误，不返回虚假的静态模型
      throw error;
    }
  }

  buildDefaultModel(modelId: string): TextModel {
    return {
      id: modelId,
      name: modelId,
      description: modelId,
      providerId: 'zhipu',
      capabilities: {
        supportsTools: true,
        supportsVision: modelId.includes('glm-4') && !modelId.includes('air'),
        maxContextLength: 128000,
      },
    };
  }

  async sendMessage(
    messages: Message[],
    config: TextModelConfig
  ): Promise<LLMResponse> {
    const client = new OpenAI({
      apiKey: config.connectionConfig.apiKey,
      baseURL: config.connectionConfig.baseURL || ZHIPU_PROVIDER.defaultBaseURL,
    });

    const response = await client.chat.completions.create({
      model: config.modelMeta.id,
      messages: messages.map((msg) => ({
        role: msg.role,
        content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content),
      })) as any,
      ...(config.llmParams || {}),
    });

    const choice = response.choices[0];
    if (!choice || !choice.message) {
      throw new Error('No response from Zhipu');
    }

    return {
      content: choice.message.content || '',
      usage: response.usage
        ? {
            promptTokens: response.usage.prompt_tokens,
            completionTokens: response.usage.completion_tokens,
            totalTokens: response.usage.total_tokens,
          }
        : undefined,
    };
  }

  async sendMessageStream(
    messages: Message[],
    config: TextModelConfig,
    callbacks: StreamHandlers
  ): Promise<void> {
    const client = new OpenAI({
      apiKey: config.connectionConfig.apiKey,
      baseURL: config.connectionConfig.baseURL || ZHIPU_PROVIDER.defaultBaseURL,
    });

    try {
      const stream = await client.chat.completions.create({
        model: config.modelMeta.id,
        messages: messages.map((msg) => ({
          role: msg.role,
          content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content),
        })) as any,
        stream: true,
        ...(config.llmParams || {}),
      });

      let fullContent = '';
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          fullContent += content;
          callbacks.onChunk?.(content);
        }
      }
      callbacks.onComplete?.(fullContent);
    } catch (error) {
      callbacks.onError?.(error as Error);
      throw error;
    }
  }
}

