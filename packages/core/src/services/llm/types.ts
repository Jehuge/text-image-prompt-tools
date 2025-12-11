/**
 * LLM 服务核心类型定义
 * 采用 Provider-Adapter-Registry 三层架构
 */

/**
 * 连接参数的类型安全定义
 */
export interface ConnectionSchema {
  required: string[];
  optional: string[];
  fieldTypes: Record<string, 'string' | 'number' | 'boolean'>;
}

/**
 * 文本模型服务提供商静态定义
 */
export interface TextProvider {
  readonly id: string;
  readonly name: string;
  readonly description?: string;
  readonly requiresApiKey: boolean;
  readonly defaultBaseURL: string;
  readonly supportsDynamicModels: boolean;
  readonly connectionSchema?: ConnectionSchema;
}

/**
 * 文本模型静态定义
 */
export interface TextModel {
  readonly id: string;
  readonly name: string;
  readonly description?: string;
  readonly providerId: string;
  readonly capabilities: {
    supportsTools: boolean;
    supportsVision?: boolean;
    supportsReasoning?: boolean;
    maxContextLength?: number;
  };
}

/**
 * 用户文本模型配置
 */
export interface TextModelConfig {
  id: string;
  name: string;
  enabled: boolean;
  providerMeta: TextProvider;
  modelMeta: TextModel;
  connectionConfig: {
    apiKey?: string;
    baseURL?: string;
    [key: string]: unknown;
  };
  llmParams?: Record<string, unknown>;
}

/**
 * LLM 消息格式
 */
export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string | Array<{
    type: 'text' | 'image_url';
    text?: string;
    image_url?: {
      url: string;
    };
  }>;
}

/**
 * LLM 响应
 */
export interface LLMResponse {
  content: string;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
}

/**
 * 流式响应处理器
 */
export interface StreamHandlers {
  onChunk?: (chunk: string) => void;
  onComplete?: (content: string) => void;
  onError?: (error: Error) => void;
}

/**
 * 文本模型 Provider 适配器接口
 */
export interface ITextProviderAdapter {
  getProvider(): TextProvider;
  getModels(): TextModel[];
  getModelsAsync?(config: TextModelConfig): Promise<TextModel[]>;
  sendMessage(messages: Message[], config: TextModelConfig): Promise<LLMResponse>;
  sendMessageStream(
    messages: Message[],
    config: TextModelConfig,
    callbacks: StreamHandlers
  ): Promise<void>;
  buildDefaultModel(modelId: string): TextModel;
}

/**
 * 文本模型 Adapter 注册表接口
 */
export interface ITextAdapterRegistry {
  register(adapter: ITextProviderAdapter): void;
  getAdapter(providerId: string): ITextProviderAdapter;
  getProvider(providerId: string): TextProvider | undefined;
  getStaticModels(providerId: string): TextModel[];
  getModels(providerId: string, config?: TextModelConfig): Promise<TextModel[]>;
}

