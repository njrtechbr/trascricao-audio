import { supabaseService } from './supabaseService';
import { vectorDatabaseService } from './vectorDatabaseService';

/**
 * Interface para dados de análise de padrões
 */
interface PadraoAprendizado {
  palavra: string;
  compensacaoMedia: number;
  frequenciaUso: number;
  contextoComum: string[];
  velocidadeReproducaoMedia: number;
  precisaoHistorica: number;
}

/**
 * Interface para métricas de performance do algoritmo
 */
interface MetricasPerformance {
  precisaoGeral: number;
  melhoriaTempoResposta: number;
  palavrasAprendidas: number;
  ultimaAtualizacao: Date;
}

/**
 * Interface para configurações do algoritmo
 */
interface ConfiguracaoAlgoritmo {
  minimoRegistrosParaAprendizado: number;
  pesoHistoricoRecente: number;
  limiteIdadeDados: number; // em dias
  intervaloAtualizacao: number; // em minutos
}

/**
 * Serviço de algoritmo de aprendizado baseado em dados históricos
 * Analisa padrões de uso e melhora as predições de compensação
 */
class LearningAlgorithmService {
  private configuracao: ConfiguracaoAlgoritmo = {
    minimoRegistrosParaAprendizado: 5,
    pesoHistoricoRecente: 0.7,
    limiteIdadeDados: 30,
    intervaloAtualizacao: 15
  };

  private padroes: Map<string, PadraoAprendizado> = new Map();
  private metricas: MetricasPerformance = {
    precisaoGeral: 0,
    melhoriaTempoResposta: 0,
    palavrasAprendidas: 0,
    ultimaAtualizacao: new Date()
  };

  private intervalId: NodeJS.Timeout | null = null;
  private isLearning = false;
  private isInitialized = false;

  /**
   * Inicializa o serviço de aprendizado
   */
  async inicializar(): Promise<void> {
    console.log('🧠 [LEARNING] Iniciando inicialização do algoritmo de aprendizado...');
    
    if (this.isInitialized) {
      console.log('✅ [LEARNING] Serviço de aprendizado já foi inicializado');
      return;
    }

    try {
      const startTime = Date.now();
      console.log('🔄 [LEARNING] Configurações do algoritmo:', {
        minimoRegistros: this.configuracao.minimoRegistrosParaAprendizado,
        pesoHistorico: this.configuracao.pesoHistoricoRecente,
        limiteIdade: `${this.configuracao.limiteIdadeDados} dias`,
        intervaloAtualizacao: `${this.configuracao.intervaloAtualizacao} minutos`
      });
      
      console.log('📚 [LEARNING] Carregando padrões existentes do banco de dados...');
      // Carregar padrões existentes do banco de dados
      await this.carregarPadroesExistentes();
      
      console.log('⏰ [LEARNING] Iniciando processo de aprendizado automático...');
      // Iniciar processo de aprendizado automático
      this.iniciarAprendizadoAutomatico();
      
      const initTime = Date.now() - startTime;
      this.isInitialized = true;
      
      console.log('✅ [LEARNING] Serviço de aprendizado inicializado com sucesso');
      console.log('📊 [LEARNING] Estatísticas da inicialização:', {
        tempoInicializacao: `${initTime}ms`,
        padroesCarregados: this.padroes.size,
        statusCiclo: this.intervalId ? 'Ativo' : 'Inativo',
        timestamp: new Date().toLocaleString('pt-BR')
      });
    } catch (error) {
      console.error('❌ [LEARNING] Erro ao inicializar serviço de aprendizado:', {
        tipo: error.constructor.name,
        mensagem: error.message,
        stack: error.stack,
        configuracao: this.configuracao
      });
      throw error;
    }
  }

  /**
   * Carrega padrões existentes do banco de dados
   */
  // Adicionar controle de taxa de requisições
  private requestQueue: Array<() => Promise<void>> = [];
  private isProcessingQueue = false;
  
  private async processRequestWithRateLimit<T>(request: () => Promise<T>): Promise<T> {
    // Implementar rate limiting simples
    await new Promise(resolve => setTimeout(resolve, 50)); // 50ms delay entre requisições
    return await request();
  }
  
