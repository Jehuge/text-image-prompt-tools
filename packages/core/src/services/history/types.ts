/**
 * 历史记录类型
 */
export type HistoryRecordType = 'prompt-optimize' | 'image-to-prompt';

/**
 * 提示词优化历史记录
 */
export interface PromptOptimizeRecord {
  id: string;
  type: 'prompt-optimize';
  originalPrompt: string;
  optimizedPrompt: string;
  modelKey: string;
  modelName?: string;
  style: string;
  timestamp: number;
}

/**
 * 图片反推历史记录
 */
export interface ImageToPromptRecord {
  id: string;
  type: 'image-to-prompt';
  imageUrl: string; // base64 或 URL
  prompt: string;
  modelKey: string;
  modelName?: string;
  timestamp: number;
}

/**
 * 历史记录联合类型
 */
export type HistoryRecord = PromptOptimizeRecord | ImageToPromptRecord;

/**
 * 历史记录管理器接口
 */
export interface IHistoryManager {
  addRecord(record: HistoryRecord): Promise<void>;
  getRecords(type?: HistoryRecordType): Promise<HistoryRecord[]>;
  getRecord(id: string): Promise<HistoryRecord | null>;
  deleteRecord(id: string): Promise<void>;
  clearRecords(type?: HistoryRecordType): Promise<void>;
}


