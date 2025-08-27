import React, { useState, useEffect } from 'react';
import { StatusFila, ObservadorFila, servicoFila } from '../services/queueService';

interface ProgressIndicatorProps {
  mostrarDetalhes?: boolean;
  className?: string;
}

const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({ 
  mostrarDetalhes = false, 
  className = '' 
}) => {
  const [status, setStatus] = useState<StatusFila>({
    total: 0,
    processadas: 0,
    pendentes: 0,
    falharam: 0,
    percentualConcluido: 0
  });
  const [visivel, setVisivel] = useState(false);
  const [animacao, setAnimacao] = useState(false);

  useEffect(() => {
    const observador: ObservadorFila = {
      onStatusChange: (novoStatus: StatusFila) => {
        setStatus(novoStatus);
        
        // Mostra o indicador quando há tarefas pendentes
        const deveSerVisivel = novoStatus.pendentes > 0;
        setVisivel(deveSerVisivel);
        
        // Ativa animação quando há progresso
        if (novoStatus.percentualConcluido > 0) {
          setAnimacao(true);
          setTimeout(() => setAnimacao(false), 300);
        }
      },
      onTarefaConcluida: () => {
        // Feedback visual quando uma tarefa é concluída
        setAnimacao(true);
        setTimeout(() => setAnimacao(false), 200);
      },
      onTarefaFalhou: () => {
        // Feedback visual quando uma tarefa falha
        console.warn('Tarefa falhou na fila');
      }
    };

    servicoFila.adicionarObservador(observador);

    // Cleanup
    return () => {
      servicoFila.removerObservador(observador);
    };
  }, []);

  // Não renderiza se não há tarefas ou se não está visível
  if (!visivel || status.total === 0) {
    return null;
  }

  const obterCorBarra = (): string => {
    if (status.falharam > 0) return 'bg-red-500';
    if (status.percentualConcluido === 100) return 'bg-green-500';
    return 'bg-blue-500';
  };

  const obterCorFundo = (): string => {
    if (status.falharam > 0) return 'bg-red-100';
    if (status.percentualConcluido === 100) return 'bg-green-100';
    return 'bg-blue-100';
  };

  return (
    <div className={`fixed top-4 right-4 z-50 ${className}`}>
      <div 
        className={`
          bg-white rounded-lg shadow-lg border p-4 min-w-[300px] max-w-[400px]
          transform transition-all duration-300 ease-in-out
          ${animacao ? 'scale-105' : 'scale-100'}
          ${visivel ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
        `}
      >
        {/* Cabeçalho */}
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-700">
            Processando Dados
          </h3>
          <div className="flex items-center space-x-2">
            {status.pendentes > 0 && (
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent"></div>
            )}
            <span className="text-xs text-gray-500">
              {status.percentualConcluido}%
            </span>
          </div>
        </div>

        {/* Barra de Progresso */}
        <div className="mb-3">
          <div className={`w-full h-2 ${obterCorFundo()} rounded-full overflow-hidden`}>
            <div 
              className={`h-full ${obterCorBarra()} transition-all duration-500 ease-out rounded-full`}
              style={{ width: `${status.percentualConcluido}%` }}
            >
              {/* Animação de brilho */}
              <div className="h-full w-full bg-gradient-to-r from-transparent via-white to-transparent opacity-30 animate-pulse"></div>
            </div>
          </div>
        </div>

        {/* Detalhes (opcional) */}
        {mostrarDetalhes && (
          <div className="text-xs text-gray-600 space-y-1">
            <div className="flex justify-between">
              <span>Total:</span>
              <span className="font-medium">{status.total}</span>
            </div>
            <div className="flex justify-between">
              <span>Processadas:</span>
              <span className="font-medium text-green-600">{status.processadas}</span>
            </div>
            <div className="flex justify-between">
              <span>Pendentes:</span>
              <span className="font-medium text-blue-600">{status.pendentes}</span>
            </div>
            {status.falharam > 0 && (
              <div className="flex justify-between">
                <span>Falharam:</span>
                <span className="font-medium text-red-600">{status.falharam}</span>
              </div>
            )}
          </div>
        )}

        {/* Mensagem de Status */}
        <div className="mt-2 text-xs text-gray-500">
          {status.pendentes > 0 ? (
            <span>Processando requisições...</span>
          ) : status.percentualConcluido === 100 ? (
            <span className="text-green-600">✓ Concluído</span>
          ) : status.falharam > 0 ? (
            <span className="text-red-600">⚠ Algumas falhas</span>
          ) : (
            <span>Aguardando...</span>
          )}
        </div>

        {/* Botão de Fechar (quando concluído) */}
        {status.percentualConcluido === 100 && status.pendentes === 0 && (
          <button
            onClick={() => setVisivel(false)}
            className="mt-2 w-full text-xs text-gray-500 hover:text-gray-700 transition-colors"
          >
            Fechar
          </button>
        )}
      </div>
    </div>
  );
};

export default ProgressIndicator;

// Hook personalizado para usar o indicador de progresso
export const useProgressIndicator = () => {
  const [status, setStatus] = useState<StatusFila>({
    total: 0,
    processadas: 0,
    pendentes: 0,
    falharam: 0,
    percentualConcluido: 0
  });

  useEffect(() => {
    const observador: ObservadorFila = {
      onStatusChange: setStatus,
      onTarefaConcluida: () => {},
      onTarefaFalhou: () => {}
    };

    servicoFila.adicionarObservador(observador);

    return () => {
      servicoFila.removerObservador(observador);
    };
  }, []);

  return {
    status,
    isProcessing: status.pendentes > 0,
    isComplete: status.percentualConcluido === 100 && status.pendentes === 0,
    hasErrors: status.falharam > 0
  };
};