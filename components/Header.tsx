import React from 'react';
import { SettingsIcon } from './icons/SettingsIcon';
import { ThemeIcon } from './icons/ThemeIcon';
import { useTheme } from '../contexts/ThemeContext';

interface HeaderProps {
    onSettingsClick: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onSettingsClick }) => {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="relative text-center w-full max-w-3xl mx-auto">
      <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-sky-400 to-indigo-500">
        Transcrição de Áudio com IA
      </h1>
      <p className="mt-3 text-lg text-brand-text-secondary">
        Transforme seu áudio em texto e obtenha resumos instantâneos com o poder da IA.
      </p>
      <div className="absolute top-0 right-0 flex gap-2">
        <button 
          onClick={toggleTheme}
          className="p-2 text-brand-text-secondary hover:text-brand-primary transition-colors"
          aria-label={`Alternar para tema ${theme === 'dark' ? 'claro' : 'escuro'}`}
          title={`Alternar para tema ${theme === 'dark' ? 'claro' : 'escuro'}`}
        >
          <ThemeIcon className="w-6 h-6" isDark={theme === 'dark'} />
        </button>
        <button 
          onClick={onSettingsClick}
          className="p-2 text-brand-text-secondary hover:text-brand-primary transition-colors"
          aria-label="Configurações"
        >
          <SettingsIcon className="w-6 h-6" />
        </button>
      </div>
    </header>
  );
};