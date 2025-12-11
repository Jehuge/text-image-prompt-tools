import React, { useState, useRef, useEffect } from 'react';
import { useImageToPrompt } from '../hooks/useImageToPrompt';
import { ModelSelector } from './ModelSelector';

export interface ImageToPromptProps {
  defaultModel?: string;
  onExtracted?: (prompt: string) => void;
  availableModels?: Array<{ id: string; name: string }>;
}


export const ImageToPrompt: React.FC<ImageToPromptProps> = ({
  defaultModel = '',
  onExtracted,
  availableModels = [],
}) => {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [model, setModel] = useState(defaultModel);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { extract, loading, error, result } = useImageToPrompt();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleExtract = async () => {
    if (!imageFile || !imagePreview) {
      alert('请先选择图片');
      return;
    }
    if (!model) {
      alert('请先选择模型');
      return;
    }
    const prompt = await extract(imagePreview, model);
    if (prompt && onExtracted) {
      onExtracted(prompt);
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
        <div className="p-4 border-b border-gray-200 bg-gray-50/50">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2 text-sm">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
            参考图片
          </h3>
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
              <p className="text-gray-600 font-medium">点击上传图片</p>
              <p className="text-gray-400 text-sm mt-2">支持 JPG, PNG, WebP</p>
            </div>
          ) : (
            <div className="relative w-full h-full flex flex-col items-center justify-center">
              <img src={imagePreview} alt="Upload preview" className="max-h-full max-w-full object-contain rounded-lg shadow-sm mb-4" />
              <button 
                onClick={() => { 
                  setImageFile(null); 
                  setImagePreview(''); 
                  if (fileInputRef.current) fileInputRef.current.value = ''; 
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
            disabled={loading || !imageFile || !model}
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
              <p className="text-sm">分析结果将显示在这里</p>
            </div>
          ) : (
            <div className="whitespace-pre-wrap font-mono text-sm text-gray-800 leading-relaxed">
              {result}
              {loading && <span className="inline-block w-2 h-4 ml-1 bg-blue-500 animate-pulse"/>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

