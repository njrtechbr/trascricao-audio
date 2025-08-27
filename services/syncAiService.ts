/**
 * Serviço de IA para correção automática de sincronismo
 * Analisa padrões de atraso e ajusta dinamicamente os timestamps
 * Integrado com banco de dados vetorial para aprendizado de máquina
 */

import { WordTimestamp } from '../types';
import vectorDatabaseService from './vectorDatabaseService';

interface SyncPattern {
  averageDelay: number;
  confidence: number;
  sampleCount: number;
  lastUpdated: number;
}

interface SyncMetrics {
  userInteractions: Array<{
    expectedTime: number;
    actualTime: number;
    timestamp: number;
  }>;
  audioLatency: number;
  systemDelay: number;
}

class SyncAiService {
  private syncPattern: SyncPattern = {
    averageDelay: 0,
    confidence: 0,
    sampleCount: 0,
    lastUpdated: Date.now()
  };

  private syncMetrics: SyncMetrics = {
    userInteractions: [],
    audioLatency: 100, // Latência inicial estimada em ms
    systemDelay: 50    // Atraso do sistema em ms
  };

  // Compensações específicas para diferentes tipos de pontuação
  private punctuationOffsets = {
    period: 200,      // Pontos finais
    comma: 150,       // Vírgulas
    semicolon: 150,   // Ponto e vírgula
    exclamation: 200, // Exclamações
    question: 200,    // Interrogações
    quote: 100,       // Aspas
    dash: 100         // Hífens
  };

  private readonly MAX_SAMPLES = 50;
  private readonly CONFIDENCE_THRESHOLD = 0.7;
  private readonly LEARNING_RATE = 0.1;

  /**
   * Registra uma interação do usuário para análise de padrões
   */
  registrarInteracaoUsuario(tempoEsperado: number, tempoReal: number): void {
    const interacao = {
      expectedTime: tempoEsperado,
      actualTime: tempoReal,
      timestamp: Date.now()
    };

    this.syncMetrics.userInteractions.push(interacao);

    // Manter apenas as últimas interações
    if (this.syncMetrics.userInteractions.length > this.MAX_SAMPLES) {
      this.syncMetrics.userInteractions.shift();
    }

    this.analisarPadroes();
  }

  /**
   * Analisa padrões de sincronismo usando algoritmos avançados de IA
   */
  private analisarPadroes(): void {
    const interacoes = this.syncMetrics.userInteractions;
    
    if (interacoes.length < 3) return;

    // Calcular atraso médio usando média ponderada
    const atrasos = interacoes.map(i => i.actualTime - i.expectedTime);
    const pesosTemporais = this.calcularPesosTemporais(interacoes);
    
    const atrasoMedioPonderado = atrasos.reduce((acc, atraso, index) => {
      return acc + (atraso * pesosTemporais[index]);
    }, 0) / pesosTemporais.reduce((a, b) => a + b, 0);

    // Análise avançada de padrões
    const tendencia = this.detectarTendencia(atrasos);
    const periodicidade = this.analisarPeriodicidade(atrasos);
    const outliers = this.detectarOutliers(atrasos);
    
    // Filtrar outliers para melhor precisão
    const atrasosFiltrados = atrasos.filter((_, index) => !outliers[index]);
    
    // Calcular confiança baseada em múltiplos fatores
    const variancia = this.calcularVariancia(atrasosFiltrados);
    const estabilidade = this.calcularEstabilidade(atrasos);
    const consistencia = this.calcularConsistencia(atrasos, tendencia);
    
    const confianca = Math.max(0, Math.min(1, 
      (1 - (variancia / 1000)) * 0.4 + 
      estabilidade * 0.3 + 
      consistencia * 0.3
    ));

    // Taxa de aprendizado adaptativa baseada na confiança
    const taxaAprendizado = this.LEARNING_RATE * (0.5 + confianca * 0.5);

    // Atualizar padrão usando aprendizado adaptativo
    this.syncPattern.averageDelay = this.lerp(
      this.syncPattern.averageDelay,
      atrasoMedioPonderado,
      taxaAprendizado
    );
    
    this.syncPattern.confidence = this.lerp(
      this.syncPattern.confidence,
      confianca,
      this.LEARNING_RATE
    );
    
    this.syncPattern.sampleCount = interacoes.length;
    this.syncPattern.lastUpdated = Date.now();

    // Ajustar latência do sistema baseado nos padrões
    this.ajustarLatenciaAdaptativa();
  }

