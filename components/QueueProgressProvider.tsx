import React, { createContext, useContext, ReactNode } from 'react';
import ProgressIndicator, { useProgressIndicator } from './ProgressIndicator';

// Contexto para compartilhar o status da fila
interface QueueContextType {
  isProcessing: boolean;
  isComplete: boolean;
  hasErrors: boolean;
  percentualConcluido: number;
  totalTarefas: number;
  tarefasPendentes: number;
}

const QueueContext = createContext<QueueContextType | undefined>(undefined);

// Hook para usar o contexto da fila
export const useQueue = (): QueueContextType => {
  const context = useContext(QueueContext);
  if (!context) {
    throw new Error('useQueue deve ser usado dentro de QueueProgressProvider');
  }
  return context;
};

// Provider que envolve a aplicação e fornece o indicador de progresso
interface QueueProgressProviderProps {
  children: ReactNode;
  mostrarDetalhes?: boolean;
}

export const QueueProgressProvider: React.FC<QueueProgressProviderProps> = ({ 
  children, 
  mostrarDetalhes = false 
}) => {
  const { status, isProcessing, isComplete, hasErrors } = useProgressIndicator();

  const contextValue: QueueContextType = {
    isProcessing,
    isComplete,
    hasErrors,
    percentualConcluido: status.percentualConcluido,
    totalTarefas: status.total,
    tarefasPendentes: status.pendentes
  };

  return (
    <QueueContext.Provider value={contextValue}>
      {children}
      <ProgressIndicator 
        mostrarDetalhes={mostrarDetalhes}
        className="z-50"
      />
    </QueueContext.Provider>
  );
};

export default QueueProgressProvider;