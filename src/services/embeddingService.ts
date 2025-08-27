/**
 * Serviço para geração de embeddings vetoriais
 * Utiliza a API do Hugging Face com InferenceClient para gerar embeddings de texto
 */

import { HfInference } from '@huggingface/inference';

class EmbeddingService {
  private modelos = [
    'sentence-transformers/all-MiniLM-L6-v2',
    'sentence-transformers/paraphrase-MiniLM-L6-v2'
  ];
  private readonly apiKey: string;
  private readonly maxRetries = 3;
  private readonly retryDelay = 1000; // 1 segundo
  private modeloAtual = 0;
  private hf: HfInference | null = null;

  constructor() {
    this.apiKey = import.meta.env.VITE_HUGGINGFACE_API_KEY || '';
    if (!this.apiKey) {
      console.warn('⚠️ [EMBEDDING] API key do Hugging Face não configurada. Usando embeddings locais.');
    } else {
      // Configurar HfInference com headers específicos para Electron
      this.hf = new HfInference(this.apiKey, {
        fetch: async (url, options = {}) => {
          try {
            const response = await fetch(url, {
              ...options,
              mode: 'cors',
              credentials: 'omit',
              headers: {
                ...options.headers,
                'Authorization': `Bearer ${this.apiKey}`,
                'User-Agent': 'TranscricaoAudioIA/1.1.0 (Electron)',
                'Accept': 'application/json',
                'Content-Type': 'application/json'
              }
            });
            
            if (!response.ok) {
              throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            return response;
          } catch (error: any) {
            console.error('🌐 [EMBEDDING] Erro na requisição:', {
              url,
              error: error.message,
              type: error.name
            });
            throw error;
          }
        }
      });
    }
  }

  /**
   * Gera embedding para um texto
   * @param texto - Texto para gerar embedding
   * @returns Promise com array de números representando o embedding
   */
  async gerarEmbedding(texto: string): Promise<number[]> {
    try {
      if (!texto || texto.trim().length === 0) {
        throw new Error('Texto vazio fornecido para geração de embedding');
      }

      if (!this.hf || !this.apiKey) {
        console.warn('⚠️ [EMBEDDING] API key não configurada, retornando embedding vazio');
        // Retorna um embedding vazio com 384 dimensões (tamanho do modelo all-MiniLM-L6-v2)
        return new Array(384).fill(0);
      }

      // Tenta com cada modelo disponível
      for (let tentativa = 0; tentativa < this.modelos.length; tentativa++) {
        const modeloIndex = (this.modeloAtual + tentativa) % this.modelos.length;
        const modelo = this.modelos[modeloIndex];

        try {
          console.log(`🔄 [EMBEDDING] Tentando modelo: ${modelo}`);
          
          // Usa o método feature_extraction do InferenceClient
          const resultado = await this.hf.featureExtraction({
            model: modelo,
            inputs: texto
          });

          // O resultado pode ser um array de arrays ou um array simples
          let embedding: number[];
          if (Array.isArray(resultado) && Array.isArray(resultado[0])) {
            // Se é um array de arrays, pega o primeiro elemento
            embedding = resultado[0] as number[];
          } else {
            // Se é um array simples, usa diretamente
            embedding = resultado as number[];
          }
            
          if (Array.isArray(embedding) && embedding.length > 0) {
            // Atualiza o modelo atual para o que funcionou
            this.modeloAtual = modeloIndex;
            console.log(`✅ [EMBEDDING] Embedding gerado com sucesso:`, {
              modelo: modelo,
              dimensoes: embedding.length
            });
            return embedding;
          }
        } catch (modelError: any) {
          // Tratamento específico para erros de rede
          if (modelError?.message?.includes('Failed to fetch') || modelError?.message?.includes('net::ERR_FAILED')) {
            console.error(`🌐 [EMBEDDING] Erro de conectividade com modelo ${modelo}:`, {
              message: 'Falha na conexão com Hugging Face',
              originalError: modelError?.message,
              suggestion: 'Verifique conexão com internet e configurações de proxy'
            });
          } else {
            console.error(`❌ [EMBEDDING] Erro detalhado com modelo ${modelo}:`, {
              message: modelError?.message,
              status: modelError?.status,
              code: modelError?.code,
              stack: modelError?.stack
            });
          }
          
          // Se o erro for de autenticação, não tenta outros modelos
          if (modelError?.message?.includes('401') || modelError?.message?.includes('Unauthorized')) {
            console.warn('⚠️ [EMBEDDING] API key inválida ou expirada, retornando embedding vazio');
            return new Array(384).fill(0);
          }
        }
      }

      console.error('❌ [EMBEDDING] Todos os modelos falharam. Verificações:', {
        apiKey: this.apiKey ? 'Configurada' : 'Não configurada',
        hfInstance: this.hf ? 'Inicializada' : 'Não inicializada',
        modelos: this.modelos,
        texto: texto.substring(0, 50) + '...'
      });
      throw new Error('Todos os modelos falharam - verifique conectividade e API key');
    } catch (error) {
      console.error('Erro ao gerar embedding:', error);
      // Em caso de erro, retorna embedding vazio para não quebrar o fluxo
      console.warn('⚠️ [EMBEDDING] Retornando embedding vazio devido ao erro');
      return new Array(384).fill(0);
    }
  }

  /**
   * Gera embeddings para múltiplos textos
   * @param textos - Array de textos para gerar embeddings
   * @returns Promise com array de embeddings
   */
  async gerarEmbeddingsLote(textos: string[]): Promise<number[][]> {
    try {
      if (!this.hf || !this.apiKey) {
        console.warn('⚠️ [EMBEDDING] API key não configurada, retornando embeddings vazios');
        return textos.map(() => new Array(384).fill(0));
      }

      const embeddings: number[][] = [];
      
      // Processa em lotes para evitar sobrecarga da API
      const tamanhoLote = 5; // Reduzido para evitar timeouts
      for (let i = 0; i < textos.length; i += tamanhoLote) {
        const lote = textos.slice(i, i + tamanhoLote);
        
        // Tenta processar o lote inteiro com um modelo
        let loteProcessado = false;
        for (let tentativa = 0; tentativa < this.modelos.length && !loteProcessado; tentativa++) {
          const modeloIndex = (this.modeloAtual + tentativa) % this.modelos.length;
          const modelo = this.modelos[modeloIndex];
          
          try {
            console.log(`🔄 [EMBEDDING] Processando lote com modelo: ${modelo}`);
            
            // Tenta processar o lote inteiro de uma vez
            const resultado = await this.hf.featureExtraction({
              model: modelo,
              inputs: lote
            });
            
            // Processa o resultado do lote
            if (Array.isArray(resultado)) {
              const embeddingsLote: number[][] = [];
              
              if (lote.length === 1) {
                // Se é apenas um texto, o resultado pode ser um array simples ou array de arrays
                const embedding = Array.isArray(resultado[0]) ? resultado[0] as number[] : resultado as number[];
                embeddingsLote.push(embedding);
              } else {
                // Se são múltiplos textos, cada elemento é um embedding
                for (const item of resultado) {
                  if (Array.isArray(item)) {
                    embeddingsLote.push(item as number[]);
                  }
                }
              }
              
              if (embeddingsLote.length === lote.length) {
                embeddings.push(...embeddingsLote);
                this.modeloAtual = modeloIndex; // Atualiza modelo que funcionou
                loteProcessado = true;
                console.log(`✅ [EMBEDDING] Lote processado com sucesso (${embeddingsLote.length} embeddings)`);
              }
            }
          } catch (modelError: any) {
            console.warn(`⚠️ [EMBEDDING] Erro no lote com modelo ${modelo}:`, modelError?.message || modelError);
          }
        }
        
        // Se o lote não foi processado, processa individualmente
        if (!loteProcessado) {
          console.log(`🔄 [EMBEDDING] Processando lote individualmente...`);
          const embeddingsLote = await Promise.all(
            lote.map(texto => this.gerarEmbedding(texto))
          );
          embeddings.push(...embeddingsLote);
        }
        
        // Pequena pausa entre lotes para não sobrecarregar a API
        if (i + tamanhoLote < textos.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      
      return embeddings;
    } catch (error) {
      console.error('Erro ao gerar embeddings em lote:', error);
      return textos.map(() => new Array(384).fill(0));
    }
  }

  /**
   * Calcula similaridade de cosseno entre dois embeddings
   * @param embedding1 - Primeiro embedding
   * @param embedding2 - Segundo embedding
   * @returns Valor de similaridade entre -1 e 1
   */
  calcularSimilaridade(embedding1: number[], embedding2: number[]): number {
    if (embedding1.length !== embedding2.length) {
      throw new Error('Embeddings devem ter o mesmo tamanho');
    }

    let produtoEscalar = 0;
    let norma1 = 0;
    let norma2 = 0;

    for (let i = 0; i < embedding1.length; i++) {
      produtoEscalar += embedding1[i] * embedding2[i];
      norma1 += embedding1[i] * embedding1[i];
      norma2 += embedding2[i] * embedding2[i];
    }

    const denominador = Math.sqrt(norma1) * Math.sqrt(norma2);
    return denominador === 0 ? 0 : produtoEscalar / denominador;
  }

  /**
   * Normaliza um embedding para ter norma unitária
   * @param embedding - Embedding para normalizar
   * @returns Embedding normalizado
   */
  normalizarEmbedding(embedding: number[]): number[] {
    const norma = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    return norma === 0 ? embedding : embedding.map(val => val / norma);
  }
}

// Instância singleton do serviço
export const embeddingService = new EmbeddingService();
export default embeddingService;