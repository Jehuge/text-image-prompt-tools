import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Save, X, FileText, Globe, Lock } from 'lucide-react';
import toast from 'react-hot-toast';
import type { ITemplateManager, Template } from '@text-image-prompt-tools/core';

interface TemplateManagerProps {
  templateManager: ITemplateManager;
}

const TEMPLATE_TYPE_LABELS: Record<string, string> = {
  optimize: '优化',
  text2imageOptimize: '文生图优化',
  image2imageOptimize: '图生图优化',
  image2prompt: '图片反推',
  iterate: '迭代',
  userOptimize: '用户优化',
  text2image: '文生图',
  image2image: '图生图',
};

const LANGUAGE_LABELS: Record<string, string> = {
  zh: '中文',
  en: 'English',
};

export const TemplateManager: React.FC<TemplateManagerProps> = ({
  templateManager,
}) => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [defaultTemplateIds, setDefaultTemplateIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadTemplates();
  }, [templateManager]);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const allTemplates = await templateManager.getAllTemplates();
      
      // 识别默认模板
      const defaultIds = new Set<string>();
      allTemplates.forEach(t => {
        // 如果模板管理器支持 isDefaultTemplate 方法，使用它
        if (templateManager.isDefaultTemplate && templateManager.isDefaultTemplate(t.id)) {
          defaultIds.add(t.id);
        } else {
          // 否则使用启发式方法：检查模板 ID 是否包含常见的默认模板前缀
          // 默认模板通常有特定的命名模式
          if (t.id.includes('general') || t.id.includes('creative') || 
              t.id.includes('analytical') || t.id.includes('context') ||
              t.id.includes('user-prompt') || t.id.includes('iterate') ||
              t.id.includes('text2image') || t.id.includes('image2prompt')) {
            // 排除用户自定义模板（通常以 custom- 开头）
            if (!t.id.startsWith('custom-')) {
              defaultIds.add(t.id);
            }
          }
        }
      });
      
      setDefaultTemplateIds(defaultIds);
      setTemplates(allTemplates);
    } catch (error) {
      console.error('加载模板失败:', error);
      toast.error('加载模板失败');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    const newTemplate: Template = {
      id: `custom-${Date.now()}`,
      name: '新模板',
      content: [
        {
          role: 'system',
          content: '你是一个提示词优化专家。',
        },
        {
          role: 'user',
          content: '请优化以下提示词：\n{{prompt}}',
        },
      ],
      metadata: {
        version: '1.0.0',
        lastModified: Date.now(),
        templateType: 'optimize',
        language: 'zh',
      },
    };
    setEditingTemplate(newTemplate);
    setIsCreating(true);
  };

  const handleEdit = (template: Template) => {
    setEditingTemplate({ ...template });
    setIsCreating(false);
  };

  const handleDelete = async (templateId: string) => {
    if (defaultTemplateIds.has(templateId)) {
      toast.error('不能删除默认模板');
      return;
    }

    if (!confirm('确定要删除这个模板吗？')) {
      return;
    }

    try {
      await templateManager.deleteTemplate(templateId);
      toast.success('模板已删除');
      loadTemplates();
    } catch (error: any) {
      console.error('删除模板失败:', error);
      toast.error(error.message || '删除模板失败');
    }
  };

  const handleSave = async () => {
    if (!editingTemplate) return;

    if (!editingTemplate.name.trim()) {
      toast.error('请输入模板名称');
      return;
    }

    if (editingTemplate.content.length === 0) {
      toast.error('模板内容不能为空');
      return;
    }

    try {
      await templateManager.saveTemplate(editingTemplate);
      toast.success(isCreating ? '模板已创建' : '模板已保存');
      setEditingTemplate(null);
      setIsCreating(false);
      loadTemplates();
    } catch (error) {
      console.error('保存模板失败:', error);
      toast.error('保存模板失败');
    }
  };

  const handleCancel = () => {
    setEditingTemplate(null);
    setIsCreating(false);
  };

  const updateContentRole = (index: number, role: 'system' | 'user' | 'assistant') => {
    if (!editingTemplate) return;
    const newContent = [...editingTemplate.content];
    newContent[index] = { ...newContent[index], role };
    setEditingTemplate({ ...editingTemplate, content: newContent });
  };

  const updateContentText = (index: number, text: string) => {
    if (!editingTemplate) return;
    const newContent = [...editingTemplate.content];
    newContent[index] = { ...newContent[index], content: text };
    setEditingTemplate({ ...editingTemplate, content: newContent });
  };

  const addMessage = () => {
    if (!editingTemplate) return;
    const newContent = [
      ...editingTemplate.content,
      { role: 'user' as const, content: '' },
    ];
    setEditingTemplate({ ...editingTemplate, content: newContent });
  };

  const removeMessage = (index: number) => {
    if (!editingTemplate) return;
    if (editingTemplate.content.length <= 1) {
      toast.error('至少需要保留一条消息');
      return;
    }
    const newContent = editingTemplate.content.filter((_, i) => i !== index);
    setEditingTemplate({ ...editingTemplate, content: newContent });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-600">加载中...</div>
      </div>
    );
  }

  if (editingTemplate) {
    return (
      <div className="h-full overflow-y-auto p-6 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">
                {isCreating ? '创建模板' : '编辑模板'}
              </h2>
              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Save className="w-4 h-4" />
                  保存
                </button>
                <button
                  onClick={handleCancel}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  <X className="w-4 h-4" />
                  取消
                </button>
              </div>
            </div>

            <div className="space-y-6">
              {/* 基本信息 */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    模板名称
                  </label>
                  <input
                    type="text"
                    value={editingTemplate.name}
                    onChange={(e) =>
                      setEditingTemplate({
                        ...editingTemplate,
                        name: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="输入模板名称"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      模板类型
                    </label>
                    <select
                      value={editingTemplate.metadata.templateType}
                      onChange={(e) =>
                        setEditingTemplate({
                          ...editingTemplate,
                          metadata: {
                            ...editingTemplate.metadata,
                            templateType: e.target.value as any,
                          },
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {Object.entries(TEMPLATE_TYPE_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      语言
                    </label>
                    <select
                      value={editingTemplate.metadata.language}
                      onChange={(e) =>
                        setEditingTemplate({
                          ...editingTemplate,
                          metadata: {
                            ...editingTemplate.metadata,
                            language: e.target.value as 'zh' | 'en',
                          },
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {Object.entries(LANGUAGE_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* 消息内容 */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <label className="block text-sm font-medium text-gray-700">
                    消息内容
                  </label>
                  <button
                    onClick={addMessage}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    添加消息
                  </button>
                </div>

                <div className="space-y-4">
                  {editingTemplate.content.map((message, index) => (
                    <div
                      key={index}
                      className="border border-gray-200 rounded-lg p-4 bg-gray-50"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <select
                          value={message.role}
                          onChange={(e) =>
                            updateContentRole(
                              index,
                              e.target.value as 'system' | 'user' | 'assistant'
                            )
                          }
                          className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="system">System</option>
                          <option value="user">User</option>
                          <option value="assistant">Assistant</option>
                        </select>
                        {editingTemplate.content.length > 1 && (
                          <button
                            onClick={() => removeMessage(index)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      <textarea
                        value={message.content}
                        onChange={(e) => updateContentText(index, e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                        rows={6}
                        placeholder="输入消息内容..."
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-6 bg-gray-50">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">模板管理</h1>
            <p className="text-gray-600 mt-1">管理提示词优化的所有模板</p>
          </div>
          <button
            onClick={handleCreate}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            新建模板
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    模板名称
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    类型
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    语言
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    消息数
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    状态
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {templates.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                      暂无模板
                    </td>
                  </tr>
                ) : (
                  templates.map((template) => {
                    const isDefault = defaultTemplateIds.has(template.id);
                    return (
                      <tr key={template.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-gray-400" />
                            <span className="text-sm font-medium text-gray-900">
                              {template.name}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-600">
                            {TEMPLATE_TYPE_LABELS[template.metadata.templateType] ||
                              template.metadata.templateType}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-600">
                            {LANGUAGE_LABELS[template.metadata.language] ||
                              template.metadata.language}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-600">
                            {template.content.length}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {isDefault ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                              <Lock className="w-3 h-3" />
                              默认
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                              <Globe className="w-3 h-3" />
                              自定义
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleEdit(template)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="编辑"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            {!isDefault && (
                              <button
                                onClick={() => handleDelete(template.id)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="删除"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