  private async carregarPadroesExistentes(): Promise<void> {
    try {
      const startTime = Date.now();
      console.log('📚 [LEARNING] Carregando padrões existentes do banco de dados...');
      console.log('🔍 [LEARNING] Buscando dados históricos dos últimos', this.configuracao.limiteIdadeDados, 'dias');
      
      // Buscar dados históricos em lotes menores
      const dadosHistoricos = await supabaseService.obterDadosHistoricos(
        this.configuracao.limiteIdadeDados
      );
      
      const totalRegistros = dadosHistoricos.length;
      console.log(`📊 [LEARNING] Encontrados ${totalRegistros} registros históricos para análise`);
  
      if (totalRegistros === 0) {
        console.log('ℹ️ [LEARNING] Nenhum dado histórico encontrado. Iniciando com padrões vazios.');
        return;
      }
  
      // Processar em lotes de 20 registros por vez
      const batchSize = 20;
      const totalBatches = Math.ceil(totalRegistros / batchSize);
      console.log(`🔄 [LEARNING] Processando em ${totalBatches} lotes de ${batchSize} registros`);
      
      for (let i = 0; i < dadosHistoricos.length; i += batchSize) {
        const batchNumber = Math.floor(i / batchSize) + 1;
        const batch = dadosHistoricos.slice(i, i + batchSize);
        
        console.log(`📦 [LEARNING] Processando lote ${batchNumber}/${totalBatches} (${batch.length} registros)`);
        const batchStartTime = Date.now();
        
        // Processar lote com rate limiting
        for (const registro of batch) {
          await this.processRequestWithRateLimit(async () => {
            await this.analisarRegistro(registro);
          });
        }
        
        const batchTime = Date.now() - batchStartTime;
        console.log(`✅ [LEARNING] Lote ${batchNumber} processado em ${batchTime}ms`);
        
        // Pausa entre lotes
        if (i + batchSize < dadosHistoricos.length) {
          console.log('⏸️ [LEARNING] Pausando 200ms entre lotes...');
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }
      
      const totalTime = Date.now() - startTime;
      console.log('✅ [LEARNING] Carregamento de padrões concluído');
      console.log('📊 [LEARNING] Estatísticas do carregamento:', {
        registrosProcessados: totalRegistros,
        padroesCarregados: this.padroes.size,
        tempoTotal: `${totalTime}ms`,
        tempoMedioPorRegistro: totalRegistros > 0 ? `${((totalTime || 0) / totalRegistros).toFixed(2)}ms` : '0ms',
        eficiencia: totalRegistros > 0 ? `${(((this.padroes.size || 0) / totalRegistros) * 100).toFixed(1)}% de padrões únicos` : '0% de padrões únicos'
      });
    } catch (error) {
      console.error('❌ [LEARNING] Erro ao carregar padrões existentes:', {
        tipo: error.constructor.name,
        mensagem: error.message,
        stack: error.stack,
        configuracao: {
          limiteIdadeDados: this.configuracao.limiteIdadeDados,
          minimoRegistros: this.configuracao.minimoRegistrosParaAprendizado
        }
      });
    }
  }

  /**
   * Analisa dados de transcrição completa e extrai padrões de aprendizado
   */
  async analisarTranscricao(dadosTranscricao: {
    palavras: string[];
    tempoProcessamento: number;
    tamanhoAudio: number;
    qualidadeTranscricao: number;
  }): Promise<void> {
    try {
      console.log('🧠 [LEARNING] Iniciando análise de transcrição:', {
        totalPalavras: dadosTranscricao.palavras.length,
        qualidade: dadosTranscricao.qualidadeTranscricao
      });

      // Processar cada palavra da transcrição
      for (let i = 0; i < dadosTranscricao.palavras.length; i++) {
        const palavra = dadosTranscricao.palavras[i];
        
        // Calcular compensação baseada na posição e qualidade
        const compensacao = this.calcularCompensacaoEstimada(palavra, i, dadosTranscricao);
        
        // Construir contexto da palavra (palavras anteriores e posteriores)
        const contexto = this.construirContextoPalavra(dadosTranscricao.palavras, i);
        
        // Criar registro para análise
        const registro = {
          word: palavra,
          compensation_offset: compensacao,
          context: contexto,
          playback_rate: 1.0
        };
        
        await this.analisarRegistro(registro);
      }
      
      console.log('✅ [LEARNING] Análise de transcrição concluída');
    } catch (error) {
      console.error('❌ [LEARNING] Erro ao analisar transcrição:', error);
      throw error;
    }
  }

  /**
   * Calcula compensação estimada baseada na posição da palavra e qualidade da transcrição
   */
  private calcularCompensacaoEstimada(palavra: string, posicao: number, dados: any): number {
    // Compensação base baseada no comprimento da palavra
    const compensacaoBase = palavra.length * 50; // 50ms por caractere
    
    // Ajuste baseado na qualidade da transcrição
    const ajusteQualidade = (1 - dados.qualidadeTranscricao) * 100;
    
    // Ajuste baseado na posição (palavras no início podem ter mais delay)
    const ajustePosicao = posicao < 5 ? 100 : 0;
    
    return Math.round(compensacaoBase + ajusteQualidade + ajustePosicao);
  }

  /**
   * Constrói contexto da palavra baseado nas palavras adjacentes
   */
  private construirContextoPalavra(palavras: string[], posicao: number): string {
    const inicio = Math.max(0, posicao - 2);
    const fim = Math.min(palavras.length, posicao + 3);
    return palavras.slice(inicio, fim).join(' ');
  }

  /**
   * Analisa um registro individual e extrai padrões
   */
  private async analisarRegistro(registro: any): Promise<void> {
    const palavra = registro.word;
    const compensacao = registro.start_time || 0;
    const contexto = registro.context || '';
    const velocidade = registro.playback_rate || 1;

    console.log('🔍 [LEARNING] Analisando registro:', {
      palavra,
      compensacao: `${compensacao}ms`,
      contexto: contexto.substring(0, 50) + (contexto.length > 50 ? '...' : ''),
      velocidade
    });

    let padrao = this.padroes.get(palavra);
    const isNovoPadrao = !padrao;
    
    if (!padrao) {
      console.log('🆕 [LEARNING] Criando novo padrão para palavra:', palavra);
      padrao = {
        palavra,
        compensacaoMedia: compensacao,
        frequenciaUso: 1,
        contextoComum: [contexto],
        velocidadeReproducaoMedia: velocidade,
        precisaoHistorica: 0
      };
    } else {
      console.log('🔄 [LEARNING] Atualizando padrão existente:', {
        palavra,
        frequenciaAnterior: padrao.frequenciaUso,
        compensacaoAnterior: `${(padrao.compensacaoMedia || 0).toFixed(2)}ms`,
        novaCompensacao: `${compensacao}ms`
      });
      
      // Atualizar padrão existente com peso para dados recentes
      const peso = this.configuracao.pesoHistoricoRecente;
      const compensacaoAnterior = padrao.compensacaoMedia;
      padrao.compensacaoMedia = (padrao.compensacaoMedia * (1 - peso)) + (compensacao * peso);
      padrao.frequenciaUso += 1;
      padrao.velocidadeReproducaoMedia = (padrao.velocidadeReproducaoMedia * (1 - peso)) + (velocidade * peso);
      
      // Adicionar contexto se não existir
      if (!padrao.contextoComum.includes(contexto)) {
        padrao.contextoComum.push(contexto);
        // Manter apenas os 5 contextos mais comuns
        if (padrao.contextoComum.length > 5) {
          padrao.contextoComum = padrao.contextoComum.slice(-5);
        }
      }
      
      console.log('📈 [LEARNING] Padrão atualizado:', {
        palavra,
        compensacaoFinal: `${(padrao.compensacaoMedia || 0).toFixed(2)}ms`,
        variacao: `${((padrao.compensacaoMedia || 0) - (compensacaoAnterior || 0)).toFixed(2)}ms`,
        novaFrequencia: padrao.frequenciaUso,
        totalContextos: padrao.contextoComum.length
      });
    }

    this.padroes.set(palavra, padrao);
    
    // Salvar dados de aprendizado no banco de dados com embeddings
    try {
      const dadosAprendizado = {
        palavra: palavra,
        compensacao: compensacao,
        contexto: contexto,
        velocidadeReproducao: velocidade,
        precisao: this.calcularPrecisaoUsuario(padrao.compensacaoMedia, compensacao)
      };
      
      console.log('💾 [LEARNING] Salvando dados de aprendizado no banco:', {
        palavra,
        precisao: `${dadosAprendizado.precisao.toFixed(2)}%`,
        contexto: contexto.substring(0, 30) + (contexto.length > 30 ? '...' : '')
      });
      
      const sucesso = await supabaseService.salvarDadosAprendizadoComEmbeddings(dadosAprendizado);
      
      if (sucesso) {
        console.log('✅ [LEARNING] Dados de aprendizado salvos com sucesso no banco');
      } else {
        console.warn('⚠️ [LEARNING] Falha ao salvar dados de aprendizado no banco');
      }
    } catch (error) {
      console.error('❌ [LEARNING] Erro ao salvar dados de aprendizado:', error);
    }
    
    if (isNovoPadrao) {
      console.log('✅ [LEARNING] Novo padrão criado e armazenado para:', palavra);
    }
  }

  /**
   * Calcula a precisão do usuário baseada na diferença entre tempo esperado e real
   */
  private calcularPrecisaoUsuario(tempoEsperado: number, tempoReal: number): number {
    const diferenca = Math.abs(tempoEsperado - tempoReal);
    const precisao = Math.max(0, 100 - (diferenca / 10)); // 10ms = 1% de perda de precisão
    return Math.min(100, precisao);
  }

  /**
   * Inicia o processo de aprendizado automático
   */
  private iniciarAprendizadoAutomatico(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }

    this.intervalId = setInterval(async () => {
      if (!this.isLearning) {
        await this.executarCicloAprendizado();
      }
    }, this.configuracao.intervaloAtualizacao * 60 * 1000);
  }