  /**
   * Calcula pesos temporais para dar mais importância a interações recentes
   */
  private calcularPesosTemporais(interacoes: Array<{timestamp: number}>): number[] {
    const agora = Date.now();
    return interacoes.map(interacao => {
      const idade = agora - interacao.timestamp;
      // Peso exponencial decrescente (mais recente = maior peso)
      return Math.exp(-idade / 30000); // 30 segundos de meia-vida
    });
  }

  /**
   * Detecta tendência nos atrasos usando regressão linear simples
   */
  private detectarTendencia(atrasos: number[]): number {
    if (atrasos.length < 3) return 0;
    
    const n = atrasos.length;
    const x = Array.from({length: n}, (_, i) => i);
    const y = atrasos;
    
    const somaX = x.reduce((a, b) => a + b, 0);
    const somaY = y.reduce((a, b) => a + b, 0);
    const somaXY = x.reduce((acc, xi, i) => acc + xi * y[i], 0);
    const somaX2 = x.reduce((acc, xi) => acc + xi * xi, 0);
    
    const inclinacao = (n * somaXY - somaX * somaY) / (n * somaX2 - somaX * somaX);
    return inclinacao;
  }

  /**
   * Analisa periodicidade nos atrasos usando autocorrelação
   */
  private analisarPeriodicidade(atrasos: number[]): number {
    if (atrasos.length < 5) return 0;
    
    const media = atrasos.reduce((a, b) => a + b, 0) / atrasos.length;
    const atrasosCentralizados = atrasos.map(a => a - media);
    
    let maxCorrelacao = 0;
    for (let lag = 1; lag < Math.min(atrasos.length / 2, 10); lag++) {
      let correlacao = 0;
      for (let i = 0; i < atrasos.length - lag; i++) {
        correlacao += atrasosCentralizados[i] * atrasosCentralizados[i + lag];
      }
      correlacao /= (atrasos.length - lag);
      maxCorrelacao = Math.max(maxCorrelacao, Math.abs(correlacao));
    }
    
    return maxCorrelacao;
  }

  /**
   * Detecta outliers usando método IQR
   */
  private detectarOutliers(atrasos: number[]): boolean[] {
    if (atrasos.length < 4) return new Array(atrasos.length).fill(false);
    
    const sorted = [...atrasos].sort((a, b) => a - b);
    const q1Index = Math.floor(sorted.length * 0.25);
    const q3Index = Math.floor(sorted.length * 0.75);
    const q1 = sorted[q1Index];
    const q3 = sorted[q3Index];
    const iqr = q3 - q1;
    const lowerBound = q1 - 1.5 * iqr;
    const upperBound = q3 + 1.5 * iqr;
    
    return atrasos.map(atraso => atraso < lowerBound || atraso > upperBound);
  }

  /**
   * Calcula estabilidade baseada na variação dos atrasos
   */
  private calcularEstabilidade(atrasos: number[]): number {
    if (atrasos.length < 2) return 0;
    
    const diferencas = [];
    for (let i = 1; i < atrasos.length; i++) {
      diferencas.push(Math.abs(atrasos[i] - atrasos[i - 1]));
    }
    
    const mediaVariacao = diferencas.reduce((a, b) => a + b, 0) / diferencas.length;
    return Math.max(0, 1 - (mediaVariacao / 500)); // Normalizar para 0-1
  }

  /**
   * Calcula consistência baseada na tendência e variabilidade
   */
  private calcularConsistencia(atrasos: number[], tendencia: number): number {
    if (atrasos.length < 3) return 0;
    
    const variabilidadeTendencia = Math.abs(tendencia);
    const estabilidadeTemporal = this.calcularEstabilidade(atrasos);
    
    // Consistência é alta quando há baixa variabilidade na tendência
    // e alta estabilidade temporal
    return Math.max(0, estabilidadeTemporal * (1 - Math.min(1, variabilidadeTendencia / 100)));
  }

  /**
   * Calcula variância dos atrasos
   */
  private calcularVariancia(valores: number[]): number {
    const media = valores.reduce((a, b) => a + b, 0) / valores.length;
    const variancia = valores.reduce((acc, valor) => {
      return acc + Math.pow(valor - media, 2);
    }, 0) / valores.length;
    return variancia;
  }

