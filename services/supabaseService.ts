import { createClient, SupabaseClient } from '@supabase/supabase-js';
import embeddingService from '../src/services/embeddingService';
import { servicoFila } from './queueService';

/**
 * Interface para dados de sincronização de palavras
 */
export interface DadosSincronizacao {
  id?: string;
  palavra: string;
  tempoReal: number; // Tempo real quando a palavra foi destacada
  tempoEsperado: number; // Tempo esperado da transcrição
  diferenca: number; // Diferença entre tempo real e esperado
  contexto?: string; // Contexto da frase
  tipoAudio?: string; // Tipo de áudio (música, fala, etc.)
  velocidadeReproducao?: number; // Velocidade de reprodução
  criadoEm?: string;
}

/**
 * Interface para métricas de aprendizado
 */
export interface MetricasAprendizado {
  palavra: string;
  mediaCompensacao: number;
  confianca: number;
  totalAmostras: number;
  ultimaAtualizacao: string;
}

/**
 * Serviço para gerenciar dados de sincronização no Supabase
 */
class SupabaseService {
  private cliente: SupabaseClient;
  private conectado: boolean = false;
  private isInitialized: boolean = false;
  private metricsCache: Map<string, { data: any; timestamp: number }> = new Map();
  private metricsCacheTimeout = 30000; // 30 segundos
  private similarCache: Map<string, { data: any; timestamp: number }> = new Map();
  private similarCacheTimeout = 60000; // 1 minuto

  constructor() {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

    if (!supabaseUrl || !supabaseKey) {
      console.warn('Credenciais do Supabase não encontradas nas variáveis de ambiente');
      return;
    }

    try {
      this.cliente = createClient(supabaseUrl, supabaseKey);
      this.conectado = true;
      console.log('Cliente Supabase inicializado com sucesso');
    } catch (error) {
      console.error('Erro ao inicializar cliente Supabase:', error);
    }
    
    // Limpar caches periodicamente
    setInterval(() => {
      this.limparCachesExpirados();
    }, 60000); // A cada minuto
  }

  /**
   * Limpa caches expirados
   */
  private limparCachesExpirados(): void {
    const now = Date.now();
    
    // Limpar cache de métricas
    for (const [key, value] of this.metricsCache.entries()) {
      if (now - value.timestamp > this.metricsCacheTimeout) {
        this.metricsCache.delete(key);
      }
    }
    
    // Limpar cache de palavras similares
    for (const [key, value] of this.similarCache.entries()) {
      if (now - value.timestamp > this.similarCacheTimeout) {
        this.similarCache.delete(key);
      }
    }
  }

