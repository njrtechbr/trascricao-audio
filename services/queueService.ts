/**
 * Serviço de Filas para Controle de Requisições
 * 
 * Este serviço implementa um sistema de filas para controlar o número de requisições
 * simultâneas ao Supabase, evitando sobrecarga e erros de conectividade.
 */

// Tipos de operação suportados
export type TipoOperacao = 'INSERT' | 'UPDATE' | 'DELETE' | 'UPSERT' | 'SELECT';

export interface TarefaFila {
  id: string;
  funcao: () => Promise<any>;
  prioridade: 'alta' | 'media' | 'baixa';
  tentativas: number;
  maxTentativas: number;
  timestamp: number;
}

export interface StatusFila {
  total: number;
  processadas: number;
  pendentes: number;
  falharam: number;
  percentualConcluido: number;
}

export interface ObservadorFila {
  onStatusChange: (status: StatusFila) => void;
  onTarefaConcluida: (tarefa: TarefaFila, resultado: any) => void;
  onTarefaFalhou: (tarefa: TarefaFila, erro: Error) => void;
}

class ServicoFila {
  private fila: TarefaFila[] = [];
  private processando: Map<string, TarefaFila> = new Map();
  private concluidas: TarefaFila[] = [];
  private falharam: TarefaFila[] = [];
  private observadores: ObservadorFila[] = [];
  
  // Configurações da fila
  private readonly maxConcorrencia = 3; // Máximo de 3 requisições simultâneas
  private readonly delayEntreRequisicoes = 100; // 100ms entre requisições
  private readonly timeoutRequisicao = 10000; // 10 segundos de timeout
  
  private processandoAtivo = false;
  private ultimaRequisicao = 0;

  /**
   * Adiciona uma tarefa à fila
   */
  adicionarTarefa(
    funcao: () => Promise<any>,
    prioridade: 'alta' | 'media' | 'baixa' = 'media',
    maxTentativas = 3
  ): Promise<any> {
    const tarefa: TarefaFila = {
      id: this.gerarId(),
      funcao,
      prioridade,
      tentativas: 0,
      maxTentativas,
      timestamp: Date.now()
    };

    return new Promise((resolve, reject) => {
      // Adiciona callbacks de resolução à tarefa
      (tarefa as any).resolve = resolve;
      (tarefa as any).reject = reject;
      
      this.fila.push(tarefa);
      this.ordenarFila();
      this.notificarObservadores();
      
      // Inicia o processamento se não estiver ativo
      if (!this.processandoAtivo) {
        this.iniciarProcessamento();
      }
    });
  }

  /**
   * Adiciona um observador para receber atualizações da fila
   */
  adicionarObservador(observador: ObservadorFila): void {
    this.observadores.push(observador);
  }

  /**
   * Remove um observador
   */
  removerObservador(observador: ObservadorFila): void {
    const index = this.observadores.indexOf(observador);
    if (index > -1) {
      this.observadores.splice(index, 1);
    }
  }

  /**
   * Obtém o status atual da fila
   */
  obterStatus(): StatusFila {
    const total = this.fila.length + this.processando.size + this.concluidas.length + this.falharam.length;
    const processadas = this.concluidas.length;
    const pendentes = this.fila.length + this.processando.size;
    const falharam = this.falharam.length;
    const percentualConcluido = total > 0 ? Math.round((processadas / total) * 100) : 0;

    return {
      total,
      processadas,
      pendentes,
      falharam,
      percentualConcluido
    };
  }

  /**
   * Limpa a fila (remove todas as tarefas pendentes)
   */
  limparFila(): void {
    this.fila = [];
    this.notificarObservadores();
  }

  /**
   * Para o processamento da fila
   */
  pararProcessamento(): void {
    this.processandoAtivo = false;
  }

  /**
   * Reinicia o processamento da fila
   */
  reiniciarProcessamento(): void {
    if (!this.processandoAtivo && this.fila.length > 0) {
      this.iniciarProcessamento();
    }
  }

