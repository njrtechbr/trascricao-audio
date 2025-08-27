# Documentação do Uso do Supabase

## Visão Geral

Este documento detalha como o Supabase está sendo utilizado no projeto de transcrição de áudio com IA, incluindo estrutura do banco de dados, configurações, extensões e recomendações de segurança e performance.

## Configuração do Projeto

### Informações de Conexão
- **URL do Projeto**: `https://uhzqchkehypuqveijegh.supabase.co`
- **Chave Anônima**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVoenFjaGtlaHlwdXF2ZWlqZWdoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQzNzIzODUsImV4cCI6MjA2OTk0ODM4NX0.UPid4S7dfszKpgbEEscu-Jr-os1adzBG4_iRTk0ZkfE`

## Estrutura do Banco de Dados

### Schema Public

O projeto utiliza três tabelas principais no schema `public`:

#### 1. Tabela `transcricoes`

**Descrição**: Armazena as transcrições de áudio processadas pelo sistema.

**Colunas**:
- `id` (uuid, PK): Identificador único da transcrição
- `nome_arquivo` (text): Nome do arquivo de áudio original
- `transcricao` (text): Texto da transcrição
- `criado_em` (timestamp with time zone): Data e hora de criação
- `atualizado_em` (timestamp with time zone): Data e hora da última atualização
- `embedding` (vector(1536)): Vetor de embedding para busca semântica
- `duracao` (numeric): Duração do áudio em segundos
- `tamanho_arquivo` (bigint): Tamanho do arquivo em bytes
- `status` (text): Status do processamento
- `metadados` (jsonb): Metadados adicionais em formato JSON

**Índices**:
- `transcricoes_pkey` (PRIMARY KEY)
- `idx_transcricoes_nome_arquivo` (btree)
- `idx_transcricoes_criado_em` (btree)
- `idx_transcricoes_embedding` (hnsw) - Para busca vetorial

#### 2. Tabela `word_timestamps`

**Descrição**: Armazena informações detalhadas sobre palavras individuais nas transcrições, incluindo timestamps e embeddings.

**Colunas**:
- `id` (uuid, PK): Identificador único
- `transcricao_id` (uuid, FK): Referência à transcrição
- `word` (text): A palavra
- `start_time` (numeric): Tempo de início da palavra
- `end_time` (numeric): Tempo de fim da palavra
- `confidence` (numeric): Nível de confiança da transcrição
- `session_id` (text): Identificador da sessão
- `timestamp` (timestamp with time zone): Timestamp de criação
- `word_embedding` (vector(1536)): Embedding da palavra
- `context_embedding` (vector(1536)): Embedding do contexto

**Índices**:
- `word_timestamps_pkey` (PRIMARY KEY)
- `idx_word_timestamps_word` (btree)
- `idx_word_timestamps_timestamp` (btree)
- `idx_word_timestamps_session` (btree)
- `idx_word_timestamps_word_embedding` (hnsw)
- `idx_word_timestamps_context_embedding` (hnsw)

**Relacionamentos**:
- FK: `transcricao_id` → `transcricoes.id`

#### 3. Tabela `learning_data`

**Descrição**: Armazena dados de aprendizado para melhorar a precisão do sistema de transcrição.

**Colunas**:
- `id` (uuid, PK): Identificador único
- `word` (text): Palavra de referência
- `context` (text): Contexto da palavra
- `correct_transcription` (text): Transcrição correta
- `frequency` (integer): Frequência de uso
- `created_at` (timestamp with time zone): Data de criação
- `updated_at` (timestamp with time zone): Data de atualização
- `word_embedding` (vector(1536)): Embedding da palavra
- `context_embedding` (vector(1536)): Embedding do contexto

**Índices**:
- `learning_data_pkey` (PRIMARY KEY)
- `idx_learning_data_word_embedding` (hnsw)
- `idx_learning_data_context_embedding` (hnsw)

### Funções do Banco de Dados

O projeto utiliza três funções personalizadas para busca semântica:

1. **`buscar_palavras_similares`**: Busca palavras similares usando embeddings
2. **`buscar_aprendizado_similar`**: Busca dados de aprendizado similares
3. **`buscar_transcricoes_similares`**: Busca transcrições similares

## Extensões Instaladas

O projeto utiliza as seguintes extensões do PostgreSQL:

### Extensões Ativas
- **`uuid-ossp`** (v1.1): Geração de UUIDs
- **`pgcrypto`** (v1.3): Funções criptográficas
- **`pg_stat_statements`** (v1.11): Estatísticas de consultas SQL
- **`pg_graphql`** (v1.5.11): Suporte ao GraphQL
- **`vector`** (v0.8.0): Suporte a vetores para IA/ML
- **`supabase_vault`** (v0.3.1): Gerenciamento de segredos
- **`plpgsql`** (v1.0): Linguagem procedural

### Extensões Disponíveis (não instaladas)
- `postgis`: Dados geoespaciais
- `pg_cron`: Agendamento de tarefas
- `pgjwt`: Tokens JWT
- `http`: Cliente HTTP
- E muitas outras...

## Uso do Storage (S3)

### Schema Storage

O projeto utiliza o sistema de storage do Supabase para armazenamento de arquivos:

#### Tabelas do Storage
- **`buckets`**: Configuração de buckets de armazenamento
- **`objects`**: Metadados dos objetos armazenados
- **`migrations`**: Controle de migrações do storage
- **`s3_multipart_uploads`**: Uploads multipart do S3
- **`s3_multipart_uploads_parts`**: Partes dos uploads multipart

### Configuração de Buckets

O storage é utilizado para:
- Armazenamento de arquivos de áudio originais
- Cache de arquivos processados
- Backup de dados

## Segurança e Compliance

### Avisos de Segurança

O sistema de linting do Supabase identificou os seguintes avisos de segurança:

#### ⚠️ Function Search Path Mutable

**Funções Afetadas**:
- `public.buscar_palavras_similares`
- `public.buscar_aprendizado_similar`
- `public.buscar_transcricoes_similares`

**Problema**: As funções não têm o parâmetro `search_path` definido, o que pode representar um risco de segurança.

**Solução Corrigida**: Definir explicitamente o `search_path` nas funções para evitar ataques de injeção de schema. Execute os seguintes comandos SQL para corrigir o problema:

```sql
-- Exemplo de correção para uma função (repita para todas as funções afetadas)
ALTER FUNCTION public.buscar_palavras_similares(text) SET search_path = 'public';
ALTER FUNCTION public.buscar_aprendizado_similar(text) SET search_path = 'public';
ALTER FUNCTION public.buscar_transcricoes_similares(text) SET search_path = 'public';
```

**Documentação**: [Function Search Path Mutable](https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable)

### Recomendações de Segurança

1. **Configurar RLS (Row Level Security)** em todas as tabelas públicas
2. **Definir políticas de acesso** baseadas em roles de usuário
3. **Corrigir o search_path** das funções personalizadas (conforme acima)
4. **Implementar auditoria** de operações sensíveis
5. **Configurar backup automático** dos dados críticos

## Performance e Otimização

### Avisos de Performance

O sistema identificou vários índices não utilizados que podem ser removidos para otimizar performance:

#### 📊 Índices Não Utilizados

**Tabela `word_timestamps`**:
- `idx_word_timestamps_word`
- `idx_word_timestamps_timestamp`
- `idx_word_timestamps_session`
- `idx_word_timestamps_word_embedding`
- `idx_word_timestamps_context_embedding`

**Tabela `transcricoes`**:
- `idx_transcricoes_nome_arquivo`
- `idx_transcricoes_criado_em`
- `idx_transcricoes_embedding`

**Tabela `learning_data`**:
- `idx_learning_data_word_embedding`
- `idx_learning_data_context_embedding`

**Ação Recomendada:**
Após uma análise cuidadosa para confirmar que os seguintes índices não são utilizados em nenhuma consulta crítica ou ad-hoc, recomenda-se a sua remoção para melhorar a performance de escrita.

```sql
-- Template para remover um índice:
DROP INDEX IF EXISTS public.<nome_do_indice>;

