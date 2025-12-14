import { useState, useEffect, useRef } from 'react'
import { Save, Eye, EyeOff, Key, Brain, CheckCircle2, RefreshCw, Loader2, Info, Image as ImageIcon, FileText, Plus, X, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import type { TextAdapterRegistry, TextProvider, TextModelConfig, TextModel } from '@text-image-prompt-tools/core'
import { LocalStorageModelManager } from '@text-image-prompt-tools/core'
import { ModelService } from '../services/modelService'
import { ProviderIcon } from '../utils/providerIcons'

interface ConfigInstance {
  id: string  // 配置实例的唯一 ID
  name: string  // 配置实例的名称（用于区分，如 "LMStudio 本地"、"LMStudio 远程"）
  apiKey: string
  baseUrl?: string
  model: string  // 保留用于兼容，但主要使用 models
  models: string[]  // 多选的模型列表
  modelCapabilities?: Record<string, { supportsVision: boolean }>  // 保存每个模型的视觉支持信息
}

interface ProviderConfig {
  provider: string
  instances: ConfigInstance[]  // 支持多个配置实例
  defaultInstanceId?: string  // 默认使用的配置实例 ID
}

interface ModelItem {
  id: string
  name: string
  provider: string
  supportsVision?: boolean
}

const PROVIDER_COLORS: Record<string, string> = {
  openai: 'bg-green-50',
  deepseek: 'bg-blue-50',
  siliconflow: 'bg-blue-50',
  anthropic: 'bg-orange-50',
  gemini: 'bg-yellow-50',
  zhipu: 'bg-blue-50',
  ollama: 'bg-teal-50',
}

interface ModelConfigProps {
  registry: TextAdapterRegistry
  providers: TextProvider[]
}

export const ModelConfig: React.FC<ModelConfigProps> = ({
  registry,
  providers: initialProviders,
}) => {
  const [providers, setProviders] = useState<TextProvider[]>(initialProviders)
  const [selectedProvider, setSelectedProvider] = useState<string>(initialProviders[0]?.id || '')
  const [selectedInstanceId, setSelectedInstanceId] = useState<string>('')  // 当前选中的配置实例 ID
  const [configs, setConfigs] = useState<Record<string, ProviderConfig>>({})
  const [showApiKeys, setShowApiKeys] = useState<Record<string, boolean>>({})
  const [saving, setSaving] = useState(false)
  const [loadingModels, setLoadingModels] = useState(false)
  const [availableModels, setAvailableModels] = useState<ModelItem[]>([])
  const loadModelsRef = useRef<(() => Promise<void>) | null>(null)
  // 缓存已加载的模型列表，避免重复请求
  const modelsCacheRef = useRef<Record<string, { models: ModelItem[], timestamp: number }>>({})
  // 防止重复加载提供商列表
  const providersLoadedRef = useRef(false)
  // 防止重复请求的锁
  const loadingLockRef = useRef<string | null>(null)

  const modelService = new ModelService(registry)

  // 生成新的配置实例 ID
  const generateInstanceId = () => {
    return `instance-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  // 加载提供商列表
  useEffect(() => {
    // 如果已经加载过，直接返回
    if (providersLoadedRef.current) {
      return
    }

    const loadProviders = async () => {
      providersLoadedRef.current = true
      try {
        const providerList = modelService.getProviders()
        setProviders(providerList)

        // 初始化配置
        const initialConfigs: Record<string, ProviderConfig> = {}
        providerList.forEach((p: TextProvider) => {
          initialConfigs[p.id] = {
            provider: p.id,
            instances: [],
            defaultInstanceId: undefined,
          }
        })

        // 从 localStorage 加载已保存的配置
        const savedConfigs = localStorage.getItem('modelConfigs')
        if (savedConfigs) {
          try {
            const parsed = JSON.parse(savedConfigs)
            // 处理旧格式的配置（兼容性）
            Object.keys(parsed).forEach((key) => {
              if (initialConfigs[key]) {
                const oldConfig = parsed[key]
                // 检查是否是旧格式（没有 instances 字段）
                if (!oldConfig.instances && (oldConfig.apiKey || oldConfig.baseUrl || oldConfig.models)) {
                  // 转换为新格式：将旧配置转换为一个实例
                  const instanceId = generateInstanceId()
                initialConfigs[key] = {
                    provider: key,
                    instances: [{
                      id: instanceId,
                      name: '默认配置',
                      apiKey: oldConfig.apiKey || '',
                      baseUrl: oldConfig.baseUrl || providerList.find(p => p.id === key)?.defaultBaseURL || '',
                      model: oldConfig.model || '',
                      models: oldConfig.models || (oldConfig.model ? [oldConfig.model] : []),
                      modelCapabilities: oldConfig.modelCapabilities || {},
                    }],
                    defaultInstanceId: instanceId,
                  }
                } else if (oldConfig.instances) {
                  // 新格式，直接使用
                  initialConfigs[key] = {
                    provider: key,
                    instances: oldConfig.instances || [],
                    defaultInstanceId: oldConfig.defaultInstanceId,
                  }
                }
              }
            })
          } catch (e) {
            console.error('加载配置失败:', e)
          }
        }

        setConfigs(initialConfigs)

        // 设置默认选中的提供商
        if (providerList.length > 0 && !selectedProvider) {
          setSelectedProvider(providerList[0].id)
        }
      } catch (error) {
        console.error('加载提供商列表失败:', error)
        // 如果加载失败，重置标记，允许重试
        providersLoadedRef.current = false
      }
    }
    loadProviders()
  }, [])

  // 获取当前选中的配置实例
  const getCurrentInstance = (): ConfigInstance | null => {
    const providerConfig = configs[selectedProvider]
    if (!providerConfig || !providerConfig.instances || providerConfig.instances.length === 0) {
      return null
    }
    
    // 如果有选中的实例 ID，使用它；否则使用默认实例或第一个实例
    const instanceId = selectedInstanceId || providerConfig.defaultInstanceId || providerConfig.instances[0]?.id
    return providerConfig.instances.find(inst => inst.id === instanceId) || providerConfig.instances[0] || null
  }

  // 当切换提供商或实例时，从缓存加载模型列表（如果存在）
  useEffect(() => {
    const currentInstance = getCurrentInstance()
    if (!currentInstance) {
      setAvailableModels([])
      return
    }

    const cacheKey = `${selectedProvider}-${currentInstance.id}-${currentInstance.apiKey || ''}-${currentInstance.baseUrl || ''}`
    const cached = modelsCacheRef.current[cacheKey]

    // 如果缓存存在且未过期（5分钟内），直接使用缓存
    if (cached && Date.now() - cached.timestamp < 5 * 60 * 1000) {
      setAvailableModels(cached.models)
    } else {
      // 如果没有缓存或缓存过期，清空列表，等待用户手动刷新
      setAvailableModels([])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProvider, selectedInstanceId, configs])

  // 当切换提供商时，自动选择第一个实例或默认实例
  useEffect(() => {
    const providerConfig = configs[selectedProvider]
    if (providerConfig && providerConfig.instances && providerConfig.instances.length > 0) {
      const instanceId = providerConfig.defaultInstanceId || providerConfig.instances[0]?.id
      if (instanceId && instanceId !== selectedInstanceId) {
        setSelectedInstanceId(instanceId)
      }
    } else {
      setSelectedInstanceId('')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProvider])

  const currentInstance = getCurrentInstance()

  // 判断是否需要 API Key
  // 对于自定义 baseURL（如 LMStudio），即使 provider 要求 API Key，也允许为空
  const requiresApiKey = () => {
    if (!currentInstance || !currentProvider) return false
    const isCustomBaseURL = currentInstance.baseUrl && 
      currentInstance.baseUrl !== currentProvider.defaultBaseURL
    // 只有对于默认 URL 且 provider 要求 API Key 时才需要
    return currentProvider.requiresApiKey && !isCustomBaseURL
  }

  const loadModels = async () => {
    if (!currentInstance) {
      toast.error('请先添加配置实例')
      return
    }

    // 检查是否需要 API Key
    if (requiresApiKey() && !currentInstance.apiKey?.trim()) {
      toast.error('请先输入 API Key')
      setAvailableModels([])
      return
    }

    // 检查缓存
    const cacheKey = `${selectedProvider}-${currentInstance.id}-${currentInstance.apiKey || ''}-${currentInstance.baseUrl || ''}`
    const cached = modelsCacheRef.current[cacheKey]

    // 如果缓存存在且未过期（5分钟内），直接使用缓存
    if (cached && Date.now() - cached.timestamp < 5 * 60 * 1000) {
      setAvailableModels(cached.models)
      toast.success(`已加载缓存的模型列表（${cached.models.length} 个模型）`, { duration: 2000 })
      return
    }

    // 防止重复请求：如果正在加载相同的配置，直接返回
    if (loadingLockRef.current === cacheKey && loadingModels) {
      console.log('[ModelConfig] 正在加载中，跳过重复请求')
      return
    }

    // 设置加载锁
    loadingLockRef.current = cacheKey
    setLoadingModels(true)
    try {
      const response = await modelService.getModelList({
        provider: selectedProvider,
        api_key: currentInstance.apiKey || '',
        base_url: currentInstance.baseUrl || undefined,
      })

      if (response.code === 200) {
        const models = response.data || []
        setAvailableModels(models)

        // 保存到缓存
        modelsCacheRef.current[cacheKey] = {
          models,
          timestamp: Date.now(),
        }

        // 同时保存到 localStorage 作为持久化缓存
        try {
          const cacheStorageKey = 'modelListCache'
          const allCache = JSON.parse(localStorage.getItem(cacheStorageKey) || '{}')
          allCache[cacheKey] = {
            models,
            timestamp: Date.now(),
          }
          localStorage.setItem(cacheStorageKey, JSON.stringify(allCache))
        } catch (e) {
          console.warn('保存模型列表缓存失败:', e)
        }

        toast.success(`已加载 ${models.length} 个模型`, { duration: 2000 })
      } else {
        toast.error(response.msg || '获取模型列表失败')
        setAvailableModels([])
      }
    } catch (error: any) {
      console.error('获取模型列表失败:', {
        error: error,
        message: error?.message,
        response: error?.response,
        provider: selectedProvider,
        baseURL: currentInstance.baseUrl,
        hasApiKey: !!currentInstance.apiKey,
      })
      const errorMessage = error?.message || error?.response?.data?.message || '获取模型列表失败'
      toast.error(errorMessage, { duration: 4000 })
      setAvailableModels([])
    } finally {
      setLoadingModels(false)
      // 清除加载锁
      if (loadingLockRef.current === cacheKey) {
        loadingLockRef.current = null
      }
    }
  }

  // 将 loadModels 保存到 ref，供 useEffect 使用
  useEffect(() => {
    loadModelsRef.current = loadModels
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentInstance?.apiKey, currentInstance?.baseUrl, selectedProvider, selectedInstanceId])

  const handleSave = async () => {
    if (!currentInstance) {
      toast.error('请先添加配置实例')
      return
    }

    setSaving(true)
    try {
      // 验证 API Key（如果需要）
      if (requiresApiKey() && !currentInstance.apiKey.trim()) {
        toast.error('请输入 API Key')
        setSaving(false)
        return
      }

      // 验证模型（至少选择一个）
      if (!currentInstance.models || currentInstance.models.length === 0) {
        toast.error('请至少选择一个模型')
        setSaving(false)
        return
      }

      // 保存模型能力信息（从真实获取的模型列表中）
      const modelCapabilities: Record<string, { supportsVision: boolean }> = {}
      currentInstance.models.forEach((modelId: string) => {
        const model = availableModels.find((m: ModelItem) => m.id === modelId)
        if (model) {
          modelCapabilities[modelId] = {
            supportsVision: model.supportsVision || false,
          }
        }
      })

      // 同步保存到 LocalStorageModelManager (供 PromptService 使用)
      try {
        const manager = new LocalStorageModelManager()
        const providerMeta = providers.find(p => p.id === selectedProvider)

        if (providerMeta) {
          // 获取该提供商下所有现有模型，以便清除未选中的
          const allExistingModels = await manager.getAllModels()
          const providerModels = allExistingModels.filter(m => m.providerMeta.id === selectedProvider)

          // 找出本次选中的 ID Set
          const selectedOptionIds = new Set<string>()

          for (const modelId of currentInstance.models) {
            const modelDef = availableModels.find(m => m.id === modelId)
            // 直接使用从 API 返回的模型 ID，不添加任何前缀
            const trimmedModelId = typeof modelId === 'string' ? modelId.trim() : String(modelId).trim()
            
            // 生成唯一 ID：provider-modelId，用于在系统中标识
            // 如果同一个 provider 有多个实例使用相同模型，通过 connectionConfig 来区分
            const hasProviderPrefix = trimmedModelId.startsWith(`${selectedProvider}-`)
            const hasPathOrAlias = trimmedModelId.includes('/') || trimmedModelId.includes(':') // Ollama model with path or HF format
            const optionId = (hasProviderPrefix || hasPathOrAlias)
              ? trimmedModelId  // 如果已经有前缀或路径，直接使用
              : `${selectedProvider}-${trimmedModelId}`  // 否则添加 provider 前缀

            selectedOptionIds.add(optionId)

            const textModelConfig: TextModelConfig = {
              id: optionId,
              name: modelDef?.name || trimmedModelId,
              enabled: true,
              providerMeta,
              modelMeta: {
                id: trimmedModelId, // 实际传递给 API 的模型 ID（原始模型 ID，不包含任何前缀）
                name: modelDef?.name || trimmedModelId,
                providerId: selectedProvider,
                capabilities: {
                  supportsVision: modelDef?.supportsVision || false,
                  supportsTools: false,
                  maxContextLength: 128000 // 默认值
                }
              },
              connectionConfig: {
                apiKey: currentInstance.apiKey,
                baseURL: currentInstance.baseUrl  // 通过 baseURL 区分不同的实例
              }
            }

            await manager.saveModel(textModelConfig)
          }

          // 删除不再选中的模型
          /*
          // 暂时注释掉删除逻辑，以免误删其他同源但不同配置的模型（虽然目前主要是 provider 维度）
          for (const existingModel of providerModels) {
            if (!selectedOptionIds.has(existingModel.id)) {
               await manager.deleteModel(existingModel.id)
            }
          }
          */
        }
      } catch (err) {
        console.error('同步保存到 ModelManager 失败:', err)
        // 不中断 UI 保存流程
      }

      // 更新当前实例
      const providerConfig = configs[selectedProvider] || { provider: selectedProvider, instances: [], defaultInstanceId: undefined }
      const updatedInstances = providerConfig.instances.map(inst => 
        inst.id === currentInstance.id 
          ? { ...currentInstance, modelCapabilities }
          : inst
      )

      // 保存到 localStorage - 确保保存完整的配置对象，包括所有提供商
      const updatedConfigs = {
        ...configs,  // 保留所有其他提供商的配置
        [selectedProvider]: {
          provider: selectedProvider,
          instances: updatedInstances,
          defaultInstanceId: providerConfig.defaultInstanceId || currentInstance.id,
        },
      }

      // 确保所有提供商的配置都被保留
      providers.forEach((provider) => {
        if (!updatedConfigs[provider.id]) {
          updatedConfigs[provider.id] = {
            provider: provider.id,
            instances: [],
            defaultInstanceId: undefined,
          }
        }
      })

      localStorage.setItem('modelConfigs', JSON.stringify(updatedConfigs))
      setConfigs(updatedConfigs)

      // 显示保存的配置信息
      const selectedModelNames = currentInstance.models
        .map((modelId: string) => {
          const model = availableModels.find((m: ModelItem) => m.id === modelId)
          return model?.name || modelId
        })
        .join(', ')
      toast.success(`配置保存成功！已选择 ${currentInstance.models.length} 个模型：${selectedModelNames}`, { duration: 3000 })

      // 保存后重新加载模型列表，确保显示正确
      setTimeout(() => {
        loadModels()
      }, 500)
    } catch (error: any) {
      toast.error(error.message || '保存失败')
    } finally {
      setSaving(false)
    }
  }

  const handleConfigChange = (field: keyof ConfigInstance, value: string) => {
    if (!currentInstance) return

    const providerConfig = configs[selectedProvider] || { provider: selectedProvider, instances: [], defaultInstanceId: undefined }
    const updatedInstances = providerConfig.instances.map(inst => 
      inst.id === currentInstance.id 
        ? { ...inst, [field]: value }
        : inst
    )

    setConfigs((prev) => ({
      ...prev,
      [selectedProvider]: {
        ...providerConfig,
        instances: updatedInstances,
      },
    }))
  }

  // 处理模型多选
  const handleModelToggle = (modelId: string) => {
    if (!currentInstance) return

    const currentModels = currentInstance.models || []
    const isSelected = currentModels.includes(modelId)

    const updatedModels = isSelected
      ? currentModels.filter((id: string) => id !== modelId)
      : [...currentModels, modelId]

    const providerConfig = configs[selectedProvider] || { provider: selectedProvider, instances: [], defaultInstanceId: undefined }
    const updatedInstances = providerConfig.instances.map(inst => 
      inst.id === currentInstance.id 
        ? { ...inst, models: updatedModels, model: updatedModels.length > 0 ? updatedModels[0] : '' }
        : inst
    )

    setConfigs((prev) => ({
      ...prev,
      [selectedProvider]: {
        ...providerConfig,
        instances: updatedInstances,
      },
    }))
  }

  // 添加新的配置实例
  const handleAddInstance = () => {
    const provider = providers.find(p => p.id === selectedProvider)
    const newInstance: ConfigInstance = {
      id: generateInstanceId(),
      name: `配置 ${(configs[selectedProvider]?.instances?.length || 0) + 1}`,
      apiKey: '',
      baseUrl: provider?.defaultBaseURL || '',
      model: '',
      models: [],
      modelCapabilities: {},
    }

    const providerConfig = configs[selectedProvider] || { provider: selectedProvider, instances: [], defaultInstanceId: undefined }
    const updatedInstances = [...(providerConfig.instances || []), newInstance]

    setConfigs((prev) => ({
      ...prev,
      [selectedProvider]: {
        ...providerConfig,
        instances: updatedInstances,
        defaultInstanceId: newInstance.id,
      },
    }))

    setSelectedInstanceId(newInstance.id)
    toast.success('已添加新配置实例')
  }

  // 删除配置实例
  const handleDeleteInstance = (instanceId: string) => {
    if (!currentInstance) return

    const providerConfig = configs[selectedProvider]
    if (!providerConfig || !providerConfig.instances) return

    if (providerConfig.instances.length <= 1) {
      toast.error('至少需要保留一个配置实例')
      return
    }

    if (!confirm('确定要删除此配置实例吗？')) {
      return
    }

    const updatedInstances = providerConfig.instances.filter(inst => inst.id !== instanceId)
    const newDefaultInstanceId = updatedInstances.length > 0 ? updatedInstances[0].id : undefined

    setConfigs((prev) => ({
      ...prev,
      [selectedProvider]: {
        ...providerConfig,
        instances: updatedInstances,
        defaultInstanceId: newDefaultInstanceId,
      },
    }))

    if (selectedInstanceId === instanceId) {
      setSelectedInstanceId(newDefaultInstanceId || '')
    }

    toast.success('已删除配置实例')
  }

  // 切换配置实例
  const handleSwitchInstance = (instanceId: string) => {
    setSelectedInstanceId(instanceId)
    setAvailableModels([]) // 清空模型列表，等待重新加载
  }

  const toggleApiKeyVisibility = (provider: string) => {
    setShowApiKeys((prev) => ({
      ...prev,
      [provider]: !prev[provider],
    }))
  }

  const testConnection = async () => {
    if (!currentInstance) {
      toast.error('请先添加配置实例')
      return
    }

    if (requiresApiKey() && !currentInstance.apiKey.trim()) {
      toast.error('请先输入 API Key')
      return
    }

    toast.loading('测试连接中...', { id: 'test-connection' })

    try {
      const response = await modelService.testModelConnection({
        provider: selectedProvider,
        api_key: currentInstance.apiKey || '',
        base_url: currentInstance.baseUrl || undefined,
      })

      if (response.code === 200) {
        toast.success(response.msg || '连接成功', { id: 'test-connection' })
        // 连接成功后，加载模型列表
        setTimeout(() => {
          loadModels()
        }, 300)
      } else {
        toast.error(response.msg || '连接失败', { id: 'test-connection' })
      }
    } catch (error: any) {
      toast.error('连接失败: ' + (error.message || '未知错误'), { id: 'test-connection' })
    }
  }

  const currentProvider = providers.find(p => p.id === selectedProvider)
  const selectedModel = availableModels.find(m => m.id === currentInstance?.model)
  const providerConfig = configs[selectedProvider]
  const instances = providerConfig?.instances || []

  return (
    <div className="h-full overflow-y-auto bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">模型配置</h1>
          <p className="text-gray-600 text-sm">配置 AI 模型的 API Key 和参数</p>
        </div>

        {/* 提供商选择 */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">选择提供商</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {providers.map((provider) => {
              const providerConfig = configs[provider.id]
              const hasInstances = providerConfig?.instances && providerConfig.instances.length > 0
              const hasModel = providerConfig?.instances?.some(inst => inst.models && inst.models.length > 0) || false

              return (
                <button
                  key={provider.id}
                  onClick={() => setSelectedProvider(provider.id)}
                  className={`flex flex-col items-center gap-2 px-4 py-3 rounded-lg border-2 transition-all relative ${selectedProvider === provider.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                    }`}
                >
                  <div className={`w-12 h-12 ${PROVIDER_COLORS[provider.id] || 'bg-gray-100'} rounded-lg flex items-center justify-center p-2`}>
                    <ProviderIcon providerId={provider.id} size={32} className="w-full h-full object-contain" />
                  </div>
                  <div className="text-center">
                    <div className="text-sm font-medium text-gray-900">{provider.name}</div>
                    {hasInstances && (
                      <div className="text-xs text-green-600 mt-0.5">
                        {hasModel ? `${providerConfig.instances.length} 个实例已配置` : `${providerConfig.instances.length} 个实例`}
                      </div>
                    )}
                  </div>
                  {selectedProvider === provider.id && (
                    <CheckCircle2 className="w-5 h-5 text-blue-600" />
                  )}
                  {hasModel && (
                    <div className="absolute top-1 right-1 w-2 h-2 bg-green-500 rounded-full"></div>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* 配置表单 */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm mb-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">
              {currentProvider?.name || '提供商'} 配置
            </h2>
            {selectedModel && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded-lg">
                <Info className="w-4 h-4 text-green-600" />
                <span className="text-sm text-green-700">
                  当前模型: <span className="font-medium">{selectedModel.name}</span>
                </span>
              </div>
            )}
          </div>

          {/* 配置实例管理 */}
          <div className="mb-6 pb-6 border-b border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-gray-700">
                配置实例
              </label>
              <button
                onClick={handleAddInstance}
                className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 px-2 py-1 rounded hover:bg-blue-50 transition-colors"
                title="添加新配置实例"
              >
                <Plus className="w-3 h-3" />
                添加实例
              </button>
            </div>
            {instances.length === 0 ? (
              <div className="px-4 py-3 border border-dashed border-gray-300 rounded-lg bg-gray-50 text-center">
                <p className="text-sm text-gray-500 mb-2">暂无配置实例</p>
                <button
                  onClick={handleAddInstance}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  点击添加第一个配置实例
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {instances.map((instance) => (
                  <div
                    key={instance.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                      selectedInstanceId === instance.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    <button
                      onClick={() => handleSwitchInstance(instance.id)}
                      className="flex-1 text-left"
                    >
                      <div className="flex items-center gap-2">
                        <div className="flex-1 min-w-0">
                          <input
                            type="text"
                            value={instance.name}
                            onChange={(e) => {
                              e.stopPropagation()
                              const providerConfig = configs[selectedProvider]
                              if (!providerConfig) return
                              const updatedInstances = providerConfig.instances.map(inst =>
                                inst.id === instance.id ? { ...inst, name: e.target.value } : inst
                              )
                              setConfigs(prev => ({
                                ...prev,
                                [selectedProvider]: {
                                  ...providerConfig,
                                  instances: updatedInstances,
                                },
                              }))
                            }}
                            onClick={(e) => e.stopPropagation()}
                            onFocus={(e) => e.stopPropagation()}
                            className="text-sm font-medium text-gray-900 bg-transparent border-none p-0 focus:outline-none focus:ring-0 w-full"
                            placeholder="配置名称"
                          />
                          <div className="text-xs text-gray-500 mt-0.5">
                            {instance.baseUrl || '未设置 Base URL'}
                            {instance.models.length > 0 && (
                              <span className="ml-2 text-green-600">
                                • {instance.models.length} 个模型
                              </span>
                            )}
                          </div>
                        </div>
                        {selectedInstanceId === instance.id && (
                          <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                        )}
                      </div>
                    </button>
                    {instances.length > 1 && (
                      <button
                        onClick={() => handleDeleteInstance(instance.id)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="删除配置实例"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {currentInstance ? (
          <div className="space-y-6">
            {/* API Key */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Key className="w-4 h-4 inline mr-1" />
                API Key
                {requiresApiKey() && <span className="text-red-500 ml-1">*</span>}
                {!requiresApiKey() && <span className="text-gray-400 ml-1 text-xs">(可选)</span>}
                {currentInstance.apiKey && (
                  <span className="ml-2 text-xs text-green-600">✓ 已配置</span>
                )}
              </label>
              <div className="relative">
                <input
                  type={showApiKeys[selectedProvider] ? 'text' : 'password'}
                  value={currentInstance.apiKey || ''}
                  onChange={(e) => handleConfigChange('apiKey', e.target.value)}
                  placeholder={requiresApiKey() ? `请输入 ${currentProvider?.name || '提供商'} API Key` : 'API Key（可选，LMStudio 等本地服务可留空）'}
                  className="w-full px-4 py-2.5 bg-white border border-gray-300 text-gray-900 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-10 placeholder-gray-400"
                />
                {requiresApiKey() && (
                  <button
                    type="button"
                    onClick={() => toggleApiKeyVisibility(selectedProvider)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    title={showApiKeys[selectedProvider] ? '隐藏 API Key' : '显示 API Key'}
                  >
                    {showApiKeys[selectedProvider] ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {selectedProvider === 'ollama'
                  ? 'Ollama 是本地服务，不需要 API Key。确保 Ollama 服务正在运行（默认地址：http://127.0.0.1:11434）'
                  : requiresApiKey()
                    ? '请前往对应提供商的官网获取 API Key'
                    : '对于自定义 Base URL（如 LMStudio），API Key 可以留空'}
              </p>
            </div>

            {/* Base URL (可选) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Base URL (可选)
              </label>
              <input
                type="text"
                value={currentInstance.baseUrl || ''}
                onChange={(e) => handleConfigChange('baseUrl', e.target.value)}
                placeholder={currentProvider?.defaultBaseURL || ''}
                className="w-full px-4 py-2.5 bg-white border border-gray-300 text-gray-900 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder-gray-400"
              />
              <p className="text-xs text-gray-500 mt-1">
                默认值已自动填充，通常无需修改。可以配置不同的 Base URL 来连接多个服务实例（如多个 LMStudio）
              </p>
            </div>

            {/* 模型选择 - 多选 */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  <Brain className="w-4 h-4 inline mr-1" />
                  选择模型（可多选）
                  {currentInstance.models && currentInstance.models.length > 0 && (
                    <span className="ml-2 text-xs text-green-600">
                      ✓ 已选择 {currentInstance.models.length} 个
                    </span>
                  )}
                </label>
                <button
                  onClick={loadModels}
                  disabled={loadingModels || (requiresApiKey() && !currentInstance.apiKey?.trim())}
                  className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 disabled:opacity-50 disabled:cursor-not-allowed px-2 py-1 rounded hover:bg-blue-50 transition-colors"
                  title={requiresApiKey() && !currentInstance.apiKey?.trim() ? '请先输入 API Key' : '刷新模型列表'}
                >
                  <RefreshCw className={`w-3 h-3 ${loadingModels ? 'animate-spin' : ''}`} />
                  {loadingModels ? '加载中...' : '刷新列表'}
                </button>
              </div>

              {loadingModels ? (
                <div className="flex items-center justify-center py-4 border border-gray-300 rounded-lg bg-gray-50">
                  <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                  <span className="ml-2 text-sm text-gray-600">正在加载模型列表...</span>
                </div>
              ) : availableModels.length > 0 ? (
                <div className="border border-gray-300 rounded-lg p-4 max-h-60 overflow-y-auto bg-gray-50">
                  <div className="space-y-2">
                    {availableModels.map((model) => {
                      const isSelected = (currentInstance.models || []).includes(model.id)
                      return (
                        <label
                          key={model.id}
                          className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${isSelected
                            ? 'bg-blue-50 border border-blue-200'
                            : 'hover:bg-gray-100 border border-transparent'
                            }`}
                          onClick={(e) => {
                            // 防止点击 label 时触发两次
                            e.preventDefault()
                            handleModelToggle(model.id)
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              e.stopPropagation()
                              handleModelToggle(model.id)
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <div className="text-sm font-medium text-gray-900">{model.name}</div>
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-gray-100 text-gray-700 rounded text-xs border border-gray-200">
                                <FileText className="w-3 h-3" />
                                text
                              </span>
                              {model.supportsVision && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-xs border border-blue-200">
                                  <ImageIcon className="w-3 h-3" />
                                  视觉
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-gray-500">{model.provider}</div>
                          </div>
                          {isSelected && (
                            <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                          )}
                        </label>
                      )
                    })}
                  </div>
                </div>
              ) : currentInstance.apiKey || !requiresApiKey() ? (
                <div className="px-4 py-2.5 border border-yellow-300 bg-yellow-50 rounded-lg text-sm text-yellow-800">
                  点击"测试连接"或"刷新列表"来加载模型列表
                </div>
              ) : (
                <div className="px-4 py-2.5 border border-gray-300 bg-gray-50 rounded-lg text-sm text-gray-600">
                  请输入 API Key 后自动加载模型列表
                </div>
              )}
              <p className="text-xs text-gray-500 mt-1">
                可以多选模型，然后在首页查看任务时使用已配置的模型
              </p>
            </div>

            {/* 操作按钮 */}
            <div className="flex gap-3 pt-4 border-t border-gray-200">
              <button
                onClick={testConnection}
                disabled={requiresApiKey() && !currentInstance.apiKey?.trim()}
                className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <CheckCircle2 className="w-4 h-4" />
                测试连接
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !currentInstance.models || currentInstance.models.length === 0}
                className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="w-4 h-4" />
                {saving ? '保存中...' : '保存配置'}
              </button>
            </div>
          </div>
          ) : (
            <div className="px-4 py-8 border border-dashed border-gray-300 rounded-lg bg-gray-50 text-center">
              <p className="text-sm text-gray-500">请先添加配置实例</p>
            </div>
          )}
        </div>

        {/* 使用提示 */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-blue-900 mb-2">💡 使用提示</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• API Key 会保存在浏览器本地，不会上传到服务器</li>
            <li>• 配置保存后，可以在首页查看任务时使用已配置的模型</li>
            <li>• 建议先测试连接，确保 API Key 有效并自动加载模型列表</li>
            <li>• 不同模型的费用和效果不同，请根据需求选择</li>
            <li>• 支持多个厂商同时配置，可以随时切换使用</li>
            <li>• 已配置的提供商会显示绿色标记</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
