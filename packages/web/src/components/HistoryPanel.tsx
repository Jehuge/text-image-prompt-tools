import React, { useState, useEffect } from 'react';
import type { HistoryRecord, HistoryRecordType } from '@text-image-prompt-tools/core';
import type { IHistoryManager } from '@text-image-prompt-tools/core';

export interface HistoryPanelProps {
  historyManager: IHistoryManager;
  onSelectRecord?: (record: HistoryRecord) => void;
}

export const HistoryPanel: React.FC<HistoryPanelProps> = ({
  historyManager,
  onSelectRecord,
}) => {
  const [records, setRecords] = useState<HistoryRecord[]>([]);
  const [filterType, setFilterType] = useState<HistoryRecordType | 'all'>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRecords();
  }, [filterType]);

  const loadRecords = async () => {
    setLoading(true);
    try {
      const allRecords = await historyManager.getRecords(
        filterType === 'all' ? undefined : filterType
      );
      setRecords(allRecords);
    } catch (error) {
      console.error('加载历史记录失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('确定要删除这条记录吗？')) {
      try {
        await historyManager.deleteRecord(id);
        await loadRecords();
      } catch (error) {
        console.error('删除记录失败:', error);
        alert('删除失败');
      }
    }
  };

  const handleClear = async () => {
    if (confirm('确定要清空所有历史记录吗？')) {
      try {
        await historyManager.clearRecords(
          filterType === 'all' ? undefined : filterType
        );
        await loadRecords();
      } catch (error) {
        console.error('清空记录失败:', error);
        alert('清空失败');
      }
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('zh-CN');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px] bg-gray-50">
        <div className="text-gray-600">加载中...</div>
      </div>
    );
  }

  return (
    <div className="w-full h-full overflow-y-auto bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-1">历史记录</h2>
            <p className="text-gray-600">查看和管理之前的生成记录。</p>
          </div>
          
          <div className="flex gap-2.5">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as HistoryRecordType | 'all')}
              className="px-3 py-2 bg-white border border-gray-300 text-gray-900 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none"
            >
              <option value="all">全部</option>
              <option value="prompt-optimize">提示词优化</option>
              <option value="image-to-prompt">图片反推</option>
            </select>
            {records.length > 0 && (
              <button
                onClick={handleClear}
                className="px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 rounded-lg border border-red-200 transition-all text-sm font-medium flex items-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                清空
              </button>
            )}
          </div>
        </div>

        {records.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-gray-200 border-dashed shadow-sm">
            <div className="bg-gray-100 p-4 rounded-full mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
            </div>
            <p className="text-gray-600 font-medium">暂无历史记录</p>
            <p className="text-gray-400 text-sm mt-1">你的生成历史将显示在这里</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {records.map((record) => (
              <div
                key={record.id}
                className={`bg-white border border-gray-200 hover:border-gray-300 rounded-xl p-4 flex flex-col group transition-all hover:shadow-md shadow-sm ${
                  onSelectRecord ? 'cursor-pointer' : ''
                }`}
                onClick={() => onSelectRecord?.(record)}
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${
                        record.type === 'prompt-optimize' 
                        ? 'bg-blue-50 text-blue-700 border-blue-200' 
                        : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      }`}
                    >
                      {record.type === 'prompt-optimize' ? '文本优化' : '图片反推'}
                    </span>
                    <span className="text-[10px] text-gray-500">
                      {formatDate(record.timestamp)}
                    </span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(record.id);
                    }}
                    className="text-gray-400 hover:text-red-600 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="删除"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                  </button>
                </div>

                {record.type === 'prompt-optimize' && (
                  <>
                    <div className="mb-3">
                      <p className="text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wider">输入</p>
                      <p className="text-sm text-gray-700 line-clamp-2 font-mono bg-gray-50 p-2 rounded border border-gray-200">
                        {record.originalPrompt}
                      </p>
                    </div>
                    <div className="flex-1 mb-4">
                      <p className="text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wider">输出</p>
                      <p className="text-sm text-gray-600 line-clamp-4">
                        {record.optimizedPrompt}
                      </p>
                    </div>
                    {record.style && (
                      <div className="text-xs text-gray-500 mb-2">
                        风格: {record.style}
                      </div>
                    )}
                  </>
                )}

                {record.type === 'image-to-prompt' && (
                  <>
                    <div className="mb-3">
                      {record.imageUrl && !record.imageUrl.includes('[compressed]') && (
                        <img
                          src={record.imageUrl}
                          alt="Preview"
                          className="w-full max-h-32 object-contain rounded mb-2"
                        />
                      )}
                      {record.imageUrl?.includes('[compressed]') && (
                        <div className="w-full h-32 flex items-center justify-center bg-gray-100 rounded mb-2">
                          <span className="text-xs text-gray-500">图片已压缩</span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 mb-4">
                      <p className="text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wider">提取的提示词</p>
                      <p className="text-sm text-gray-600 line-clamp-4">
                        {record.prompt}
                      </p>
                    </div>
                    {(record.resolution || record.aspectRatio) && (
                      <div className="flex flex-wrap gap-2 mb-3">
                        {record.resolution && (
                          <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded border border-blue-100">
                            {record.resolution.width} × {record.resolution.height}
                          </span>
                        )}
                        {record.aspectRatio && (
                          <span className="text-[10px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded border border-indigo-100">
                            比例: {record.aspectRatio}
                          </span>
                        )}
                      </div>
                    )}
                  </>
                )}

                <div className="pt-3 mt-auto border-t border-gray-200 flex gap-2">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      if (record.type === 'prompt-optimize' && record.optimizedPrompt) {
                        navigator.clipboard.writeText(record.optimizedPrompt);
                      } else if (record.type === 'image-to-prompt' && record.prompt) {
                        navigator.clipboard.writeText(record.prompt);
                      }
                    }}
                    className="flex-1 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium rounded transition-colors flex items-center justify-center gap-1.5"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"></rect><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"></path></svg>
                    复制
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
