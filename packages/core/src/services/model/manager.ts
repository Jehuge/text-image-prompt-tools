import type { IModelManager, TextModelConfig } from './types';

/**
 * 内存模型管理器（简单实现，实际应该使用持久化存储）
 */
export class MemoryModelManager implements IModelManager {
  private models: Map<string, TextModelConfig> = new Map();

  async getModel(modelKey: string): Promise<TextModelConfig | null> {
    return this.models.get(modelKey) || null;
  }

  async getAllModels(): Promise<TextModelConfig[]> {
    return Array.from(this.models.values());
  }

  async saveModel(config: TextModelConfig): Promise<void> {
    this.models.set(config.id, config);
  }

  async deleteModel(modelKey: string): Promise<void> {
    this.models.delete(modelKey);
  }
}