  /**
   * Executa um ciclo de aprendizado
   */
  private async executarCicloAprendizado(): Promise<void> {
    this.isLearning = true;
    
    try {
      console.log('Executando ciclo de aprendizado...');
      
      // Buscar novos dados desde a última atualização
      const novosDados = await supabaseService.obterDadosRecentes(
        this.metricas.ultimaAtualizacao
      );

      // Analisar novos dados
      for (const registro of novosDados) {
        await this.analisarRegistro(registro);
      }

      // Atualizar métricas de performance
      await this.atualizarMetricas();
      
      // Otimizar padrões baseado na performance
      await this.otimizarPadroes();
      
      this.metricas.ultimaAtualizacao = new Date();
      
      console.log('Ciclo de aprendizado concluído');
    } catch (error) {
      console.error('Erro durante ciclo de aprendizado:', error);
    } finally {
      this.isLearning = false;
    }
  }

  /**
   * Atualiza métricas de performance do algoritmo
   */
  private async atualizarMetricas(): Promise<void> {
    try {
      // Calcular precisão geral baseada nos padrões
      let totalPrecisao = 0;
      let contadorPadroes = 0;

      for (const padrao of this.padroes.values()) {
        if (padrao.frequenciaUso >= this.configuracao.minimoRegistrosParaAprendizado) {
          totalPrecisao += padrao.precisaoHistorica;
          contadorPadroes++;
        }
      }

      this.metricas.precisaoGeral = contadorPadroes > 0 ? totalPrecisao / contadorPadroes : 0;
      this.metricas.palavrasAprendidas = contadorPadroes;
      
      // Calcular melhoria no tempo de resposta (simulado)
      this.metricas.melhoriaTempoResposta = Math.min(95, this.metricas.palavrasAprendidas * 0.5);
      
    } catch (error) {
      console.error('Erro ao atualizar métricas:', error);
    }
  }

