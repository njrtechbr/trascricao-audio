import { useState, useEffect, useCallback } from 'react';

interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  audioPlaybackSpeed: number;
  autoScroll: boolean;
  highlightTolerance: number;
  exportFormat: 'txt' | 'json' | 'srt' | 'vtt';
  fontSize: 'small' | 'medium' | 'large';
  keyboardShortcutsEnabled: boolean;
  autoSave: boolean;
  language: 'pt-BR' | 'en-US' | 'es-ES';
  maxRecentFiles: number;
  showTimestamps: boolean;
  wordConfidenceThreshold: number;
}

const DEFAULT_PREFERENCES: UserPreferences = {
  theme: 'system',
  audioPlaybackSpeed: 1.0,
  autoScroll: true,
  highlightTolerance: 0.5,
  exportFormat: 'txt',
  fontSize: 'medium',
  keyboardShortcutsEnabled: true,
  autoSave: true,
  language: 'pt-BR',
  maxRecentFiles: 10,
  showTimestamps: false,
  wordConfidenceThreshold: 0.7
};

const STORAGE_KEY = 'transcription-app-preferences';

export const usePreferences = () => {
  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_PREFERENCES);
  const [isLoading, setIsLoading] = useState(true);

  // Carregar preferências do localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsedPreferences = JSON.parse(stored);
        // Mesclar com valores padrão para garantir que novas preferências sejam incluídas
        setPreferences({ ...DEFAULT_PREFERENCES, ...parsedPreferences });
      }
    } catch (error) {
      console.error('Erro ao carregar preferências:', error);
      // Em caso de erro, usar preferências padrão
      setPreferences(DEFAULT_PREFERENCES);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Salvar preferências no localStorage
  const savePreferences = useCallback((newPreferences: UserPreferences) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newPreferences));
      setPreferences(newPreferences);
    } catch (error) {
      console.error('Erro ao salvar preferências:', error);
    }
  }, []);

  // Atualizar uma preferência específica
  const updatePreference = useCallback(<K extends keyof UserPreferences>(
    key: K,
    value: UserPreferences[K]
  ) => {
    const newPreferences = { ...preferences, [key]: value };
    savePreferences(newPreferences);
  }, [preferences, savePreferences]);

  // Resetar para preferências padrão
  const resetPreferences = useCallback(() => {
    savePreferences(DEFAULT_PREFERENCES);
  }, [savePreferences]);

  // Exportar preferências
  const exportPreferences = useCallback(() => {
    const dataStr = JSON.stringify(preferences, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = 'transcription-app-preferences.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
  }, [preferences]);

  // Importar preferências
  const importPreferences = useCallback((file: File) => {
    return new Promise<void>((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const importedPreferences = JSON.parse(content);
          
          // Validar se as preferências importadas são válidas
          const validatedPreferences = { ...DEFAULT_PREFERENCES, ...importedPreferences };
          savePreferences(validatedPreferences);
          resolve();
        } catch (error) {
          reject(new Error('Arquivo de preferências inválido'));
        }
      };
      
      reader.onerror = () => {
        reject(new Error('Erro ao ler o arquivo'));
      };
      
      reader.readAsText(file);
    });
  }, [savePreferences]);

  // Obter configurações de tema baseadas na preferência
  const getThemeSettings = useCallback(() => {
    if (preferences.theme === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return preferences.theme;
  }, [preferences.theme]);

  // Obter configurações de fonte baseadas na preferência
  const getFontSizeClass = useCallback(() => {
    const sizeMap = {
      small: 'text-sm',
      medium: 'text-base',
      large: 'text-lg'
    };
    return sizeMap[preferences.fontSize];
  }, [preferences.fontSize]);

  return {
    preferences,
    isLoading,
    updatePreference,
    resetPreferences,
    exportPreferences,
    importPreferences,
    getThemeSettings,
    getFontSizeClass,
    // Atalhos para preferências comuns
    setTheme: (theme: UserPreferences['theme']) => updatePreference('theme', theme),
    setPlaybackSpeed: (speed: number) => updatePreference('audioPlaybackSpeed', speed),
    setAutoScroll: (enabled: boolean) => updatePreference('autoScroll', enabled),
    setHighlightTolerance: (tolerance: number) => updatePreference('highlightTolerance', tolerance),
    setExportFormat: (format: UserPreferences['exportFormat']) => updatePreference('exportFormat', format),
    setFontSize: (size: UserPreferences['fontSize']) => updatePreference('fontSize', size),
    setKeyboardShortcuts: (enabled: boolean) => updatePreference('keyboardShortcutsEnabled', enabled),
    setAutoSave: (enabled: boolean) => updatePreference('autoSave', enabled),
    setLanguage: (language: UserPreferences['language']) => updatePreference('language', language),
    setShowTimestamps: (show: boolean) => updatePreference('showTimestamps', show),
    setWordConfidenceThreshold: (threshold: number) => updatePreference('wordConfidenceThreshold', threshold)
  };
};

// Hook para gerenciar arquivos recentes
export const useRecentFiles = () => {
  const [recentFiles, setRecentFiles] = useState<Array<{
    name: string;
    path: string;
    lastOpened: number;
    size?: number;
  }>>([]);

  const { preferences } = usePreferences();

  useEffect(() => {
    try {
      const stored = localStorage.getItem('transcription-app-recent-files');
      if (stored) {
        setRecentFiles(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Erro ao carregar arquivos recentes:', error);
    }
  }, []);

  const addRecentFile = useCallback((file: { name: string; path: string; size?: number }) => {
    setRecentFiles(prev => {
      const filtered = prev.filter(f => f.path !== file.path);
      const newList = [{ ...file, lastOpened: Date.now() }, ...filtered]
        .slice(0, preferences.maxRecentFiles);
      
      localStorage.setItem('transcription-app-recent-files', JSON.stringify(newList));
      return newList;
    });
  }, [preferences.maxRecentFiles]);

  const removeRecentFile = useCallback((path: string) => {
    setRecentFiles(prev => {
      const filtered = prev.filter(f => f.path !== path);
      localStorage.setItem('transcription-app-recent-files', JSON.stringify(filtered));
      return filtered;
    });
  }, []);

  const clearRecentFiles = useCallback(() => {
    setRecentFiles([]);
    localStorage.removeItem('transcription-app-recent-files');
  }, []);

  return {
    recentFiles,
    addRecentFile,
    removeRecentFile,
    clearRecentFiles
  };
};