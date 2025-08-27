import React, { useState, useEffect } from 'react';
import { useApiKey } from '../contexts/ApiKeyContext';
import { useTheme } from '../contexts/ThemeContext';
import { usePreferences } from '../hooks/usePreferences';
import { CloseIcon } from './icons/CloseIcon';
import { KeyboardShortcutsHelp } from '../hooks/useKeyboardShortcuts';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { apiKey, setApiKey } = useApiKey();
  const { theme, toggleTheme } = useTheme();
  const { preferences, updatePreferences, resetPreferences, exportPreferences, importPreferences } = usePreferences();
  const [localKey, setLocalKey] = useState(apiKey || '');
  const [activeTab, setActiveTab] = useState<'api' | 'preferences' | 'shortcuts'>('api');

  useEffect(() => {
    setLocalKey(apiKey || '');
  }, [apiKey, isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    setApiKey(localKey.trim());
    onClose();
  };

  const handlePreferenceChange = (key: keyof typeof preferences, value: any) => {
    updatePreferences({ [key]: value });
  };

  const handleExportPreferences = () => {
    const data = exportPreferences();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'transcricao-preferencias.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImportPreferences = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = e.target?.result as string;
          importPreferences(data);
        } catch (error) {
          alert('Erro ao importar preferências. Verifique se o arquivo é válido.');
        }
      };
      reader.readAsText(file);
    }
  };

  const handleWrapperClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
        onClose();
    }
  }

  return (
    <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in-fast" 
        onClick={handleWrapperClick}
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
    >
      <div className="bg-brand-surface w-full max-w-4xl m-4 rounded-xl shadow-2xl border border-gray-700 p-6 md:p-8" role="document">
        <div className="flex justify-between items-center mb-6">
          <h2 id="settings-title" className="text-2xl font-bold text-brand-primary">Configurações</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white" aria-label="Fechar modal">
            <CloseIcon className="w-6 h-6" />
          </button>
        </div>
        
        {/* Tabs */}
        <div className="flex border-b border-gray-600 mb-6">
          <button
            onClick={() => setActiveTab('api')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'api'
                ? 'text-brand-primary border-b-2 border-brand-primary'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            API
          </button>
          <button
            onClick={() => setActiveTab('preferences')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'preferences'
                ? 'text-brand-primary border-b-2 border-brand-primary'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Preferências
          </button>
          <button
            onClick={() => setActiveTab('shortcuts')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'shortcuts'
                ? 'text-brand-primary border-b-2 border-brand-primary'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Atalhos
          </button>
        </div>
        
        {/* Tab Content */}
        <div className="min-h-[400px]">
          {activeTab === 'api' && (
            <div>
              <label htmlFor="apiKey" className="block text-sm font-medium text-brand-text-secondary mb-2">
                Chave de API do Google Gemini
              </label>
              <input
                id="apiKey"
                type="password"
                value={localKey}
                onChange={(e) => setLocalKey(e.target.value)}
                placeholder="Cole sua chave de API aqui"
                className="w-full bg-gray-900/50 border border-gray-600 rounded-md p-3 text-brand-text focus:ring-2 focus:ring-brand-primary focus:border-brand-primary outline-none"
              />
              <p className="text-xs text-brand-text-secondary mt-2">
                Sua chave de API é armazenada apenas no seu navegador. Você pode obter uma em{' '}
                <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-brand-primary hover:underline">
                  Google AI Studio
                </a>.
              </p>
            </div>
          )}
          
          {activeTab === 'preferences' && (
            <div className="space-y-6">
              {/* Tema */}
              <div>
                <label className="block text-sm font-medium text-brand-text-secondary mb-2">
                  Tema
                </label>
                <div className="flex items-center space-x-4">
                  <button
                    onClick={toggleTheme}
                    className="px-4 py-2 bg-brand-primary text-gray-900 rounded-md hover:bg-brand-primary-hover transition-colors"
                  >
                    {theme === 'dark' ? 'Mudar para Claro' : 'Mudar para Escuro'}
                  </button>
                  <span className="text-sm text-brand-text-secondary">
                    Tema atual: {theme === 'dark' ? 'Escuro' : 'Claro'}
                  </span>
                </div>
              </div>
              
              {/* Velocidade de Reprodução */}
              <div>
                <label className="block text-sm font-medium text-brand-text-secondary mb-2">
                  Velocidade de Reprodução Padrão: {preferences.audioPlaybackSpeed}x
                </label>
                <input
                  type="range"
                  min="0.5"
                  max="2"
                  step="0.1"
                  value={preferences.audioPlaybackSpeed}
                  onChange={(e) => handlePreferenceChange('audioPlaybackSpeed', parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>
              
              {/* Formato de Exportação */}
              <div>
                <label className="block text-sm font-medium text-brand-text-secondary mb-2">
                  Formato de Exportação
                </label>
                <select
                  value={preferences.exportFormat}
                  onChange={(e) => handlePreferenceChange('exportFormat', e.target.value)}
                  className="w-full bg-gray-900/50 border border-gray-600 rounded-md p-3 text-brand-text focus:ring-2 focus:ring-brand-primary focus:border-brand-primary outline-none"
                >
                  <option value="txt">Texto (.txt)</option>
                  <option value="json">JSON (.json)</option>
                  <option value="srt">SubRip (.srt)</option>
                  <option value="vtt">WebVTT (.vtt)</option>
                </select>
              </div>
              
              {/* Tamanho da Fonte */}
              <div>
                <label className="block text-sm font-medium text-brand-text-secondary mb-2">
                  Tamanho da Fonte: {preferences.fontSize}px
                </label>
                <input
                  type="range"
                  min="12"
                  max="24"
                  step="1"
                  value={preferences.fontSize}
                  onChange={(e) => handlePreferenceChange('fontSize', parseInt(e.target.value))}
                  className="w-full"
                />
              </div>
              
              {/* Configurações Booleanas */}
              <div className="space-y-4">
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={preferences.autoScroll}
                    onChange={(e) => handlePreferenceChange('autoScroll', e.target.checked)}
                    className="w-4 h-4 text-brand-primary bg-gray-900 border-gray-600 rounded focus:ring-brand-primary"
                  />
                  <span className="text-sm text-brand-text-secondary">Rolagem Automática</span>
                </label>
                
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={preferences.keyboardShortcutsEnabled}
                    onChange={(e) => handlePreferenceChange('keyboardShortcutsEnabled', e.target.checked)}
                    className="w-4 h-4 text-brand-primary bg-gray-900 border-gray-600 rounded focus:ring-brand-primary"
                  />
                  <span className="text-sm text-brand-text-secondary">Atalhos de Teclado</span>
                </label>
                
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={preferences.autoSave}
                    onChange={(e) => handlePreferenceChange('autoSave', e.target.checked)}
                    className="w-4 h-4 text-brand-primary bg-gray-900 border-gray-600 rounded focus:ring-brand-primary"
                  />
                  <span className="text-sm text-brand-text-secondary">Salvamento Automático</span>
                </label>
                
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={preferences.showTimestamps}
                    onChange={(e) => handlePreferenceChange('showTimestamps', e.target.checked)}
                    className="w-4 h-4 text-brand-primary bg-gray-900 border-gray-600 rounded focus:ring-brand-primary"
                  />
                  <span className="text-sm text-brand-text-secondary">Mostrar Timestamps</span>
                </label>
              </div>
              
              {/* Ações de Preferências */}
              <div className="border-t border-gray-600 pt-4">
                <h3 className="text-lg font-medium text-brand-text mb-4">Gerenciar Preferências</h3>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={handleExportPreferences}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
                  >
                    Exportar
                  </button>
                  <label className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors cursor-pointer">
                    Importar
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleImportPreferences}
                      className="hidden"
                    />
                  </label>
                  <button
                    onClick={resetPreferences}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors"
                  >
                    Resetar
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {activeTab === 'shortcuts' && (
            <div>
              <KeyboardShortcutsHelp />
            </div>
          )}
        </div>

        <div className="flex justify-end gap-4 mt-8">
            <button
                onClick={onClose}
                className="px-6 py-2 text-sm font-semibold bg-gray-700 hover:bg-gray-600 rounded-md transition-colors"
            >
                Cancelar
            </button>
            <button
                onClick={handleSave}
                className="px-6 py-2 text-sm font-bold bg-brand-primary text-gray-900 hover:bg-brand-primary-hover rounded-md transition-colors"
            >
                Salvar
            </button>
        </div>
      </div>
    </div>
  );
};

// Adiciona animação de fade-in para o modal
const style = document.createElement('style');
if (!document.querySelector('#modal-animation-style')) {
    style.id = 'modal-animation-style';
    style.innerHTML = `
      @keyframes fade-in-fast {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      .animate-fade-in-fast {
        animation: fade-in-fast 0.2s ease-out forwards;
      }
    `;
    document.head.appendChild(style);
}