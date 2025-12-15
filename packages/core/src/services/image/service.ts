import type { ILLMService } from '../llm/service';
import type { IModelManager } from '../model/types';
import type { ITemplateManager } from '../template/types';
import type { Message } from '../llm/types';

/**
 * 图片反推提示词请求
 */
export interface ImageToPromptRequest {
  imageUrl: string; // base64 或 URL
  modelKey: string;
  templateId?: string;
  instructions?: string; // 用户额外指令
}

/**
 * 图片反推提示词响应
 */
export interface ImageToPromptResponse {
  prompt: string;
  imageUrl: string;
}

/**
 * 图片反推提示词服务接口
 */
export interface IImageService {
  imageToPrompt(request: ImageToPromptRequest): Promise<ImageToPromptResponse>;
}

/**
 * 图片反推提示词服务实现
 */
export class ImageService implements IImageService {
  constructor(
    private llmService: ILLMService,
    private modelManager: IModelManager,
    private templateManager: ITemplateManager
  ) {}

  async imageToPrompt(
    request: ImageToPromptRequest
  ): Promise<ImageToPromptResponse> {
    if (!request.imageUrl) {
      throw new Error('图片 URL 不能为空');
    }

    const modelConfig = await this.modelManager.getModel(request.modelKey);
    if (!modelConfig) {
      throw new Error(`模型 ${request.modelKey} 不存在`);
    }

    // 检查模型是否支持视觉
    if (!modelConfig.modelMeta.capabilities.supportsVision) {
      throw new Error(`模型 ${request.modelKey} 不支持视觉功能`);
    }

    // 获取模板
    const templateId = request.templateId || 'image2prompt-general';
    const template = await this.templateManager.getTemplate(templateId);

    if (!template) {
      throw new Error(`模板 ${templateId} 不存在`);
    }

    // 构建多模态消息
    const messages: Message[] = template.content.map((msg) => {
      if (msg.role === 'user' && msg.content.includes('[图像]')) {
        // 替换 [图像] 为实际图像内容
        const instructionText = request.instructions?.trim();
        const withImage = msg.content.replace('[图像]', '请从以下图像中提取提示词：');
        const withInstructionPlaceholder = withImage.includes('{{instructions}}')
          ? withImage.replace('{{instructions}}', instructionText || '（无额外指令）')
          : withImage;
        const combinedText =
          instructionText && !withImage.includes('{{instructions}}')
            ? `${withInstructionPlaceholder}\n用户额外指令：${instructionText}`
            : withInstructionPlaceholder;
        return {
          role: 'user',
          content: [
            {
              type: 'text',
              text: combinedText,
            },
            {
              type: 'image_url',
              image_url: {
                url: request.imageUrl,
              },
            },
          ],
        };
      }
      return {
        role: msg.role,
        content: msg.content,
      };
    });

    // 调用 LLM 提取提示词
    const prompt = await this.llmService.sendMessage(messages, request.modelKey);

    return {
      prompt: prompt.trim(),
      imageUrl: request.imageUrl,
    };
  }
}

