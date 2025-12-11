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
 * Ollama Provider 定义
 */
const OLLAMA_PROVIDER: TextProvider = {
  id: 'ollama',
  name: 'Ollama',
  description: 'Ollama Local Models (OpenAI Compatible)',
  requiresApiKey: false, // Ollama 不需要 API Key
  defaultBaseURL: 'http://127.0.0.1:11434/v1',
  supportsDynamicModels: true,
  connectionSchema: {
    required: [],
    optional: ['baseURL'],
    fieldTypes: {
      baseURL: 'string',
    },
  },
};

/**
 * Ollama 静态模型列表（常用模型）
 */
const OLLAMA_MODELS: TextModel[] = [
  {
    id: 'llama3.2',
    name: 'Llama 3.2',
    description: 'Llama 3.2',
    providerId: 'ollama',
    capabilities: {
      supportsTools: false,
      supportsVision: false,
      maxContextLength: 128000,
    },
  },
  {
    id: 'llama3.1',
    name: 'Llama 3.1',
    description: 'Llama 3.1',
    providerId: 'ollama',
    capabilities: {
      supportsTools: false,
      supportsVision: false,
      maxContextLength: 128000,
    },
  },
  {
    id: 'llama3',
    name: 'Llama 3',
    description: 'Llama 3',
    providerId: 'ollama',
    capabilities: {
      supportsTools: false,
      supportsVision: false,
      maxContextLength: 128000,
    },
  },
  {
    id: 'llama3.2-vision',
    name: 'Llama 3.2 Vision',
    description: 'Llama 3.2 Vision',
    providerId: 'ollama',
    capabilities: {
      supportsTools: false,
      supportsVision: true,
      maxContextLength: 128000,
    },
  },
  {
    id: 'llava',
    name: 'LLaVA',
    description: 'LLaVA Vision Model',
    providerId: 'ollama',
    capabilities: {
      supportsTools: false,
      supportsVision: true,
      maxContextLength: 128000,
    },
  },
  {
    id: 'qwen2.5',
    name: 'Qwen 2.5',
    description: 'Qwen 2.5',
    providerId: 'ollama',
    capabilities: {
      supportsTools: false,
      supportsVision: false,
      maxContextLength: 128000,
    },
  },
  {
    id: 'qwen2.5-vision',
    name: 'Qwen 2.5 Vision',
    description: 'Qwen 2.5 Vision',
    providerId: 'ollama',
    capabilities: {
      supportsTools: false,
      supportsVision: true,
      maxContextLength: 128000,
    },
  },
];

/**
 * Ollama Adapter 实现 (使用 OpenAI 兼容接口)
 */
export class OllamaAdapter implements ITextProviderAdapter {
  getProvider(): TextProvider {
    return OLLAMA_PROVIDER;
  }

  getModels(): TextModel[] {
    return OLLAMA_MODELS;
  }

  async getModelsAsync(config: TextModelConfig): Promise<TextModel[]> {
    const baseURL = config.connectionConfig.baseURL || OLLAMA_PROVIDER.defaultBaseURL;

    // Ollama 使用 OpenAI 兼容的 API，但模型列表需要通过 /api/tags 获取
    const tagsUrl = baseURL.replace('/v1', '') + '/api/tags';
    console.log('[OllamaAdapter] 获取模型列表:', tagsUrl);

    const response = await fetch(tagsUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json();

    if (!data.models || !Array.isArray(data.models)) {
      throw new Error('API 返回格式异常：models 字段不存在或不是数组');
    }

    // 将 Ollama 模型转换为 TextModel
    // 视觉支持信息从模型名称判断（这是 Ollama API 返回的真实数据）
    const dynamicModels: TextModel[] = data.models.map((model: any) => {
      const modelId = model.name || '';
      // 从真实获取的模型信息中判断是否支持视觉
      // 基于模型名称模式（这是从真实 API 返回的数据中获取的信息）
      const supportsVision =
        modelId.includes('vision') ||
        modelId.includes('llava') ||
        modelId.includes('qwen2.5-vision') ||
        modelId.includes('llama3.2-vision');

      return {
        id: modelId,
        name: modelId,
        description: model.details?.parent_model || modelId,
        providerId: 'ollama',
        capabilities: {
          supportsTools: false,
          supportsVision,
          maxContextLength: 128000,
        },
      };
    });

    console.log(`[OllamaAdapter] 成功获取 ${dynamicModels.length} 个真实模型`);

    // 只返回真实获取的模型，不合并静态模型
    return dynamicModels;
  }

  buildDefaultModel(modelId: string): TextModel {
    // 判断是否支持视觉
    const supportsVision =
      modelId.includes('vision') ||
      modelId.includes('llava') ||
      modelId.includes('qwen2.5-vision') ||
      modelId.includes('llama3.2-vision');

    return {
      id: modelId,
      name: modelId,
      description: modelId,
      providerId: 'ollama',
      capabilities: {
        supportsTools: false,
        supportsVision,
        maxContextLength: 128000,
      },
    };
  }

  async sendMessage(
    messages: Message[],
    config: TextModelConfig
  ): Promise<LLMResponse> {
    const client = new OpenAI({
      apiKey: 'ollama', // Ollama 不需要真实的 API Key，但 OpenAI SDK 需要
      baseURL: config.connectionConfig.baseURL || OLLAMA_PROVIDER.defaultBaseURL,
      dangerouslyAllowBrowser: true,
    });

    try {
      const response = await client.chat.completions.create({
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
        ...(config.llmParams || {}),
      });

      return {
        content: response.choices[0]?.message?.content || '',
        usage: response.usage
          ? {
            promptTokens: response.usage.prompt_tokens,
            completionTokens: response.usage.completion_tokens,
            totalTokens: response.usage.total_tokens,
          }
          : undefined,
      };
    } catch (error: any) {
      console.error('[OllamaAdapter] 发送消息失败:', error);
      throw new Error(`Ollama API 错误: ${error.message || '未知错误'}`);
    }
  }

  async sendMessageStream(
    messages: Message[],
    config: TextModelConfig,
    callbacks: StreamHandlers
  ): Promise<void> {
    const client = new OpenAI({
      apiKey: 'ollama', // Ollama 不需要真实的 API Key，但 OpenAI SDK 需要
      baseURL: config.connectionConfig.baseURL || OLLAMA_PROVIDER.defaultBaseURL,
      dangerouslyAllowBrowser: true,
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