  /**
   * Otimiza padrões baseado na performance
   */
  private async otimizarPadroes(): Promise<void> {
    try {
      // Remover padrões com baixa frequência ou precisão
      for (const [palavra, padrao] of this.padroes.entries()) {
        if (padrao.frequenciaUso < 2 || padrao.precisaoHistorica < 0.3) {
          this.padroes.delete(palavra);
        }
      }

      // Atualizar padrões no vectorDatabaseService
      for (const padrao of this.padroes.values()) {
        if (padrao.frequenciaUso >= this.configuracao.minimoRegistrosParaAprendizado) {
          // Aqui podemos integrar com o vectorDatabaseService para melhorar predições
          await this.atualizarPadraoNoVectorDatabase(padrao);
        }
      }
    } catch (error) {
      console.error('Erro ao otimizar padrões:', error);
    }
  }

  /**
   * Atualiza padrão no vector database service
   */
  private async atualizarPadraoNoVectorDatabase(padrao: PadraoAprendizado): Promise<void> {
    try {
      // Integração futura com vectorDatabaseService para melhorar predições
      // Por enquanto, apenas log para debug
      console.log(`Padrão otimizado para palavra "${padrao.palavra}": compensação média ${padrao.compensacaoMedia?.toFixed(2) || '0.00'}ms`);
    } catch (error) {
      console.error('Erro ao atualizar padrão no vector database:', error);
    }
  }

