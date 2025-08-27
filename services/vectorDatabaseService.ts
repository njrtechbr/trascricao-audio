import supabaseService, { DadosSincronizacao, MetricasAprendizado } from './supabaseService';
import { syncAiService } from './syncAiService';
import learningAlgorithmService from './learningAlgorithmService';
import embeddingService from '../src/services/embeddingService';

/**
 * Interface para dados de contexto de palavra
 */
interface ContextoPalavra {
  palavra: string;
  posicao: number;
  frase: string;
  palavraAnterior?: string;
  proximaPalavra?: string;
}

/**
 * Interface para predição de compensação
 */
interface PredicaoCompensacao {
  compensacao: number;
  confianca: number;
  baseadoEm: 'historico' | 'similar' | 'padrao';
}

/**
 * Serviço de banco de dados vetorial para aprendizado de sincronização
 */
class VectorDatabaseService {
  private static instance: VectorDatabaseService;
  private registrosBuffer: DadosSincronizacao[] = [];
  private bufferMaximo = 10; // Número máximo de registros no buffer
  private intervaloBatch = 5000; // Intervalo para envio em lote (5 segundos)
  private ultimoEnvio = 0;
  private aprendizadoAtivo = true;
  private cache: Map<string, any> = new Map();
  private cacheTimeout = 5 * 60 * 1000; // 5 minutos
  private compensacaoCache: Map<string, { resultado: any; timestamp: number }> = new Map();
  private compensacaoCacheTimeout = 30 * 1000; // 30 segundos para cache de compensação

  constructor() {
    // Inicia processo de limpeza automática
    this.iniciarLimpezaAutomatica();
    // Nota: A inicialização do algoritmo de aprendizado será feita externamente
    // para evitar dependência circular
    
    // Limpar cache periodicamente
    setInterval(() => {
      this.limparCacheExpirado();
    }, 60000); // A cada minuto
  }

  /**
   * Registra o tempo real de uma palavra para aprendizado
   */
  async registrarPalavraComTempo(
    palavra: string,
    tempoReal: number,
    tempoEsperado: number,
    contexto: ContextoPalavra,
    velocidadeReproducao: number = 1.0
  ): Promise<void> {
    if (!this.aprendizadoAtivo || !supabaseService.estaConectado()) {
      return;
    }

    const diferenca = tempoReal - tempoEsperado;
    
    const dadosSincronizacao: DadosSincronizacao = {
      palavra: palavra.toLowerCase(),
      tempoReal,
      tempoEsperado,
      diferenca,
      contexto: this.construirContextoString(contexto),
      tipoAudio: 'fala', // Por enquanto, assumimos fala
      velocidadeReproducao
    };

    // Adiciona ao buffer
    this.registrosBuffer.push(dadosSincronizacao);

    // Verifica se deve enviar o lote
    const agora = Date.now();
    if (
      this.registrosBuffer.length >= this.bufferMaximo ||
      agora - this.ultimoEnvio > this.intervaloBatch
    ) {
      await this.enviarLoteRegistros();
    }

    // Atualiza métricas de aprendizado
    await this.atualizarAprendizadoPalavra(palavra, diferenca);
  }

