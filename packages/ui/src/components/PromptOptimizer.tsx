import React, { useState, useEffect } from 'react';
import { usePromptOptimizer } from '../hooks/usePromptOptimizer';
import { ModelSelector } from './ModelSelector';
import type { PromptStyle } from '@text-image-prompt-tools/core';

export interface PromptOptimizerProps {
  defaultModel?: string;
  defaultStyle?: PromptStyle;
  onOptimized?: (optimized: string) => void;
  availableModels?: Array<{ id: string; name: string }>;
}

const STYLE_OPTIONS: Array<{ value: PromptStyle; label: string }> = [
  { value: 'general', label: '通用优化' },
  { value: 'creative', label: '创意优化' },
  { value: 'photography', label: '摄影风格' },
  { value: 'design', label: '设计风格' },
  { value: 'chinese-aesthetics', label: '中国美学' },
];

// 格式化模型名称显示
// 注意：App.tsx 已经通过 formatModelDisplayName 格式化好了名称并传递到 name 字段
// 这里直接使用传入的名称即可，不需要再次处理

export const PromptOptimizer: React.FC<PromptOptimizerProps> = ({
  defaultModel = '',
  defaultStyle = 'general',
  onOptimized,
  availableModels = [],
}) => {
  const [prompt, setPrompt] = useState('');
  const [style, setStyle] = useState<PromptStyle>(defaultStyle);
  const [model, setModel] = useState(defaultModel);
  const { optimize, loading, error, result } = usePromptOptimizer();

  const handleOptimize = async () => {
    if (!prompt.trim()) {
      return;
    }
    if (!model) {
      alert('请先选择模型');
      return;
    }
    const optimized = await optimize(prompt, model, style);
    if (optimized && onOptimized) {
      onOptimized(optimized);
    }
  };

  const copyToClipboard = () => {
    if (result) {
      navigator.clipboard.writeText(result);
    }
  };

  return (
    <div className="w-full h-full grid grid-cols-1 md:grid-cols-2 gap-6 p-6 overflow-hidden">
      {/* Input Section */}
      <div className="flex flex-col h-full min-h-0 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50/50">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2 text-sm">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
            原始想法
          </h3>
          <span className="text-xs text-gray-500 font-mono">{prompt.length} 字符</span>
        </div>
        
        {/* Model Selection */}
        <div className="p-4 border-b border-gray-200 bg-white">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">选择模型</label>
          <ModelSelector
            value={model}
            onChange={setModel}
            filterVisionOnly={false}
            storageKey="selectedTextModel"
          />
        </div>

        {/* Style Selection */}
        <div className="p-4 border-b border-gray-200 bg-white">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">选择优化风格</label>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
            {STYLE_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => setStyle(option.value)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                  style === option.value 
                  ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm' 
                  : 'bg-gray-100 text-gray-600 border-gray-300 hover:border-gray-400 hover:text-gray-900'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
        
        <textarea
          className="flex-1 w-full bg-white p-4 resize-none focus:outline-none text-gray-900 placeholder-gray-400 text-sm leading-relaxed"
          placeholder="描述你想生成的内容（例如：'一只赛博朋克风格的猫在雨中'）..."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
        />

        <div className="p-4 border-t border-gray-200 bg-white">
          <button
            onClick={handleOptimize}
            disabled={loading || !prompt.trim() || !model}
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-all duration-200 flex justify-center items-center gap-2 shadow-sm"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                正在优化...
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v4"></path><path d="m4.93 4.93 2.83 2.83"></path><path d="M2 12h4"></path><path d="m4.93 19.07 2.83-2.83"></path><path d="M12 22v-4"></path><path d="m19.07 19.07-2.83-2.83"></path><path d="M22 12h-4"></path><path d="m19.07 4.93-2.83 2.83"></path></svg>
                一键优化
              </>
            )}
          </button>
        </div>
      </div>

      {/* Output Section */}
      <div className="flex flex-col h-full min-h-0 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden relative">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50/50">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2 text-sm">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
            优化结果
          </h3>
          {result && (
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
          ) : !result && !loading ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400">
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="mb-2 opacity-50"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
              <p className="text-sm">优化后的提示词将显示在这里</p>
            </div>
          ) : (
            <div className="whitespace-pre-wrap font-mono text-sm text-gray-800 leading-relaxed">
              {result}
              {loading && <span className="inline-block w-2 h-4 ml-1 bg-indigo-500 animate-pulse"/>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

