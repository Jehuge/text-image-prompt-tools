import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function buildDesktop() {
  console.log('📦 开始构建桌面应用...');
  
  // 1. 构建 core
  console.log('1️⃣ 构建 core...');
  execSync('pnpm -F @text-image-prompt-tools/core build', { stdio: 'inherit' });
  
  // 2. 构建 ui
  console.log('2️⃣ 构建 ui...');
  execSync('pnpm -F @text-image-prompt-tools/ui build', { stdio: 'inherit' });
  
  // 3. 构建 web 应用（渲染进程）
  console.log('3️⃣ 构建渲染进程（web 应用）...');
  execSync('pnpm -F @text-image-prompt-tools/web build', { stdio: 'inherit' });
  
  // 4. 复制 web 构建输出到 desktop/dist/renderer
  console.log('4️⃣ 复制渲染进程文件...');
  const webDist = path.resolve(__dirname, '../web/dist');
  const desktopRenderer = path.resolve(__dirname, 'dist/renderer');
  
  // 确保目标目录存在
  if (!fs.existsSync(path.resolve(__dirname, 'dist'))) {
    fs.mkdirSync(path.resolve(__dirname, 'dist'), { recursive: true });
  }
  
  // 删除旧的 renderer 目录
  if (fs.existsSync(desktopRenderer)) {
    fs.rmSync(desktopRenderer, { recursive: true, force: true });
  }
  
  // 复制文件
  if (fs.existsSync(webDist)) {
    fs.cpSync(webDist, desktopRenderer, { recursive: true });
    console.log('✅ 渲染进程文件已复制');
  } else {
    throw new Error(`Web 构建输出不存在: ${webDist}`);
  }
  
  // 5. 构建主进程和预加载脚本
  console.log('5️⃣ 构建主进程和预加载脚本...');
  execSync('tsc', { stdio: 'inherit', cwd: __dirname });
  
  // 验证主进程文件是否存在
  const mainFile = path.resolve(__dirname, 'dist/main.js');
  if (!fs.existsSync(mainFile)) {
    throw new Error(`主进程文件未生成: ${mainFile}`);
  }
  
  const preloadFile = path.resolve(__dirname, 'dist/preload.js');
  if (!fs.existsSync(preloadFile)) {
    throw new Error(`预加载脚本未生成: ${preloadFile}`);
  }
  
  console.log('✅ 构建完成！');
}

buildDesktop();

