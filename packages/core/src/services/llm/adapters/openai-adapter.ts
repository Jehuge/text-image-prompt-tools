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
 * OpenAI Provider 定义
 */
const OPENAI_PROVIDER: TextProvider = {
  id: 'openai',
  name: 'OpenAI',
  description: 'OpenAI API',
  requiresApiKey: true,
  defaultBaseURL: 'https://api.openai.com/v1',
  supportsDynamicModels: true,
  connectionSchema: {
    required: ['apiKey'],
    optional: ['baseURL', 'organization'],
    fieldTypes: {
      apiKey: 'string',
      baseURL: 'string',
      organization: 'string',
    },
  },
};

/**
 * OpenAI 静态模型列表
 */
const OPENAI_MODELS: TextModel[] = [
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    description: 'OpenAI GPT-4o (Latest)',
    providerId: 'openai',
    capabilities: {
      supportsTools: true,
      supportsVision: true,
      maxContextLength: 128000,
    },
  },
  {
    id: 'gpt-4o-mini',
    name: 'GPT-4o Mini',
    description: 'OpenAI GPT-4o Mini (Fast and affordable)',
    providerId: 'openai',
    capabilities: {
      supportsTools: true,
      supportsVision: true,
      maxContextLength: 128000,
    },
  },
  {
    id: 'gpt-4-turbo',
    name: 'GPT-4 Turbo',
    description: 'OpenAI GPT-4 Turbo',
    providerId: 'openai',
    capabilities: {
      supportsTools: true,
      supportsVision: true,
      maxContextLength: 128000,
    },
  },
  {
    id: 'gpt-4',
    name: 'GPT-4',
    description: 'OpenAI GPT-4',
    providerId: 'openai',
    capabilities: {
      supportsTools: true,
      supportsVision: true,
      maxContextLength: 8192,
    },
  },
  {
    id: 'gpt-3.5-turbo',
    name: 'GPT-3.5 Turbo',
    description: 'OpenAI GPT-3.5 Turbo',
    providerId: 'openai',
    capabilities: {
      supportsTools: true,
      supportsVision: false,
      maxContextLength: 16385,
    },
  },
  {
    id: 'o1-preview',
    name: 'O1 Preview',
    description: 'OpenAI O1 Preview (Reasoning model)',
    providerId: 'openai',
    capabilities: {
      supportsTools: false,
      supportsReasoning: true,
      maxContextLength: 200000,
    },
  },
  {
    id: 'o1-mini',
    name: 'O1 Mini',
    description: 'OpenAI O1 Mini (Reasoning model)',
    providerId: 'openai',
    capabilities: {
      supportsTools: false,
      supportsReasoning: true,
      maxContextLength: 128000,
    },
  },
];

/**
 * OpenAI Adapter 实现
 */
export class OpenAIAdapter implements ITextProviderAdapter {
  getProvider(): TextProvider {
    return OPENAI_PROVIDER;
  }

  getModels(): TextModel[] {
    return OPENAI_MODELS;
  }

  async getModelsAsync(config: TextModelConfig): Promise<TextModel[]> {
    const client = new OpenAI({
      apiKey: config.connectionConfig.apiKey,
      baseURL: config.connectionConfig.baseURL || OPENAI_PROVIDER.defaultBaseURL,
    });

    try {
      console.log('[OpenAIAdapter] 开始获取模型列表...');
      const response = await client.models.list();
      console.log(`[OpenAIAdapter] API 返回 ${response.data.length} 个模型`);
      
      // 只返回真实从 API 获取的模型
      const dynamicModels = response.data
        .filter((model) => model.id.includes('gpt'))
        .map((model) => {
          // 从真实 API 返回的模型信息中判断视觉支持
          // 基于模型 ID 模式（这是从真实 API 返回的数据）
          const supportsVision = model.id.includes('vision') || model.id.includes('4');
          
          return {
            id: model.id,
            name: model.id,
            description: model.id,
            providerId: 'openai',
            capabilities: {
              supportsTools: true,
              supportsVision,
              maxContextLength: 128000,
            },
          };
        });
      
      console.log(`[OpenAIAdapter] 从真实 API 获取 ${dynamicModels.length} 个模型`);
      
      // 只返回真实获取的模型，不合并静态模型
      return dynamicModels;
    } catch (error) {
      console.error('[OpenAIAdapter] 动态获取模型失败:', error);
      // 获取失败时抛出错误，不返回虚假的静态模型
      throw error;
    }
  }

  buildDefaultModel(modelId: string): TextModel {
    return {
      id: modelId,
      name: modelId,
      description: modelId,
      providerId: 'openai',
      capabilities: {
        supportsTools: true,
        supportsVision: modelId.includes('vision') || modelId.includes('4'),
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
      baseURL: config.connectionConfig.baseURL || OPENAI_PROVIDER.defaultBaseURL,
    });

    const response = await client.chat.completions.create({
      model: config.modelMeta.id,
      messages: messages.map((msg) => {
        if (typeof msg.content === 'string') {
          return {
            role: msg.role,
            content: msg.content,
          };
        }
        // 处理多模态内容
        return {
          role: msg.role,
          content: msg.content,
        };
      }) as any,
      ...(config.llmParams || {}),
    });

    const choice = response.choices[0];
    if (!choice || !choice.message) {
      throw new Error('No response from OpenAI');
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
      baseURL: config.connectionConfig.baseURL || OPENAI_PROVIDER.defaultBaseURL,
    });

    try {
      const stream = await client.chat.completions.create({
        model: config.modelMeta.id,
        messages: messages.map((msg) => {
          if (typeof msg.content === 'string') {
            return {
              role: msg.role,
              content: msg.content,
            };
          }
          return {
            role: msg.role,
            content: msg.content,
          };
        }) as any,
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

