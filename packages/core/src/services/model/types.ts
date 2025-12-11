import type { TextModelConfig } from '../llm/types';

/**
 * 模型管理器接口
 */
export interface IModelManager {
  getModel(modelKey: string): Promise<TextModelConfig | null>;
  getAllModels(): Promise<TextModelConfig[]>;
  saveModel(config: TextModelConfig): Promise<void>;
  deleteModel(modelKey: string): Promise<void>;
}

// 重新导出 TextModelConfig 以便其他模块使用
export type { TextModelConfig } from '../llm/types';

