import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useImageToPrompt } from '../hooks/useImageToPrompt';
import { ModelSelector } from './ModelSelector';
import { TemplateSelector } from './TemplateSelector';
import type { ImageService, HistoryManager } from '@text-image-prompt-tools/core';

export interface TemplateOption {
  id: string;
  name: string;
  language: 'zh' | 'en';
}

export interface ImageToPromptProps {
  defaultModel?: string;
  defaultTemplateId?: string;
  onExtracted?: (prompt: string) => void;
  availableModels?: Array<{ id: string; name: string }>;
  availableTemplates?: TemplateOption[];
  templateManager?: any; // ITemplateManager 类型，但为了避免循环依赖使用 any
  imageService?: ImageService;
  historyManager?: HistoryManager;
}

const COMMON_RATIOS = [
  { label: '1:1', ratio: 1 / 1 },
  { label: '2:3', ratio: 2 / 3 },
  { label: '3:2', ratio: 3 / 2 },
  { label: '3:4', ratio: 3 / 4 },
  { label: '4:3', ratio: 4 / 3 },
  { label: '16:9', ratio: 16 / 9 },
  { label: '9:16', ratio: 9 / 16 },
  { label: '16:10', ratio: 16 / 10 },
  { label: '10:16', ratio: 10 / 16 },
  { label: '21:9', ratio: 21 / 9 },
];

const getClosestRatio = (width: number, height: number): string => {
  const currentRatio = width / height;
  let closest = COMMON_RATIOS[0];
  let minDiff = Math.abs(currentRatio - closest.ratio);

  for (let i = 1; i < COMMON_RATIOS.length; i++) {
    const diff = Math.abs(currentRatio - COMMON_RATIOS[i].ratio);
    if (diff < minDiff) {
      minDiff = diff;
      closest = COMMON_RATIOS[i];
    }
  }

  return closest.label;
};

