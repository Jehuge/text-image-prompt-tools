import type { IStorageProvider } from './types';

/**
 * 基于 localStorage 的存储提供器
 */
export class LocalStorageProvider implements IStorageProvider {
  private getStorage(): Storage | null {
    if (typeof window === 'undefined' || !window.localStorage) {
      return null;
    }
    return window.localStorage;
  }

  async getItem(key: string): Promise<string | null> {
    const storage = this.getStorage();
    if (!storage) {
      return null;
    }
    try {
      return storage.getItem(key);
    } catch (error) {
      console.warn(`Failed to get item ${key} from localStorage:`, error);
      return null;
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    const storage = this.getStorage();
    if (!storage) {
      return;
    }
    try {
      storage.setItem(key, value);
    } catch (error) {
      console.error(`Failed to set item ${key} to localStorage:`, error);
      throw error;
    }
  }

  async removeItem(key: string): Promise<void> {
    const storage = this.getStorage();
    if (!storage) {
      return;
    }
    try {
      storage.removeItem(key);
    } catch (error) {
      console.warn(`Failed to remove item ${key} from localStorage:`, error);
    }
  }

  async clear(): Promise<void> {
    const storage = this.getStorage();
    if (!storage) {
      return;
    }
    try {
      storage.clear();
    } catch (error) {
      console.warn('Failed to clear localStorage:', error);
    }
  }
}

