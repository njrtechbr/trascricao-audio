# Configuração do Banco de Dados Supabase

Este diretório contém os scripts SQL necessários para configurar o banco de dados Supabase para a aplicação de transcrição de áudio.

## Pré-requisitos

1. Conta no [Supabase](https://supabase.com)
2. Projeto criado no Supabase
3. Variáveis de ambiente configuradas no arquivo `.env`

## Configuração

### 1. Criar Projeto no Supabase

1. Acesse [supabase.com](https://supabase.com)
2. Faça login ou crie uma conta
3. Clique em "New Project"
4. Escolha sua organização
5. Defina um nome para o projeto (ex: "transcricao-audio")
6. Escolha uma senha forte para o banco de dados
7. Selecione uma região próxima
8. Clique em "Create new project"

### 2. Obter Credenciais

Após criar o projeto:

1. Vá para **Settings** > **API**
2. Copie a **Project URL**
3. Copie a **anon public** key

### 3. Configurar Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto (copie do `.env.example`):

```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anonima-aqui
```

### 4. Executar Scripts SQL

1. No painel do Supabase, vá para **SQL Editor**
2. Clique em "New query"
3. Copie e cole o conteúdo do arquivo `supabase-schema.sql`
4. Clique em "Run" para executar o script

## Estrutura das Tabelas

### `word_timestamps`
Armazena palavras e seus timestamps durante a reprodução:
- `id`: Identificador único
- `word`: A palavra falada
- `timestamp`: Tempo atual da reprodução
- `start_time`: Tempo de início da palavra na transcrição
- `context`: Contexto da frase
- `playback_rate`: Velocidade de reprodução
- `session_id`: ID da sessão
- `created_at`: Data de criação

### `learning_data`
Armazena dados para aprendizado da IA:
- `id`: Identificador único
- `word`: A palavra para aprendizado
- `expected_time`: Tempo esperado pela IA
- `actual_time`: Tempo real do usuário
- `user_accuracy`: Precisão do usuário (0-1)
- `context`: Contexto da palavra
- `created_at`: Data de criação

## Segurança

As tabelas estão configuradas com Row Level Security (RLS) habilitado e políticas que permitem acesso público para demonstração. **Em produção, configure políticas mais restritivas baseadas em autenticação de usuários.**

## Verificação

Após executar os scripts, você pode verificar se as tabelas foram criadas corretamente:

1. Vá para **Table Editor** no painel do Supabase
2. Você deve ver as tabelas `word_timestamps` e `learning_data`
3. Clique em cada tabela para ver sua estrutura

## Troubleshooting

- **Erro de conexão**: Verifique se as variáveis de ambiente estão corretas
- **Erro de permissão**: Verifique se as políticas RLS estão configuradas
- **Tabelas não aparecem**: Execute novamente o script SQL