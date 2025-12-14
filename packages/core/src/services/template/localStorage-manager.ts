import type { ITemplateManager, Template } from './types';
import { StorageAdapter } from '../storage/storage-adapter';
import { LocalStorageProvider } from '../storage/localStorageProvider';
import { getDefaultTemplate } from './default-templates/index';

const STORAGE_KEY = 'text-image-prompt-tools:templates';

/**
 * 基于 localStorage 的模板管理器
 * 支持持久化存储用户自定义模板，同时保留默认模板
 */
export class LocalStorageTemplateManager implements ITemplateManager {
  private storage: StorageAdapter;
  private defaultTemplates: Map<string, Template>;

  constructor() {
    const provider = new LocalStorageProvider();
    this.storage = new StorageAdapter(provider);
    
    // 初始化默认模板
    const defaultTemplates = getDefaultTemplate();
    this.defaultTemplates = new Map();
    defaultTemplates.forEach((template) => {
      this.defaultTemplates.set(template.id, template);
    });
  }

  async getTemplate(templateId: string): Promise<Template | null> {
    // 先检查用户自定义模板
    const customTemplates = await this.getCustomTemplates();
    if (customTemplates.has(templateId)) {
      return customTemplates.get(templateId) || null;
    }
    
    // 再检查默认模板
    return this.defaultTemplates.get(templateId) || null;
  }

  /**
   * 检查模板是否为默认模板
   */
  isDefaultTemplate(templateId: string): boolean {
    return this.defaultTemplates.has(templateId);
  }

  async getAllTemplates(): Promise<Template[]> {
    const customTemplates = await this.getCustomTemplates();
    const allTemplates = new Map<string, Template>();
    
    // 先添加默认模板
    this.defaultTemplates.forEach((template, id) => {
      allTemplates.set(id, template);
    });
    
    // 再添加用户自定义模板（会覆盖同名的默认模板）
    customTemplates.forEach((template, id) => {
      allTemplates.set(id, template);
    });
    
    return Array.from(allTemplates.values());
  }

  async saveTemplate(template: Template): Promise<void> {
    // 更新模板的 lastModified 时间
    const updatedTemplate: Template = {
      ...template,
      metadata: {
        ...template.metadata,
        lastModified: Date.now(),
      },
    };

    await this.storage.updateData<Record<string, Template>>(
      STORAGE_KEY,
      (templates) => {
        const existing = templates || {};
        return {
          ...existing,
          [updatedTemplate.id]: updatedTemplate,
        };
      }
    );
  }

  async deleteTemplate(templateId: string): Promise<void> {
    // 不能删除默认模板
    if (this.defaultTemplates.has(templateId)) {
      throw new Error(`Cannot delete default template: ${templateId}`);
    }

    await this.storage.updateData<Record<string, Template>>(
      STORAGE_KEY,
      (templates) => {
        const existing = templates || {};
        const { [templateId]: deleted, ...rest } = existing;
        return rest;
      }
    );
  }

  /**
   * 获取用户自定义模板
   */
  private async getCustomTemplates(): Promise<Map<string, Template>> {
    const templates = await this.storage.getData<Record<string, Template>>(
      STORAGE_KEY,
      {}
    );
    return new Map(Object.entries(templates));
  }
}

