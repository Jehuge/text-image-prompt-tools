import Anthropic from '@anthropic-ai/sdk';
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
 * Anthropic Provider 定义
 */
const ANTHROPIC_PROVIDER: TextProvider = {
  id: 'anthropic',
  name: 'Anthropic',
  description: 'Anthropic Claude models',
  requiresApiKey: true,
  defaultBaseURL: 'https://api.anthropic.com',
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
 * Anthropic 静态模型列表
 */
const ANTHROPIC_MODELS: TextModel[] = [
  {
    id: 'claude-3-5-sonnet-20241022',
    name: 'Claude 3.5 Sonnet',
    description: 'Anthropic Claude 3.5 Sonnet',
    providerId: 'anthropic',
    capabilities: {
      supportsTools: true,
      supportsVision: true,
      maxContextLength: 200000,
    },
  },
  {
    id: 'claude-3-5-haiku-20241022',
    name: 'Claude 3.5 Haiku',
    description: 'Anthropic Claude 3.5 Haiku',
    providerId: 'anthropic',
    capabilities: {
      supportsTools: true,
      supportsVision: true,
      maxContextLength: 200000,
    },
  },
  {
    id: 'claude-3-opus-20240229',
    name: 'Claude 3 Opus',
    description: 'Anthropic Claude 3 Opus',
    providerId: 'anthropic',
    capabilities: {
      supportsTools: true,
      supportsVision: true,
      maxContextLength: 200000,
    },
  },
  {
    id: 'claude-3-sonnet-20240229',
    name: 'Claude 3 Sonnet',
    description: 'Anthropic Claude 3 Sonnet',
    providerId: 'anthropic',
    capabilities: {
      supportsTools: true,
      supportsVision: true,
      maxContextLength: 200000,
    },
  },
  {
    id: 'claude-3-haiku-20240307',
    name: 'Claude 3 Haiku',
    description: 'Anthropic Claude 3 Haiku',
    providerId: 'anthropic',
    capabilities: {
      supportsTools: true,
      supportsVision: true,
      maxContextLength: 200000,
    },
  },
];

/**
 * Anthropic Adapter 实现
 */
export class AnthropicAdapter implements ITextProviderAdapter {
  getProvider(): TextProvider {
    return ANTHROPIC_PROVIDER;
  }

  getModels(): TextModel[] {
    return ANTHROPIC_MODELS;
  }

  async getModelsAsync(config: TextModelConfig): Promise<TextModel[]> {
    // Anthropic API 不提供 models.list() 端点
    // 由于无法从真实 API 获取模型列表，返回空数组（不返回虚假的静态模型）
    console.warn('[AnthropicAdapter] Anthropic API 不提供模型列表端点，无法获取真实模型列表');
    throw new Error('Anthropic API 不支持动态获取模型列表，请手动配置模型');
  }

  buildDefaultModel(modelId: string): TextModel {
    return {
      id: modelId,
      name: modelId,
      description: modelId,
      providerId: 'anthropic',
      capabilities: {
        supportsTools: true,
        supportsVision: true,
        maxContextLength: 200000,
      },
    };
  }

  async sendMessage(
    messages: Message[],
    config: TextModelConfig
  ): Promise<LLMResponse> {
    const client = new Anthropic({
      apiKey: config.connectionConfig.apiKey,
      baseURL: config.connectionConfig.baseURL || ANTHROPIC_PROVIDER.defaultBaseURL,
    });

    // 转换消息格式
    const systemMessage = messages.find((m) => m.role === 'system');
    const conversationMessages = messages.filter((m) => m.role !== 'system');

    const anthropicMessages = conversationMessages.map((msg) => {
      if (typeof msg.content === 'string') {
        return {
          role: msg.role === 'assistant' ? 'assistant' : 'user',
          content: msg.content,
        };
      }
      // 处理多模态内容
      const contents: any[] = [];
      for (const content of msg.content) {
        if (content.type === 'text') {
          contents.push({ type: 'text', text: content.text });
        } else if (content.type === 'image_url' && content.image_url) {
          contents.push({
            type: 'image',
            source: {
              type: 'base64',
              media_type: 'image/jpeg',
              data: content.image_url.url.split(',')[1] || content.image_url.url,
            },
          });
        }
      }
      return {
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: contents,
      };
    });

    const response = await client.messages.create({
      model: config.modelMeta.id,
      max_tokens: 4096,
      system: systemMessage?.content as string || undefined,
      messages: anthropicMessages as any,
      ...(config.llmParams || {}),
    });

    const content = response.content[0];
    if (!content || content.type !== 'text') {
      throw new Error('No text response from Anthropic');
    }

    return {
      content: content.text,
      usage: response.usage
        ? {
            promptTokens: response.usage.input_tokens,
            completionTokens: response.usage.output_tokens,
            totalTokens: response.usage.input_tokens + response.usage.output_tokens,
          }
        : undefined,
    };
  }

  async sendMessageStream(
    messages: Message[],
    config: TextModelConfig,
    callbacks: StreamHandlers
  ): Promise<void> {
    const client = new Anthropic({
      apiKey: config.connectionConfig.apiKey,
      baseURL: config.connectionConfig.baseURL || ANTHROPIC_PROVIDER.defaultBaseURL,
    });

    // 转换消息格式
    const systemMessage = messages.find((m) => m.role === 'system');
    const conversationMessages = messages.filter((m) => m.role !== 'system');

    const anthropicMessages = conversationMessages.map((msg) => {
      if (typeof msg.content === 'string') {
        return {
          role: msg.role === 'assistant' ? 'assistant' : 'user',
          content: msg.content,
        };
      }
      const contents: any[] = [];
      for (const content of msg.content) {
        if (content.type === 'text') {
          contents.push({ type: 'text', text: content.text });
        } else if (content.type === 'image_url' && content.image_url) {
          contents.push({
            type: 'image',
            source: {
              type: 'base64',
              media_type: 'image/jpeg',
              data: content.image_url.url.split(',')[1] || content.image_url.url,
            },
          });
        }
      }
      return {
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: contents,
      };
    });

    try {
      const stream = await client.messages.stream({
        model: config.modelMeta.id,
        max_tokens: 4096,
        system: systemMessage?.content as string || undefined,
        messages: anthropicMessages as any,
        ...(config.llmParams || {}),
      });

      let fullContent = '';
      for await (const event of stream) {
        if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
          const text = event.delta.text;
          if (text) {
            fullContent += text;
            callbacks.onChunk?.(text);
          }
        }
      }
      callbacks.onComplete?.(fullContent);
    } catch (error) {
      callbacks.onError?.(error as Error);
      throw error;
    }
  }
}

