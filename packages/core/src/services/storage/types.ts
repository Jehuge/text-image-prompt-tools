/**
 * 存储提供器接口
 */
export interface IStorageProvider {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
  clear(): Promise<void>;
}

/**
 * 存储适配器
 */
export class StorageAdapter {
  constructor(private provider: IStorageProvider) {}

  async getData<T>(key: string, defaultValue: T): Promise<T> {
    try {
      const data = await this.provider.getItem(key);
      if (!data) {
        return defaultValue;
      }
      return JSON.parse(data) as T;
    } catch (error) {
      console.warn(`Failed to get data for key ${key}:`, error);
      return defaultValue;
    }
  }

  async setData<T>(key: string, value: T): Promise<void> {
    try {
      await this.provider.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(`Failed to set data for key ${key}:`, error);
      throw error;
    }
  }

  async updateData<T>(
    key: string,
    updater: (current: T | null) => T
  ): Promise<void> {
    const current = await this.getData<T>(key, null as T);
    const updated = updater(current);
    await this.setData(key, updated);
  }

  async removeData(key: string): Promise<void> {
    await this.provider.removeItem(key);
  }
}

