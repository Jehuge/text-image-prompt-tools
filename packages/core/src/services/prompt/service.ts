import type {
  OptimizationRequest,
  OptimizationResponse,
  PromptStyle,
} from './types';
import type { ILLMService } from '../llm/service';
import type { IModelManager } from '../model/types';
import type { ITemplateManager } from '../template/types';
import { getDefaultTemplate } from '../template/default-templates/index';

/**
 * 提示词优化服务接口
 */
export interface IPromptService {
  optimizePrompt(request: OptimizationRequest): Promise<OptimizationResponse>;
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
    const messages = template.content.map((msg) => ({
      role: msg.role,
      content: msg.content.replace('{{prompt}}', request.targetPrompt),
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
}

/**
 * 获取默认模板 ID
 */
function getDefaultTemplateId(style: PromptStyle): string {
  const templateMap: Record<PromptStyle, string> = {
    general: 'text2image-general-optimize',
    creative: 'text2image-creative-optimize',
    photography: 'text2image-photography-optimize',
    design: 'text2image-design-optimize',
    'chinese-aesthetics': 'text2image-chinese-optimize',
  };
  return templateMap[style] || templateMap.general;
}

