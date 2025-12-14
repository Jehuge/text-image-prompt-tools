import type { ITemplateManager, Template } from './types';
import { getDefaultTemplate } from './default-templates/index';

/**
 * 内存模板管理器
 */
export class MemoryTemplateManager implements ITemplateManager {
  private templates: Map<string, Template> = new Map();

  constructor() {
    // 初始化默认模板
    const defaultTemplates = getDefaultTemplate();
    defaultTemplates.forEach((template) => {
      this.templates.set(template.id, template);
    });
  }

  async getTemplate(templateId: string): Promise<Template | null> {
    return this.templates.get(templateId) || null;
  }

  async getAllTemplates(): Promise<Template[]> {
    return Array.from(this.templates.values());
  }

  async saveTemplate(template: Template): Promise<void> {
    this.templates.set(template.id, template);
  }

  async deleteTemplate(templateId: string): Promise<void> {
    this.templates.delete(templateId);
  }
}

