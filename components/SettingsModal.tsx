import React, { useState, useEffect } from 'react';
import { useApiKey } from '../contexts/ApiKeyContext';
import { CloseIcon } from './icons/CloseIcon';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { apiKey, setApiKey } = useApiKey();
  const [localKey, setLocalKey] = useState(apiKey || '');

  useEffect(() => {
    setLocalKey(apiKey || '');
  }, [apiKey, isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    setApiKey(localKey.trim());
    onClose();
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
      <div className="bg-brand-surface w-full max-w-md m-4 rounded-xl shadow-2xl border border-gray-700 p-6 md:p-8" role="document">
        <div className="flex justify-between items-center mb-6">
          <h2 id="settings-title" className="text-2xl font-bold text-brand-primary">Configurações</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white" aria-label="Fechar modal">
            <CloseIcon className="w-6 h-6" />
          </button>
        </div>
        
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