  /**
   * Prediz a compensação de tempo necessária para uma palavra específica
   */
  async predizerCompensacao(palavra: string, contexto?: string[]): Promise<PredicaoCompensacao> {
    try {
      // Verificar cache primeiro
      const cacheKey = `compensacao_${palavra.toLowerCase()}`;
      const cached = this.compensacaoCache.get(cacheKey);
      const now = Date.now();
      
      if (cached && (now - cached.timestamp) < this.compensacaoCacheTimeout) {
        return cached.resultado;
      }

      // Primeiro, tenta usar o algoritmo de aprendizado de máquina
      if (contexto && contexto.length > 0) {
        const contextoString = this.construirContextoString(contexto);
        const compensacaoAprendizado = await learningAlgorithmService.predizerCompensacao(
          palavra,
          contextoString,
          1.0 // velocidade padrão
        );
        
        // Se o algoritmo de aprendizado tem dados suficientes, usar sua predição
        const estatisticas = learningAlgorithmService.obterEstatisticasPadroes();
        if (estatisticas.padroesAtivos > 0) {
          const resultado = {
            compensacao: compensacaoAprendizado,
            confianca: Math.min(0.95, 0.6 + (estatisticas.padroesAtivos * 0.05)),
            baseadoEm: 'historico'
          };
          
          // Armazenar no cache
          this.compensacaoCache.set(cacheKey, { resultado, timestamp: now });
          return resultado;
        }
      }

      // Segundo, tenta buscar métricas específicas da palavra
      const metricas = await supabaseService.obterMetricasPalavra(palavra);
      
      if (metricas && metricas.confianca > 0.3) {
        const resultado = {
          compensacao: metricas.mediaCompensacao,
          confianca: metricas.confianca,
          baseadoEm: 'historico'
        };
        
        // Armazenar no cache
        this.compensacaoCache.set(cacheKey, { resultado, timestamp: now });
        return resultado;
      }

      // Se não tem dados suficientes, busca palavras similares
      const palavrasSimilares = await supabaseService.buscarPalavrasSimilares(palavra, 3);
      
      if (palavrasSimilares.length > 0) {
        const compensacaoMedia = palavrasSimilares.reduce(
          (acc, p) => acc + (p.mediaCompensacao * p.confianca), 0
        ) / palavrasSimilares.reduce((acc, p) => acc + p.confianca, 0);
        
        const confiancaMedia = palavrasSimilares.reduce(
          (acc, p) => acc + p.confianca, 0
        ) / palavrasSimilares.length;

        const resultado = {
          compensacao: compensacaoMedia,
          confianca: confiancaMedia * 0.7, // Reduz confiança por ser baseado em similaridade
          baseadoEm: 'similar'
        };
        
        // Armazenar no cache
        this.compensacaoCache.set(cacheKey, { resultado, timestamp: now });
        return resultado;
      }

      // Fallback para compensação padrão baseada em pontuação
      const compensacaoPadrao = this.obterCompensacaoPadrao(palavra);
      
      const resultado = {
        compensacao: compensacaoPadrao,
        confianca: 0.2,
        baseadoEm: 'padrao'
      };
      
      // Armazenar no cache
      this.compensacaoCache.set(cacheKey, { resultado, timestamp: now });
      return resultado;
    } catch (error) {
      console.error('Erro ao predizer compensação:', error);
      const resultado = {
        compensacao: 0,
        confianca: 0,
        baseadoEm: 'padrao'
      };
      
      // Armazenar no cache mesmo em caso de erro para evitar repetir consultas
      this.compensacaoCache.set(cacheKey, { resultado, timestamp: now });
      return resultado;
    }
  }

  /**
   * Obtém estatísticas de aprendizado
   */
  async obterEstatisticasAprendizado(): Promise<{
    totalPalavras: number;
    palavrasComAltoAprendizado: number;
    compensacaoMediaGeral: number;
    confiancaMedia: number;
    algoritmo: {
      padroesAtivos: number;
      palavraMaisFrequente: string | null;
      compensacaoMediaGeral: number;
    };
  }> {
    try {
      // Obter estatísticas do algoritmo de aprendizado
      const estatisticasAlgoritmo = learningAlgorithmService.obterEstatisticasPadroes();
      const metricas = learningAlgorithmService.obterMetricas();
      
      return {
        totalPalavras: estatisticasAlgoritmo.totalPalavras || 0,
        palavrasComAltoAprendizado: estatisticasAlgoritmo.padroesAtivos || 0,
        compensacaoMediaGeral: estatisticasAlgoritmo.compensacaoMediaGeral || 0,
        confiancaMedia: metricas.precisaoGeral || 0,
        algoritmo: {
          padroesAtivos: estatisticasAlgoritmo.padroesAtivos,
          palavraMaisFrequente: estatisticasAlgoritmo.palavraMaisFrequente,
          compensacaoMediaGeral: estatisticasAlgoritmo.compensacaoMediaGeral
        }
      };
    } catch (error) {
      console.error('Erro ao obter estatísticas:', error);
      return {
        totalPalavras: 0,
        palavrasComAltoAprendizado: 0,
        compensacaoMediaGeral: 0,
        confiancaMedia: 0,
        algoritmo: {
          padroesAtivos: 0,
          palavraMaisFrequente: null,
          compensacaoMediaGeral: 0
        }
      };
    }
  }