  /**
   * Inicializa o serviço e verifica a conexão
   */
  async inicializar(): Promise<void> {
    console.log('🔄 [SUPABASE] Iniciando inicialização do serviço Supabase...');
    
    if (this.isInitialized) {
      console.log('✅ [SUPABASE] Supabase já foi inicializado');
      return;
    }

    if (!this.conectado) {
      console.error('❌ [SUPABASE] Supabase não está conectado. Verificando credenciais...');
      console.error('❌ [SUPABASE] URL:', import.meta.env.VITE_SUPABASE_URL ? 'Presente' : 'Ausente');
      console.error('❌ [SUPABASE] Chave:', import.meta.env.VITE_SUPABASE_ANON_KEY ? 'Presente' : 'Ausente');
      throw new Error('Supabase não está conectado. Verifique as credenciais.');
    }

    try {
      console.log('🔍 [SUPABASE] Testando conexão com banco de dados...');
      const startTime = Date.now();
      
      // Testa a conexão
      const conexaoOk = await this.verificarConexao();
      const connectionTime = Date.now() - startTime;
      console.log(`⏱️ [SUPABASE] Tempo de conexão: ${connectionTime}ms`);
      
      if (conexaoOk) {
        this.isInitialized = true;
        console.log('✅ [SUPABASE] Supabase inicializado e conectado com sucesso');
        console.log('📊 [SUPABASE] Status da conexão:', {
          conectado: this.conectado,
          inicializado: this.isInitialized,
          tempoConexao: `${connectionTime}ms`
        });
      } else {
        console.warn('⚠️ [SUPABASE] Supabase inicializado mas com problemas de conexão');
        throw new Error('Problemas de conexão com Supabase');
      }
    } catch (error) {
      console.error('❌ [SUPABASE] Erro ao inicializar Supabase:', {
        tipo: error.constructor.name,
        mensagem: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Verifica se o serviço está conectado
   */
  estaConectado(): boolean {
    return this.conectado;
  }

  /**
   * Registra dados de sincronização no banco usando sistema de filas
   */
  async registrarSincronizacao(dados: DadosSincronizacao): Promise<boolean> {
    if (!this.conectado || !this.cliente) {
      console.warn('Supabase não está conectado');
      return false;
    }

    try {
      const operacao = async () => {
        const { error } = await this.cliente
          .from('word_timestamps')
          .insert({
            word: dados.palavra,
            timestamp: dados.tempoReal,
            start_time: dados.tempoEsperado,
            context: dados.contexto,
            playback_rate: dados.velocidadeReproducao || 1.0,
          });

        if (error) {
          throw new Error(`Erro ao registrar sincronização: ${error.message}`);
        }

        return true;
      };

      const resultado = await servicoFila.adicionarTarefa(operacao, 'media');

      return resultado;
    } catch (error) {
      console.error('Erro ao adicionar tarefa de sincronização à fila:', error);
      return false;
    }
  }

  /**
   * Busca métricas de aprendizado para uma palavra específica com retry e backoff exponencial
   */
  async obterMetricasPalavra(palavra: string, tentativas: number = 3): Promise<MetricasAprendizado | null> {
    if (!this.conectado || !this.cliente) {
      console.warn('Supabase não está conectado');
      return null;
    }

    // Verificar cache primeiro
    const cacheKey = `metrics_${palavra.toLowerCase()}`;
    const cached = this.metricsCache.get(cacheKey);
    const now = Date.now();
    
    if (cached && (now - cached.timestamp) < this.metricsCacheTimeout) {
      return cached.data;
    }

    for (let tentativa = 1; tentativa <= tentativas; tentativa++) {
      try {
        // Adicionar delay entre tentativas (backoff exponencial)
        if (tentativa > 1) {
          const delay = Math.min(1000 * Math.pow(2, tentativa - 2), 5000);
          await new Promise(resolve => setTimeout(resolve, delay));
        }

        const { data, error } = await this.cliente
          .from('learning_data')
          .select('*')
          .eq('word', palavra.toLowerCase())
          .single();

        if (error) {
          if (error.code === 'PGRST116') { // PGRST116 = não encontrado
            return null;
          }
          
          console.warn(`Tentativa ${tentativa} falhou:`, error.message);
          
          if (tentativa === tentativas) {
            console.error('Erro ao buscar métricas após todas as tentativas:', error);
            return null;
          }
          
          continue; // Tentar novamente
        }

        if (!data) {
          // Armazenar null no cache para evitar consultas repetidas
          this.metricsCache.set(cacheKey, { data: null, timestamp: now });
          return null;
        }

        const resultado = {
          palavra: data.word,
          mediaCompensacao: data.expected_time - data.actual_time,
          confianca: data.user_accuracy,
          totalAmostras: 1,
          ultimaAtualizacao: data.created_at
        };
        
        // Armazenar no cache
        this.metricsCache.set(cacheKey, { data: resultado, timestamp: now });
        return resultado;
      } catch (error) {
        console.warn(`Erro na tentativa ${tentativa}:`, error);
        
        if (tentativa === tentativas) {
          console.error('Erro ao buscar métricas após todas as tentativas:', error);
          return null;
        }
      }
    }
    
    return null;
  }

  /**
   * Atualiza ou cria métricas de aprendizado para uma palavra usando sistema de filas
   */
  async salvarDadosAprendizadoComEmbeddings(dados: {
    palavra: string;
    compensacao: number;
    contexto: string;
    velocidadeReproducao: number;
    precisao?: number;
  }): Promise<boolean> {
    if (!this.conectado || !this.cliente) {
      console.warn('Supabase não está conectado');
      return false;
    }

    // Validar dados antes de adicionar à fila
    if (!dados.palavra || dados.palavra.trim().length === 0) {
      console.warn('Palavra vazia detectada, pulando salvamento');
      return false;
    }
        
    // Validação para evitar valores nulos em actual_time
    if (dados.compensacao === null || dados.compensacao === undefined || isNaN(dados.compensacao)) {
      console.warn('⚠️ [SUPABASE] Compensação inválida detectada:', dados.compensacao, 'para palavra:', dados.palavra);
      dados.compensacao = 100; // Valor padrão de 100ms
    }

    try {
      const operacao = async () => {
        // Gerar embeddings para palavra e contexto
        const wordEmbedding = await embeddingService.gerarEmbedding(dados.palavra.trim());
        const contextEmbedding = (dados.contexto && dados.contexto.trim().length > 0)
          ? await embeddingService.gerarEmbedding(dados.contexto.trim())
          : null;

        // Verificar se já existe registro para esta palavra
        const { data: existingData, error: selectError } = await this.cliente
          .from('learning_data')
          .select('*')
          .eq('word', dados.palavra.toLowerCase())
          .single();

        if (selectError && selectError.code !== 'PGRST116') {
          throw new Error(`Erro ao verificar dados existentes: ${selectError.message}`);
        }

        if (existingData) {
          // Atualizar registro existente
          const novoTotal = (existingData.sample_count || 0) + 1;
          const novaMedia = existingData.sample_count > 0
            ? ((existingData.actual_time * existingData.sample_count) + dados.compensacao) / novoTotal
            : dados.compensacao;
          const novaPrecisao = dados.precisao || Math.min(0.95, novoTotal * 0.05);

          const { error } = await this.cliente
            .from('learning_data')
            .update({
              expected_time: existingData.expected_time || 0,
              actual_time: novaMedia,
              user_accuracy: novaPrecisao,
              context: dados.contexto,
              word_embedding: wordEmbedding,
              context_embedding: contextEmbedding
            })
            .eq('word', dados.palavra.toLowerCase());

          if (error) {
            throw new Error(`Erro ao atualizar dados de aprendizado: ${error.message}`);
          }
        } else {
          // Criar novo registro com embeddings
          const { error } = await this.cliente
            .from('learning_data')
            .insert({
              word: dados.palavra.toLowerCase(),
              expected_time: 0,
              actual_time: dados.compensacao,
              user_accuracy: dados.precisao || 0.1,
              context: dados.contexto,
              word_embedding: wordEmbedding,
              context_embedding: contextEmbedding
            });

          if (error) {
            throw new Error(`Erro ao criar dados de aprendizado: ${error.message}`);
          }
        }

        console.log(`✅ [SUPABASE] Dados de aprendizado salvos com embeddings para palavra: ${dados.palavra}`);
        return true;
      };

      const resultado = await servicoFila.adicionarTarefa(operacao, 'alta');

      return resultado;
    } catch (error) {
      console.error('Erro ao adicionar tarefa de aprendizado à fila:', error);
      return false;
    }
  }

  async atualizarMetricasPalavra(palavra: string, novaCompensacao: number, tentativas: number = 3): Promise<boolean> {
    if (!this.conectado || !this.cliente) {
      console.warn('Supabase não está conectado');
      return false;
    }

    for (let tentativa = 1; tentativa <= tentativas; tentativa++) {
      try {
        // Backoff exponencial entre tentativas
        if (tentativa > 1) {
          const delay = Math.min(1000 * Math.pow(2, tentativa - 2), 5000);
          await new Promise(resolve => setTimeout(resolve, delay));
        }

        // Primeiro, tenta buscar métricas existentes
        const metricasExistentes = await this.obterMetricasPalavra(palavra);

        if (metricasExistentes) {
          // Atualiza métricas existentes
          const novoTotal = metricasExistentes.totalAmostras + 1;
          const novaMedia = (
            (metricasExistentes.mediaCompensacao * metricasExistentes.totalAmostras + novaCompensacao) / 
            novoTotal
          );
          const novaConfianca = Math.min(0.95, novoTotal * 0.1); // Aumenta confiança até 95%

          const { error } = await this.cliente
            .from('learning_data')
            .update({
              expected_time: metricasExistentes.mediaCompensacao,
              actual_time: metricasExistentes.mediaCompensacao + novaCompensacao,
              user_accuracy: novaConfianca
            })
            .eq('word', palavra.toLowerCase());

          if (error) {
            console.warn(`Tentativa ${tentativa} falhou:`, error.message);
            
            if (tentativa === tentativas) {
              console.error('Erro ao atualizar métricas após todas as tentativas:', error);
              return false;
            }
            
            continue; // Tentar novamente
          }
        } else {
          // Cria novas métricas sem embeddings (temporário até aplicar schema)
          const { error } = await this.cliente
            .from('learning_data')
            .insert({
              word: palavra.toLowerCase(),
              expected_time: 0,
              actual_time: novaCompensacao,
              user_accuracy: 0.1, // Confiança inicial baixa
              context: ''
            });

          if (error) {
            console.warn(`Tentativa ${tentativa} falhou:`, error.message);
            
            if (tentativa === tentativas) {
              console.error('Erro ao criar métricas após todas as tentativas:', error);
              return false;
            }
            
            continue; // Tentar novamente
          }
        }

        return true;
      } catch (error) {
        console.warn(`Erro na tentativa ${tentativa}:`, error);
        
        if (tentativa === tentativas) {
          console.error('Erro ao atualizar métricas após todas as tentativas:', error);
          return false;
        }
      }
    }
    
    return false;
  }

  /**
   * Busca palavras similares usando embeddings vetoriais
   */
  async buscarPalavrasSimilaresVetorial(palavra: string, limite: number = 5, limiarSimilaridade: number = 0.7): Promise<any[]> {
    if (!this.conectado || !this.cliente) {
      console.warn('Supabase não está conectado');
      return [];
    }

    try {
      // Gerar embedding da palavra de busca
      const queryEmbedding = await embeddingService.gerarEmbedding(palavra);
      
      // Buscar palavras similares usando similaridade de cosseno
      const { data, error } = await this.cliente.rpc('buscar_palavras_similares', {
        query_embedding: queryEmbedding,
        similarity_threshold: limiarSimilaridade,
        match_count: limite
      });

      if (error) {
        console.error('Erro na busca vetorial:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Erro ao buscar palavras similares:', error);
      return [];
    }
  }

  /**
   * Busca transcrições similares usando embeddings vetoriais
   */
  async buscarTranscricoesSimilares(texto: string, limite: number = 5, limiarSimilaridade: number = 0.7): Promise<any[]> {
    if (!this.conectado || !this.cliente) {
      console.warn('Supabase não está conectado');
      return [];
    }

    try {
      // Gerar embedding do texto de busca
      const queryEmbedding = await embeddingService.gerarEmbedding(texto);
      
      // Buscar transcrições similares
      const { data, error } = await this.cliente.rpc('buscar_transcricoes_similares', {
        query_embedding: queryEmbedding,
        similarity_threshold: limiarSimilaridade,
        match_count: limite
      });

      if (error) {
        console.error('Erro na busca de transcrições:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Erro ao buscar transcrições similares:', error);
      return [];
    }
  }

  /**
   * Busca palavras similares com retry e tratamento robusto de erros (método original)
   */
  async buscarPalavrasSimilares(palavra: string, limite: number = 5, tentativas: number = 3): Promise<MetricasAprendizado[]> {
    if (!this.conectado || !this.cliente) {
      console.warn('Supabase não está conectado');
      return [];
    }

    // Verificar cache primeiro
    const cacheKey = `similar_${palavra.toLowerCase()}_${limite}`;
    const cached = this.similarCache.get(cacheKey);
    const now = Date.now();
    
    if (cached && (now - cached.timestamp) < this.similarCacheTimeout) {
      return cached.data;
    }

    for (let tentativa = 1; tentativa <= tentativas; tentativa++) {
      try {
        // Backoff exponencial entre tentativas
        if (tentativa > 1) {
          const delay = Math.min(1000 * Math.pow(2, tentativa - 2), 5000);
          await new Promise(resolve => setTimeout(resolve, delay));
        }

        // Por enquanto, busca palavras que começam com as mesmas letras
        const prefixo = palavra.toLowerCase().substring(0, 3);
        
        const { data, error } = await this.cliente
          .from('learning_data')
          .select('*')
          .ilike('word', `${prefixo}%`)
          .order('user_accuracy', { ascending: false })
          .limit(limite);

        if (error) {
          console.warn(`Tentativa ${tentativa} falhou:`, error.message);
          
          if (tentativa === tentativas) {
            console.error('Erro ao buscar palavras similares após todas as tentativas:', error);
            return [];
          }
          
          continue; // Tentar novamente
        }

        const resultado = data?.map(item => ({
          palavra: item.word,
          mediaCompensacao: item.expected_time - item.actual_time,
          confianca: item.user_accuracy,
          totalAmostras: 1,
          ultimaAtualizacao: item.created_at
        })) || [];
        
        // Armazenar no cache
        this.similarCache.set(cacheKey, { data: resultado, timestamp: now });
        return resultado;
      } catch (error) {
        console.warn(`Erro na tentativa ${tentativa}:`, error);
        
        if (tentativa === tentativas) {
          console.error('Erro ao buscar palavras similares após todas as tentativas:', error);
          return [];
        }
      }
    }
    
    return [];
  }

  /**
   * Verifica a saúde da conexão com Supabase
   */
  async verificarConexao(): Promise<boolean> {
    if (!this.conectado || !this.cliente) {
      return false;
    }

    try {
      const { data, error } = await this.cliente
        .from('learning_data')
        .select('word')
        .limit(1);

      return !error;
    } catch (error) {
      console.error('Erro ao verificar conexão:', error);
      return false;
    }
  }

  /**
   * Remove registros antigos da tabela word_timestamps
   * @param diasParaManterDados Número de dias de dados para manter (padrão: 30)
   */
  async limparDadosAntigos(diasParaManterDados: number = 30): Promise<void> {
    if (!this.conectado || !this.cliente) {
      console.warn('Supabase não está conectado');
      return;
    }

    try {
      const dataLimite = new Date();
      dataLimite.setDate(dataLimite.getDate() - diasParaManterDados);

      const { error } = await this.cliente
        .from('word_timestamps')
        .delete()
        .lt('created_at', dataLimite.toISOString());

      if (error) {
        console.error('Erro ao limpar dados antigos:', error);
        throw error;
      }

      console.log(`Dados antigos removidos (mais de ${diasParaManterDados} dias)`);
    } catch (error) {
      console.error('Erro ao limpar dados antigos:', error);
      throw error;
    }
  }

  /**
   * Obtém dados históricos para análise de padrões
   * @param limiteDias Número de dias para buscar dados históricos
   */
  async obterDadosHistoricos(limiteDias: number = 30): Promise<any[]> {
    try {
      if (!this.conectado || !this.cliente) {
        console.warn('Cliente Supabase não está conectado');
        return [];
      }

      const dataLimite = new Date();
      dataLimite.setDate(dataLimite.getDate() - limiteDias);

      const { data, error } = await this.cliente
        .from('word_timestamps')
        .select('*')
        .gte('created_at', dataLimite.toISOString())
        .order('created_at', { ascending: false })
        .limit(1000); // Limitar para evitar sobrecarga

      if (error) {
        console.error('Erro ao obter dados históricos:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Erro ao obter dados históricos:', error);
      return [];
    }
  }

  /**
   * Obtém dados recentes desde uma data específica
   * @param dataUltimaAtualizacao Data da última atualização
   */
  async obterDadosRecentes(dataUltimaAtualizacao: Date): Promise<any[]> {
    try {
      if (!this.conectado || !this.cliente) {
        console.warn('Cliente Supabase não está conectado');
        return [];
      }
      const { data, error } = await this.cliente
        .from('word_timestamps')
        .select('*')
        .gte('created_at', dataUltimaAtualizacao.toISOString())
        .order('created_at', { ascending: false })
        .limit(500); // Limitar para evitar sobrecarga

      if (error) {
        console.error('Erro ao obter dados recentes:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Erro ao obter dados recentes:', error);
      return [];
    }
  }

  /**
   * Obtém estatísticas gerais dos dados
   */
  async obterEstatisticasGerais(): Promise<{
    totalRegistros: number;
    palavrasUnicas: number;
    compensacaoMedia: number;
    ultimoRegistro: Date | null;
  }> {
    try {
      if (!this.conectado || !this.cliente) {
        console.warn('Cliente Supabase não está conectado');
        return {
          totalRegistros: 0,
          palavrasUnicas: 0,
          compensacaoMedia: 0,
          ultimoRegistro: null
        };
      }
      // Contar total de registros
      const { count: totalRegistros } = await this.cliente
        .from('word_timestamps')
        .select('*', { count: 'exact', head: true });

      // Obter estatísticas básicas
      const { data: estatisticas, error } = await this.cliente
        .from('word_timestamps')
        .select('word, compensation_offset, created_at')
        .order('created_at', { ascending: false })
        .limit(1000);

      if (error) {
        console.error('Erro ao obter estatísticas:', error);
        throw error;
      }

      const palavrasUnicas = new Set(estatisticas?.map(r => r.word) || []).size;
      const compensacaoMedia = estatisticas && estatisticas.length > 0
        ? estatisticas.reduce((sum, r) => sum + (r.compensation_offset || 0), 0) / estatisticas.length
        : 0;
      
      const ultimoRegistro = estatisticas && estatisticas.length > 0
        ? new Date(estatisticas[0].created_at)
        : null;

      return {
        totalRegistros: totalRegistros || 0,
        palavrasUnicas,
        compensacaoMedia,
        ultimoRegistro
      };
    } catch (error) {
      console.error('Erro ao obter estatísticas gerais:', error);
      return {
        totalRegistros: 0,
        palavrasUnicas: 0,
        compensacaoMedia: 0,
        ultimoRegistro: null
      };
    }
  }

  /**
   * Orquestra o salvamento completo do resultado da transcrição (otimizado)
   */
  async salvarResultadoCompleto(transcricaoData: any[], textoTranscritoCompleto: string, audioFile: File): Promise<void> {
    console.log('🚀 [SUPABASE] Iniciando salvamento completo e otimizado do resultado...');
    const startTime = Date.now();

    try {
      // Executa as duas tarefas de salvamento em paralelo para otimizar o tempo
      await Promise.all([
        this.salvarTranscricao(textoTranscritoCompleto, audioFile.name, audioFile.size),
        this.salvarTranscricaoComEmbeddings(transcricaoData, audioFile.name)
      ]);
    } catch (error) {
      console.error('❌ [SUPABASE] Erro durante o salvamento em paralelo do resultado completo:', error);
      // Mesmo com erro, o processo não deve parar, mas o erro é logado.
      // Dependendo da criticidade, um throw aqui pode ser apropriado.
    }

    const endTime = Date.now();
    console.log(`🎉 [SUPABASE] Salvamento completo do resultado finalizado em ${(endTime - startTime) / 1000}s.`);
  }

  /**
   * Salva a transcrição principal com seu embedding.
   */
  private async salvarTranscricao(transcricao: string, nomeArquivo: string, tamanhoArquivo: number): Promise<boolean> {
    if (!this.conectado || !this.cliente) {
      console.warn('Supabase não está conectado');
      return false;
    }

    try {
      console.log(`🔄 [SUPABASE] Salvando transcrição principal: ${nomeArquivo}`);
      
      const textoLimpo = transcricao?.trim();
      if (!textoLimpo || textoLimpo.length === 0) {
        console.warn('Transcrição vazia detectada, pulando salvamento.');
        return false;
      }
      
      const transcriptionEmbedding = await embeddingService.gerarEmbedding(textoLimpo);
      
      const { error } = await this.cliente
        .from('transcricoes')
        .insert({
          transcricao: textoLimpo,
          nome_arquivo: nomeArquivo,
          tamanho_arquivo: tamanhoArquivo,
          embedding: transcriptionEmbedding, // Corrigido para 'embedding'
          criado_em: new Date().toISOString()
        });

      if (error) {
        console.error('❌ [SUPABASE] Erro ao salvar transcrição principal:', error);
        return false;
      }

      console.log('✅ [SUPABASE] Transcrição principal salva com sucesso');
      return true;
    } catch (error) {
      console.error('❌ [SUPABASE] Erro crítico ao salvar transcrição principal:', error);
      return false;
    }
  }

  /**
   * Salva as palavras da transcrição com seus embeddings em lote (Otimizado)
   */
  private async salvarTranscricaoComEmbeddings(transcricao: any[], nomeArquivo: string): Promise<boolean> {
    if (!this.conectado || !this.cliente) {
      console.warn('Supabase não está conectado');
      return false;
    }

    if (!transcricao || !Array.isArray(transcricao) || transcricao.length === 0) {
      console.error('❌ [SUPABASE] Transcrição inválida ou vazia para salvar com embeddings.');
      return false;
    }

    try {
      const startTime = Date.now();
      console.log(`🔄 [SUPABASE] Otimizado: Iniciando salvamento de ${transcricao.length} palavras com embeddings.`);

      const palavrasParaEmbed = transcricao.map(p => p.word?.trim()).filter(Boolean);
      if (palavrasParaEmbed.length === 0) {
        console.warn('⚠️ [SUPABASE] Nenhuma palavra válida para gerar embeddings.');
        return true;
      }

      const embeddings = await embeddingService.gerarEmbeddingsLote(palavrasParaEmbed);
      if (embeddings.length !== palavrasParaEmbed.length) {
        throw new Error('Disparidade entre número de palavras e embeddings gerados.');
      }

      const sessionId = crypto.randomUUID();
      let embeddingIndex = 0;
      const dadosParaInserir = transcricao
        .map(palavra => {
          if (!palavra.word || !palavra.word.trim()) return null;
          return {
            word: palavra.word,
            start_time: palavra.start,
            end_time: palavra.end,
            confidence: palavra.confidence,
            session_id: sessionId,
            word_embedding: embeddings[embeddingIndex++],
            contexto: `Arquivo: ${nomeArquivo}`
          };
        })
        .filter(Boolean);

      const tamanhoLote = 100;
      for (let i = 0; i < dadosParaInserir.length; i += tamanhoLote) {
        const lote = dadosParaInserir.slice(i, i + tamanhoLote);
        const { error } = await this.cliente.from('word_timestamps').insert(lote);
        if (error) {
          console.error(`❌ [SUPABASE] Erro ao salvar lote de palavras:`, error);
          return false;
        }
      }

      const endTime = Date.now();
      console.log(`🎉 [SUPABASE] Palavras com embeddings salvas. Tempo: ${(endTime - startTime) / 1000}s.`);
      return true;
    } catch (error) {
      console.error('❌ [SUPABASE] Erro no processo otimizado de salvar com embeddings:', error);
      return false;
    }
  }
}

// Instância singleton do serviço
export const supabaseService = new SupabaseService();
export default supabaseService;