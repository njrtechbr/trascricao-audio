import React, { useState, useEffect } from 'react';
import learningAlgorithmService from '../services/learningAlgorithmService';

interface RelatorioProgresso {
  resumoGeral: {
    totalPalavras: number;
    precisaoMedia: number;
    melhoriaGeral: number;
    ultimaAtualizacao: Date;
  };
  topPalavras: Array<{
    palavra: string;
    precisao: number;
    frequencia: number;
    melhoria: number;
  }>;
  estatisticasDetalhadas: {
    palavrasComAltoAprendizado: number;
    palavrasComBaixoAprendizado: number;
    compensacaoMediaGeral: number;
    tendenciaAprendizado: 'crescente' | 'estavel' | 'decrescente';
  };
}

interface Recomendacao {
  tipo: 'palavra' | 'configuracao' | 'dados';
  prioridade: 'alta' | 'media' | 'baixa';
  descricao: string;
  acao: string;
}

interface LearningReportProps {
  isVisible: boolean;
  onClose: () => void;
}

const LearningReport: React.FC<LearningReportProps> = ({ isVisible, onClose }) => {
  const [relatorio, setRelatorio] = useState<RelatorioProgresso | null>(null);
  const [recomendacoes, setRecomendacoes] = useState<Recomendacao[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (isVisible) {
      carregarDados();
    }
  }, [isVisible]);

  const carregarDados = async () => {
    setCarregando(true);
    setErro(null);
    
    try {
      const [relatorioData, recomendacoesData] = await Promise.all([
        learningAlgorithmService.gerarRelatorioProgresso(),
        learningAlgorithmService.obterRecomendacoesMelhoria()
      ]);
      
      setRelatorio(relatorioData);
      setRecomendacoes(recomendacoesData);
    } catch (error) {
      console.error('Erro ao carregar dados do relatório:', error);
      setErro('Erro ao carregar dados do relatório de aprendizado');
    } finally {
      setCarregando(false);
    }
  };

  const formatarPorcentagem = (valor: number): string => {
    return `${(valor * 100).toFixed(1)}%`;
  };

  const formatarData = (data: Date): string => {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(data);
  };

  const obterCorTendencia = (tendencia: string): string => {
    switch (tendencia) {
      case 'crescente': return 'text-green-600';
      case 'decrescente': return 'text-red-600';
      default: return 'text-yellow-600';
    }
  };

  const obterCorPrioridade = (prioridade: string): string => {
    switch (prioridade) {
      case 'alta': return 'bg-red-100 text-red-800 border-red-200';
      case 'media': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto m-4">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">Relatório de Aprendizado</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
            >
              ×
            </button>
          </div>

          {carregando && (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-gray-600">Carregando dados...</span>
            </div>
          )}

          {erro && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {erro}
            </div>
          )}

          {relatorio && (
            <div className="space-y-6">
              {/* Resumo Geral */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-4 text-gray-800">Resumo Geral</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{relatorio.resumoGeral.totalPalavras}</div>
                    <div className="text-sm text-gray-600">Total de Palavras</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {formatarPorcentagem(relatorio.resumoGeral.precisaoMedia)}
                    </div>
                    <div className="text-sm text-gray-600">Precisão Média</div>
                  </div>
                  <div className="text-center">
                    <div className={`text-2xl font-bold ${obterCorTendencia(relatorio.estatisticasDetalhadas.tendenciaAprendizado)}`}>
                      {formatarPorcentagem(Math.abs(relatorio.resumoGeral.melhoriaGeral))}
                    </div>
                    <div className="text-sm text-gray-600">Melhoria Geral</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm font-medium text-gray-800">
                      {formatarData(relatorio.resumoGeral.ultimaAtualizacao)}
                    </div>
                    <div className="text-sm text-gray-600">Última Atualização</div>
                  </div>
                </div>
              </div>

              {/* Estatísticas Detalhadas */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-4 text-gray-800">Estatísticas Detalhadas</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white rounded p-3 border">
                    <div className="text-lg font-bold text-green-600">
                      {relatorio.estatisticasDetalhadas.palavrasComAltoAprendizado}
                    </div>
                    <div className="text-sm text-gray-600">Palavras com Alto Aprendizado ({'>'}80%)</div>
                  </div>
                  <div className="bg-white rounded p-3 border">
                    <div className="text-lg font-bold text-red-600">
                      {relatorio.estatisticasDetalhadas.palavrasComBaixoAprendizado}
                    </div>
                    <div className="text-sm text-gray-600">Palavras com Baixo Aprendizado ({'<'}50%)</div>
                  </div>
                  <div className="bg-white rounded p-3 border">
                    <div className={`text-lg font-bold ${obterCorTendencia(relatorio.estatisticasDetalhadas.tendenciaAprendizado)}`}>
                      {relatorio.estatisticasDetalhadas.tendenciaAprendizado.toUpperCase()}
                    </div>
                    <div className="text-sm text-gray-600">Tendência de Aprendizado</div>
                  </div>
                </div>
              </div>

              {/* Top Palavras */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-4 text-gray-800">Top 10 Palavras por Melhoria</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full bg-white rounded border">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Palavra</th>
                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Precisão</th>
                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Frequência</th>
                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Score de Melhoria</th>
                      </tr>
                    </thead>
                    <tbody>
                      {relatorio.topPalavras.map((palavra, index) => (
                        <tr key={`palavra-${index}`} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                          <td className="px-4 py-2 text-sm font-medium text-gray-900">{palavra.palavra}</td>
                          <td className="px-4 py-2 text-sm text-gray-700">{formatarPorcentagem(palavra.precisao)}</td>
                          <td className="px-4 py-2 text-sm text-gray-700">{palavra.frequencia}</td>
                          <td className="px-4 py-2 text-sm text-gray-700">{palavra.melhoria ? palavra.melhoria.toFixed(2) : '0.00'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Recomendações */}
              {recomendacoes.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-lg font-semibold mb-4 text-gray-800">Recomendações de Melhoria</h3>
                  <div className="space-y-3">
                    {recomendacoes.map((recomendacao, index) => (
                      <div key={`recomendacao-${index}`} className="bg-white rounded border p-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className={`px-2 py-1 rounded text-xs font-medium border ${obterCorPrioridade(recomendacao.prioridade)}`}>
                                {recomendacao.prioridade.toUpperCase()}
                              </span>
                              <span className="text-xs text-gray-500 uppercase">{recomendacao.tipo}</span>
                            </div>
                            <div className="text-sm font-medium text-gray-900 mb-1">{recomendacao.descricao}</div>
                            <div className="text-sm text-gray-600">{recomendacao.acao}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Botão de Atualizar */}
              <div className="flex justify-center">
                <button
                  onClick={carregarDados}
                  disabled={carregando}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                >
                  {carregando ? 'Atualizando...' : 'Atualizar Dados'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LearningReport;