-- Exemplo:
DROP INDEX IF EXISTS public.idx_word_timestamps_word;
```

### Recomendações de Performance

1. **Avaliar e remover** os índices não utilizados (conforme acima)
2. **Monitorar consultas** usando `pg_stat_statements`
3. **Implementar cache** para consultas frequentes
4. **Otimizar consultas vetoriais** para melhor performance de busca semântica

## Monitoramento e Logs

### Ferramentas Disponíveis

- **Database Linter**: Análise automática de segurança e performance
- **pg_stat_statements**: Estatísticas detalhadas de consultas
- **Logs do Supabase**: Monitoramento em tempo real
- **Métricas de Storage**: Uso de espaço e transferência

### Logs por Serviço

- `api`: Logs da API REST
- `auth`: Logs de autenticação
- `postgres`: Logs do banco de dados
- `storage`: Logs do sistema de arquivos
- `realtime`: Logs de sincronização em tempo real
- `edge-function`: Logs de funções serverless

## Migrações

### Status Atual

Atualmente não há migrações registradas no sistema, indicando que a estrutura do banco foi criada diretamente ou através de outros métodos.

### Recomendações

1. **Implementar controle de migrações** para mudanças futuras
2. **Documentar mudanças** de schema
3. **Usar versionamento** para rollbacks seguros
4. **Testar migrações** em ambiente de desenvolvimento

## Integração com a Aplicação

### Serviços Utilizados

1. **supabaseService.ts**: Serviço principal de integração
2. **queueService.ts**: Sistema de filas para operações
3. **embeddingService.ts**: Processamento de embeddings

### Funcionalidades Implementadas

- ✅ Upload e processamento de arquivos de áudio
- ✅ Transcrição com timestamps detalhados
- ✅ Busca semântica usando embeddings
- ✅ Sistema de aprendizado adaptativo
- ✅ Cache e otimização de consultas
- ✅ Sistema de filas para controle de requisições

## Próximos Passos

### Melhorias de Segurança
1. Implementar RLS em todas as tabelas
2. Corrigir search_path das funções
3. Configurar políticas de acesso granulares

### Otimizações de Performance
1. Revisar e remover índices não utilizados
2. Implementar cache de consultas frequentes
3. Otimizar consultas vetoriais

### Funcionalidades Futuras
1. Implementar backup automático
2. Adicionar métricas de uso
3. Configurar alertas de performance
4. Implementar auditoria completa

---

**Última Atualização**: Janeiro 2025
**Versão do Supabase**: Mais recente
**Ambiente**: Produção