export const ImageToPrompt: React.FC<ImageToPromptProps> = ({
  defaultModel = '',
  defaultTemplateId,
  onExtracted,
  availableModels = [],
  availableTemplates = [],
  templateManager,
  imageService,
  historyManager,
}) => {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [instructions, setInstructions] = useState('');
  const pasteAreaRef = useRef<HTMLTextAreaElement>(null);
  // 初始化时从 localStorage 恢复模型选择
  const [model, setModel] = useState(() => {
    // 优先从 localStorage 恢复，如果没有则使用 defaultModel
    try {
      const saved = localStorage.getItem('selectedImageModel');
      return saved || defaultModel;
    } catch (e) {
      return defaultModel;
    }
  });
  const [templateId, setTemplateId] = useState<string | undefined>(defaultTemplateId);
  const [persistedResult, setPersistedResult] = useState<string>('');
  const [resolution, setResolution] = useState<{ width: number; height: number } | null>(null);
  const [aspectRatio, setAspectRatio] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { extract, loading, error, result } = useImageToPrompt(imageService, historyManager);

  const templateStorageKey = 'image-prompt-template';
  const imagePreviewStorageKey = 'image-prompt-preview';
  const resultStorageKey = 'image-prompt-result';
  const instructionStorageKey = 'image-prompt-instructions';

  // 过滤中文模板
  const chineseTemplates = availableTemplates.filter(t => t.language === 'zh');

  // 加载模板选择
  useEffect(() => {
    try {
      const saved = localStorage.getItem(templateStorageKey);
      if (saved) {
        setTemplateId(saved);
      }
    } catch (e) {
      console.warn('加载反推模板选择失败', e);
    }
  }, []);

  // 保存模板选择
  useEffect(() => {
    try {
      if (templateId) {
        localStorage.setItem(templateStorageKey, templateId);
      } else {
        localStorage.removeItem(templateStorageKey);
      }
    } catch (e) {
      console.warn('保存反推模板选择失败', e);
    }
  }, [templateId]);

  // 加载图片预览和结果
  useEffect(() => {
    try {
      const savedPreview = localStorage.getItem(imagePreviewStorageKey);
      if (savedPreview) {
        setImagePreview(savedPreview);

        // 如果有预览图，重新分析一次分辨率（因为 localStorage 没存分辨率）
        const img = new Image();
        img.onload = () => {
          const width = img.width;
          const height = img.height;
          setResolution({ width, height });
          setAspectRatio(getClosestRatio(width, height));
        };
        img.src = savedPreview;
      }
      const savedResult = localStorage.getItem(resultStorageKey);
      if (savedResult) {
        setPersistedResult(savedResult);
      }
      const savedInstructions = localStorage.getItem(instructionStorageKey);
      if (savedInstructions) {
        setInstructions(savedInstructions);
      }
    } catch (e) {
      console.warn('加载图片预览和结果失败', e);
    }
  }, []);

  // 保存图片预览
  useEffect(() => {
    try {
      if (imagePreview) {
        localStorage.setItem(imagePreviewStorageKey, imagePreview);
      } else {
        localStorage.removeItem(imagePreviewStorageKey);
      }
    } catch (e) {
      console.warn('保存图片预览失败', e);
    }
  }, [imagePreview]);

  // 保存额外指令
  useEffect(() => {
    try {
      if (instructions) {
        localStorage.setItem(instructionStorageKey, instructions);
      } else {
        localStorage.removeItem(instructionStorageKey);
      }
    } catch (e) {
      console.warn('保存额外指令失败', e);
    }
  }, [instructions]);

  // 保存结果
  useEffect(() => {
    try {
      if (result) {
        localStorage.setItem(resultStorageKey, result);
        setPersistedResult(result);
      }
    } catch (e) {
      console.warn('保存结果失败', e);
    }
  }, [result]);

  const loadImageFile = useCallback((file: File) => {
    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setImagePreview(base64);

      // 分析图片分辨率和比例
      const img = new Image();
      img.onload = () => {
        const width = img.width;
        const height = img.height;
        setResolution({ width, height });
        setAspectRatio(getClosestRatio(width, height));
      };
      img.src = base64;
    };
    reader.readAsDataURL(file);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      loadImageFile(file);
    }
  };

  const handlePasteIntoBox = (event: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = event.clipboardData?.items;
    if (!items?.length) return;

    const imageItem = Array.from(items).find((item) => item.type.startsWith('image/'));
    if (!imageItem) return;

    const file = imageItem.getAsFile();
    if (!file) return;

    event.preventDefault();
    loadImageFile(file);
    if (pasteAreaRef.current) {
      pasteAreaRef.current.value = '';
    }
  };

  useEffect(() => {
    const handlePaste = (event: ClipboardEvent) => {
      const items = event.clipboardData?.items;
      if (!items?.length) return;

      const imageItem = Array.from(items).find((item) => item.type.startsWith('image/'));
      if (!imageItem) return;

      const file = imageItem.getAsFile();
      if (!file) return;

      loadImageFile(file);
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [loadImageFile]);

  const handleExtract = async () => {
    if (!imagePreview) {
      alert('请先选择图片');
      return;
    }
    if (!model) {
      alert('请先选择模型');
      return;
    }
    const prompt = await extract(imagePreview, model, templateId, instructions, {
      resolution: resolution || undefined,
      aspectRatio: aspectRatio || undefined,
    });
    if (prompt && onExtracted) {
      onExtracted(prompt);
    }
  };

  const copyToClipboard = () => {
    const content = result || persistedResult;
    if (content) {
      navigator.clipboard.writeText(content);
    }
  };

  return (
    <div className="w-full h-full grid grid-cols-1 md:grid-cols-2 gap-6 p-6 overflow-hidden">
      {/* Input Section */}
      <div className="flex flex-col h-full min-h-0 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-200 bg-gray-50/50 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3 flex-wrap">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2 text-sm">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
              参考图片
            </h3>
            {chineseTemplates.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">反推模板</span>
                <div className="w-[22rem]">
                  <TemplateSelector
                    value={templateId}
                    onChange={setTemplateId}
                    availableTemplates={chineseTemplates}
                    templateManager={templateManager}
                    placeholder="默认"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Model Selection */}
        <div className="p-4 border-b border-gray-200 bg-white">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">选择模型 (需支持 Vision)</label>
          <ModelSelector
            value={model}
            onChange={setModel}
            filterVisionOnly={true}
            storageKey="selectedImageModel"
          />
        </div>

        {/* Paste & Instructions Row */}
        <div className="p-4 border-b border-gray-200 bg-white grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">粘贴图片区域</label>
            <textarea
              ref={pasteAreaRef}
              onPaste={handlePasteIntoBox}
              placeholder="按 Ctrl/Cmd + V 粘贴截图或图片，文本会被忽略"
              className="w-full h-24 rounded-lg border border-gray-200 bg-gray-50 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-sm p-3 resize-none transition-colors"
            />
          </div>

          <div className="flex flex-col">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">额外指令（风格/侧重等，可选）</label>
            <textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="如：赛博朋克风格 / 更强调暖色氛围 / 保留写实"
              className="w-full h-24 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-sm p-3 resize-none transition-colors"
            />
          </div>
        </div>

        <div className="flex-1 p-6 flex flex-col items-center justify-center bg-white min-h-0">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            className="hidden"
          />

          {!imagePreview ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="w-full h-full border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 hover:bg-gray-50 transition-all"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400 mb-4"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
              <p className="text-gray-600 font-medium">点击上传图片或直接粘贴</p>
              <p className="text-gray-400 text-sm mt-2">支持 JPG, PNG, WebP</p>
            </div>
          ) : (
            <div className="relative w-full h-full flex flex-col items-center justify-center">
              <img src={imagePreview} alt="Upload preview" className="max-h-[calc(100%-4rem)] max-w-full object-contain rounded-lg shadow-sm mb-2" />
              
              {resolution && (
                <div className="flex items-center gap-3 mb-3 bg-blue-50 px-3 py-1.5 rounded-full border border-blue-100">
                  <span className="text-xs font-medium text-blue-700 flex items-center gap-1">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><path d="M12 8v8"></path><path d="M8 12h8"></path></svg>
                    分辨率: {resolution.width} × {resolution.height}
                  </span>
                  <span className="text-xs font-medium text-blue-700 flex items-center gap-1">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2z"></path><polyline points="7 12 12 7 17 12"></polyline><polyline points="7 17 12 12 17 17"></polyline></svg>
                    比例: {aspectRatio}
                  </span>
                </div>
              )}

              <button
                onClick={() => {
                  setImageFile(null);
                  setImagePreview('');
                  setResolution(null);
                  setAspectRatio('');
                  if (fileInputRef.current) fileInputRef.current.value = '';
                  localStorage.removeItem(imagePreviewStorageKey);
                }}
                className="text-xs text-red-600 hover:text-red-700 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                移除图片
              </button>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-200 bg-white">
          <button
            onClick={handleExtract}
            disabled={loading || !imagePreview || !model}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-all duration-200 flex justify-center items-center gap-2 shadow-sm"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                正在分析...
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.64 3.64-1.28-1.28a1.21 1.21 0 0 0-1.72 0L2.36 18.64a1.21 1.21 0 0 0 0 1.72l1.28 1.28a1.2 1.2 0 0 0 1.72 0L21.64 5.36a1.2 1.2 0 0 0 0-1.72Z"></path><path d="m14 7 3 3"></path><path d="M5 6v4"></path><path d="M19 14v4"></path><path d="M10 2v2"></path><path d="M7 8H3"></path><path d="M21 16h-4"></path><path d="M11 3H9"></path></svg>
                反推提示词
              </>
            )}
          </button>
        </div>
      </div>

      {/* Output Section */}
      <div className="flex flex-col h-full min-h-0 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden relative">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50/50">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2 text-sm">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
            分析结果
          </h3>
          {(result || persistedResult) && (
            <button
              onClick={copyToClipboard}
              className="text-gray-500 hover:text-gray-700 p-1.5 hover:bg-gray-100 rounded transition-all flex items-center gap-1 text-xs font-medium"
              title="复制到剪贴板"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"></rect><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"></path></svg>
              复制
            </button>
          )}
        </div>
        <div className="flex-1 w-full bg-white p-4 overflow-y-auto relative min-h-0">
          {error ? (
            <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-lg text-sm">
              错误: {error.message}
            </div>
          ) : !result && !persistedResult && !loading ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400">
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="mb-2 opacity-50"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
              <p className="text-sm">分析结果将显示在这里</p>
            </div>
          ) : (
            <div className="whitespace-pre-wrap font-mono text-sm text-gray-800 leading-relaxed">
              {result || persistedResult}
              {loading && <span className="inline-block w-2 h-4 ml-1 bg-blue-500 animate-pulse" />}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