  /**
   * Prediz compensação baseada em padrões aprendidos
   */
  async predizerCompensacao(palavra: string, contexto: string, velocidadeReproducao: number): Promise<number> {
    try {
      const padrao = this.padroes.get(palavra);
      
      if (padrao && padrao.frequenciaUso >= this.configuracao.minimoRegistrosParaAprendizado) {
        // Ajustar compensação baseada na velocidade de reprodução
        const fatorVelocidade = velocidadeReproducao / padrao.velocidadeReproducaoMedia;
        const compensacaoAjustada = padrao.compensacaoMedia * fatorVelocidade;
        
        // Ajustar baseado no contexto
        const fatorContexto = padrao.contextoComum.some(ctx => 
          ctx.includes(contexto) || contexto.includes(ctx)
        ) ? 1.1 : 0.9;
        
        return compensacaoAjustada * fatorContexto;
      }
      
      // Fallback para compensação padrão
      return 100; // 100ms padrão
    } catch (error) {
      console.error('Erro ao predizer compensação:', error);
      return 100;
    }
  }

  /**
   * Obtém métricas de performance do algoritmo
   */
  obterMetricas(): MetricasPerformance {
    return { ...this.metricas };
  }

  /**
   * Obtém estatísticas dos padrões aprendidos
   */
  obterEstatisticasPadroes(): {
    totalPadroes: number;
    padroesAtivos: number;
    palavraMaisFrequente: string | null;
    compensacaoMediaGeral: number;
  } {
    const padroesAtivos = Array.from(this.padroes.values())
      .filter(p => p.frequenciaUso >= this.configuracao.minimoRegistrosParaAprendizado);
    
    const palavraMaisFrequente = padroesAtivos.length > 0 
      ? padroesAtivos.reduce((a, b) => a.frequenciaUso > b.frequenciaUso ? a : b).palavra
      : null;
    
    const compensacaoMediaGeral = padroesAtivos.length > 0
      ? padroesAtivos.reduce((sum, p) => sum + p.compensacaoMedia, 0) / padroesAtivos.length
      : 0;

    return {
      totalPadroes: this.padroes.size,
      padroesAtivos: padroesAtivos.length,
      palavraMaisFrequente,
      compensacaoMediaGeral
    };
  }

  /**
   * Atualiza configuração do algoritmo
   */
  atualizarConfiguracao(novaConfiguracao: Partial<ConfiguracaoAlgoritmo>): void {
    this.configuracao = { ...this.configuracao, ...novaConfiguracao };
    
    // Reiniciar aprendizado automático com nova configuração
    this.iniciarAprendizadoAutomatico();
  }

  /**
   * Para o serviço de aprendizado
   */
  parar(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isLearning = false;
    console.log('Serviço de aprendizado parado');
  }

  /**
   * Força um ciclo de aprendizado imediato
   */
  async forcarAprendizado(): Promise<void> {
    if (!this.isLearning) {
      await this.executarCicloAprendizado();
    }
  }

