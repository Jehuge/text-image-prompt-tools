import { useState, useEffect } from 'react'
import { Brain, ChevronDown, CheckCircle2, Image as ImageIcon, FileText } from 'lucide-react'
import toast from 'react-hot-toast'
import type { TextAdapterRegistry } from '@text-image-prompt-tools/core'

interface ModelOption {
  id: string
  name: string
  provider: string
  providerName: string
  modelId: string
  supportsVision?: boolean
}

interface ProviderConfig {
  provider: string
  apiKey: string
  baseUrl?: string
  model: string
  models: string[]
  modelCapabilities?: Record<string, { supportsVision: boolean }>
}

interface ModelSelectorPanelProps {
  registry?: TextAdapterRegistry | null
}

const PROVIDER_LABELS: Record<string, string> = {
  openai: 'OpenAI',
  deepseek: 'DeepSeek',
  siliconflow: 'SiliconFlow',
  anthropic: 'Anthropic',
  gemini: 'Gemini',
  zhipu: 'Zhipu',
  ollama: 'Ollama',
}

const PROVIDER_COLORS: Record<string, string> = {
  openai: 'bg-green-50 text-green-700 border-green-200',
  deepseek: 'bg-blue-50 text-blue-700 border-blue-200',
  siliconflow: 'bg-blue-50 text-blue-700 border-blue-200',
  anthropic: 'bg-orange-50 text-orange-700 border-orange-200',
  gemini: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  zhipu: 'bg-blue-50 text-blue-700 border-blue-200',
  ollama: 'bg-teal-50 text-teal-700 border-teal-200',
}

