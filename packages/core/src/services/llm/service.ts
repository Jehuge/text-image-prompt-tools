import type {
  TextModelConfig,
  Message,
  LLMResponse,
  StreamHandlers,
} from './types';
import type { ITextAdapterRegistry } from './types';
import type { IModelManager } from '../model/types';

/**
 * LLM 服务接口
 */
export interface ILLMService {
  sendMessage(messages: Message[], provider: string): Promise<string>;
  sendMessageStructured(
    messages: Message[],
    provider: string
  ): Promise<LLMResponse>;
  sendMessageStream(
    messages: Message[],
    provider: string,
    callbacks: StreamHandlers
  ): Promise<void>;
}

/**
 * LLM 服务实现
 */
export class LLMService implements ILLMService {
  constructor(
    private registry: ITextAdapterRegistry,
    private modelManager: IModelManager
  ) {}

  /**
   * 发送消息（返回字符串）
   */
  async sendMessage(
    messages: Message[],
    provider: string
  ): Promise<string> {
    const response = await this.sendMessageStructured(messages, provider);
    return response.content;
  }

  /**
   * 发送消息（返回结构化响应）
   */
  async sendMessageStructured(
    messages: Message[],
    provider: string
  ): Promise<LLMResponse> {
    if (!provider) {
      throw new Error('模型提供商不能为空');
    }

    const modelConfig = await this.modelManager.getModel(provider);
    if (!modelConfig) {
      throw new Error(`模型 ${provider} 不存在`);
    }

    const adapter = this.registry.getAdapter(modelConfig.providerMeta.id);
    return await adapter.sendMessage(messages, modelConfig);
  }

  /**
   * 发送流式消息
   */
  async sendMessageStream(
    messages: Message[],
    provider: string,
    callbacks: StreamHandlers
  ): Promise<void> {
    if (!provider) {
      throw new Error('模型提供商不能为空');
    }

    const modelConfig = await this.modelManager.getModel(provider);
    if (!modelConfig) {
      throw new Error(`模型 ${provider} 不存在`);
    }

    const adapter = this.registry.getAdapter(modelConfig.providerMeta.id);
    await adapter.sendMessageStream(messages, modelConfig, callbacks);
  }
}

