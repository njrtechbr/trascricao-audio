const { contextBridge, ipcRenderer } = require('electron');

/**
 * Script de preload para comunicação segura entre o processo principal e o renderer
 * Este arquivo é executado no contexto do renderer, mas tem acesso às APIs do Node.js
 */

// Expor APIs seguras para o contexto do renderer
contextBridge.exposeInMainWorld('electronAPI', {
  /**
   * APIs para manipulação de arquivos
   */
  arquivo: {
    /**
     * Abre diálogo para seleção de arquivo de áudio
     * @returns {Promise<string|null>} Caminho do arquivo selecionado ou null se cancelado
     */
    abrirDialogoSelecao: () => ipcRenderer.invoke('dialog:openFile'),
    
    /**
     * Salva conteúdo em arquivo
     * @param {string} caminhoDefault - Caminho padrão para salvar
     * @param {string} conteudo - Conteúdo a ser salvo
     * @returns {Promise<{success: boolean, filePath?: string, error?: string}>}
     */
    salvarArquivo: (caminhoDefault, conteudo) => 
      ipcRenderer.invoke('dialog:saveFile', caminhoDefault, conteudo)
  },

  /**
   * APIs para informações do sistema
   */
  sistema: {
    /**
     * Obtém informações da plataforma
     * @returns {string} Nome da plataforma (win32, darwin, linux)
     */
    obterPlataforma: () => process.platform,
    
    /**
     * Verifica se está em modo de desenvolvimento
     * @returns {boolean} True se estiver em desenvolvimento
     */
    ehDesenvolvimento: () => process.env.NODE_ENV === 'development'
  },

  /**
   * APIs para notificações (futuro)
   */
  notificacao: {
    /**
     * Mostra notificação do sistema
     * @param {string} titulo - Título da notificação
     * @param {string} corpo - Corpo da notificação
     */
    mostrar: (titulo, corpo) => {
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(titulo, { body: corpo });
      }
    },
    
    /**
     * Solicita permissão para notificações
     * @returns {Promise<string>} Resultado da permissão
     */
    solicitarPermissao: () => {
      if ('Notification' in window) {
        return Notification.requestPermission();
      }
      return Promise.resolve('denied');
    }
  },

  /**
   * APIs para configurações da aplicação
   */
  configuracoes: {
    /**
     * Salva configuração no localStorage (wrapper seguro)
     * @param {string} chave - Chave da configuração
     * @param {string} valor - Valor da configuração
     */
    salvar: (chave, valor) => {
      try {
        localStorage.setItem(chave, valor);
        return true;
      } catch (error) {
        console.error('Erro ao salvar configuração:', error);
        return false;
      }
    },
    
    /**
     * Carrega configuração do localStorage
     * @param {string} chave - Chave da configuração
     * @returns {string|null} Valor da configuração ou null
     */
    carregar: (chave) => {
      try {
        return localStorage.getItem(chave);
      } catch (error) {
        console.error('Erro ao carregar configuração:', error);
        return null;
      }
    },
    
    /**
     * Remove configuração do localStorage
     * @param {string} chave - Chave da configuração
     */
    remover: (chave) => {
      try {
        localStorage.removeItem(chave);
        return true;
      } catch (error) {
        console.error('Erro ao remover configuração:', error);
        return false;
      }
    }
  }
});

/**
 * Logs de segurança
 */
console.log('Preload script carregado com sucesso');
console.log('APIs do Electron expostas:', Object.keys(window.electronAPI || {}));

/**
 * Prevenir acesso direto às APIs do Node.js
 */
delete window.require;
delete window.exports;
delete window.module;

/**
 * Configurações de segurança adicionais
 */
window.addEventListener('DOMContentLoaded', () => {
  // Remover referências potencialmente perigosas
  delete window.global;
  delete window.Buffer;
  delete window.process;
  
  console.log('Contexto de segurança configurado');
});