  /**
   * Interpolação linear para aprendizado suave
   */
  private lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }

  /**
   * Ajusta latência do sistema de forma adaptativa e dinâmica
   */
  private ajustarLatenciaAdaptativa(): void {
    const interacoes = this.syncMetrics.userInteractions;
    if (interacoes.length < 2) return;

    // Análise temporal das interações
    const ultimasInteracoes = interacoes.slice(-10); // Últimas 10 interações
    const atrasos = ultimasInteracoes.map(i => i.actualTime - i.expectedTime);
    
    // Calcular múltiplas métricas
    const atrasoMedio = atrasos.reduce((a, b) => a + b, 0) / atrasos.length;
    const tendenciaAtraso = this.detectarTendencia(atrasos);
    const variabilidade = this.calcularVariancia(atrasos);
    const estabilidade = this.calcularEstabilidade(atrasos);
    
    // Fator de ajuste baseado na confiança e estabilidade
    const fatorAjuste = Math.min(0.3, this.syncPattern.confidence * estabilidade);
    
    // Ajuste principal baseado no atraso médio
    if (Math.abs(atrasoMedio) > 30) {
      const ajustePrincipal = atrasoMedio * fatorAjuste;
      this.syncMetrics.audioLatency += ajustePrincipal;
    }
    
    // Ajuste preditivo baseado na tendência
    if (Math.abs(tendenciaAtraso) > 5) {
      const ajustePreditivo = tendenciaAtraso * 10 * fatorAjuste;
      this.syncMetrics.audioLatency += ajustePreditivo;
    }
    
    // Limitar latência a valores razoáveis
    this.syncMetrics.audioLatency = Math.max(-500, Math.min(1000, this.syncMetrics.audioLatency));
    
    // Implementar sistema de auto-calibração
    this.executarAutoCalibração();
  }

  private lastCalibration?: number;

  /**
   * Sistema de auto-calibração que se ajusta automaticamente
   */
  private executarAutoCalibração(): void {
    const agora = Date.now();
    const tempoDesdeUltimaCalibração = agora - (this.lastCalibration || 0);
    
    // Executar calibração a cada 30 segundos se houver dados suficientes
    if (tempoDesdeUltimaCalibração > 30000 && this.syncMetrics.userInteractions.length >= 5) {
      this.calibrarSistema();
      this.lastCalibration = agora;
    }
  }

  /**
   * Calibra o sistema baseado no histórico de interações
   */
  private calibrarSistema(): void {
    const interacoes = this.syncMetrics.userInteractions;
    const atrasos = interacoes.map(i => i.actualTime - i.expectedTime);
    
    // Remover outliers para calibração mais precisa
    const outliers = this.detectarOutliers(atrasos);
    const atrasosFiltrados = atrasos.filter((_, index) => !outliers[index]);
    
    if (atrasosFiltrados.length < 3) return;
    
    // Calcular nova latência base
    const novaLatenciaBase = atrasosFiltrados.reduce((a, b) => a + b, 0) / atrasosFiltrados.length;
    
    // Aplicar calibração gradual
    const fatorCalibracao = Math.min(0.5, this.syncPattern.confidence);
    this.syncMetrics.audioLatency = this.lerp(
      this.syncMetrics.audioLatency,
      novaLatenciaBase,
      fatorCalibracao
    );
    
    console.log(`Sistema calibrado: Nova latência base = ${this.syncMetrics.audioLatency?.toFixed(2) || '0.00'}ms`);
  }

  /**
   * Aplica correção de IA aos timestamps da transcrição
   */
  corrigirTimestamps(transcricao: WordTimestamp[], tempoAtualAudio: number): WordTimestamp[] {
    if (this.syncPattern.confidence < this.CONFIDENCE_THRESHOLD) {
      // Usar correção básica se a confiança for baixa
      return this.aplicarCorrecaoBasica(transcricao, tempoAtualAudio);
    }

    // Aplicar correção avançada baseada em IA
    return this.aplicarCorrecaoAvancada(transcricao, tempoAtualAudio);
  }

  /**
   * Correção básica para quando não há dados suficientes
   */
  private aplicarCorrecaoBasica(transcricao: WordTimestamp[], tempoAtualAudio: number): WordTimestamp[] {
    const compensacao = this.syncMetrics.audioLatency;
    
    return transcricao.map(palavra => ({
      ...palavra,
      startTime: Math.max(0, palavra.startTime - compensacao),
      endTime: Math.max(palavra.startTime, palavra.endTime - compensacao)
    }));
  }

  /**
   * Correção avançada usando padrões de IA com análise preditiva
   */
  private aplicarCorrecaoAvancada(transcricao: WordTimestamp[], tempoAtualAudio: number): WordTimestamp[] {
    const compensacaoBase = this.syncMetrics.audioLatency + this.syncPattern.averageDelay;
    const tendencia = this.calcularTendenciaLocal(transcricao);
    
    return transcricao.map((palavra, index) => {
      // Análise preditiva baseada na posição e contexto
      const fatorPosicao = this.calcularFatorPosicao(index, transcricao.length);
      const correcaoPreditiva = this.calcularCorrecaoPreditiva(palavra, index, transcricao);
      const suavizacaoTemporal = this.aplicarSuavizacaoTemporal(palavra, index, transcricao);
      
      // Combinar diferentes tipos de correção
      const posicaoRelativa = index / transcricao.length;
      const compensacaoAdaptativa = compensacaoBase * fatorPosicao + 
                                   correcaoPreditiva * 0.3 + 
                                   tendencia * posicaoRelativa * 0.2;
      
      const novoStartTime = Math.max(0, palavra.startTime - compensacaoAdaptativa + suavizacaoTemporal.start);
      const novoEndTime = Math.max(novoStartTime, palavra.endTime - compensacaoAdaptativa + suavizacaoTemporal.end);
      
      return {
        ...palavra,
        startTime: novoStartTime,
        endTime: novoEndTime
      };
    });
  }

  /**
   * Calcula tendência local nos timestamps
   */
  private calcularTendenciaLocal(transcricao: WordTimestamp[]): number {
    if (transcricao.length < 3) return 0;
    
    const intervalos = [];
    for (let i = 1; i < transcricao.length; i++) {
      intervalos.push(transcricao[i].startTime - transcricao[i - 1].startTime);
    }
    
    const mediaIntervalo = intervalos.reduce((a, b) => a + b, 0) / intervalos.length;
    const intervaloEsperado = 500; // 500ms entre palavras em média
    
    return (mediaIntervalo - intervaloEsperado) / 1000; // Normalizar
  }

  /**
   * Calcula correção preditiva baseada no contexto
   */
  private calcularCorrecaoPreditiva(palavra: WordTimestamp, index: number, transcricao: WordTimestamp[]): number {
    const janela = 3; // Analisar 3 palavras antes e depois
    const inicio = Math.max(0, index - janela);
    const fim = Math.min(transcricao.length, index + janela + 1);
    
    const contexto = transcricao.slice(inicio, fim);
    const duracaoMedia = contexto.reduce((acc, p) => acc + (p.endTime - p.startTime), 0) / contexto.length;
    const duracaoAtual = palavra.endTime - palavra.startTime;
    
    // Ajustar baseado na diferença de duração
    const fatorDuracao = (duracaoAtual - duracaoMedia) / duracaoMedia;
    return fatorDuracao * 100; // Correção sutil baseada na duração
  }

  /**
   * Aplica suavização temporal para transições mais naturais
   */
  private aplicarSuavizacaoTemporal(palavra: WordTimestamp, index: number, transcricao: WordTimestamp[]): {start: number, end: number} {
    if (index === 0 || index === transcricao.length - 1) {
      return {start: 0, end: 0};
    }
    
    const anterior = transcricao[index - 1];
    const posterior = transcricao[index + 1];
    
    // Suavizar baseado nas palavras adjacentes
    const gapAnterior = palavra.startTime - anterior.endTime;
    const gapPosterior = posterior.startTime - palavra.endTime;
    
    const ajusteStart = gapAnterior < 50 ? -gapAnterior * 0.5 : 0; // Reduzir sobreposição
    const ajusteEnd = gapPosterior < 50 ? gapPosterior * 0.5 : 0; // Reduzir gap muito pequeno
    
    return {
      start: ajusteStart,
      end: ajusteEnd
    };
  }

  /**
   * Calcula fator de correção baseado na posição da palavra
   */
  private calcularFatorPosicao(indice: number, total: number): number {
    // Aplicar correção mais forte no início e suavizar ao longo do tempo
    const posicaoRelativa = indice / total;
    return 1.0 - (posicaoRelativa * 0.3); // Reduzir correção em 30% ao longo da transcrição
  }

  /**
   * Calcula compensação dinâmica para o tempo atual
   */
  async calcularCompensacaoTempo(tempoAtual: number, palavra?: string): Promise<number> {
    let compensacao = this.syncMetrics.audioLatency;
    
    // Tentar obter predição do banco de dados vetorial primeiro
    if (palavra) {
      try {
        const predicao = await vectorDatabaseService.predizerCompensacao(palavra);
        
        if (predicao.confianca > 0.5) {
          // Usar predição do banco vetorial se a confiança for alta
          return compensacao + predicao.compensacao;
        } else if (predicao.confianca > 0.2) {
          // Combinar predição com lógica tradicional se confiança for média
          const compensacaoTradicional = this.calcularCompensacaoTradicional(tempoAtual, palavra);
          const peso = predicao.confianca;
          return compensacao + (predicao.compensacao * peso + compensacaoTradicional * (1 - peso));
        }
      } catch (error) {
        console.warn('Erro ao obter predição do banco vetorial:', error);
      }
    }
    
    // Fallback para lógica tradicional
    return this.calcularCompensacaoTradicional(tempoAtual, palavra);
  }
  
  /**
   * Método de compensação tradicional (mantido como fallback)
   */
  private calcularCompensacaoTradicional(tempoAtual: number, palavra?: string): number {
    let compensacao = 0;
    
    if (this.syncPattern.confidence > 0.5) {
      compensacao += this.syncPattern.averageDelay;
    }
    
    // Aplicar compensação específica para pontuações
    if (palavra && this.isPunctuationWord(palavra)) {
      compensacao += this.calcularCompensacaoPontuacao(palavra);
    }
    
    return compensacao;
  }

  /**
   * Verifica se a palavra contém pontuação que precisa de correção especial
   */
  private isPunctuationWord(palavra: string): boolean {
    return /[.!?,:;"'\-]/.test(palavra);
  }

  /**
   * Calcula compensação específica baseada no tipo de pontuação
   */
  private calcularCompensacaoPontuacao(palavra: string): number {
    // Pontuações que indicam pausa mais longa (final de frase)
    if (/\.$/.test(palavra)) {
      return this.punctuationOffsets.period;
    }
    if (/!$/.test(palavra)) {
      return this.punctuationOffsets.exclamation;
    }
    if (/\?$/.test(palavra)) {
      return this.punctuationOffsets.question;
    }
    
    // Vírgulas e pontos e vírgulas (pausa média)
    if (/,$/.test(palavra)) {
      return this.punctuationOffsets.comma;
    }
    if (/;$/.test(palavra)) {
      return this.punctuationOffsets.semicolon;
    }
    
    // Aspas e hífens (transições rápidas)
    if (/["']/.test(palavra)) {
      return this.punctuationOffsets.quote;
    }
    if (/-/.test(palavra)) {
      return this.punctuationOffsets.dash;
    }
    
    return 0;
  }

  /**
   * Ajusta dinamicamente os offsets de pontuação baseado no aprendizado
   */
  ajustarOffsetsPontuacao(tipoPontuacao: keyof typeof this.punctuationOffsets, novoOffset: number): void {
    this.punctuationOffsets[tipoPontuacao] = Math.max(0, Math.min(500, novoOffset)); // Limita entre 0 e 500ms
  }

  /**
   * Obtém métricas atuais do sincronismo
   */
  obterMetricas(): {
    atrasoMedio: number;
    confianca: number;
    amostras: number;
    latenciaAudio: number;
    ultimaAtualizacao: number;
  } {
    return {
      atrasoMedio: this.syncPattern.averageDelay,
      confianca: this.syncPattern.confidence,
      amostras: this.syncPattern.sampleCount,
      latenciaAudio: this.syncMetrics.audioLatency,
      ultimaAtualizacao: this.syncPattern.lastUpdated
    };
  }

  /**
   * Sistema de monitoramento em tempo real
   */
  iniciarMonitoramento(): void {
    // Monitorar a cada 2 segundos
    setInterval(() => {
      this.executarMonitoramentoRealTime();
    }, 2000);
  }

  /**
   * Executa monitoramento em tempo real
   */
  private executarMonitoramentoRealTime(): void {
    const agora = Date.now();
    const interacoes = this.syncMetrics.userInteractions;
    
    if (interacoes.length === 0) return;
    
    // Analisar interações recentes (últimos 10 segundos)
    const interacoesRecentes = interacoes.filter(i => agora - i.timestamp < 10000);
    
    if (interacoesRecentes.length >= 2) {
      this.ajustarParametrosDinamicos(interacoesRecentes);
      this.detectarAnomalias(interacoesRecentes);
    }
    
    // Limpeza de dados antigos (manter apenas últimas 100 interações)
    if (interacoes.length > 100) {
      this.syncMetrics.userInteractions = interacoes.slice(-100);
    }
  }

  /**
   * Ajusta parâmetros dinamicamente baseado em interações recentes
   */
  private ajustarParametrosDinamicos(interacoesRecentes: Array<{expectedTime: number; actualTime: number; timestamp: number}>): void {
    const atrasos = interacoesRecentes.map(i => i.actualTime - i.expectedTime);
    const atrasoMedio = atrasos.reduce((a, b) => a + b, 0) / atrasos.length;
    const variabilidade = this.calcularVariancia(atrasos);
    
    // Ajustar taxa de aprendizado baseada na variabilidade
    if (variabilidade > 200) {
      // Alta variabilidade = aprendizado mais lento
      (this as any).LEARNING_RATE = Math.max(0.05, (this as any).LEARNING_RATE * 0.9);
    } else if (variabilidade < 50) {
      // Baixa variabilidade = aprendizado mais rápido
      (this as any).LEARNING_RATE = Math.min(0.3, (this as any).LEARNING_RATE * 1.1);
    }
    
    // Ajustar limiar de confiança dinamicamente
    if (Math.abs(atrasoMedio) < 30 && variabilidade < 100) {
      (this as any).CONFIDENCE_THRESHOLD = Math.max(0.3, (this as any).CONFIDENCE_THRESHOLD - 0.05);
    } else {
      (this as any).CONFIDENCE_THRESHOLD = Math.min(0.7, (this as any).CONFIDENCE_THRESHOLD + 0.05);
    }
  }

  /**
   * Detecta anomalias no comportamento de sincronização
   */
  private detectarAnomalias(interacoesRecentes: Array<{expectedTime: number; actualTime: number; timestamp: number}>): void {
    const atrasos = interacoesRecentes.map(i => i.actualTime - i.expectedTime);
    const outliers = this.detectarOutliers(atrasos);
    
    const percentualOutliers = outliers.filter(Boolean).length / outliers.length;
    
    if (percentualOutliers > 0.5) {
      // Muitos outliers detectados - resetar parcialmente o sistema
      console.warn('Anomalia detectada: Muitos outliers. Resetando sistema parcialmente.');
      this.resetarSistemaParcial();
    }
    
    // Detectar mudanças bruscas na latência
    if (atrasos.length >= 3) {
      const ultimoAtraso = atrasos[atrasos.length - 1];
      const penultimoAtraso = atrasos[atrasos.length - 2];
      const mudancaBrusca = Math.abs(ultimoAtraso - penultimoAtraso);
      
      if (mudancaBrusca > 300) {
        console.warn('Mudança brusca detectada na latência:', mudancaBrusca);
        this.aplicarCorrecaoEmergencia(ultimoAtraso);
      }
    }
  }

  /**
   * Reseta parcialmente o sistema em caso de anomalias
   */
  private resetarSistemaParcial(): void {
    // Manter apenas as últimas 5 interações mais estáveis
    const interacoes = this.syncMetrics.userInteractions;
    const atrasos = interacoes.map(i => i.actualTime - i.expectedTime);
    const outliers = this.detectarOutliers(atrasos);
    
    const interacoesEstáveis = interacoes.filter((_, index) => !outliers[index]);
    this.syncMetrics.userInteractions = interacoesEstáveis.slice(-5);
    
    // Reduzir confiança temporariamente
    this.syncPattern.confidence *= 0.7;
    
    // Resetar taxa de aprendizado
    (this as any).LEARNING_RATE = 0.15;
  }

  /**
   * Aplica correção de emergência para mudanças bruscas
   */
  private aplicarCorrecaoEmergencia(novoAtraso: number): void {
    // Aplicar correção imediata mas conservadora
    const correcaoEmergencia = novoAtraso * 0.3;
    this.syncMetrics.audioLatency += correcaoEmergencia;
    
    // Limitar a valores seguros
    this.syncMetrics.audioLatency = Math.max(-300, Math.min(800, this.syncMetrics.audioLatency));
  }

  /**
   * Reseta os padrões aprendidos
   */
  resetarPadroes(): void {
    this.syncPattern = {
      averageDelay: 0,
      confidence: 0,
      sampleCount: 0,
      lastUpdated: Date.now()
    };
    
    this.syncMetrics.userInteractions = [];
    this.syncMetrics.audioLatency = 100;
  }
}

// Instância singleton do serviço
export const syncAiService = new SyncAiService();
export default syncAiService;