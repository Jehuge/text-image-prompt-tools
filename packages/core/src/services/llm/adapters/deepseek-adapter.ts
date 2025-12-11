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
 * DeepSeek Provider 定义
 */
const DEEPSEEK_PROVIDER: TextProvider = {
  id: 'deepseek',
  name: 'DeepSeek',
  description: 'DeepSeek API (OpenAI Compatible)',
  requiresApiKey: true,
  defaultBaseURL: 'https://api.deepseek.com/v1',
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
 * DeepSeek 静态模型列表
 */
const DEEPSEEK_MODELS: TextModel[] = [
  {
    id: 'deepseek-chat',
    name: 'DeepSeek Chat',
    description: 'DeepSeek Chat',
    providerId: 'deepseek',
    capabilities: {
      supportsTools: true,
      supportsVision: false,
      maxContextLength: 128000,
    },
  },
  {
    id: 'deepseek-reasoner',
    name: 'DeepSeek Reasoner',
    description: 'DeepSeek Reasoner (Reasoning model)',
    providerId: 'deepseek',
    capabilities: {
      supportsTools: false,
      supportsReasoning: true,
      maxContextLength: 128000,
    },
  },
  {
    id: 'deepseek-coder',
    name: 'DeepSeek Coder',
    description: 'DeepSeek Coder',
    providerId: 'deepseek',
    capabilities: {
      supportsTools: false,
      supportsVision: false,
      maxContextLength: 128000,
    },
  },
];

/**
 * DeepSeek Adapter 实现 (使用 OpenAI 兼容接口)
 */
export class DeepSeekAdapter implements ITextProviderAdapter {
  getProvider(): TextProvider {
    return DEEPSEEK_PROVIDER;
  }

  getModels(): TextModel[] {
    return DEEPSEEK_MODELS;
  }

  async getModelsAsync(config: TextModelConfig): Promise<TextModel[]> {
    const client = new OpenAI({
      apiKey: config.connectionConfig.apiKey,
      baseURL: config.connectionConfig.baseURL || DEEPSEEK_PROVIDER.defaultBaseURL,
    });

    try {
      console.log('[DeepSeekAdapter] 开始获取模型列表...');
      const response = await client.models.list();
      console.log(`[DeepSeekAdapter] API 返回 ${response.data.length} 个模型`);
      
      // 只返回真实从 API 获取的模型
      const dynamicModels = response.data
        .filter((model) => model.id.includes('deepseek'))
        .map((model) => {
          // 从真实 API 返回的模型 ID 中判断能力
          return {
            id: model.id,
            name: model.id,
            description: model.id,
            providerId: 'deepseek',
            capabilities: {
              supportsTools: model.id.includes('chat'),
              supportsVision: false, // DeepSeek 模型不支持视觉
              supportsReasoning: model.id.includes('reasoner'),
              maxContextLength: 128000,
            },
          };
        });
      
      console.log(`[DeepSeekAdapter] 从真实 API 获取 ${dynamicModels.length} 个模型`);
      
      // 只返回真实获取的模型，不合并静态模型
      return dynamicModels;
    } catch (error) {
      console.error('[DeepSeekAdapter] 动态获取模型失败:', error);
      // 获取失败时抛出错误，不返回虚假的静态模型
      throw error;
    }
  }

  buildDefaultModel(modelId: string): TextModel {
    return {
      id: modelId,
      name: modelId,
      description: modelId,
      providerId: 'deepseek',
      capabilities: {
        supportsTools: false,
        supportsVision: false,
        maxContextLength: 64000,
      },
    };
  }

  async sendMessage(
    messages: Message[],
    config: TextModelConfig
  ): Promise<LLMResponse> {
    const client = new OpenAI({
      apiKey: config.connectionConfig.apiKey,
      baseURL: config.connectionConfig.baseURL || DEEPSEEK_PROVIDER.defaultBaseURL,
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
      throw new Error('No response from DeepSeek');
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
      baseURL: config.connectionConfig.baseURL || DEEPSEEK_PROVIDER.defaultBaseURL,
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

