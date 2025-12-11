import type { IModelManager, TextModelConfig } from './types';
import { StorageAdapter } from '../storage/storage-adapter';
import { LocalStorageProvider } from '../storage/localStorageProvider';

const STORAGE_KEY = 'text-image-prompt-tools:models';

/**
 * 基于 localStorage 的模型管理器
 */
export class LocalStorageModelManager implements IModelManager {
  private storage: StorageAdapter;

  constructor() {
    const provider = new LocalStorageProvider();
    this.storage = new StorageAdapter(provider);
  }

  async getModel(modelKey: string): Promise<TextModelConfig | null> {
    const models = await this.storage.getData<TextModelConfig[]>(STORAGE_KEY, []);
    return models.find((m) => m.id === modelKey) || null;
  }

  async getAllModels(): Promise<TextModelConfig[]> {
    return await this.storage.getData<TextModelConfig[]>(STORAGE_KEY, []);
  }

  async saveModel(config: TextModelConfig): Promise<void> {
    await this.storage.updateData<TextModelConfig[]>(STORAGE_KEY, (models) => {
      const existing = models || [];
      const index = existing.findIndex((m) => m.id === config.id);
      if (index >= 0) {
        existing[index] = config;
        return existing;
      }
      return [...existing, config];
    });
  }

  async deleteModel(modelKey: string): Promise<void> {
    await this.storage.updateData<TextModelConfig[]>(STORAGE_KEY, (models) => {
      const existing = models || [];
      return existing.filter((m) => m.id !== modelKey);
    });
  }
}


