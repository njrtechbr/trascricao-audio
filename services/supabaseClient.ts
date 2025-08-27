import { createClient } from '@supabase/supabase-js';

// Configuração do Supabase
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Configurações do Supabase não encontradas. Funcionalidades de banco de dados vetorial serão desabilitadas.');
}

// Criar cliente Supabase
export const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Verificar se o cliente está configurado
export const isSupabaseConfigured = () => {
  return supabase !== null;
};

// Tipos para o banco de dados
export interface WordTimestampRecord {
  id?: number;
  word: string;
  timestamp: number;
  start_time: number;
  context: string;
  playback_rate: number;
  session_id?: string;
  word_embedding?: number[];
  context_embedding?: number[];
  created_at?: string;
}

export interface LearningData {
  id?: number;
  word: string;
  expected_time: number;
  actual_time: number;
  user_accuracy: number;
  context: string;
  word_embedding?: number[];
  context_embedding?: number[];
  created_at?: string;
}

export interface TranscricaoRecord {
  id?: number;
  nome_arquivo: string;
  transcricao: string;
  tamanho_arquivo: number;
  transcricao_embedding?: number[];
  criado_em?: string;
}

export default supabase;