export default function ModelSelectorPanel({ registry }: ModelSelectorPanelProps = {}) {
  const [selectedModel, setSelectedModel] = useState<string>('')
  const [availableModels, setAvailableModels] = useState<ModelOption[]>([])
  const [isOpen, setIsOpen] = useState(false)

  // 获取模型的能力信息（只从保存的真实信息中获取，不使用推断）
  const getModelCapabilities = (providerId: string, modelId: string, config: ProviderConfig): { supportsVision: boolean } => {
    // 从保存的配置中获取视觉支持信息（这些信息是从真实 API 获取的）
    if (config.modelCapabilities && config.modelCapabilities[modelId]) {
      return config.modelCapabilities[modelId]
    }
    // 如果没有保存的信息，返回 false（不进行推断）
    return { supportsVision: false }
  }

  // 从 localStorage 加载所有已配置的模型
  const loadModels = () => {
    try {
      const savedConfigs = localStorage.getItem('modelConfigs')
      
      if (!savedConfigs) {
        setAvailableModels([])
        setSelectedModel('')
        return
      }

      const configs = JSON.parse(savedConfigs)
      const modelList: ModelOption[] = []

      // 遍历所有配置，提取已配置的模型
      Object.entries(configs).forEach(([providerId, config]: [string, any]) => {
        if (!config || typeof config !== 'object') {
          return
        }
        
        // 支持新格式（instances）和旧格式（兼容性）
        let instances: any[] = []
        if (config.instances && Array.isArray(config.instances)) {
          // 新格式：使用 instances 数组
          instances = config.instances
        } else if (config.apiKey || config.baseUrl || config.models || config.model) {
          // 旧格式：转换为单个实例
          instances = [{
            id: 'default',
            name: '默认配置',
            apiKey: config.apiKey || '',
            baseUrl: config.baseUrl || '',
            models: config.models || (config.model ? [config.model] : []),
            modelCapabilities: config.modelCapabilities || {},
          }]
        }
        
        // 遍历所有实例
        instances.forEach((instance: any) => {
          const modelIds = instance.models && Array.isArray(instance.models) && instance.models.length > 0
            ? instance.models
            : (instance.model && typeof instance.model === 'string' && instance.model.trim() ? [instance.model.trim()] : [])
          
          // 检查是否有 API Key（某些提供商可能不需要）
          const hasApiKey = !instance.apiKey || (instance.apiKey && typeof instance.apiKey === 'string' && instance.apiKey.trim())
          
          // 只有同时满足：有模型 且 有 API Key（如果需要）才添加
          if (modelIds.length > 0 && hasApiKey) {
            // 遍历所有选中的模型
            modelIds.forEach((modelId: string) => {
              const trimmedModelId = typeof modelId === 'string' ? modelId.trim() : String(modelId).trim()
              if (!trimmedModelId) return
              
              // 新格式：ID 包含实例 ID，格式为 provider-instanceId-modelId
              const instancePrefix = instance.id && instance.id !== 'default' ? `${providerId}-${instance.id}-` : `${providerId}-`
              let optionId: string
              if (trimmedModelId.startsWith(instancePrefix)) {
                optionId = trimmedModelId
              } else if (trimmedModelId.startsWith(`${providerId}-`)) {
                const modelIdWithoutPrefix = trimmedModelId.substring(providerId.length + 1)
                optionId = `${instancePrefix}${modelIdWithoutPrefix}`
              } else {
                optionId = `${instancePrefix}${trimmedModelId}`
              }
              
              // 模型名称处理
              let modelName = trimmedModelId
              
              // 移除实例前缀（如果存在）用于显示
              if (modelName.startsWith(instancePrefix)) {
                modelName = modelName.substring(instancePrefix.length)
              } else if (modelName.startsWith(`${providerId}-`)) {
                modelName = modelName.substring(providerId.length + 1)
              }
              
              // 处理特殊格式的模型名称（如 hf.co/unsloth/Qwen3-4B-GGUF:Q6_K_XL）
              // 提取最后一部分作为显示名称
              if (modelName.includes('/')) {
                const parts = modelName.split('/')
                modelName = parts[parts.length - 1]
              }
              
              // 处理量化格式（如 :Q6_K_XL），保留量化信息
              if (modelName.includes(':')) {
                const colonIndex = modelName.lastIndexOf(':')
                if (colonIndex > 0) {
                  const baseName = modelName.substring(0, colonIndex)
                  const quantInfo = modelName.substring(colonIndex + 1)
                  modelName = `${baseName} (${quantInfo})`
                }
              }
              
              // 如果有实例名称且不是默认配置，添加到显示名称
              if (instance.name && instance.name !== '默认配置' && instance.name !== 'default') {
                modelName = `${instance.name} - ${modelName}`
              }
              
              // 获取模型的能力信息（从保存的真实信息中获取）
              const capabilities = getModelCapabilities(providerId, trimmedModelId, instance as ProviderConfig)
              
              const modelOption: ModelOption = {
                id: optionId,
                name: modelName,
                provider: providerId,
                providerName: PROVIDER_LABELS[providerId] || providerId,
                modelId: trimmedModelId,
                supportsVision: capabilities.supportsVision,
              }
              
              modelList.push(modelOption)
            })
          }
        })
      })

      // 按提供商名称排序，然后按模型名称排序
      modelList.sort((a, b) => {
        if (a.providerName !== b.providerName) {
          return a.providerName.localeCompare(b.providerName)
        }
        return a.name.localeCompare(b.name)
      })

      setAvailableModels(modelList)

      // 加载已选择的模型
      const savedSelected = localStorage.getItem('selectedModel')
      
      if (savedSelected && modelList.find(m => m.id === savedSelected)) {
        setSelectedModel(savedSelected)
      } else if (modelList.length > 0) {
        // 如果没有保存的选择，选择第一个
        setSelectedModel(modelList[0].id)
        localStorage.setItem('selectedModel', modelList[0].id)
        // 触发自定义事件，通知其他组件模型已更改
        window.dispatchEvent(new Event('modelChanged'))
      } else {
        setSelectedModel('')
      }
    } catch (error) {
      console.error('加载模型列表失败:', error)
      setAvailableModels([])
      setSelectedModel('')
    }
  }

  useEffect(() => {
    loadModels()

    // 监听 storage 变化
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'modelConfigs' || e.key === 'selectedModel') {
        loadModels()
      }
    }
    window.addEventListener('storage', handleStorageChange)

    // 定期检查配置变化（因为同窗口的 localStorage 变化不会触发 storage 事件）
    const interval = setInterval(loadModels, 1000)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
      clearInterval(interval)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [registry])

  const currentModel = availableModels.find(m => m.id === selectedModel)

  const handleModelChange = (modelId: string) => {
    setSelectedModel(modelId)
    localStorage.setItem('selectedModel', modelId)
    setIsOpen(false)
    const model = availableModels.find(m => m.id === modelId)
    if (model) {
      toast.success(`已切换到: ${model.providerName} - ${model.name}`)
      // 触发自定义事件，通知其他组件模型已更改
      window.dispatchEvent(new Event('modelChanged'))
    }
  }

  if (availableModels.length === 0) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
        <div className="flex items-start gap-3">
          <Brain className="w-5 h-5 text-yellow-600 mt-0.5 shrink-0" />
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-yellow-900 mb-1">未配置模型</h3>
            <p className="text-xs text-yellow-800">
              请先在下方配置至少一个提供商的 API Key 和模型，然后才能在此处选择使用。
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6 shadow-sm max-w-5xl mx-auto">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">选择当前使用的模型</h2>
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50/50 transition-all text-left"
        >
          <div className="flex items-center gap-3 min-w-0">
            <Brain className="w-5 h-5 text-blue-600 shrink-0" />
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
                  <div className="text-xs text-gray-500 mt-0.5">
                    {currentModel.providerName}
                  </div>
                </>
              ) : (
                <div className="text-sm text-gray-500">请选择模型</div>
              )}
            </div>
            {currentModel && (
              <span className={`text-xs px-2.5 py-1 rounded border shrink-0 ${
                PROVIDER_COLORS[currentModel.provider] || 'bg-gray-100 text-gray-700 border-gray-200'
              }`}>
                {currentModel.providerName}
              </span>
            )}
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
                      className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0 ${
                        selectedModel === model.id
                          ? 'bg-blue-50 text-blue-700 font-medium'
                          : 'text-gray-700'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Brain className="w-4 h-4" />
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
                          <div className="text-xs text-gray-500 mt-0.5">{model.providerName}</div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`text-xs px-2 py-0.5 rounded border ${
                            PROVIDER_COLORS[model.provider] || 'bg-gray-100 text-gray-700 border-gray-200'
                          }`}>
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
      <p className="text-xs text-gray-500 mt-2">
        当前选择的模型将用于生成内容。共 {availableModels.length} 个可用模型，可以在下方配置更多模型。
      </p>
    </div>
  )
}

