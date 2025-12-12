import { app, BrowserWindow, ipcMain } from 'electron';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let mainWindow: BrowserWindow | null = null;

// 打印用户数据目录（用于调试）
console.log('用户数据目录:', app.getPath('userData'));
console.log('LocalStorage 存储位置:', join(app.getPath('userData'), 'Local Storage'));

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: join(__dirname, 'preload.js'),
    },
    titleBarStyle: 'hiddenInset',
    show: false,
  });

  // 开发环境加载本地服务器，生产环境加载构建后的文件
  if (process.env.NODE_ENV === 'development' || !app.isPackaged) {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    // 打包后，renderer 目录和 main.js 在同一层级（都在 dist 目录下）
    const htmlPath = join(__dirname, 'renderer/index.html');
    console.log('加载 HTML 文件路径:', htmlPath);
    console.log('__dirname:', __dirname);
    console.log('app.getAppPath():', app.getAppPath());
    
    mainWindow.loadFile(htmlPath).catch((error) => {
      console.error('加载 HTML 文件失败:', error);
      // 如果 loadFile 失败，尝试使用 loadURL
      const fileUrl = `file://${htmlPath}`;
      console.log('尝试使用 file:// URL:', fileUrl);
      mainWindow?.loadURL(fileUrl).catch((urlError) => {
        console.error('使用 file:// URL 也失败:', urlError);
      });
    });
  }

  // 监听页面加载错误
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.error('页面加载失败:', {
      errorCode,
      errorDescription,
      validatedURL,
    });
  });

  // 监听控制台消息（用于调试）
  mainWindow.webContents.on('console-message', (event, level, message) => {
    console.log(`[渲染进程 ${level}]:`, message);
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  // 注册 IPC 处理器
  ipcMain.handle('get-user-data-path', () => {
    return app.getPath('userData');
  });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

