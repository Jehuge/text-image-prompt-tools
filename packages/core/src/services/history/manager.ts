import type { IHistoryManager, HistoryRecord, HistoryRecordType } from './types';
import { StorageAdapter } from '../storage/storage-adapter';
import { LocalStorageProvider } from '../storage/localStorageProvider';
import { compressImageToThumbnail, isImageTooLarge } from './image-compress';

const STORAGE_KEY = 'text-image-prompt-tools:history';
const MAX_RECORDS = 50; // 最多保存 50 条记录（减少以节省空间）

/**
 * 压缩图片 URL（如果是 base64，生成缩略图或移除数据）
 */
async function compressImageUrl(imageUrl: string): Promise<string> {
  if (!imageUrl.startsWith('data:image')) {
    // 如果不是 base64 图片，直接返回
    return imageUrl;
  }

  // 如果图片太大，尝试压缩成缩略图
  if (isImageTooLarge(imageUrl)) {
    const thumbnail = await compressImageToThumbnail(imageUrl);
    if (thumbnail) {
      return thumbnail;
    }
    // 如果压缩失败，返回标识符
    const match = imageUrl.match(/^data:image\/([^;]+);base64,/);
    const imageType = match ? match[1] : 'unknown';
    return `data:image/${imageType};base64,[compressed]`;
  }

  // 如果图片不大，直接返回原图
  return imageUrl;
}

/**
 * 历史记录管理器实现
 */
export class HistoryManager implements IHistoryManager {
  private storage: StorageAdapter;

  constructor() {
    const provider = new LocalStorageProvider();
    this.storage = new StorageAdapter(provider);
  }

  async addRecord(record: HistoryRecord): Promise<void> {
    try {
      // 如果是图片反推记录，压缩图片 URL
      if (record.type === 'image-to-prompt') {
        const compressedUrl = await compressImageUrl(record.imageUrl);
        record = {
          ...record,
          imageUrl: compressedUrl,
        };
      }

      await this.storage.updateData<HistoryRecord[]>(STORAGE_KEY, (records) => {
        const existing = records || [];
        // 将新记录添加到开头
        const updated = [record, ...existing];
        // 限制最大记录数
        return updated.slice(0, MAX_RECORDS);
      });
    } catch (error: any) {
      // 如果存储失败（可能是配额超限），尝试清理旧记录后重试
      if (error.message?.includes('quota') || error.message?.includes('QuotaExceeded') || error.name === 'QuotaExceededError') {
        console.warn('存储配额超限，尝试清理旧记录...');
        try {
          // 清理一半的旧记录
          const records = await this.storage.getData<HistoryRecord[]>(STORAGE_KEY, []);
          const cleaned = records.slice(0, Math.floor(MAX_RECORDS / 2));
          await this.storage.setData<HistoryRecord[]>(STORAGE_KEY, cleaned);
          
          // 重试添加记录（需要再次压缩图片）
          let recordToSave = record;
          if (record.type === 'image-to-prompt') {
            const compressedUrl = await compressImageUrl(record.imageUrl);
            recordToSave = {
              ...record,
              imageUrl: compressedUrl,
            };
          }
          const updated = [recordToSave, ...cleaned];
          await this.storage.setData<HistoryRecord[]>(STORAGE_KEY, updated.slice(0, MAX_RECORDS));
        } catch (retryError) {
          console.error('清理后仍然无法保存历史记录:', retryError);
          // 不抛出错误，避免影响主流程
        }
      } else {
        console.error('保存历史记录失败:', error);
        // 不抛出错误，避免影响主流程
      }
    }
  }

  async getRecords(type?: HistoryRecordType): Promise<HistoryRecord[]> {
    const records = await this.storage.getData<HistoryRecord[]>(STORAGE_KEY, []);
    if (type) {
      return records.filter((r) => r.type === type);
    }
    return records;
  }

  async getRecord(id: string): Promise<HistoryRecord | null> {
    const records = await this.storage.getData<HistoryRecord[]>(STORAGE_KEY, []);
    return records.find((r) => r.id === id) || null;
  }

  async deleteRecord(id: string): Promise<void> {
    await this.storage.updateData<HistoryRecord[]>(STORAGE_KEY, (records) => {
      const existing = records || [];
      return existing.filter((r) => r.id !== id);
    });
  }

  async clearRecords(type?: HistoryRecordType): Promise<void> {
    if (type) {
      await this.storage.updateData<HistoryRecord[]>(STORAGE_KEY, (records) => {
        const existing = records || [];
        return existing.filter((r) => r.type !== type);
      });
    } else {
      await this.storage.setData<HistoryRecord[]>(STORAGE_KEY, []);
    }
  }
}

