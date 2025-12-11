import type { Template } from '../types';
import { text2imageGeneralOptimize } from './text2image-general-optimize';
import { text2imageCreativeOptimize } from './text2image-creative-optimize';
import { image2promptGeneral } from './image2prompt-general';
import { getAllDefaultTemplates } from '../../default-templates/index';

/**
 * 获取所有默认模板
 * 包括原有的模板和 default-templates 目录中的所有模板
 */
export function getDefaultTemplate(): Template[] {
  // 原有的模板
  const originalTemplates: Template[] = [
    text2imageGeneralOptimize,
    text2imageCreativeOptimize,
    image2promptGeneral,
  ];
  
  // 从 default-templates 目录获取所有模板
  const additionalTemplates = getAllDefaultTemplates();
  
  // 合并所有模板，避免重复（基于 id）
  const templateMap = new Map<string, Template>();
  
  // 先添加原有模板
  originalTemplates.forEach(template => {
    templateMap.set(template.id, template);
  });
  
  // 再添加新模板（如果 id 不存在）
  additionalTemplates.forEach(template => {
    if (!templateMap.has(template.id)) {
      templateMap.set(template.id, template);
    }
  });
  
  return Array.from(templateMap.values());
}

