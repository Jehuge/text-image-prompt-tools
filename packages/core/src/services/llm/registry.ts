import type {
  ITextProviderAdapter,
  ITextAdapterRegistry,
  TextProvider,
  TextModel,
  TextModelConfig,
} from './types';

/**
 * 文本模型 Adapter 注册表实现
 */
export class TextAdapterRegistry implements ITextAdapterRegistry {
  private adapters: Map<string, ITextProviderAdapter> = new Map();

  /**
   * 注册 Adapter
   */
  register(adapter: ITextProviderAdapter): void {
    const provider = adapter.getProvider();
    this.adapters.set(provider.id, adapter);
  }

  /**
   * 获取 Adapter
   */
  getAdapter(providerId: string): ITextProviderAdapter {
    const adapter = this.adapters.get(providerId);
    if (!adapter) {
      throw new Error(`Provider adapter not found: ${providerId}`);
    }
    return adapter;
  }

  /**
   * 获取 Provider 元数据
   */
  getProvider(providerId: string): TextProvider | undefined {
    const adapter = this.adapters.get(providerId);
    return adapter?.getProvider();
  }

  /**
   * 获取静态模型列表
   */
  getStaticModels(providerId: string): TextModel[] {
    const adapter = this.adapters.get(providerId);
    if (!adapter) {
      return [];
    }
    return adapter.getModels();
  }

  /**
   * 获取模型列表（只从真实 API 获取，不返回虚假预设）
   */
  async getModels(
    providerId: string,
    config?: TextModelConfig
  ): Promise<TextModel[]> {
    const adapter = this.getAdapter(providerId);
    const provider = adapter.getProvider();

    // 如果支持动态获取且提供了配置，尝试动态获取
    if (provider.supportsDynamicModels && config && adapter.getModelsAsync) {
      console.log(`[Registry] 尝试动态获取模型 (${providerId})`);
      try {
        const dynamicModels = await adapter.getModelsAsync(config);
        console.log(`[Registry] 动态获取成功，获得 ${dynamicModels.length} 个模型`);
        // 只返回真实获取的模型，不合并静态模型
        return dynamicModels;
      } catch (error) {
        console.error(
          `动态模型加载失败 (${providerId}):`,
          error
        );
        // 获取失败时返回空数组，不返回虚假的静态模型
        throw error;
      }
    } else {
      // 如果不支持动态获取，返回空数组（不返回虚假的静态模型）
      console.log(`[Registry] 提供商 ${providerId} 不支持动态获取模型或缺少配置`);
      return [];
    }
  }
}

