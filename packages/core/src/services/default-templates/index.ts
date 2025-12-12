/**
 * 默认模板统一导入和集成
 * 
 * 🎯 极简设计：模板自身包含完整信息，无需额外配置
 */

import type { Template, MessageTemplate } from './types';

// 导入所有模板
import { template as general_optimize } from './optimize/general-optimize';
import { template as output_format_optimize } from './optimize/output-format-optimize';
import { template as analytical_optimize } from './optimize/analytical-optimize';
import { template as context_iterate } from './iterate/context/context-iterate';
// 新增对齐的系统上下文模板：分析型/输出格式
import { template as context_analytical_optimize } from './optimize/context/context-analytical-optimize';
import { template as context_output_format_optimize } from './optimize/context/context-output-format-optimize';
// 新增消息优化模板（多轮对话模式专用）
import { template as context_message_optimize } from './optimize/context/context-message-optimize';
// 新增对齐的用户上下文模板（基础/专业/规划）
import { template as context_user_prompt_basic } from './user-optimize/context/context-user-prompt-basic';
import { template as context_user_prompt_professional_ctx } from './user-optimize/context/context-user-prompt-professional';
import { template as context_user_prompt_planning_ctx } from './user-optimize/context/context-user-prompt-planning';

import { template as iterate } from './iterate/iterate';

import { user_prompt_professional } from './user-optimize/user-prompt-professional';
import { user_prompt_basic } from './user-optimize/user-prompt-basic';
import { user_prompt_planning } from './user-optimize/user-prompt-planning';

// 图像优化模板（重构后的目录结构）
// 文生图
import { template as image_general_optimize } from './image-optimize/text2image/general-image-optimize';
import { template as image_chinese_optimize } from './image-optimize/text2image/chinese-model-optimize';
import { template as image_photography_optimize } from './image-optimize/text2image/photography-optimize';
import { template as image_creative_text2image } from './image-optimize/text2image/creative-text2image';
// 图生图
import { template as image2image_optimize } from './image-optimize/image2image/image2image-optimize';
import { template as image2image_design_text_edit_optimize } from './image-optimize/image2image/design-text-edit-optimize';
// 图像迭代
import { template as image_iterate_general } from './image-optimize/iterate/image-iterate-general';

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

// 简单的模板集合 - 模板自身已包含完整信息（id、name、language、type等）
export const ALL_TEMPLATES = {
  general_optimize,
  output_format_optimize,
  analytical_optimize,
  context_iterate,
  context_analytical_optimize,
  context_output_format_optimize,
  context_message_optimize,
  context_user_prompt_basic,
  context_user_prompt_professional_ctx,
  context_user_prompt_planning_ctx,
  user_prompt_professional,
  iterate,
  user_prompt_basic,
  user_prompt_planning,
  // 图像优化模板
  image_general_optimize,
  image_chinese_optimize,
  image_photography_optimize,
  image_creative_text2image,
  // 图生图模板
  image2image_optimize,
  image2image_design_text_edit_optimize,
  // 图像迭代模板
  image_iterate_general,
};

/**
 * 获取所有默认模板（已标准化格式）
 * 用于集成到模板管理器中
 */
export function getAllDefaultTemplates(): Template[] {
  return Object.values(ALL_TEMPLATES).map(normalizeTemplate);
}