  /**
   * Ativa ou desativa o aprendizado automático
   */
  definirAprendizadoAtivo(ativo: boolean): void {
    this.aprendizadoAtivo = ativo;
    console.log(`Aprendizado de sincronização ${ativo ? 'ativado' : 'desativado'}`);
  }

  /**
   * Força o envio de todos os registros pendentes
   */
  async forcarEnvioRegistros(): Promise<void> {
    if (this.registrosBuffer.length > 0) {
      await this.enviarLoteRegistros();
    }
  }

  // Métodos privados

  private construirContextoString(contexto: ContextoPalavra): string {
    return JSON.stringify({
      posicao: contexto.posicao,
      frase: contexto.frase.substring(0, 100), // Limita o tamanho
      palavraAnterior: contexto.palavraAnterior,
      proximaPalavra: contexto.proximaPalavra
    });
  }

  private async enviarLoteRegistros(): Promise<void> {
    if (this.registrosBuffer.length === 0) {
      return;
    }

    const registrosParaEnviar = [...this.registrosBuffer];
    this.registrosBuffer = [];
    this.ultimoEnvio = Date.now();

    try {
      // Envia todos os registros em paralelo
      const promessas = registrosParaEnviar.map(registro => 
        supabaseService.registrarSincronizacao(registro)
      );
      
      const resultados = await Promise.allSettled(promessas);
      
      const sucessos = resultados.filter(r => r.status === 'fulfilled').length;
      const falhas = resultados.length - sucessos;
      
      if (falhas > 0) {
        console.warn(`Enviado lote de registros: ${sucessos} sucessos, ${falhas} falhas`);
      } else {
        console.log(`Enviado lote de ${sucessos} registros com sucesso`);
      }
    } catch (error) {
      console.error('Erro ao enviar lote de registros:', error);
      // Recoloca os registros no buffer para tentar novamente
      this.registrosBuffer.unshift(...registrosParaEnviar);
    }
  }

  private async atualizarAprendizadoPalavra(palavra: string, diferenca: number): Promise<void> {
    try {
      await supabaseService.atualizarMetricasPalavra(palavra, diferenca);
    } catch (error) {
      console.error('Erro ao atualizar aprendizado da palavra:', error);
    }
  }

  private obterCompensacaoPadrao(palavra: string): number {
    // Usa a lógica existente do syncAiService como fallback
    return syncAiService.calcularCompensacaoPontuacao(palavra);
  }

  private iniciarLimpezaAutomatica(): void {
    // Executa limpeza a cada 24 horas
    setInterval(async () => {
      try {
        await supabaseService.limparDadosAntigos();
        console.log('Limpeza automática de dados antigos executada');
      } catch (error) {
        console.error('Erro na limpeza automática:', error);
      }
    }, 24 * 60 * 60 * 1000); // 24 horas
  }

