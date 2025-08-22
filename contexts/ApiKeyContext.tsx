import React, { createContext, useState, useContext, ReactNode } from 'react';

interface ApiKeyContextType {
  apiKey: string | null;
  setApiKey: (key: string | null) => void;
  isConfigured: boolean;
}

const ApiKeyContext = createContext<ApiKeyContextType | undefined>(undefined);

export const ApiKeyProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [apiKey, setApiKeyInternal] = useState<string | null>(() => {
    try {
      return localStorage.getItem('gemini_api_key');
    } catch {
      // localStorage pode não estar disponível em alguns ambientes (ex: SSR, iframes em modo anônimo)
      return null;
    }
  });

  const setApiKey = (key: string | null) => {
    try {
      if (key) {
        localStorage.setItem('gemini_api_key', key);
      } else {
        localStorage.removeItem('gemini_api_key');
      }
    } catch (error) {
        console.error("Não foi possível salvar a chave de API no localStorage", error);
    }
    setApiKeyInternal(key);
  };

  const isConfigured = !!apiKey;

  return (
    <ApiKeyContext.Provider value={{ apiKey, setApiKey, isConfigured }}>
      {children}
    </ApiKeyContext.Provider>
  );
};

export const useApiKey = (): ApiKeyContextType => {
  const context = useContext(ApiKeyContext);
  if (context === undefined) {
    throw new Error('useApiKey deve ser usado dentro de um ApiKeyProvider');
  }
  return context;
};