import { useState } from 'react';
import type {
  ImageToPromptRequest,
  HistoryManager,
  ImageToPromptRecord,
} from '@text-image-prompt-tools/core';
import type { ImageService } from '@text-image-prompt-tools/core';

// 这里需要从 core 包导入服务，实际使用时需要初始化服务实例
let imageServiceInstance: ImageService | null = null;
let historyManagerInstance: HistoryManager | null = null;

export function setImageService(service: ImageService) {
  imageServiceInstance = service;
}

export function setHistoryManager(manager: HistoryManager) {
  historyManagerInstance = manager;
}

export function useImageToPrompt() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [result, setResult] = useState<string | null>(null);

  const extract = async (
    imageUrl: string,
    modelKey: string
  ): Promise<string | null> => {
    if (!imageServiceInstance) {
      setError(new Error('图片服务未初始化'));
      return null;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const request: ImageToPromptRequest = {
        imageUrl,
        modelKey,
      };
      const response = await imageServiceInstance.imageToPrompt(request);
      setResult(response.prompt);
      
      // 保存历史记录
      if (historyManagerInstance) {
        const record: ImageToPromptRecord = {
          id: `image-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          type: 'image-to-prompt',
          imageUrl: imageUrl,
          prompt: response.prompt,
          modelKey,
          timestamp: Date.now(),
        };
        await historyManagerInstance.addRecord(record);
      }
      
      return response.prompt;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return {
    extract,
    loading,
    error,
    result,
  };
}