  /**
   * Gera relatório detalhado de progresso do aprendizado
   */
  async gerarRelatorioProgresso(): Promise<{
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
  }> {
    try {
      // Calcular estatísticas gerais
      const totalPalavras = this.padroes.size;
      const precisaoMedia = totalPalavras > 0 
        ? Array.from(this.padroes.values()).reduce((acc, p) => acc + p.precisaoHistorica, 0) / totalPalavras
        : 0;

      // Identificar top palavras por precisão
      const topPalavras = Array.from(this.padroes.entries())
        .map(([palavra, padrao]) => ({
          palavra,
          precisao: padrao.precisaoHistorica,
          frequencia: padrao.frequenciaUso,
          melhoria: padrao.precisaoHistorica * padrao.frequenciaUso
        }))
        .sort((a, b) => b.melhoria - a.melhoria)
        .slice(0, 10);

      // Calcular estatísticas detalhadas
      const palavrasComAltoAprendizado = Array.from(this.padroes.values())
        .filter(p => p.precisaoHistorica > 0.8).length;
      
      const palavrasComBaixoAprendizado = Array.from(this.padroes.values())
        .filter(p => p.precisaoHistorica < 0.5).length;

      const compensacaoMediaGeral = totalPalavras > 0
        ? Array.from(this.padroes.values()).reduce((acc, p) => acc + p.compensacaoMedia, 0) / totalPalavras
        : 0;

      // Determinar tendência (simplificado)
      const tendenciaAprendizado: 'crescente' | 'estavel' | 'decrescente' = 
        this.metricas.melhoriaTempoResposta > 0.1 ? 'crescente' :
        this.metricas.melhoriaTempoResposta < -0.1 ? 'decrescente' : 'estavel';

      return {
        resumoGeral: {
          totalPalavras,
          precisaoMedia,
          melhoriaGeral: this.metricas.melhoriaTempoResposta,
          ultimaAtualizacao: this.metricas.ultimaAtualizacao
        },
        topPalavras,
        estatisticasDetalhadas: {
          palavrasComAltoAprendizado,
          palavrasComBaixoAprendizado,
          compensacaoMediaGeral,
          tendenciaAprendizado
        }
      };
    } catch (error) {
      console.error('Erro ao gerar relatório de progresso:', error);
      throw error;
    }
  }

  /**
   * Obtém recomendações de melhoria baseadas no aprendizado atual
   */
  async obterRecomendacoesMelhoria(): Promise<Array<{
    tipo: 'palavra' | 'configuracao' | 'dados';
    prioridade: 'alta' | 'media' | 'baixa';
    descricao: string;
    acao: string;
  }>> {
    const recomendacoes: Array<{
      tipo: 'palavra' | 'configuracao' | 'dados';
      prioridade: 'alta' | 'media' | 'baixa';
      descricao: string;
      acao: string;
    }> = [];

    try {
      // Analisar palavras com baixa precisão
      const palavrasBaixaPrecisao = Array.from(this.padroes.entries())
        .filter(([_, padrao]) => padrao.precisaoHistorica < 0.5 && padrao.frequenciaUso > 5);

      if (palavrasBaixaPrecisao.length > 0) {
        recomendacoes.push({
          tipo: 'palavra',
          prioridade: 'alta',
          descricao: `${palavrasBaixaPrecisao.length} palavras com baixa precisão detectadas`,
          acao: 'Revisar e ajustar compensação para palavras frequentes com baixa precisão'
        });
      }

      // Verificar se há dados suficientes
      if (this.padroes.size < this.configuracao.minimoRegistrosParaAprendizado) {
        recomendacoes.push({
          tipo: 'dados',
          prioridade: 'media',
          descricao: 'Poucos dados para aprendizado efetivo',
          acao: 'Continuar usando o sistema para coletar mais dados de treinamento'
        });
      }

      // Verificar configurações
      if (this.configuracao.intervaloAtualizacao > 30) {
        recomendacoes.push({
          tipo: 'configuracao',
          prioridade: 'baixa',
          descricao: 'Intervalo de atualização pode ser muito longo',
          acao: 'Considerar reduzir intervalo de atualização para aprendizado mais rápido'
        });
      }

      return recomendacoes;
    } catch (error) {
      console.error('Erro ao obter recomendações:', error);
      return [];
    }
  }
}

// Instância singleton do serviço
const learningAlgorithmService = new LearningAlgorithmService();
export default learningAlgorithmService;