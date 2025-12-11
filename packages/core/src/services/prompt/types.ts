/**
 * 提示词优化请求
 */
export interface OptimizationRequest {
  targetPrompt: string;
  modelKey: string;
  templateId?: string;
  style?: PromptStyle;
}

/**
 * 提示词优化风格
 */
export type PromptStyle =
  | 'general' // 通用优化
  | 'creative' // 创意优化
  | 'photography' // 摄影风格
  | 'design' // 设计风格
  | 'chinese-aesthetics'; // 中国美学

/**
 * 提示词优化响应
 */
export interface OptimizationResponse {
  optimizedPrompt: string;
  originalPrompt: string;
  style: PromptStyle;
}

