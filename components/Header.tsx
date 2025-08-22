import React from 'react';
import { SettingsIcon } from './icons/SettingsIcon';

interface HeaderProps {
    onSettingsClick: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onSettingsClick }) => {
  return (
    <header className="relative text-center w-full max-w-3xl mx-auto">
      <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-sky-400 to-indigo-500">
        Transcrição de Áudio com IA
      </h1>
      <p className="mt-3 text-lg text-brand-text-secondary">
        Transforme seu áudio em texto e obtenha resumos instantâneos com o poder da IA.
      </p>
      <button 
        onClick={onSettingsClick}
        className="absolute top-0 right-0 p-2 text-brand-text-secondary hover:text-brand-primary transition-colors"
        aria-label="Configurações"
      >
          <SettingsIcon className="w-6 h-6" />
      </button>
    </header>
  );
};