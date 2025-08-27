import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [theme, setThemeInternal] = useState<Theme>(() => {
    try {
      const savedTheme = localStorage.getItem('app_theme') as Theme;
      return savedTheme || 'dark';
    } catch {
      return 'dark';
    }
  });

  const setTheme = (newTheme: Theme) => {
    try {
      localStorage.setItem('app_theme', newTheme);
    } catch (error) {
      console.error('Não foi possível salvar o tema no localStorage', error);
    }
    setThemeInternal(newTheme);
  };

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  // Aplica as classes CSS do tema no documento
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
    
    // Atualiza as variáveis CSS customizadas
    if (theme === 'light') {
      root.style.setProperty('--bg-primary', '#ffffff');
      root.style.setProperty('--bg-secondary', '#f8fafc');
      root.style.setProperty('--text-primary', '#1f2937');
      root.style.setProperty('--text-secondary', '#6b7280');
      root.style.setProperty('--border-color', '#e5e7eb');
      root.style.setProperty('--accent-color', '#0ea5e9');
      root.style.setProperty('--accent-hover', '#0284c7');
    } else {
      root.style.setProperty('--bg-primary', '#111827');
      root.style.setProperty('--bg-secondary', '#1f2937');
      root.style.setProperty('--text-primary', '#e5e7eb');
      root.style.setProperty('--text-secondary', '#9ca3af');
      root.style.setProperty('--border-color', '#374151');
      root.style.setProperty('--accent-color', '#22d3ee');
      root.style.setProperty('--accent-hover', '#67e8f9');
    }
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme deve ser usado dentro de um ThemeProvider');
  }
  return context;
};