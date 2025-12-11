import React from 'react';

/**
 * 提供商 ID 到图标文件名的映射
 */
const PROVIDER_ICON_MAP: Record<string, string> = {
  openai: 'openai-svgrepo-com.svg',
  anthropic: 'claude-color.svg',
  gemini: 'gemini-color.svg',
  deepseek: 'deepseek-color.svg',
  siliconflow: 'siliconcloud-color.svg',
  zhipu: 'chatglm-color.svg',
  ollama: 'ollama.svg',
};

/**
 * 获取提供商的图标路径
 */
export const getProviderIconPath = (providerId: string): string => {
  const iconFile = PROVIDER_ICON_MAP[providerId] || 'openai-svgrepo-com.svg';
  return `/icons/${iconFile}`;
};

/**
 * 提供商图标组件
 */
interface ProviderIconProps {
  providerId: string;
  className?: string;
  size?: number;
}

export const ProviderIcon: React.FC<ProviderIconProps> = ({
  providerId,
  className = '',
  size = 24,
}) => {
  const iconPath = getProviderIconPath(providerId);
  
  return (
    <img
      src={iconPath}
      alt={`${providerId} icon`}
      className={className}
      style={{ width: size, height: size }}
      onError={(e) => {
        // 如果图标加载失败，显示默认的 emoji
        const fallbackEmojis: Record<string, string> = {
          openai: '🤖',
          deepseek: '🔍',
          siliconflow: '💬',
          anthropic: '🧠',
          gemini: '✨',
          zhipu: '🌟',
          ollama: '🦙',
        };
        const target = e.target as HTMLImageElement;
        if (target) {
          target.style.display = 'none';
          const parent = target.parentElement;
          if (parent && !parent.querySelector('.fallback-emoji')) {
            const emoji = document.createElement('span');
            emoji.className = 'fallback-emoji';
            emoji.textContent = fallbackEmojis[providerId] || '🤖';
            emoji.style.fontSize = `${size}px`;
            parent.appendChild(emoji);
          }
        }
      }}
    />
  );
};

