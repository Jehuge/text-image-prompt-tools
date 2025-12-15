/**
 * 默认模板统一导入和集成
 * 
 * 🎯 极简设计：模板自身包含完整信息，无需额外配置
 */

import type { Template, MessageTemplate } from './types';

// 只导入文生图相关的模板
// 文生图提示词优化模板
import { template as image_general_optimize } from './image-optimize/text2image/general-image-optimize';
import { template as image_chinese_optimize } from './image-optimize/text2image/chinese-model-optimize';
import { template as image_photography_optimize } from './image-optimize/text2image/photography-optimize';
import { template as image_creative_text2image } from './image-optimize/text2image/creative-text2image';

/**
 * 将字符串格式的content转换为MessageTemplate[]格式
 */
function normalizeTemplate(template: any): Template {
  // 如果content已经是数组格式，直接返回
  if (Array.isArray(template.content)) {
    return template as Template;
  }
  
  // 如果content是字符串，转换为数组格式
  // 字符串格式的模板通常是一个完整的提示词，作为 user 消息
  if (typeof template.content === 'string') {
    return {
      ...template,
      content: [
        {
          role: 'user' as const,
          content: template.content,
        },
      ] as MessageTemplate[],
    };
  }
  
  return template as Template;
}

// 只保留文生图提示词优化模板
export const ALL_TEMPLATES = {
  // 文生图提示词优化模板
  image_general_optimize,
  image_chinese_optimize,
  image_photography_optimize,
  image_creative_text2image,
};

/**
 * 获取所有默认模板（已标准化格式）
 * 用于集成到模板管理器中
 */
export function getAllDefaultTemplates(): Template[] {
  return Object.values(ALL_TEMPLATES).map(normalizeTemplate);
}
