import type { Template } from '../types';
import { text2imageGeneralOptimize } from './text2image-general-optimize';
import { text2imageCreativeOptimize } from './text2image-creative-optimize';
import { image2promptGeneral } from './image2prompt-general';

/**
 * 获取所有默认模板
 */
export function getDefaultTemplate(): Template[] {
  return [
    text2imageGeneralOptimize,
    text2imageCreativeOptimize,
    image2promptGeneral,
  ];
}

