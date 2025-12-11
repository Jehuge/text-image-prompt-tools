import React, { useState, useEffect } from 'react';
import { Brain, ChevronDown, CheckCircle2, Image as ImageIcon } from 'lucide-react';

interface ModelOption {
  id: string;
  name: string;
  provider: string;
  providerName: string;
  modelId: string;
  supportsVision?: boolean;
}

interface ProviderConfig {
  provider: string;
  apiKey: string;
  baseUrl?: string;
  model: string;
  models: string[];
  modelCapabilities?: Record<string, { supportsVision: boolean }>;
}

interface ModelSelectorProps {
  value?: string;
  onChange?: (modelId: string) => void;
  filterVisionOnly?: boolean;
  storageKey?: string;
  className?: string;
}

const PROVIDER_LABELS: Record<string, string> = {
  openai: 'OpenAI',
  deepseek: 'DeepSeek',
  siliconflow: 'SiliconFlow',
  anthropic: 'Anthropic',
  gemini: 'Gemini',
  zhipu: 'Zhipu',
  ollama: 'Ollama',
};

const PROVIDER_COLORS: Record<string, string> = {
  openai: 'bg-green-50 text-green-700 border-green-200',
  deepseek: 'bg-blue-50 text-blue-700 border-blue-200',
  siliconflow: 'bg-purple-50 text-purple-700 border-purple-200',
  anthropic: 'bg-orange-50 text-orange-700 border-orange-200',
  gemini: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  zhipu: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  ollama: 'bg-teal-50 text-teal-700 border-teal-200',
};

// 提供商图标文件映射
const PROVIDER_ICON_MAP: Record<string, string> = {
  openai: '/icons/openai-svgrepo-com.svg',
  anthropic: '/icons/claude-color.svg',
  gemini: '/icons/gemini-color.svg',
  deepseek: '/icons/deepseek-color.svg',
  siliconflow: '/icons/siliconcloud-color.svg',
  zhipu: '/icons/chatglm-color.svg',
  ollama: '/icons/ollama.svg',
};

// 提供商图标组件
const ProviderIcon: React.FC<{ providerId: string; size?: number; className?: string }> = ({
  providerId,
  size = 16,
  className = '',
}) => {
  const iconPath = PROVIDER_ICON_MAP[providerId] || PROVIDER_ICON_MAP.openai;
  
  return (
    <img
      src={iconPath}
      alt={`${providerId} icon`}
      className={className}
      style={{ width: size, height: size }}
      onError={(e) => {
        // 如果图标加载失败，隐藏图片
        const target = e.target as HTMLImageElement;
        if (target) {
          target.style.display = 'none';
        }
      }}
    />
  );
};