  /**
   * Limpa entradas expiradas do cache de compensação
   */
  private limparCacheExpirado(): void {
    const now = Date.now();
    
    for (const [key, value] of this.compensacaoCache.entries()) {
      if (now - value.timestamp > this.compensacaoCacheTimeout) {
        this.compensacaoCache.delete(key);
      }
    }
    
    // Limpar cache geral também
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > this.cacheTimeout) {
        this.cache.delete(key);
      }
    }
  }

  private async inicializarAlgoritmoAprendizado(): Promise<void> {
    try {
      await learningAlgorithmService.inicializar();
      console.log('Algoritmo de aprendizado inicializado');
    } catch (error) {
      console.error('Erro ao inicializar algoritmo de aprendizado:', error);
    }
  }

  /**
   * Busca palavras similares usando embeddings vetoriais
   */
  async buscarPalavrasSimilares(
    palavra: string, 
    limite: number = 5, 
    limiarSimilaridade: number = 0.7
  ): Promise<any[]> {
    try {
      console.log(`🔍 [VECTOR] Buscando palavras similares a: ${palavra}`);
      
      const resultados = await supabaseService.buscarPalavrasSimilaresVetorial(
        palavra, 
        limite, 
        limiarSimilaridade
      );
      
      console.log(`✅ [VECTOR] Encontradas ${resultados.length} palavras similares`);
      return resultados;
    } catch (error) {
      console.error('❌ [VECTOR] Erro na busca de palavras similares:', error);
      return [];
    }
  }

  /**
   * Busca transcrições similares usando embeddings vetoriais
   */
  async buscarTranscricoesSimilares(
    texto: string, 
    limite: number = 5, 
    limiarSimilaridade: number = 0.7
  ): Promise<any[]> {
    try {
      console.log(`🔍 [VECTOR] Buscando transcrições similares ao texto: ${texto.substring(0, 50)}...`);
      
      const resultados = await supabaseService.buscarTranscricoesSimilares(
        texto, 
        limite, 
        limiarSimilaridade
      );
      
      console.log(`✅ [VECTOR] Encontradas ${resultados.length} transcrições similares`);
      return resultados;
    } catch (error) {
      console.error('❌ [VECTOR] Erro na busca de transcrições similares:', error);
      return [];
    }
  }

  /**
   * Prediz compensação usando busca semântica de palavras similares
   */
  async predizerCompensacaoSemantica(
    palavra: string, 
    contexto?: ContextoPalavra
  ): Promise<PredicaoCompensacao> {
    try {
      // Buscar palavras similares
      const palavrasSimilares = await this.buscarPalavrasSimilares(palavra, 3, 0.8);
      
      if (palavrasSimilares.length === 0) {
        // Fallback para predição tradicional
        return await this.predizerCompensacao(palavra, contexto);
      }
      
      // Calcular compensação média ponderada pela similaridade
      let compensacaoTotal = 0;
      let pesoTotal = 0;
      
      for (const similar of palavrasSimilares) {
        const metricas = await supabaseService.obterMetricasPalavra(similar.word);
        if (metricas) {
          const peso = similar.similarity;
          compensacaoTotal += metricas.mediaCompensacao * peso;
          pesoTotal += peso;
        }
      }
      
      const compensacaoMedia = pesoTotal > 0 ? compensacaoTotal / pesoTotal : 0;
      const confianca = Math.min(0.9, pesoTotal / palavrasSimilares.length);
      
      console.log(`🧠 [VECTOR] Predição semântica para '${palavra}': ${compensacaoMedia.toFixed(2)}ms (confiança: ${(confianca * 100).toFixed(1)}%)`);
      
      return {
        compensacao: compensacaoMedia,
        confianca,
        baseadoEm: 'similar'
      };
    } catch (error) {
      console.error('❌ [VECTOR] Erro na predição semântica:', error);
      // Fallback para predição tradicional
      return await this.predizerCompensacao(palavra, contexto);
    }
  }

  /**
   * Analisa padrões de aprendizado usando busca vetorial
   */
  async analisarPadroesSemanticos(): Promise<{
    gruposSimilares: any[];
    palavrasProblematicas: any[];
    recomendacoes: string[];
  }> {
    try {
      console.log('🔍 [VECTOR] Analisando padrões semânticos...');
      
      // Obter palavras com baixa precisão
      const estatisticas = await this.obterEstatisticasAprendizado();
      const palavrasProblematicas = [];
      
      // Buscar grupos de palavras similares
      const gruposSimilares = [];
      
      // Gerar recomendações baseadas na análise
      const recomendacoes = [
        'Considere praticar mais palavras com baixa precisão',
        'Palavras similares podem ter padrões de compensação relacionados',
        'Use a busca semântica para encontrar palavras de treino relacionadas'
      ];
      
      return {
        gruposSimilares,
        palavrasProblematicas,
        recomendacoes
      };
    } catch (error) {
      console.error('❌ [VECTOR] Erro na análise de padrões semânticos:', error);
      return {
        gruposSimilares: [],
        palavrasProblematicas: [],
        recomendacoes: []
      };
    }
  }
}

// Instância singleton do serviço
export const vectorDatabaseService = new VectorDatabaseService();
export default vectorDatabaseService;