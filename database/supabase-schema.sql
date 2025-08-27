-- Criar tabela para armazenar palavras e timestamps
CREATE TABLE IF NOT EXISTS word_timestamps (
  id BIGSERIAL PRIMARY KEY,
  word TEXT NOT NULL,
  timestamp DECIMAL NOT NULL,
  start_time DECIMAL NOT NULL,
  context TEXT,
  playback_rate DECIMAL DEFAULT 1.0,
  session_id UUID DEFAULT gen_random_uuid(),
  word_embedding VECTOR(384),
  context_embedding VECTOR(384),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar tabela para dados de aprendizado da IA
CREATE TABLE IF NOT EXISTS learning_data (
  id BIGSERIAL PRIMARY KEY,
  word TEXT NOT NULL,
  expected_time DECIMAL NOT NULL,
  actual_time DECIMAL NOT NULL,
  user_accuracy DECIMAL NOT NULL,
  context TEXT,
  word_embedding VECTOR(384),
  context_embedding VECTOR(384),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar tabela para armazenar transcrições completas
CREATE TABLE IF NOT EXISTS transcricoes (
  id BIGSERIAL PRIMARY KEY,
  nome_arquivo TEXT NOT NULL,
  transcricao TEXT NOT NULL,
  tamanho_arquivo BIGINT,
  transcricao_embedding VECTOR(384),
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_word_timestamps_word ON word_timestamps(word);
CREATE INDEX IF NOT EXISTS idx_word_timestamps_timestamp ON word_timestamps(timestamp);
CREATE INDEX IF NOT EXISTS idx_word_timestamps_session ON word_timestamps(session_id);
CREATE INDEX IF NOT EXISTS idx_word_timestamps_created_at ON word_timestamps(created_at);

CREATE INDEX IF NOT EXISTS idx_learning_data_word ON learning_data(word);
CREATE INDEX IF NOT EXISTS idx_learning_data_accuracy ON learning_data(user_accuracy);
CREATE INDEX IF NOT EXISTS idx_learning_data_created_at ON learning_data(created_at);

CREATE INDEX IF NOT EXISTS idx_transcricoes_nome_arquivo ON transcricoes(nome_arquivo);
CREATE INDEX IF NOT EXISTS idx_transcricoes_criado_em ON transcricoes(criado_em);

-- Índices vetoriais para busca semântica
CREATE INDEX IF NOT EXISTS idx_word_timestamps_word_embedding ON word_timestamps USING hnsw (word_embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS idx_word_timestamps_context_embedding ON word_timestamps USING hnsw (context_embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS idx_learning_data_word_embedding ON learning_data USING hnsw (word_embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS idx_learning_data_context_embedding ON learning_data USING hnsw (context_embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS idx_transcricoes_embedding ON transcricoes USING hnsw (transcricao_embedding vector_cosine_ops);

-- Habilitar Row Level Security (RLS)
ALTER TABLE word_timestamps ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE transcricoes ENABLE ROW LEVEL SECURITY;

-- Criar políticas de segurança (permitir acesso público para demonstração)
-- Em produção, você deve configurar políticas mais restritivas
CREATE POLICY "Permitir acesso público a word_timestamps" ON word_timestamps
  FOR ALL USING (true);

CREATE POLICY "Permitir acesso público a learning_data" ON learning_data
  FOR ALL USING (true);

CREATE POLICY "Permitir acesso público a transcricoes" ON transcricoes
  FOR ALL USING (true);

-- Comentários para documentação
COMMENT ON TABLE word_timestamps IS 'Armazena palavras e seus timestamps durante a reprodução de áudio';
COMMENT ON TABLE learning_data IS 'Armazena dados de aprendizado para melhorar a sincronização da IA';
COMMENT ON TABLE transcricoes IS 'Armazena transcrições completas de arquivos de áudio';

COMMENT ON COLUMN word_timestamps.word IS 'A palavra falada';
COMMENT ON COLUMN word_timestamps.timestamp IS 'Tempo atual da reprodução quando a palavra foi registrada';
COMMENT ON COLUMN word_timestamps.start_time IS 'Tempo de início da palavra na transcrição';
COMMENT ON COLUMN word_timestamps.context IS 'Contexto da frase onde a palavra aparece';
COMMENT ON COLUMN word_timestamps.playback_rate IS 'Velocidade de reprodução quando a palavra foi registrada';
COMMENT ON COLUMN word_timestamps.session_id IS 'ID da sessão de reprodução';

COMMENT ON COLUMN learning_data.word IS 'A palavra para aprendizado';
COMMENT ON COLUMN learning_data.expected_time IS 'Tempo esperado pela IA';
COMMENT ON COLUMN learning_data.actual_time IS 'Tempo real do usuário';
COMMENT ON COLUMN learning_data.user_accuracy IS 'Precisão do usuário (0-1)';
COMMENT ON COLUMN learning_data.context IS 'Contexto da palavra';

COMMENT ON COLUMN transcricoes.nome_arquivo IS 'Nome do arquivo de áudio original';
COMMENT ON COLUMN transcricoes.transcricao IS 'Texto completo da transcrição';
COMMENT ON COLUMN transcricoes.tamanho_arquivo IS 'Tamanho do arquivo em bytes';
COMMENT ON COLUMN transcricoes.transcricao_embedding IS 'Embedding vetorial do texto completo da transcrição para busca semântica';
COMMENT ON COLUMN transcricoes.criado_em IS 'Data e hora de criação do registro';

-- =====================================================
-- FUNÇÕES PARA BUSCA VETORIAL
-- =====================================================

-- Função para buscar palavras similares usando embeddings
CREATE OR REPLACE FUNCTION buscar_palavras_similares(
  query_embedding vector(384),
  similarity_threshold float DEFAULT 0.7,
  match_count int DEFAULT 5
)
RETURNS TABLE (
  id bigint,
  word text,
  context text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    wt.id,
    wt.word,
    wt.context,
    1 - (wt.word_embedding <=> query_embedding) as similarity
  FROM word_timestamps wt
  WHERE wt.word_embedding IS NOT NULL
    AND 1 - (wt.word_embedding <=> query_embedding) > similarity_threshold
  ORDER BY wt.word_embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Função para buscar transcrições similares usando embeddings
CREATE OR REPLACE FUNCTION buscar_transcricoes_similares(
  query_embedding vector(384),
  similarity_threshold float DEFAULT 0.7,
  match_count int DEFAULT 5
)
RETURNS TABLE (
  id bigint,
  nome_arquivo text,
  transcricao text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id,
    t.nome_arquivo,
    t.transcricao,
    1 - (t.transcricao_embedding <=> query_embedding) as similarity
  FROM transcricoes t
  WHERE t.transcricao_embedding IS NOT NULL
    AND 1 - (t.transcricao_embedding <=> query_embedding) > similarity_threshold
  ORDER BY t.transcricao_embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Função para buscar dados de aprendizado similares
CREATE OR REPLACE FUNCTION buscar_aprendizado_similar(
  query_embedding vector(384),
  similarity_threshold float DEFAULT 0.7,
  match_count int DEFAULT 5
)
RETURNS TABLE (
  id bigint,
  word text,
  context text,
  user_accuracy float,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ld.id,
    ld.word,
    ld.context,
    ld.user_accuracy,
    1 - (ld.word_embedding <=> query_embedding) as similarity
  FROM learning_data ld
  WHERE ld.word_embedding IS NOT NULL
    AND 1 - (ld.word_embedding <=> query_embedding) > similarity_threshold
  ORDER BY ld.word_embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Comentários para as funções
COMMENT ON FUNCTION buscar_palavras_similares IS 'Busca palavras similares usando similaridade de cosseno com embeddings';
COMMENT ON FUNCTION buscar_transcricoes_similares IS 'Busca transcrições similares usando similaridade de cosseno com embeddings';
COMMENT ON FUNCTION buscar_aprendizado_similar IS 'Busca dados de aprendizado similares usando similaridade de cosseno com embeddings';

-- Comentários para colunas vetoriais
COMMENT ON COLUMN word_timestamps.word_embedding IS 'Embedding vetorial da palavra';
COMMENT ON COLUMN word_timestamps.context_embedding IS 'Embedding vetorial do contexto';
COMMENT ON COLUMN learning_data.word_embedding IS 'Embedding vetorial da palavra para aprendizado';
COMMENT ON COLUMN learning_data.context_embedding IS 'Embedding vetorial do contexto para aprendizado';