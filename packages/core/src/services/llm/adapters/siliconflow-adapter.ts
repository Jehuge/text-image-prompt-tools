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
 * SiliconFlow Provider 定义
 */
const SILICONFLOW_PROVIDER: TextProvider = {
  id: 'siliconflow',
  name: 'SiliconFlow',
  description: 'SiliconFlow OpenAI-compatible models',
  requiresApiKey: true,
  defaultBaseURL: 'https://api.siliconflow.cn/v1',
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
 * SiliconFlow 静态模型列表
 */
const SILICONFLOW_MODELS: TextModel[] = [
  {
    id: 'Qwen/Qwen2.5-72B-Instruct',
    name: 'Qwen2.5-72B-Instruct',
    description: 'Qwen2.5 72B via SiliconFlow',
    providerId: 'siliconflow',
    capabilities: {
      supportsTools: false,
      supportsVision: false,
      maxContextLength: 128000,
    },
  },
  {
    id: 'Qwen/Qwen2.5-32B-Instruct',
    name: 'Qwen2.5-32B-Instruct',
    description: 'Qwen2.5 32B via SiliconFlow',
    providerId: 'siliconflow',
    capabilities: {
      supportsTools: false,
      supportsVision: false,
      maxContextLength: 128000,
    },
  },
  {
    id: 'Qwen/Qwen2.5-14B-Instruct',
    name: 'Qwen2.5-14B-Instruct',
    description: 'Qwen2.5 14B via SiliconFlow',
    providerId: 'siliconflow',
    capabilities: {
      supportsTools: false,
      supportsVision: false,
      maxContextLength: 128000,
    },
  },
  {
    id: 'Qwen/Qwen2.5-7B-Instruct',
    name: 'Qwen2.5-7B-Instruct',
    description: 'Qwen2.5 7B via SiliconFlow',
    providerId: 'siliconflow',
    capabilities: {
      supportsTools: false,
      supportsVision: false,
      maxContextLength: 128000,
    },
  },
];

/**
 * SiliconFlow Adapter 实现 (使用 OpenAI 兼容接口)
 */
export class SiliconflowAdapter implements ITextProviderAdapter {
  getProvider(): TextProvider {
    return SILICONFLOW_PROVIDER;
  }

  getModels(): TextModel[] {
    return SILICONFLOW_MODELS;
  }

  async getModelsAsync(config: TextModelConfig): Promise<TextModel[]> {
    const client = new OpenAI({
      apiKey: config.connectionConfig.apiKey,
      baseURL: config.connectionConfig.baseURL || SILICONFLOW_PROVIDER.defaultBaseURL,
    });

    try {
      console.log('[SiliconFlowAdapter] 开始获取模型列表...');
      const response = await client.models.list();
      console.log(`[SiliconFlowAdapter] API 返回 ${response.data.length} 个模型`);
      
      // 只返回真实从 API 获取的模型
      const dynamicModels = response.data.map((model) => ({
        id: model.id,
        name: model.id,
        description: model.id,
        providerId: 'siliconflow',
        capabilities: {
          supportsTools: false,
          supportsVision: false, // SiliconFlow 模型不支持视觉
          maxContextLength: 128000,
        },
      }));
      
      console.log(`[SiliconFlowAdapter] 从真实 API 获取 ${dynamicModels.length} 个模型`);
      
      // 只返回真实获取的模型，不合并静态模型
      return dynamicModels;
    } catch (error) {
      console.error('[SiliconFlowAdapter] 动态获取模型失败:', error);
      // 获取失败时抛出错误，不返回虚假的静态模型
      throw error;
    }
  }

  buildDefaultModel(modelId: string): TextModel {
    return {
      id: modelId,
      name: modelId,
      description: modelId,
      providerId: 'siliconflow',
      capabilities: {
        supportsTools: false,
        supportsVision: false,
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
      baseURL: config.connectionConfig.baseURL || SILICONFLOW_PROVIDER.defaultBaseURL,
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
      throw new Error('No response from SiliconFlow');
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
      baseURL: config.connectionConfig.baseURL || SILICONFLOW_PROVIDER.defaultBaseURL,
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

