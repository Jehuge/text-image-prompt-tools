import React, { useState, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { PromptOptimizer, ImageToPrompt } from '@text-image-prompt-tools/ui';

type TemplateOption = {
  id: string;
  name: string;
  language: 'zh' | 'en';
};
import {
  TextAdapterRegistry,
  LLMService,
  PromptService,
  ImageService,
  LocalStorageModelManager,
  LocalStorageTemplateManager,
  OpenAIAdapter,
  GeminiAdapter,
  DeepSeekAdapter,
  AnthropicAdapter,
  SiliconflowAdapter,
  ZhipuAdapter,
  OllamaAdapter,
  HistoryManager,
  type TextModelConfig,
  type TextProvider,
  type Template,
  type ITemplateManager,
} from '@text-image-prompt-tools/core';
import {
  setPromptService,
  setImageService,
  setHistoryManager,
  setImageHistoryManager,
} from '@text-image-prompt-tools/ui';
import { ModelConfig } from './components/ModelConfig';
import { HistoryPanel } from './components/HistoryPanel';

function App() {
  const [activeTab, setActiveTab] = useState<'optimize' | 'extract' | 'config' | 'history'>('optimize');
  const [servicesInitialized, setServicesInitialized] = useState(false);
  const [modelManager, setModelManager] = useState<LocalStorageModelManager | null>(null);
  const [historyManager, setHistoryManager] = useState<HistoryManager | null>(null);
  const [promptServiceInstance, setPromptServiceInstance] = useState<PromptService | null>(null);
  const [imageServiceInstance, setImageServiceInstance] = useState<ImageService | null>(null);
  const [modelConfigs, setModelConfigs] = useState<TextModelConfig[]>([]);
  const [providers, setProviders] = useState<TextProvider[]>([]);
  const [registry, setRegistry] = useState<TextAdapterRegistry | null>(null);
  const [templateManager, setTemplateManager] = useState<ITemplateManager | null>(null);
  const [optimizeTemplates, setOptimizeTemplates] = useState<TemplateOption[]>([]);
  const [image2promptTemplates, setImage2promptTemplates] = useState<TemplateOption[]>([]);

  useEffect(() => {
    // 初始化服务（使用内部 async 函数）
    const initServices = async () => {
      const reg = new TextAdapterRegistry();
      const openaiAdapter = new OpenAIAdapter();
      const geminiAdapter = new GeminiAdapter();
      const deepseekAdapter = new DeepSeekAdapter();
      const anthropicAdapter = new AnthropicAdapter();
      const siliconflowAdapter = new SiliconflowAdapter();
      const zhipuAdapter = new ZhipuAdapter();
      const ollamaAdapter = new OllamaAdapter();

      reg.register(openaiAdapter);
      reg.register(geminiAdapter);
      reg.register(deepseekAdapter);
      reg.register(anthropicAdapter);
      reg.register(siliconflowAdapter);
      reg.register(zhipuAdapter);
      reg.register(ollamaAdapter);

      setRegistry(reg);

      // 收集所有 providers
      const allProviders = [
        openaiAdapter.getProvider(),
        geminiAdapter.getProvider(),
        deepseekAdapter.getProvider(),
        anthropicAdapter.getProvider(),
        siliconflowAdapter.getProvider(),
        zhipuAdapter.getProvider(),
        ollamaAdapter.getProvider(),
      ];
      setProviders(allProviders);

      const manager = new LocalStorageModelManager();
      setModelManager(manager);

      // 加载已保存的模型配置
      const savedConfigs = await manager.getAllModels();
      setModelConfigs(savedConfigs);

      const historyMgr = new HistoryManager();
      setHistoryManager(historyMgr);

      const templateMgr = new LocalStorageTemplateManager();
      setTemplateManager(templateMgr);

      // 获取所有模板并分类（只保留文生图和图片反推相关模板）
      const refreshTemplatesInternal = async () => {
        const allTemplates = await templateMgr.getAllTemplates();
        // 只保留文生图提示词优化模板
        const optimizeTemplatesList = allTemplates
          .filter(t => t.metadata.templateType === 'text2imageOptimize')
          .map(t => ({
            id: t.id,
            name: t.name,
            language: t.metadata.language,
          }));
        // 只保留图片反推模板
        const image2promptTemplatesList = allTemplates
          .filter(t => t.metadata.templateType === 'image2prompt')
          .map(t => ({
            id: t.id,
            name: t.name,
            language: t.metadata.language,
          }));

        setOptimizeTemplates(optimizeTemplatesList);
        setImage2promptTemplates(image2promptTemplatesList);
      };

      await refreshTemplatesInternal();

      const llmService = new LLMService(reg, manager);

      const promptService = new PromptService(
        llmService,
        manager,
        templateMgr
      );
      const imageService = new ImageService(
        llmService,
        manager,
        templateMgr
      );

      // 设置服务到 hooks
      setPromptService(promptService);
      setPromptServiceInstance(promptService);
      setImageService(imageService);
      setImageServiceInstance(imageService);
      setHistoryManager(historyMgr);
      setImageHistoryManager(historyMgr);

      setServicesInitialized(true);
    };

    initServices();
  }, []);

  // 刷新模板列表（只保留文生图和图片反推相关模板）
  const refreshTemplates = async () => {
    if (!templateManager) return;
    const allTemplates = await templateManager.getAllTemplates();
    // 只保留文生图提示词优化模板
    const optimizeTemplatesList = allTemplates
      .filter(t => t.metadata.templateType === 'text2imageOptimize')
      .map(t => ({
        id: t.id,
        name: t.name,
        language: t.metadata.language,
      }));
    // 只保留图片反推模板
    const image2promptTemplatesList = allTemplates
      .filter(t => t.metadata.templateType === 'image2prompt')
      .map(t => ({
        id: t.id,
        name: t.name,
        language: t.metadata.language,
      }));

    setOptimizeTemplates(optimizeTemplatesList);
    setImage2promptTemplates(image2promptTemplatesList);
  };

  const handleSaveModel = async (config: TextModelConfig) => {
    if (modelManager) {
      await modelManager.saveModel(config);
      const allConfigs = await modelManager.getAllModels();
      setModelConfigs(allConfigs);
      alert('模型配置已保存！');
    }
  };

  // 刷新模型配置列表
  const refreshModelConfigs = async () => {
    if (modelManager) {
      const allConfigs = await modelManager.getAllModels();
      setModelConfigs(allConfigs);
    }
  };

  if (!servicesInitialized) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-gray-600">初始化服务中...</div>
      </div>
    );
  }

  // 获取厂商显示名称
  const getProviderDisplayName = (providerId: string): string => {
    const providerNames: Record<string, string> = {
      openai: 'OpenAI',
      gemini: 'Gemini',
      deepseek: 'DeepSeek',
      anthropic: 'Anthropic',
      siliconflow: 'SiliconFlow',
      zhipu: 'Zhipu',
      ollama: 'Ollama',
    };
    return providerNames[providerId] || providerId;
  };

  // 格式化模型名称显示：前面显示厂商，后面显示完整模型名称
  const formatModelDisplayName = (providerId: string, modelId: string, modelCapabilities?: Record<string, { supportsVision: boolean }>): string => {
    // 获取厂商显示名称
    const providerName = getProviderDisplayName(providerId);

    // 如果 modelId 包含 provider 前缀，去掉它
    let displayName = modelId;

    // 检查并去掉 provider 前缀（支持多种格式）
    if (modelId.startsWith(providerId + '-')) {
      displayName = modelId.substring(providerId.length + 1);
    } else if (modelId.startsWith(providerId + '_')) {
      displayName = modelId.substring(providerId.length + 1);
    } else if (modelId.startsWith(providerId + '/')) {
      displayName = modelId.substring(providerId.length + 1);
    }

    // 处理特殊格式的模型名称（如 hf.co/unsloth/Qwen3-4B-GGUF:Q6_K_XL）
    if (displayName.includes('/')) {
      const parts = displayName.split('/');
      displayName = parts[parts.length - 1];
    }

    // 处理量化格式（如 :Q6_K_XL），保留量化信息
    if (displayName.includes(':')) {
      const colonIndex = displayName.lastIndexOf(':');
      if (colonIndex > 0) {
        const baseName = displayName.substring(0, colonIndex);
        const quantInfo = displayName.substring(colonIndex + 1);
        displayName = `${baseName} (${quantInfo})`;
      }
    }

    // 确保返回完整的名称，不要截断
    const finalModelName = displayName || modelId;

    // 返回格式：厂商 - 完整模型名称
    return `${providerName} - ${finalModelName}`;
  };

  // 从新的存储结构获取可用模型列表
  const getAvailableModels = () => {
    try {
      const savedConfigs = localStorage.getItem('modelConfigs');
      if (!savedConfigs) return [];

      const configs = JSON.parse(savedConfigs);
      const modelList: Array<{ id: string; name: string; supportsVision?: boolean }> = [];

      Object.entries(configs).forEach(([providerId, config]: [string, any]) => {
        if (!config || typeof config !== 'object') return;

        // 支持新格式（instances）和旧格式（兼容性）
        let instances: any[] = [];
        if (config.instances && Array.isArray(config.instances)) {
          instances = config.instances;
        } else if (config.apiKey || config.baseUrl || config.models || config.model) {
          instances = [{
            id: 'default',
            name: '默认配置',
            apiKey: config.apiKey || '',
            baseUrl: config.baseUrl || '',
            models: config.models || (config.model ? [config.model] : []),
            modelCapabilities: config.modelCapabilities || {},
          }];
        }

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
              const hasProviderPrefix = trimmedModelId.startsWith(`${providerId}-`);
              const hasPathOrAlias = trimmedModelId.includes('/') || trimmedModelId.includes(':');
              const fullId = (hasProviderPrefix || hasPathOrAlias)
                ? trimmedModelId
                : `${providerId}-${trimmedModelId}`;

              let displayName = formatModelDisplayName(providerId, trimmedModelId, instance.modelCapabilities);

              // 如果有实例名称且不是默认配置，添加到显示名称
              if (instance.name && instance.name !== '默认配置' && instance.name !== 'default') {
                displayName = `${instance.name} - ${displayName}`;
              }

              // 获取 vision 支持状态
              // 尝试多种可能的 Key 格式
              let supportsVision = instance.modelCapabilities?.[trimmedModelId]?.supportsVision;

              if (supportsVision === undefined) {
                // 尝试如果不带 trim 的 ID
                supportsVision = instance.modelCapabilities?.[modelId]?.supportsVision;
              }

              if (supportsVision === undefined && providerId === 'openai') {
                // OpenAI 特殊处理，有时候可能是 gpt-4-vision-preview 
              }

              modelList.push({
                id: fullId,
                name: displayName,
                supportsVision: supportsVision,
              });
            });
          }
        });
      });

      return modelList;
    } catch (error) {
      console.error('获取可用模型失败:', error);
      return [];
    }
  };

  // 获取支持 Vision 的模型
  const getVisionModels = () => {
    try {
      const savedConfigs = localStorage.getItem('modelConfigs');
      if (!savedConfigs) return [];

      const configs = JSON.parse(savedConfigs);
      const modelList: Array<{ id: string; name: string }> = [];

      Object.entries(configs).forEach(([providerId, config]: [string, any]) => {
        if (!config || typeof config !== 'object') return;

        // 支持新格式（instances）和旧格式（兼容性）
        let instances: any[] = [];
        if (config.instances && Array.isArray(config.instances)) {
          instances = config.instances;
        } else if (config.apiKey || config.baseUrl || config.models || config.model) {
          instances = [{
            id: 'default',
            name: '默认配置',
            apiKey: config.apiKey || '',
            baseUrl: config.baseUrl || '',
            models: config.models || (config.model ? [config.model] : []),
            modelCapabilities: config.modelCapabilities || {},
          }];
        }

        instances.forEach((instance: any) => {
          const modelIds = instance.models && Array.isArray(instance.models) && instance.models.length > 0
            ? instance.models
            : (instance.model && typeof instance.model === 'string' && instance.model.trim() ? [instance.model.trim()] : []);

          const hasApiKey = !instance.apiKey || (instance.apiKey && typeof instance.apiKey === 'string' && instance.apiKey.trim());
          const modelCapabilities = instance.modelCapabilities || {};

          if (modelIds.length > 0 && hasApiKey) {
            modelIds.forEach((modelId: string) => {
              const trimmedModelId = typeof modelId === 'string' ? modelId.trim() : String(modelId).trim();
              if (!trimmedModelId) return;

              // 检查模型是否支持 Vision
              const supportsVision = modelCapabilities[trimmedModelId]?.supportsVision || false;

              // 如果明确标记为支持 Vision，或者没有能力信息（兼容旧数据），则包含
              if (supportsVision || !modelCapabilities[trimmedModelId]) {
                // 直接使用 provider-modelId 格式，不包含实例前缀
                const hasProviderPrefix = trimmedModelId.startsWith(`${providerId}-`);
                const hasPathOrAlias = trimmedModelId.includes('/') || trimmedModelId.includes(':');
                const fullId = (hasProviderPrefix || hasPathOrAlias)
                  ? trimmedModelId
                  : `${providerId}-${trimmedModelId}`;

                let displayName = formatModelDisplayName(providerId, trimmedModelId, modelCapabilities);

                // 如果有实例名称且不是默认配置，添加到显示名称
                if (instance.name && instance.name !== '默认配置' && instance.name !== 'default') {
                  displayName = `${instance.name} - ${displayName}`;
                }

                modelList.push({
                  id: fullId,
                  name: displayName,
                });
              }
            });
          }
        });
      });

      return modelList;
    } catch (error) {
      console.error('获取 Vision 模型失败:', error);
      return [];
    }
  };

  const navItems = [
    {
      id: 'optimize',
      label: '文生图提示词优化',
      icon: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
    },
    {
      id: 'extract',
      label: '图片反推',
      icon: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
    },
    {
      id: 'config',
      label: '模型配置',
      icon: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
    },
    {
      id: 'history',
      label: '历史记录',
      icon: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v5h5"></path><path d="M3.05 13A9 9 0 1 0 6 5.3L3 8"></path><path d="M12 7v5l4 2"></path></svg>
    }
  ];

  return (
    <div className="flex flex-col h-screen bg-gray-50 text-gray-900 overflow-hidden font-sans">
      <Toaster position="top-right" />
      {/* Top Header Navigation */}
      <header className="h-16 flex-shrink-0 bg-white border-b border-gray-200 shadow-sm flex items-center justify-between px-4 md:px-6 relative z-10 drag-region">

        {/* Brand and Nav */}
        <div className="flex items-center gap-2 md:gap-8 flex-1">
          <div className="flex items-center gap-3 mr-4">
            <div className="bg-blue-600 p-1.5 rounded-lg flex-shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white"><path d="M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5 4 4 0 0 1-5-5"></path><path d="M8.5 8.5v.01"></path><path d="M11.5 15.5v.01"></path><path d="M15.5 11.5v.01"></path></svg>
            </div>
            <span className="font-bold text-lg tracking-tight hidden md:block text-gray-900">文生图提示词工具</span>
          </div>

          <nav className="flex items-center gap-1 overflow-x-auto no-scrollbar mask-gradient no-drag">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as any)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap no-drag ${activeTab === item.id
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 relative overflow-hidden bg-gray-50 min-h-0">
        {activeTab === 'optimize' && (
          <div className="absolute inset-0 w-full h-full">
            <PromptOptimizer
              availableModels={getAvailableModels() as any}
              availableTemplates={optimizeTemplates as any}
              defaultTemplateId={undefined}
              templateManager={templateManager}
              onOptimized={() => { }}
              promptService={promptServiceInstance as any}
              historyManager={historyManager}
            />
          </div>
        )}
        {activeTab === 'extract' && (
          <div className="absolute inset-0 w-full h-full">
            <ImageToPrompt
              availableModels={getAvailableModels() as any}
              availableTemplates={image2promptTemplates as any}
              defaultTemplateId={undefined}
              templateManager={templateManager}
              onExtracted={() => { }}
              imageService={imageServiceInstance as any}
              historyManager={historyManager}
            />
          </div>
        )}
        {activeTab === 'config' && registry && (
          <div className="h-full overflow-y-auto">
            <ModelConfig
              providers={providers}
              registry={registry}
            />
          </div>
        )}
        {activeTab === 'history' && historyManager && (
          <HistoryPanel historyManager={historyManager} />
        )}
      </main>
    </div>
  );
}

export default App;

