import { createClient, SupabaseClient } from '@supabase/supabase-js';

class SupabaseStorageService {
  private cliente: SupabaseClient | null = null;
  private conectado: boolean = false;

  constructor() {
    this.inicializar();
  }

  private inicializar(): void {
    try {
      // Usar import.meta.env para Vite
       const urlSupabase = import.meta.env.VITE_SUPABASE_URL;
       const chaveServiceRole = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

      // Verificar se as variáveis estão configuradas
       if (!urlSupabase || !chaveServiceRole) {
         console.warn('Variáveis de ambiente do Supabase não configuradas corretamente');
         this.conectado = false;
         return;
       }

      if (!urlSupabase || !chaveServiceRole) {
        console.warn('Credenciais do Supabase Storage não encontradas nas variáveis de ambiente');
        console.warn('URL:', urlSupabase);
        console.warn('Service Role Key:', chaveServiceRole ? 'Presente' : 'Ausente');
        return;
      }

      // Usar service role key para operações de storage
      this.cliente = createClient(urlSupabase, chaveServiceRole);
      this.conectado = true;
      console.log('Serviço de Storage do Supabase inicializado com sucesso');
    } catch (erro) {
      console.error('Erro ao inicializar serviço de Storage do Supabase:', erro);
      this.conectado = false;
    }
  }

  /**
   * Sanitiza o nome do arquivo removendo caracteres especiais
   */
  private sanitizarNomeArquivo(nomeArquivo: string): string {
    return nomeArquivo
      .normalize('NFD') // Decompor caracteres acentuados
      .replace(/[\u0300-\u036f]/g, '') // Remover acentos
      .replace(/[^a-zA-Z0-9._-]/g, '_') // Substituir caracteres especiais por underscore
      .replace(/_+/g, '_') // Substituir múltiplos underscores por um só
      .replace(/^_|_$/g, ''); // Remover underscores do início e fim
  }

  /**
   * Faz upload de um arquivo de áudio para o bucket do Supabase
   */
  async fazerUploadAudio(arquivo: File, nomeArquivo?: string): Promise<{ sucesso: boolean; url?: string; erro?: string }> {
    if (!this.conectado || !this.cliente) {
      return { sucesso: false, erro: 'Serviço de Storage não está conectado' };
    }

    try {
      // Gerar nome único se não fornecido e sanitizar
      const nomeBase = nomeArquivo || arquivo.name;
      const nomeSanitizado = this.sanitizarNomeArquivo(nomeBase);
      const nomeUnico = `audio_${Date.now()}_${nomeSanitizado}`;
      const caminhoArquivo = `audios/${nomeUnico}`;

      // Fazer upload do arquivo
      const { data, error } = await this.cliente.storage
        .from('audio-files')
        .upload(caminhoArquivo, arquivo, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        console.error('Erro no upload:', error);
        return { sucesso: false, erro: error.message };
      }

      // Obter URL pública do arquivo
      const { data: urlData } = this.cliente.storage
        .from('audio-files')
        .getPublicUrl(caminhoArquivo);

      return {
        sucesso: true,
        url: urlData.publicUrl
      };
    } catch (erro) {
      console.error('Erro ao fazer upload do áudio:', erro);
      return { sucesso: false, erro: 'Erro interno no upload' };
    }
  }

  /**
   * Remove um arquivo de áudio do storage
   */
  async removerAudio(caminhoArquivo: string): Promise<{ sucesso: boolean; erro?: string }> {
    if (!this.conectado || !this.cliente) {
      return { sucesso: false, erro: 'Serviço de Storage não está conectado' };
    }

    try {
      const { error } = await this.cliente.storage
        .from('audio-files')
        .remove([caminhoArquivo]);

      if (error) {
        console.error('Erro ao remover arquivo:', error);
        return { sucesso: false, erro: error.message };
      }

      return { sucesso: true };
    } catch (erro) {
      console.error('Erro ao remover áudio:', erro);
      return { sucesso: false, erro: 'Erro interno na remoção' };
    }
  }

  /**
   * Lista arquivos de áudio no storage
   */
  async listarAudios(): Promise<{ sucesso: boolean; arquivos?: any[]; erro?: string }> {
    if (!this.conectado || !this.cliente) {
      return { sucesso: false, erro: 'Serviço de Storage não está conectado' };
    }

    try {
      const { data, error } = await this.cliente.storage
        .from('audio-files')
        .list('audios', {
          limit: 100,
          offset: 0
        });

      if (error) {
        console.error('Erro ao listar arquivos:', error);
        return { sucesso: false, erro: error.message };
      }

      return { sucesso: true, arquivos: data };
    } catch (erro) {
      console.error('Erro ao listar áudios:', erro);
      return { sucesso: false, erro: 'Erro interno na listagem' };
    }
  }

  /**
   * Verifica se o serviço está conectado
   */
  estaConectado(): boolean {
    return this.conectado;
  }
}

// Exportar instância singleton
export const supabaseStorageService = new SupabaseStorageService();
export default supabaseStorageService;