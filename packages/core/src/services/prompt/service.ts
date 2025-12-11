import type {
  OptimizationRequest,
  OptimizationResponse,
  PromptStyle,
} from './types';
import type { ILLMService } from '../llm/service';
import type { IModelManager } from '../model/types';
import type { ITemplateManager } from '../template/types';
import type { StreamHandlers } from '../llm/types';
import { getDefaultTemplate } from '../template/default-templates/index';

/**
 * 提示词优化服务接口
 */
export interface IPromptService {
  optimizePrompt(request: OptimizationRequest): Promise<OptimizationResponse>;
  optimizePromptStream(
    request: OptimizationRequest,
    handlers: StreamHandlers
  ): Promise<void>;
}

/**
 * 提示词优化服务实现
 */
export class PromptService implements IPromptService {
  constructor(
    private llmService: ILLMService,
    private modelManager: IModelManager,
    private templateManager: ITemplateManager
  ) {}

  async optimizePrompt(
    request: OptimizationRequest
  ): Promise<OptimizationResponse> {
    if (!request.targetPrompt) {
      throw new Error('目标提示词不能为空');
    }

    const modelConfig = await this.modelManager.getModel(request.modelKey);
    if (!modelConfig) {
      throw new Error(`模型 ${request.modelKey} 不存在`);
    }

    // 获取模板
    const templateId =
      request.templateId ||
      getDefaultTemplateId(request.style || 'general');
    const template = await this.templateManager.getTemplate(templateId);

    if (!template) {
      throw new Error(`模板 ${templateId} 不存在`);
    }

    // 构建消息
    const placeholderRegex = /{{\s*(originalPrompt|prompt)\s*}}/g;
    const messages = template.content.map((msg) => ({
      role: msg.role,
      content: msg.content.replace(placeholderRegex, request.targetPrompt),
    }));

    // 调用 LLM 优化
    const optimizedPrompt = await this.llmService.sendMessage(
      messages,
      request.modelKey
    );

    return {
      optimizedPrompt: optimizedPrompt.trim(),
      originalPrompt: request.targetPrompt,
      style: request.style || 'general',
    };
  }

  /**
   * 流式优化提示词
   */
  async optimizePromptStream(
    request: OptimizationRequest,
    handlers: StreamHandlers
  ): Promise<void> {
    if (!request.targetPrompt) {
      throw new Error('目标提示词不能为空');
    }

    const modelConfig = await this.modelManager.getModel(request.modelKey);
    if (!modelConfig) {
      throw new Error(`模型 ${request.modelKey} 不存在`);
    }

    const templateId =
      request.templateId || getDefaultTemplateId(request.style || 'general');
    const template = await this.templateManager.getTemplate(templateId);

    if (!template) {
      throw new Error(`模板 ${templateId} 不存在`);
    }

    const placeholderRegex = /{{\s*(originalPrompt|prompt)\s*}}/g;
    const messages = template.content.map((msg) => ({
      role: msg.role,
      content: msg.content.replace(placeholderRegex, request.targetPrompt),
    }));

    await this.llmService.sendMessageStream(messages, request.modelKey, {
      onChunk: handlers.onChunk,
      onComplete: handlers.onComplete,
      onError: handlers.onError,
    });
  }
}

/**
 * 获取默认模板 ID
 */
function getDefaultTemplateId(style: PromptStyle): string {
  const templateMap: Record<PromptStyle, string> = {
    general: 'image-general-optimize',
    creative: 'image-creative-text2image',
    photography: 'image-photography-optimize',
    design: 'image-general-optimize',
    'chinese-aesthetics': 'image-chinese-optimize',
  };
  return templateMap[style] || templateMap.general;
}

