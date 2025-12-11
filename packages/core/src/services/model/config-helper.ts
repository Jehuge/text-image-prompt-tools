import type { TextModelConfig, TextProvider, TextModel } from '../llm/types';

/**
 * 创建模型配置的辅助函数
 */
export function createModelConfig(
  provider: TextProvider,
  model: TextModel,
  connectionConfig: {
    apiKey?: string;
    baseURL?: string;
    [key: string]: unknown;
  },
  options?: {
    name?: string;
    enabled?: boolean;
    llmParams?: Record<string, unknown>;
  }
): TextModelConfig {
  return {
    id: `${provider.id}-${model.id}`,
    name: options?.name || `${provider.name} ${model.name}`,
    enabled: options?.enabled !== false,
    providerMeta: provider,
    modelMeta: model,
    connectionConfig,
    llmParams: options?.llmParams,
  };
}

/**
 * 从环境变量创建默认模型配置
 */
export function createDefaultModelConfigs(): TextModelConfig[] {
  const configs: TextModelConfig[] = [];

  // OpenAI 配置
  const openaiApiKey = typeof window !== 'undefined' 
    ? (window as any).__OPENAI_API_KEY__ 
    : process.env.VITE_OPENAI_API_KEY;
  
  if (openaiApiKey) {
    // 这里需要从适配器获取 provider 和 model，暂时返回空数组
    // 实际使用时应该在运行时从适配器获取
  }

  return configs;
}