  /**
   * Inicia o processamento das tarefas na fila
   */
  private async iniciarProcessamento(): Promise<void> {
    this.processandoAtivo = true;

    while (this.processandoAtivo && (this.fila.length > 0 || this.processando.size > 0)) {
      // Processa tarefas se há espaço na concorrência
      while (this.processando.size < this.maxConcorrencia && this.fila.length > 0) {
        const tarefa = this.fila.shift()!;
        this.processarTarefa(tarefa);
      }

      // Aguarda um pouco antes de verificar novamente
      await this.aguardar(50);
    }

    this.processandoAtivo = false;
  }

  /**
   * Processa uma tarefa individual
   */
  private async processarTarefa(tarefa: TarefaFila): Promise<void> {
    this.processando.set(tarefa.id, tarefa);
    tarefa.tentativas++;

    try {
      // Respeita o delay entre requisições
      const agora = Date.now();
      const tempoEspera = Math.max(0, this.delayEntreRequisicoes - (agora - this.ultimaRequisicao));
      if (tempoEspera > 0) {
        await this.aguardar(tempoEspera);
      }
      this.ultimaRequisicao = Date.now();

      // Executa a tarefa com timeout
      const resultado = await Promise.race([
        tarefa.funcao(),
        this.criarTimeoutPromise(this.timeoutRequisicao)
      ]);

      // Tarefa concluída com sucesso
      this.processando.delete(tarefa.id);
      this.concluidas.push(tarefa);
      
      // Resolve a promise original
      (tarefa as any).resolve(resultado);
      
      // Notifica observadores
      this.observadores.forEach(obs => {
        try {
          obs.onTarefaConcluida(tarefa, resultado);
        } catch (e) {
          console.error('Erro ao notificar observador:', e);
        }
      });

    } catch (erro) {
      this.processando.delete(tarefa.id);
      
      // Verifica se deve tentar novamente
      if (tarefa.tentativas < tarefa.maxTentativas) {
        console.warn(`Tentativa ${tarefa.tentativas}/${tarefa.maxTentativas} falhou para tarefa ${tarefa.id}:`, erro);
        
        // Recoloca na fila com delay exponencial
        const delayTentativa = Math.min(1000 * Math.pow(2, tarefa.tentativas - 1), 5000);
        setTimeout(() => {
          this.fila.unshift(tarefa); // Adiciona no início para priorizar
          this.notificarObservadores();
        }, delayTentativa);
        
      } else {
        // Falha definitiva
        this.falharam.push(tarefa);
        
        // Rejeita a promise original
        (tarefa as any).reject(erro);
        
        // Notifica observadores
        this.observadores.forEach(obs => {
          try {
            obs.onTarefaFalhou(tarefa, erro as Error);
          } catch (e) {
            console.error('Erro ao notificar observador:', e);
          }
        });
      }
    }

    this.notificarObservadores();
  }

  /**
   * Ordena a fila por prioridade e timestamp
   */
  private ordenarFila(): void {
    const prioridades = { 'alta': 3, 'media': 2, 'baixa': 1 };
    
    this.fila.sort((a, b) => {
      // Primeiro por prioridade
      const diffPrioridade = prioridades[b.prioridade] - prioridades[a.prioridade];
      if (diffPrioridade !== 0) return diffPrioridade;
      
      // Depois por timestamp (mais antigo primeiro)
      return a.timestamp - b.timestamp;
    });
  }

  /**
   * Notifica todos os observadores sobre mudanças no status
   */
  private notificarObservadores(): void {
    const status = this.obterStatus();
    this.observadores.forEach(obs => {
      try {
        obs.onStatusChange(status);
      } catch (e) {
        console.error('Erro ao notificar observador:', e);
      }
    });
  }

  /**
   * Gera um ID único para a tarefa
   */
  private gerarId(): string {
    return `tarefa_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Função auxiliar para aguardar um tempo específico
   */
  private aguardar(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Cria uma promise que rejeita após um timeout
   */
  private criarTimeoutPromise(timeout: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Timeout de ${timeout}ms excedido`));
      }, timeout);
    });
  }
}

// Instância singleton do serviço de fila
export const servicoFila = new ServicoFila();

// Função auxiliar para adicionar tarefas à fila
export const adicionarTarefaFila = (
  funcao: () => Promise<any>,
  prioridade: 'alta' | 'media' | 'baixa' = 'media',
  maxTentativas = 3
): Promise<any> => {
  return servicoFila.adicionarTarefa(funcao, prioridade, maxTentativas);
};

export default servicoFila;