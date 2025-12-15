import React, { useState, useEffect } from 'react';
import { Brain, ChevronDown, CheckCircle2, Image as ImageIcon, FileText } from 'lucide-react';

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
  availableModels?: Array<{ id: string; name: string; supportsVision?: boolean }>; // 外部传入的模型列表（可选）
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
  siliconflow: 'bg-blue-50 text-blue-700 border-blue-200',
  anthropic: 'bg-orange-50 text-orange-700 border-orange-200',
  gemini: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  zhipu: 'bg-blue-50 text-blue-700 border-blue-200',
  ollama: 'bg-teal-50 text-teal-700 border-teal-200',
};

// 提供商图标文件映射
// 使用相对路径以支持 Electron 的 file:// 协议
const PROVIDER_ICON_MAP: Record<string, string> = {
  openai: './icons/openai-svgrepo-com.svg',
  anthropic: './icons/claude-color.svg',
  gemini: './icons/gemini-color.svg',
  deepseek: './icons/deepseek-color.svg',
  siliconflow: './icons/siliconcloud-color.svg',
  zhipu: './icons/chatglm-color.svg',
  ollama: './icons/ollama.svg',
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
  availableModels: externalModels,
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

    // OpenAI 模型：包含 vision、4、gpt-5 或 gpt5 的模型支持 Vision
    if (providerId === 'openai') {
      if (lowerModelId.includes('vision') ||
        lowerModelId.includes('4') ||
        lowerModelId.includes('gpt-4') ||
        lowerModelId.includes('gpt-5') ||  // GPT-5 系列支持视觉
        lowerModelId.includes('gpt5')) {   // GPT5 系列支持视觉（兼容不同命名格式）
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

        // 支持新格式（instances）和旧格式（兼容性）
        let instances: any[] = [];
        if (config.instances && Array.isArray(config.instances)) {
          // 新格式：使用 instances 数组
          instances = config.instances;
        } else if (config.apiKey || config.baseUrl || config.models || config.model) {
          // 旧格式：转换为单个实例
          instances = [{
            id: 'default',
            name: '默认配置',
            apiKey: config.apiKey || '',
            baseUrl: config.baseUrl || '',
            models: config.models || (config.model ? [config.model] : []),
            modelCapabilities: config.modelCapabilities || {},
          }];
        }

        // 遍历所有实例
        instances.forEach((instance: any) => {
          const modelIds = instance.models && Array.isArray(instance.models) && instance.models.length > 0
            ? instance.models
            : (instance.model && typeof instance.model === 'string' && instance.model.trim() ? [instance.model.trim()] : []);

          const hasApiKey = !instance.apiKey || (instance.apiKey && typeof instance.apiKey === 'string' && instance.apiKey.trim());

          if (modelIds.length > 0 && hasApiKey) {
            modelIds.forEach((modelId: string) => {
              const trimmedModelId = typeof modelId === 'string' ? modelId.trim() : String(modelId).trim();
              if (!trimmedModelId) return;

              // 直接使用 provider-modelId 格式，不包含实例前缀
              // 实例信息通过 connectionConfig.baseURL 区分
              const hasProviderPrefix = trimmedModelId.startsWith(`${providerId}-`);
              const hasPathOrAlias = trimmedModelId.includes('/') || trimmedModelId.includes(':');

              // 生成 ID：如果已经有 provider 前缀或路径，直接使用；否则添加 provider 前缀
              const optionId = (hasProviderPrefix || hasPathOrAlias)
                ? trimmedModelId
                : `${providerId}-${trimmedModelId}`;

              // 模型名称处理：移除 provider 前缀用于显示
              let modelName = trimmedModelId;
              if (modelName.startsWith(`${providerId}-`)) {
                modelName = modelName.substring(providerId.length + 1);
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

              // 如果有实例名称且不是默认配置，添加到显示名称
              if (instance.name && instance.name !== '默认配置' && instance.name !== 'default') {
                modelName = `${instance.name} - ${modelName}`;
              }

              const capabilities = getModelCapabilities(providerId, trimmedModelId, instance as ProviderConfig);

              // 如果设置了只显示支持 Vision 的模型，进行过滤
              if (filterVisionOnly && !capabilities.supportsVision) {
                return;
              }

              const modelOption: ModelOption = {
                id: optionId,
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

      const findModel = (id: string | null) => id && modelList.find(m => m.id === id);
      const savedSelectedRaw = localStorage.getItem(storageKey);

      const normalizeDuplicatePrefix = (id: string) => {
        // 将形如 "provider-provider-model" 规范为 "provider-model"
        const parts = id.split('-');
        if (parts.length > 2 && parts[0] === parts[1]) {
          return [parts[0], ...parts.slice(2)].join('-');
        }
        return id;
      };

      const selected = findModel(savedSelectedRaw)
        || (savedSelectedRaw ? findModel(normalizeDuplicatePrefix(savedSelectedRaw)) : undefined);

      if (selected) {
        // 找到了保存的选择，使用它
        setSelectedModel(selected.id);
        if (onChange) {
          onChange(selected.id);
        }
      } else if (value && value !== '') {
        // 有外部传入的值，优先使用它
        const valueModel = findModel(value);
        if (valueModel) {
          setSelectedModel(value);
        } else if (modelList.length > 0) {
          // value 对应的模型不在列表中，但有模型列表，选择第一个
          setSelectedModel(modelList[0].id);
          localStorage.setItem(storageKey, modelList[0].id);
          if (onChange) {
            onChange(modelList[0].id);
          }
        } else {
          setSelectedModel('');
        }
      } else if (modelList.length > 0) {
        // 没有保存的选择，也没有外部传入的值，但有模型列表
        // 检查当前 selectedModel 是否还在列表中
        const currentModelInList = selectedModel && findModel(selectedModel);
        if (currentModelInList) {
          // 当前选择还在列表中，保持不变
          // 不更新，避免覆盖用户的选择
        } else {
          // 当前选择不在列表中，选择第一个（仅在首次加载时）
          // 但如果之前有保存的选择（只是不在当前列表中），不要自动覆盖
          if (!savedSelectedRaw) {
            // 确实没有任何保存的选择，才自动选择第一个
            setSelectedModel(modelList[0].id);
            localStorage.setItem(storageKey, modelList[0].id);
            if (onChange) {
              onChange(modelList[0].id);
            }
          } else {
            // 有保存的选择但不在当前列表中，保持当前状态或设为空
            // 不自动选择第一个，避免覆盖用户之前的选择
            if (!selectedModel) {
              setSelectedModel('');
            }
          }
        }
      } else {
        setSelectedModel('');
      }
    } catch (error) {
      console.error('加载模型列表失败:', error);
      setAvailableModels([]);
      setSelectedModel('');
    }
  };

  // 如果外部传入了模型列表，直接使用；否则从 localStorage 加载
  useEffect(() => {
    if (externalModels && externalModels.length > 0) {
      // 将外部模型列表转换为 ModelOption 格式
      const modelOptions: ModelOption[] = externalModels.map(model => {
        // 解析 provider 和 modelId
        const parts = model.id.split('-');
        const providerId = parts[0] || 'unknown';
        const modelId = parts.slice(1).join('-') || model.id;

        // 推断是否支持 Vision：优先使用传入的 supportsVision，否则尝试推断
        const supportsVision = model.supportsVision !== undefined
          ? model.supportsVision
          : inferVisionSupport(providerId, modelId);

        return {
          id: model.id,
          name: model.name,
          provider: providerId,
          providerName: PROVIDER_LABELS[providerId] || providerId,
          modelId: modelId,
          supportsVision: supportsVision,
        };
      });

      // 如果设置了 filterVisionOnly，只保留支持 Vision 的模型
      const filteredModels = filterVisionOnly
        ? modelOptions.filter(m => m.supportsVision)
        : modelOptions;

      setAvailableModels(filteredModels);

      // 当使用 externalModels 时，也需要从 localStorage 恢复选择
      // 注意：要优先使用保存的选择，而不是 value prop（因为 value 可能是空字符串）
      try {
        const savedSelected = localStorage.getItem(storageKey);
        const findModel = (id: string) => filteredModels.find(m => m.id === id);
        const normalizeDuplicatePrefix = (id: string) => {
          const parts = id.split('-');
          if (parts.length > 2 && parts[0] === parts[1]) {
            return [parts[0], ...parts.slice(2)].join('-');
          }
          return id;
        };

        if (filteredModels.length > 0) {
          // 优先使用保存的选择（即使 value prop 有值，也优先使用保存的选择）
          if (savedSelected) {
            const selected = findModel(savedSelected) || findModel(normalizeDuplicatePrefix(savedSelected));
            if (selected) {
              // 找到了保存的模型，使用它（优先于 value prop）
              setSelectedModel(selected.id);
              if (onChange) {
                onChange(selected.id);
              }
              return; // 找到保存的选择，直接返回，不检查 value
            }
          }

          // 如果没有保存的选择，再检查 value prop
          if (value && value !== '') {
            const valueModel = findModel(value);
            if (valueModel) {
              // value 对应的模型在列表中，使用它
              setSelectedModel(value);
              return;
            }
          }

          // 检查当前 selectedModel 是否还在列表中
          const currentModelInList = selectedModel && findModel(selectedModel);
          if (currentModelInList) {
            // 当前选择还在列表中，保持不变，不覆盖用户的选择
            return;
          }

          // 如果既没有保存的选择，value 也是空的或不在列表中，且当前选择也不在列表中
          // 只有在确实没有任何选择时，才自动选择第一个
          if (filteredModels.length > 0) {
            // 如果之前有保存的选择（只是不在当前列表中），不要自动覆盖
            if (!savedSelected) {
              // 确实没有任何保存的选择，才自动选择第一个
              setSelectedModel(filteredModels[0].id);
              localStorage.setItem(storageKey, filteredModels[0].id);
              if (onChange) {
                onChange(filteredModels[0].id);
              }
            } else {
              // 有保存的选择但不在当前列表中，保持当前状态
              // 不自动选择第一个，避免覆盖用户之前的选择
              if (!selectedModel) {
                setSelectedModel('');
              }
            }
          }
        } else if (value && value !== '') {
          // 没有可用模型，但有外部传入的 value，使用它
          setSelectedModel(value);
        }
      } catch (e) {
        console.warn('恢复模型选择失败', e);
        // 出错时至少使用外部传入的 value
        if (value && value !== '') {
          setSelectedModel(value);
        }
      }
    } else {
      // 没有外部模型列表，从 localStorage 加载
      loadModels();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [externalModels, filterVisionOnly]);

  useEffect(() => {
    // 监听 storage 变化（仅在从 localStorage 加载时）
    if (!externalModels || externalModels.length === 0) {
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
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey, filterVisionOnly, externalModels]);

  // 当外部 value 变化时更新内部状态
  // 但要注意：如果 value 是空字符串且我们有保存的选择，应该优先使用保存的选择
  // 另外，如果当前 selectedModel 是从 localStorage 恢复的，不要被空的 value 覆盖
  useEffect(() => {
    if (value !== undefined && value !== selectedModel) {
      // 如果 value 是空字符串，且我们有保存的选择，不要覆盖
      if (value === '') {
        const savedSelected = localStorage.getItem(storageKey);
        if (savedSelected && availableModels.length > 0) {
          const findModel = (id: string) => availableModels.find(m => m.id === id);
          if (findModel(savedSelected)) {
            // 有保存的选择且在列表中，不覆盖
            return;
          }
        }
        // 如果 value 是空字符串且当前 selectedModel 在列表中，也不要覆盖
        if (availableModels.length > 0) {
          const findModel = (id: string) => availableModels.find(m => m.id === id);
          if (findModel(selectedModel)) {
            // 当前选择在列表中，不覆盖
            return;
          }
        }
      }
      // 只有当 value 非空且对应的模型在列表中时，才更新
      if (value && value !== '') {
        const findModel = (id: string) => availableModels.find(m => m.id === id);
        if (findModel(value)) {
          setSelectedModel(value);
        }
      }
    }
  }, [value, selectedModel, storageKey, availableModels]);

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
        className="w-full flex items-center justify-between px-3 py-2 bg-white border border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50/50 transition-all text-left text-sm"
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {currentModel ? (
            <ProviderIcon providerId={currentModel.provider} size={16} className="shrink-0" />
          ) : (
            <Brain className="w-4 h-4 text-blue-600 shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            {currentModel ? (
              <>
                <div className="flex items-center gap-2">
                  <div className="text-sm font-medium text-gray-900 truncate">
                    {currentModel.name}
                  </div>
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-gray-100 text-gray-700 rounded text-xs shrink-0 border border-gray-200">
                    <FileText className="w-3 h-3" />
                    text
                  </span>
                  {currentModel.supportsVision && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-xs shrink-0 border border-blue-200">
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
                    className={`w-full px-4 py-2.5 text-left hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0 ${selectedModel === model.id
                      ? 'bg-blue-50 text-blue-700 font-medium'
                      : 'text-gray-700'
                      }`}
                  >
                    <div className="flex items-center gap-2">
                      <ProviderIcon providerId={model.provider} size={16} className="shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <div className="text-sm font-medium truncate">{model.name}</div>
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-gray-100 text-gray-700 rounded text-xs shrink-0 border border-gray-200">
                            <FileText className="w-3 h-3" />
                            text
                          </span>
                          {model.supportsVision && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-xs shrink-0 border border-blue-200">
                              <ImageIcon className="w-3 h-3" />
                              视觉
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5 truncate">{model.providerName}</div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-xs px-2 py-0.5 rounded border flex items-center gap-1 ${PROVIDER_COLORS[model.provider] || 'bg-gray-100 text-gray-700 border-gray-200'
                          }`}>
                          <ProviderIcon providerId={model.provider} size={12} />
                          {model.providerName}
                        </span>
                        {selectedModel === model.id && (
                          <CheckCircle2 className="w-4 h-4 text-blue-600" />
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

