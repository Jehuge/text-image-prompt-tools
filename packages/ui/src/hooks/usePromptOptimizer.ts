import { useState } from 'react';
import type {
  OptimizationRequest,
  PromptStyle,
  HistoryManager,
  PromptOptimizeRecord,
} from '@text-image-prompt-tools/core';
import type { PromptService } from '@text-image-prompt-tools/core';

// 这里需要从 core 包导入服务，实际使用时需要初始化服务实例
// 为了演示，这里使用简化的实现
let promptServiceInstance: PromptService | null = null;
let historyManagerInstance: HistoryManager | null = null;

export function setPromptService(service: PromptService) {
  promptServiceInstance = service;
}

export function setHistoryManager(manager: HistoryManager) {
  historyManagerInstance = manager;
}

export function usePromptOptimizer() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [streaming, setStreaming] = useState(false);
  const [streamingResult, setStreamingResult] = useState<string>('');

  const optimize = async (
    prompt: string,
    modelKey: string,
    style: PromptStyle = 'general',
    templateId?: string
  ): Promise<string | null> => {
    if (!promptServiceInstance) {
      setError(new Error('提示词服务未初始化'));
      return null;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const request: OptimizationRequest = {
        targetPrompt: prompt,
        modelKey,
        style,
        templateId,
      };
      const response = await promptServiceInstance.optimizePrompt(request);
      setResult(response.optimizedPrompt);
      
      // 保存历史记录
      if (historyManagerInstance) {
        const record: PromptOptimizeRecord = {
          id: `prompt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          type: 'prompt-optimize',
          originalPrompt: prompt,
          optimizedPrompt: response.optimizedPrompt,
          modelKey,
          style,
          timestamp: Date.now(),
        };
        await historyManagerInstance.addRecord(record);
      }
      
      return response.optimizedPrompt;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const optimizeStream = async (
    prompt: string,
    modelKey: string,
    style: PromptStyle = 'general',
    templateId?: string
  ): Promise<string | null> => {
    if (!promptServiceInstance) {
      setError(new Error('提示词服务未初始化'));
      return null;
    }

    setStreaming(true);
    setLoading(true);
    setError(null);
    setResult(null);
    setStreamingResult('');

    try {
      const request: OptimizationRequest = {
        targetPrompt: prompt,
        modelKey,
        style,
        templateId,
      };

      await promptServiceInstance.optimizePromptStream(request, {
        onChunk: (chunk) => {
          setStreamingResult((prev) => prev + chunk);
        },
        onComplete: (content) => {
          setStreamingResult(content);
          setResult(content);
          setStreaming(false);
          setLoading(false);
          // 保存历史记录
          if (historyManagerInstance) {
            const record: PromptOptimizeRecord = {
              id: `prompt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              type: 'prompt-optimize',
              originalPrompt: prompt,
              optimizedPrompt: content,
              modelKey,
              style,
              timestamp: Date.now(),
            };
            void historyManagerInstance.addRecord(record);
          }
        },
        onError: (err) => {
          const error = err instanceof Error ? err : new Error(String(err));
          setError(error);
          setStreaming(false);
          setLoading(false);
        },
      });

      return null;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      return null;
    } finally {
      // loading/streaming already handled in callbacks; ensure no leak if early throw
      setStreaming(false);
      setLoading(false);
    }
  };

  return {
    optimize,
    optimizeStream,
    loading,
    error,
    result,
    streaming,
    streamingResult,
  };
}