export const ModelSelector: React.FC<ModelSelectorProps> = ({
  value,
  onChange,
  filterVisionOnly = false,
  storageKey = 'selectedModel',
  className = '',
}) => {
  const [selectedModel, setSelectedModel] = useState<string>(value || '');
  const [availableModels, setAvailableModels] = useState<ModelOption[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  // 根据模型名称推断是否支持 Vision（用于兼容旧数据或未从 API 获取能力信息的情况）
  const inferVisionSupport = (providerId: string, modelId: string): boolean => {
    const lowerModelId = modelId.toLowerCase();
    
    // Gemini 模型：flash 系列默认支持 Vision
    if (providerId === 'gemini') {
      if (lowerModelId.includes('flash') || lowerModelId.includes('2.5') || lowerModelId.includes('pro')) {
        return true;
      }
    }
    
    // OpenAI 模型：包含 vision 或 4 的模型支持 Vision
    if (providerId === 'openai') {
      if (lowerModelId.includes('vision') || lowerModelId.includes('4') || lowerModelId.includes('gpt-4')) {
        return true;
      }
    }
    
    // Anthropic Claude 模型：默认支持 Vision
    if (providerId === 'anthropic') {
      if (lowerModelId.includes('claude') || lowerModelId.includes('sonnet') || lowerModelId.includes('haiku') || lowerModelId.includes('opus')) {
        return true;
      }
    }
    
    // Ollama 模型：包含 vision、llava、qwen2.5-vision 等
    if (providerId === 'ollama') {
      if (lowerModelId.includes('vision') || lowerModelId.includes('llava') || lowerModelId.includes('qwen2.5-vision') || lowerModelId.includes('llama3.2-vision')) {
        return true;
      }
    }
    
    // Zhipu 模型：glm-4 系列支持 Vision
    if (providerId === 'zhipu') {
      if (lowerModelId.includes('glm-4') && !lowerModelId.includes('air')) {
        return true;
      }
    }
    
    // 通用规则：包含 vision 关键词的模型
    if (lowerModelId.includes('vision') || lowerModelId.includes('visual')) {
      return true;
    }
    
    return false;
  };

  // 获取模型的能力信息
  const getModelCapabilities = (providerId: string, modelId: string, config: ProviderConfig): { supportsVision: boolean } => {
    // 首先尝试从保存的配置中获取（尝试多种可能的 key 格式）
    if (config.modelCapabilities) {
      // 尝试直接使用 modelId
      if (config.modelCapabilities[modelId]) {
        return config.modelCapabilities[modelId];
      }
      
      // 尝试去掉 provider 前缀后的 modelId
      const modelIdWithoutPrefix = modelId.startsWith(providerId + '-') 
        ? modelId.substring(providerId.length + 1) 
        : modelId;
      if (config.modelCapabilities[modelIdWithoutPrefix]) {
        return config.modelCapabilities[modelIdWithoutPrefix];
      }
      
      // 尝试完整的 provider-modelId 格式
      const fullModelId = `${providerId}-${modelId}`;
      if (config.modelCapabilities[fullModelId]) {
        return config.modelCapabilities[fullModelId];
      }
    }
    
    // 如果没有保存的信息，尝试推断（兼容旧数据或未从 API 获取的情况）
    const inferredVision = inferVisionSupport(providerId, modelId);
    return { supportsVision: inferredVision };
  };

  // 从 localStorage 加载所有已配置的模型
  const loadModels = () => {
    try {
      const savedConfigs = localStorage.getItem('modelConfigs');
      
      if (!savedConfigs) {
        setAvailableModels([]);
        setSelectedModel('');
        return;
      }

      const configs = JSON.parse(savedConfigs);
      const modelList: ModelOption[] = [];

      Object.entries(configs).forEach(([providerId, config]: [string, any]) => {
        if (!config || typeof config !== 'object') {
          return;
        }
        
        const modelIds = config.models && Array.isArray(config.models) && config.models.length > 0
          ? config.models
          : (config.model && typeof config.model === 'string' && config.model.trim() ? [config.model.trim()] : []);
        
        const hasApiKey = !config.apiKey || (config.apiKey && typeof config.apiKey === 'string' && config.apiKey.trim());
        
        if (modelIds.length > 0 && hasApiKey) {
          modelIds.forEach((modelId: string) => {
            const trimmedModelId = typeof modelId === 'string' ? modelId.trim() : String(modelId).trim();
            if (!trimmedModelId) return;
            
            let modelName = trimmedModelId;
            
            if (trimmedModelId.startsWith(providerId + '-')) {
              modelName = trimmedModelId.substring(providerId.length + 1);
            }
            
            if (modelName.includes('/')) {
              const parts = modelName.split('/');
              modelName = parts[parts.length - 1];
            }
            
            if (modelName.includes(':')) {
              const colonIndex = modelName.lastIndexOf(':');
              if (colonIndex > 0) {
                const baseName = modelName.substring(0, colonIndex);
                const quantInfo = modelName.substring(colonIndex + 1);
                modelName = `${baseName} (${quantInfo})`;
              }
            }
            
            const capabilities = getModelCapabilities(providerId, trimmedModelId, config as ProviderConfig);
            
            // 如果设置了只显示支持 Vision 的模型，进行过滤
            if (filterVisionOnly && !capabilities.supportsVision) {
              return;
            }
            
            const modelOption: ModelOption = {
              id: `${providerId}-${trimmedModelId}`,
              name: modelName,
              provider: providerId,
              providerName: PROVIDER_LABELS[providerId] || providerId,
              modelId: trimmedModelId,
              supportsVision: capabilities.supportsVision,
            };
            
            modelList.push(modelOption);
          });
        }
      });

      modelList.sort((a, b) => {
        if (a.providerName !== b.providerName) {
          return a.providerName.localeCompare(b.providerName);
        }
        return a.name.localeCompare(b.name);
      });

      setAvailableModels(modelList);

      // 加载已选择的模型
      const savedSelected = localStorage.getItem(storageKey);
      
      if (savedSelected && modelList.find(m => m.id === savedSelected)) {
        setSelectedModel(savedSelected);
        if (onChange) {
          onChange(savedSelected);
        }
      } else if (modelList.length > 0 && !value) {
        // 如果没有保存的选择且没有外部传入的值，选择第一个
        setSelectedModel(modelList[0].id);
        localStorage.setItem(storageKey, modelList[0].id);
        if (onChange) {
          onChange(modelList[0].id);
        }
      } else if (value) {
        setSelectedModel(value);
      } else {
        setSelectedModel('');
      }
    } catch (error) {
      console.error('加载模型列表失败:', error);
      setAvailableModels([]);
      setSelectedModel('');
    }
  };

  useEffect(() => {
    loadModels();

    // 监听 storage 变化
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'modelConfigs' || e.key === storageKey) {
        loadModels();
      }
    };
    window.addEventListener('storage', handleStorageChange);

    // 定期检查配置变化
    const interval = setInterval(loadModels, 1000);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterVisionOnly, storageKey]);

  // 当外部 value 变化时更新内部状态
  useEffect(() => {
    if (value !== undefined && value !== selectedModel) {
      setSelectedModel(value);
    }
  }, [value, selectedModel]);

  const currentModel = availableModels.find(m => m.id === selectedModel);

  const handleModelChange = (modelId: string) => {
    setSelectedModel(modelId);
    localStorage.setItem(storageKey, modelId);
    setIsOpen(false);
    if (onChange) {
      onChange(modelId);
    }
  };

  if (availableModels.length === 0) {
    return (
      <div className={`bg-yellow-50 border border-yellow-200 rounded-lg p-3 ${className}`}>
        <div className="flex items-start gap-2">
          <Brain className="w-4 h-4 text-yellow-600 mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="text-xs text-yellow-800">
              {filterVisionOnly 
                ? '请先在"模型配置"页面配置支持 Vision 的模型' 
                : '请先在"模型配置"页面配置模型'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2 bg-white border border-gray-300 rounded-lg hover:border-indigo-500 hover:bg-indigo-50/50 transition-all text-left text-sm"
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {currentModel ? (
            <ProviderIcon providerId={currentModel.provider} size={16} className="shrink-0" />
          ) : (
            <Brain className="w-4 h-4 text-indigo-600 shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            {currentModel ? (
              <>
                <div className="flex items-center gap-2">
                  <div className="text-sm font-medium text-gray-900 truncate">
                    {currentModel.name}
                  </div>
                  {currentModel.supportsVision && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded text-xs shrink-0 border border-purple-200">
                      <ImageIcon className="w-3 h-3" />
                      视觉
                    </span>
                  )}
                </div>
                <div className="text-xs text-gray-500 mt-0.5 truncate">
                  {currentModel.providerName}
                </div>
              </>
            ) : (
              <div className="text-sm text-gray-500">请选择模型</div>
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
          <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
            {availableModels.length === 0 ? (
              <div className="px-4 py-3 text-sm text-gray-500 text-center">
                暂无可用模型
              </div>
            ) : (
              <>
                <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 text-xs font-medium text-gray-700 sticky top-0">
                  共 {availableModels.length} 个可用模型
                </div>
                {availableModels.map((model) => (
                  <button
                    key={model.id}
                    onClick={() => handleModelChange(model.id)}
                    className={`w-full px-4 py-2.5 text-left hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0 ${
                      selectedModel === model.id
                        ? 'bg-indigo-50 text-indigo-700 font-medium'
                        : 'text-gray-700'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <ProviderIcon providerId={model.provider} size={16} className="shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <div className="text-sm font-medium truncate">{model.name}</div>
                          {model.supportsVision && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded text-xs shrink-0 border border-purple-200">
                              <ImageIcon className="w-3 h-3" />
                              视觉
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5 truncate">{model.providerName}</div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-xs px-2 py-0.5 rounded border flex items-center gap-1 ${
                          PROVIDER_COLORS[model.provider] || 'bg-gray-100 text-gray-700 border-gray-200'
                        }`}>
                          <ProviderIcon providerId={model.provider} size={12} />
                          {model.providerName}
                        </span>
                        {selectedModel === model.id && (
                          <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
};

