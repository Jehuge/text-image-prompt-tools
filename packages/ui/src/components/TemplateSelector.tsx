import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, CheckCircle2, Eye, FileText } from 'lucide-react';
import type { Template } from '@text-image-prompt-tools/core';

export interface TemplateOption {
  id: string;
  name: string;
  language: 'zh' | 'en';
}

interface TemplateSelectorProps {
  value?: string;
  onChange?: (templateId: string | undefined) => void;
  availableTemplates?: TemplateOption[];
  templateManager?: any; // ITemplateManager 类型，但为了避免循环依赖使用 any
  className?: string;
  placeholder?: string;
}

export const TemplateSelector: React.FC<TemplateSelectorProps> = ({
  value,
  onChange,
  availableTemplates = [],
  templateManager,
  className = '',
  placeholder = '使用默认模板',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const currentTemplate = availableTemplates.find(t => t.id === value);

  const handleTemplateChange = (templateId: string | undefined) => {
    onChange?.(templateId);
    setIsOpen(false);
  };

  const handlePreview = async (e: React.MouseEvent, templateId: string) => {
    e.stopPropagation();
    e.preventDefault();
    setIsOpen(false);

    if (templateManager) {
      try {
        setShowPreview(true);
        setPreviewTemplate(null);

        const template = await templateManager.getTemplate(templateId);
        if (template) {
          setPreviewTemplate(template);
        } else {
          console.error('模板不存在:', templateId);
          alert('模板不存在或无法加载');
          setShowPreview(false);
        }
      } catch (error) {
        console.error('获取模板详情失败:', error);
        alert('获取模板详情失败，请稍后重试');
        setShowPreview(false);
      }
    } else {
      console.warn('模板管理器未初始化');
      alert('模板管理器未初始化');
    }
  };

  if (availableTemplates.length === 0) {
    return (
      <div className={`bg-gray-50 border border-gray-200 rounded-lg p-3 ${className}`}>
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-gray-400 shrink-0" />
          <div className="flex-1">
            <p className="text-xs text-gray-500">暂无可用模板</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className={`relative ${className}`}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between px-3 py-2 bg-white border border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50/50 transition-all text-left text-sm shadow-sm"
        >
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <FileText className="w-4 h-4 text-blue-600 shrink-0" />
            <div className="flex-1 min-w-0">
              {currentTemplate ? (
                <div className="text-sm font-medium text-gray-900 truncate">
                  {currentTemplate.name}
                </div>
              ) : (
                <div className="text-sm text-gray-500">{placeholder}</div>
              )}
            </div>
          </div>
          <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform shrink-0 ml-2 ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setIsOpen(false)}
            />
            <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-60 overflow-y-auto animate-in fade-in zoom-in-95 duration-100"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-4 py-2 bg-gray-50/80 backdrop-blur-sm border-b border-gray-200 text-xs font-medium text-gray-700 sticky top-0 z-10">
                共 {availableTemplates.length} 个可用模板
              </div>
              <button
                onClick={() => handleTemplateChange(undefined)}
                className={`w-full px-4 py-2.5 text-left hover:bg-gray-50 transition-colors border-b border-gray-100 ${!value
                  ? 'bg-blue-50 text-blue-700 font-medium'
                  : 'text-gray-700'
                  }`}
              >
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-gray-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">{placeholder}</div>
                  </div>
                  {!value && (
                    <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                  )}
                </div>
              </button>
              {availableTemplates.map((template) => (
                <div
                  key={template.id}
                  className={`w-full px-4 py-2.5 text-left hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0 group ${value === template.id
                    ? 'bg-blue-50 text-blue-700 font-medium'
                    : 'text-gray-700'
                    }`}
                >
                  <div className="flex items-center gap-2">
                    <FileText className={`w-4 h-4 shrink-0 ${value === template.id ? 'text-blue-500' : 'text-gray-400 group-hover:text-blue-400 transition-colors'}`} />
                    <button
                      onClick={() => handleTemplateChange(template.id)}
                      className="flex-1 min-w-0 text-left"
                    >
                      <div className="text-sm font-medium truncate">{template.name}</div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500 font-medium tracking-wide">
                          {template.language === 'zh' ? 'ZH' : 'EN'}
                        </span>
                      </div>
                    </button>
                    <div className="flex items-center gap-1 shrink-0">
                      {templateManager && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            handlePreview(e, template.id);
                          }}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                          }}
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-100 rounded-full transition-all"
                          title="预览模板"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      )}
                      {value === template.id && (
                        <CheckCircle2 className="w-4 h-4 text-blue-600" />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* 模板详情预览弹窗 - 工具风格设计 */}
      {mounted && showPreview && createPortal(
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6"
        >
          {/* Backdrop - High contrast but neutral */}
          <div
            className="absolute inset-0 bg-gray-900/75 backdrop-blur-sm transition-opacity"
            onClick={() => {
              setShowPreview(false);
              setPreviewTemplate(null);
            }}
          />

          {/* Modal Container - Matches App Card Style (Rounded-xl, Gray-200 border) */}
          <div
            className="relative bg-white rounded-xl shadow-2xl border border-gray-200 w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header - Matches PromptOptimizer Header */}
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between sticky top-0 z-10">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white border border-gray-200 rounded-lg shadow-sm">
                  <FileText className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 text-base leading-tight">
                    {previewTemplate?.name || '加载中...'}
                  </h3>
                  {previewTemplate && (
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-gray-500 font-mono">
                        ID: {previewTemplate.id}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Metadata Badges - Clean Style */}
                {previewTemplate && (
                  <div className="hidden sm:flex items-center gap-2 mr-4">
                    <span className="text-xs font-medium px-2.5 py-1 rounded-md bg-white border border-gray-200 text-gray-600">
                      {previewTemplate.metadata.language === 'zh' ? '中文' : 'English'}
                    </span>
                    <span className="text-xs font-medium px-2.5 py-1 rounded-md bg-white border border-gray-200 text-gray-600">
                      v{previewTemplate.metadata.version}
                    </span>
                    <span className="text-xs font-medium px-2.5 py-1 rounded-md bg-blue-50 border border-blue-100 text-blue-700">
                      {previewTemplate.metadata.templateType}
                    </span>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setShowPreview(false);
                    setPreviewTemplate(null);
                  }}
                  className="p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-white transition-colors border border-transparent hover:border-gray-200"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </div>
            </div>

            {/* Content Area - Structured Document Style */}
            <div className="flex-1 overflow-y-auto bg-white relative p-6">
              {previewTemplate ? (
                <div className="max-w-4xl mx-auto space-y-6">
                  {previewTemplate.content && previewTemplate.content.length > 0 ? (
                    <div className="space-y-6">
                      {previewTemplate.content.map((msg, index) => {
                        const isSystem = msg.role === 'system';
                        const roleLabel = isSystem ? 'System Instruction' : msg.role === 'user' ? 'User Prompt' : 'Assistant Response';
                        const roleIcon = isSystem
                          ? <div className="w-2 h-2 rounded-full bg-indigo-500" />
                          : msg.role === 'user'
                            ? <div className="w-2 h-2 rounded-full bg-blue-500" />
                            : <div className="w-2 h-2 rounded-full bg-green-500" />;

                        return (
                          <div key={index} className="flex flex-col gap-2">
                            {/* Section Label */}
                            <div className="flex items-center gap-2 px-1">
                              {roleIcon}
                              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                {roleLabel}
                              </span>
                            </div>

                            {/* Content Box */}
                            <div className="group relative">
                              <div className={`
                                                    p-4 rounded-lg border text-sm leading-relaxed whitespace-pre-wrap font-mono
                                                    ${isSystem
                                  ? 'bg-indigo-50/30 border-indigo-100 text-gray-800'
                                  : 'bg-gray-50 border-gray-200 text-gray-800'
                                }
                                                `}>
                                {msg.content}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-24 text-gray-400">
                      <FileText className="w-16 h-16 mb-4 stroke-[1.5] text-gray-200" />
                      <p>该模板没有内容</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="animate-pulse flex flex-col items-center gap-4">
                    <div className="w-12 h-12 bg-gray-100 rounded-lg"></div>
                    <div className="h-4 w-40 bg-gray-100 rounded"></div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3 sticky bottom-0 z-10 text-sm">
              <button
                type="button"
                onClick={() => {
                  setShowPreview(false);
                  setPreviewTemplate(null);
                }}
                className="px-5 py-2 bg-white border border-gray-200 hover:bg-gray-50 hover:border-gray-300 text-gray-700 font-medium rounded-lg transition-all shadow-sm"
              >
                关闭预览
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};


