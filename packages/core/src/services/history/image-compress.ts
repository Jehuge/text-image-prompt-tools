/**
 * 图片压缩工具
 * 将大图片压缩成小缩略图，用于历史记录存储
 */

const MAX_THUMBNAIL_SIZE = 200; // 缩略图最大尺寸（宽或高）
const THUMBNAIL_QUALITY = 0.6; // 缩略图质量（0-1）

/**
 * 将 base64 图片压缩成小缩略图
 * @param imageUrl base64 图片 URL
 * @returns 压缩后的 base64 缩略图 URL，如果压缩失败则返回 null
 */
export async function compressImageToThumbnail(imageUrl: string): Promise<string | null> {
  if (!imageUrl.startsWith('data:image')) {
    // 如果不是 base64 图片，直接返回原 URL
    return imageUrl;
  }

  // 检查是否在浏览器环境中
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    console.warn('不在浏览器环境中，无法压缩图片');
    return null;
  }

  return new Promise((resolve) => {
    try {
      const img = new Image();
      img.onload = () => {
        try {
          // 计算缩略图尺寸
          let width = img.width;
          let height = img.height;
          
          if (width > height) {
            if (width > MAX_THUMBNAIL_SIZE) {
              height = (height * MAX_THUMBNAIL_SIZE) / width;
              width = MAX_THUMBNAIL_SIZE;
            }
          } else {
            if (height > MAX_THUMBNAIL_SIZE) {
              width = (width * MAX_THUMBNAIL_SIZE) / height;
              height = MAX_THUMBNAIL_SIZE;
            }
          }

          // 创建 canvas 并绘制缩略图
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          
          if (!ctx) {
            resolve(null);
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);
          
          // 转换为 base64
          const compressedUrl = canvas.toDataURL('image/jpeg', THUMBNAIL_QUALITY);
          resolve(compressedUrl);
        } catch (error) {
          console.warn('图片压缩失败:', error);
          resolve(null);
        }
      };
      
      img.onerror = () => {
        console.warn('图片加载失败，无法压缩');
        resolve(null);
      };
      
      img.src = imageUrl;
    } catch (error) {
      console.warn('图片压缩过程出错:', error);
      resolve(null);
    }
  });
}

/**
 * 检查图片大小（base64 字符串长度）
 * @param imageUrl base64 图片 URL
 * @returns 图片大小（字节）
 */
export function getImageSize(imageUrl: string): number {
  if (!imageUrl.startsWith('data:image')) {
    return 0;
  }
  // base64 编码后的大小约为原始大小的 4/3
  // 这里简单计算 base64 字符串的长度
  const base64Data = imageUrl.split(',')[1];
  return base64Data ? base64Data.length : 0;
}

/**
 * 检查图片是否过大（超过 500KB）
 */
export function isImageTooLarge(imageUrl: string): boolean {
  const size = getImageSize(imageUrl);
  // 500KB = 500 * 1024 字节
  return size > 500 * 1024;
}

