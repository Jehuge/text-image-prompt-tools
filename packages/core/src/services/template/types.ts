/**
 * 模板消息
 */
export interface MessageTemplate {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * 模板元数据
 */
export interface TemplateMetadata {
  version: string;
  lastModified: number;
  templateType: 'text2image' | 'image2image' | 'image2prompt';
  language: 'zh' | 'en';
}

/**
 * 模板定义
 */
export interface Template {
  id: string;
  name: string;
  content: MessageTemplate[];
  metadata: TemplateMetadata;
}

/**
 * 模板管理器接口
 */
export interface ITemplateManager {
  getTemplate(templateId: string): Promise<Template | null>;
  getAllTemplates(): Promise<Template[]>;
  saveTemplate(template: Template): Promise<void>;
}

