const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const isDev = !app.isPackaged;

/**
 * Cria a janela principal da aplicação
 */
function criarJanelaPrincipal() {
  // Criar a janela do navegador
  let janelaMain = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false, // Desabilita integração do Node.js por segurança
      contextIsolation: true, // Habilita isolamento de contexto
      enableRemoteModule: false, // Desabilita módulo remoto por segurança
      webSecurity: false, // Permite requisições CORS para APIs externas
      allowRunningInsecureContent: true,
      experimentalFeatures: true,
      preload: path.join(__dirname, 'preload.js') // Script de preload para comunicação segura
    },
    icon: path.join(__dirname, 'assets', 'icon-256.png'), // Ícone da aplicação
    show: false, // Não mostrar até estar pronto
    titleBarStyle: 'default',
    title: 'Transcrição de Áudio com IA'
  });

  // Carregar a aplicação
  if (isDev) {
    // Em desenvolvimento, carrega do servidor Vite
    janelaMain.loadURL('http://localhost:5173');
    // Abrir DevTools em desenvolvimento
    janelaMain.webContents.openDevTools();
  } else {
    // Em produção, carrega os arquivos estáticos
    const indexPath = path.join(__dirname, 'dist', 'index.html');
    janelaMain.loadFile(indexPath);
  }

  // Mostrar janela quando estiver pronta
  janelaMain.once('ready-to-show', () => {
    janelaMain.show();
  });

  // Emitir evento quando a janela for fechada
  janelaMain.on('closed', () => {
    // Desreferenciar o objeto da janela
    janelaMain = null;
  });

  return janelaMain;
}

/**
 * Configurações do aplicativo
 */

// Este método será chamado quando o Electron terminar a inicialização
// e estiver pronto para criar janelas do navegador
app.whenReady().then(() => {
  criarJanelaPrincipal();

  // No macOS, é comum recriar uma janela quando o ícone do dock é clicado
  // e não há outras janelas abertas
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      criarJanelaPrincipal();
    }
  });
});

// Sair quando todas as janelas forem fechadas, exceto no macOS
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Manipuladores IPC para comunicação com o renderer

/**
 * Manipulador para abrir diálogo de seleção de arquivo
 */
ipcMain.handle('dialog:openFile', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [
      {
        name: 'Arquivos de Áudio',
        extensions: ['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac']
      },
      {
        name: 'Todos os Arquivos',
        extensions: ['*']
      }
    ]
  });
  
  if (canceled) {
    return null;
  } else {
    return filePaths[0];
  }
});

/**
 * Manipulador para salvar arquivo
 */
ipcMain.handle('dialog:saveFile', async (event, defaultPath, content) => {
  const { canceled, filePath } = await dialog.showSaveDialog({
    defaultPath: defaultPath,
    filters: [
      {
        name: 'Arquivo de Texto',
        extensions: ['txt']
      },
      {
        name: 'Todos os Arquivos',
        extensions: ['*']
      }
    ]
  });
  
  if (canceled) {
    return { success: false };
  } else {
    try {
      const fs = require('fs');
      fs.writeFileSync(filePath, content, 'utf8');
      return { success: true, filePath };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
});

/**
 * Configurações de segurança
 */
app.on('web-contents-created', (event, contents) => {
  // Prevenir navegação para URLs externas (mas permitir requisições de API)
  contents.on('will-navigate', (navigationEvent, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl);
    
    // Permitir URLs locais e APIs necessárias
    const allowedOrigins = [
      'http://localhost:5173',
      'file://',
      'https://api-inference.huggingface.co',
      'https://router.huggingface.co',
      'https://huggingface.co',
      'https://uhzqchkehypuqveijegh.supabase.co'
    ];
    
    const isAllowed = allowedOrigins.some(origin => 
      parsedUrl.origin === origin || navigationUrl.startsWith(origin)
    );
    
    if (!isAllowed) {
      navigationEvent.preventDefault();
    }
  });

  // Prevenir abertura de novas janelas
  contents.setWindowOpenHandler(({ url }) => {
    // Permitir URLs locais
    if (url.startsWith('http://localhost:5173') || url.startsWith('file://')) {
      return { action: 'allow' };
    }
    return { action: 'deny' };
  });
});