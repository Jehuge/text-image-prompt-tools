import { GoogleGenerativeAI } from '@google/generative-ai';
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
 * Gemini Provider 定义
 */
const GEMINI_PROVIDER: TextProvider = {
  id: 'gemini',
  name: 'Google Gemini',
  description: 'Google Gemini API',
  requiresApiKey: true,
  defaultBaseURL: 'https://generativelanguage.googleapis.com',
  supportsDynamicModels: true,
  connectionSchema: {
    required: ['apiKey'],
    optional: [],
    fieldTypes: {
      apiKey: 'string',
    },
  },
};

/**
 * Gemini 静态模型列表
 */
const GEMINI_MODELS: TextModel[] = [
  {
    id: 'gemini-2.0-flash-exp',
    name: 'Gemini 2.0 Flash',
    description: 'Google Gemini 2.0 Flash (Experimental)',
    providerId: 'gemini',
    capabilities: {
      supportsTools: true,
      supportsVision: true,
      maxContextLength: 1000000,
    },
  },
  {
    id: 'gemini-1.5-pro',
    name: 'Gemini 1.5 Pro',
    description: 'Google Gemini 1.5 Pro',
    providerId: 'gemini',
    capabilities: {
      supportsTools: true,
      supportsVision: true,
      maxContextLength: 2000000,
    },
  },
  {
    id: 'gemini-1.5-flash',
    name: 'Gemini 1.5 Flash',
    description: 'Google Gemini 1.5 Flash',
    providerId: 'gemini',
    capabilities: {
      supportsTools: true,
      supportsVision: true,
      maxContextLength: 1000000,
    },
  },
  {
    id: 'gemini-1.5-flash-8b',
    name: 'Gemini 1.5 Flash 8B',
    description: 'Google Gemini 1.5 Flash 8B',
    providerId: 'gemini',
    capabilities: {
      supportsTools: true,
      supportsVision: true,
      maxContextLength: 1000000,
    },
  },
];

/**
 * Gemini Adapter 实现
 */
export class GeminiAdapter implements ITextProviderAdapter {
  getProvider(): TextProvider {
    return GEMINI_PROVIDER;
  }

  getModels(): TextModel[] {
    return GEMINI_MODELS;
  }

  async getModelsAsync(config: TextModelConfig): Promise<TextModel[]> {
    try {
      const apiKey = config.connectionConfig.apiKey || '';
      const baseURL = config.connectionConfig.baseURL || GEMINI_PROVIDER.defaultBaseURL;
      
      // 使用 REST API 直接调用 ListModels 端点
      const url = `${baseURL}/v1beta/models?key=${apiKey}`;
      
      console.log('[GeminiAdapter] 调用 ListModels API:', url.replace(apiKey, '***'));
      
      const response = await fetch(url, {
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

      // 过滤出支持 generateContent 的模型
      // 从真实 API 返回的数据中获取模型信息和能力
      const dynamicModels: TextModel[] = data.models
        .filter((model: any) => {
          // 只包含支持 generateContent 的模型
          return model.supportedGenerationMethods?.includes('generateContent');
        })
        .map((model: any) => {
          const modelId = model.name?.replace('models/', '') || model.name || '';
          // Gemini 模型从 API 返回的信息中判断视觉支持
          // 根据 Gemini API 文档，所有支持 generateContent 的模型都支持视觉
          return {
            id: modelId,
            name: model.displayName || modelId,
            description: model.description || '',
            providerId: 'gemini',
            capabilities: {
              supportsTools: true,
              supportsVision: true, // Gemini API 返回的模型都支持视觉
              maxContextLength: model.inputTokenLimit || 1000000,
            },
          };
        });

      console.log(`[GeminiAdapter] 从真实 API 获取 ${dynamicModels.length} 个模型`);

      // 只返回真实获取的模型，不合并静态模型
      return dynamicModels;
    } catch (error) {
      console.error('[GeminiAdapter] 动态获取模型失败:', error);
      // 获取失败时抛出错误，不返回虚假的静态模型
      throw error;
    }
  }

  buildDefaultModel(modelId: string): TextModel {
    return {
      id: modelId,
      name: modelId,
      description: modelId,
      providerId: 'gemini',
      capabilities: {
        supportsTools: true,
        supportsVision: true,
        maxContextLength: 1000000,
      },
    };
  }

  async sendMessage(
    messages: Message[],
    config: TextModelConfig
  ): Promise<LLMResponse> {
    const client = new GoogleGenerativeAI(
      config.connectionConfig.apiKey || ''
    );

    const model = client.getGenerativeModel({
      model: config.modelMeta.id,
    });

    // 转换消息格式
    const geminiMessages = messages.map((msg) => {
      if (typeof msg.content === 'string') {
        return {
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.content }],
        };
      }
      // 处理多模态内容
      const parts: any[] = [];
      for (const content of msg.content) {
        if (content.type === 'text') {
          parts.push({ text: content.text });
        } else if (content.type === 'image_url' && content.image_url) {
          parts.push({
            inlineData: {
              data: content.image_url.url.split(',')[1] || content.image_url.url,
              mimeType: 'image/jpeg',
            },
          });
        }
      }
      return {
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts,
      };
    });

    const result = await model.generateContent({
      contents: geminiMessages as any,
    });

    const response = result.response;
    const text = response.text();

    return {
      content: text,
      usage: {
        totalTokens: response.usageMetadata?.totalTokenCount,
      },
    };
  }

  async sendMessageStream(
    messages: Message[],
    config: TextModelConfig,
    callbacks: StreamHandlers
  ): Promise<void> {
    const client = new GoogleGenerativeAI(
      config.connectionConfig.apiKey || ''
    );

    const model = client.getGenerativeModel({
      model: config.modelMeta.id,
    });

    // 转换消息格式
    const geminiMessages = messages.map((msg) => {
      if (typeof msg.content === 'string') {
        return {
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.content }],
        };
      }
      const parts: any[] = [];
      for (const content of msg.content) {
        if (content.type === 'text') {
          parts.push({ text: content.text });
        } else if (content.type === 'image_url' && content.image_url) {
          parts.push({
            inlineData: {
              data: content.image_url.url.split(',')[1] || content.image_url.url,
              mimeType: 'image/jpeg',
            },
          });
        }
      }
      return {
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts,
      };
    });

    try {
      const result = await model.generateContentStream({
        contents: geminiMessages as any,
      });

      let fullContent = '';
      for await (const chunk of result.stream) {
        const text = chunk.text();
        if (text) {
          fullContent += text;
          callbacks.onChunk?.(text);
        }
      }
      callbacks.onComplete?.(fullContent);
    } catch (error) {
      callbacks.onError?.(error as Error);
      throw error;
    }
  }
}

