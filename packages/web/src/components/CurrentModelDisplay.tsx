import { useState, useEffect } from 'react'
import { Brain } from 'lucide-react'

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
  openai: 'bg-green-100 text-green-700 border-green-200',
  deepseek: 'bg-blue-100 text-blue-700 border-blue-200',
  siliconflow: 'bg-blue-100 text-blue-700 border-blue-200',
  anthropic: 'bg-orange-100 text-orange-700 border-orange-200',
  gemini: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  zhipu: 'bg-blue-100 text-blue-700 border-blue-200',
  ollama: 'bg-teal-100 text-teal-700 border-teal-200',
}

export default function CurrentModelDisplay() {
  const [currentModel, setCurrentModel] = useState<{
    name: string
    provider: string
    providerName: string
  } | null>(null)

  useEffect(() => {
    const loadCurrentModel = () => {
      try {
        const savedSelected = localStorage.getItem('selectedModel')
        
        if (!savedSelected) {
          setCurrentModel(null)
          return
        }

        // 解析选中的模型 ID（格式：provider-modelId）
        const firstDashIndex = savedSelected.indexOf('-')
        if (firstDashIndex <= 0) {
          setCurrentModel(null)
          return
        }

        const providerId = savedSelected.substring(0, firstDashIndex)
        const modelId = savedSelected.substring(firstDashIndex + 1)
        
        // 直接使用模型 ID 作为显示名称（去掉可能的 provider 前缀）
        let modelName = modelId
        if (modelId.startsWith(providerId + '-')) {
          modelName = modelId.substring(providerId.length + 1)
        }
        
        setCurrentModel({
          name: modelName,
          provider: providerId,
          providerName: PROVIDER_LABELS[providerId] || providerId,
        })
      } catch (error) {
        console.error('加载当前模型失败:', error)
        setCurrentModel(null)
      }
    }

    loadCurrentModel()

    // 监听 storage 变化（同窗口内的变化不会触发 storage 事件，所以需要自定义事件）
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'selectedModel') {
        loadCurrentModel()
      }
    }
    window.addEventListener('storage', handleStorageChange)

    // 监听自定义事件（用于同窗口内的变化）
    const handleCustomStorageChange = () => {
      loadCurrentModel()
    }
    window.addEventListener('modelChanged', handleCustomStorageChange)

    // 定期检查配置变化（作为备用方案）
    const interval = setInterval(loadCurrentModel, 1000)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('modelChanged', handleCustomStorageChange)
      clearInterval(interval)
    }
  }, [])

  if (!currentModel) {
    return (
      <div className="flex items-center gap-2 text-xs text-gray-500">
        <Brain className="w-3.5 h-3.5" />
        <span>未选择</span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
      <span className="text-gray-600 font-mono">{currentModel.name}</span>
    </div>
  )
}

