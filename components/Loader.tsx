
import React from 'react';
import { Status } from '../types';

interface LoaderProps {
  status: Status;
}

const statusMessages: Record<Status, string> = {
  [Status.Transcribing]: 'Transcrevendo o áudio... isso pode levar um momento.',
  [Status.Summarizing]: 'Criando resumo com IA...',
  [Status.Idle]: '',
  [Status.Done]: '',
  [Status.Error]: '',
}

export const Loader: React.FC<LoaderProps> = ({ status }) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 bg-brand-surface rounded-xl border border-gray-700">
      <div className="w-12 h-12 border-4 border-t-brand-primary border-gray-600 rounded-full animate-spin"></div>
      <p className="mt-4 text-brand-text-secondary font-medium tracking-wide">
        {statusMessages[status] || 'Processando...'}
      </p>
    </div>
  );
};
