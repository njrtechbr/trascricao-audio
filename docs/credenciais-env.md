# Configuração de Credenciais (.env)

Este documento detalha todas as credenciais necessárias para configurar o projeto de transcrição de áudio com IA. As credenciais devem ser configuradas no arquivo `.env` na raiz do projeto.

## 📋 Arquivo de Configuração

Copie o arquivo `.env.example` para `.env` e configure as credenciais conforme descrito abaixo:

```bash
cp .env.example .env
```

## 🔑 Credenciais Obrigatórias

### 1. Anthropic API Key
```env
ANTHROPIC_API_KEY="your_anthropic_api_key_here"
```

**Status**: ✅ **OBRIGATÓRIO**

**Descrição**: Chave de API da Anthropic para usar modelos Claude.

**Como Obter**:
1. Acesse [console.anthropic.com](https://console.anthropic.com)
2. Faça login ou crie uma conta
3. Vá para "API Keys" no menu
4. Clique em "Create Key"
5. Copie a chave gerada

**Formato**: `sk-ant-api03-...`

**Custo**: Pago por uso (consulte preços na Anthropic)

---

### 2. Hugging Face API Key
```env
VITE_HUGGINGFACE_API_KEY="your_huggingface_api_key"
```

**Status**: ✅ **OBRIGATÓRIO** (para funcionalidades de embedding)

**Descrição**: Chave de API do Hugging Face para processamento de embeddings de texto.

**Como Obter**:
1. Acesse [huggingface.co](https://huggingface.co)
2. Crie uma conta ou faça login
3. Vá para "Settings" → "Access Tokens"
4. Clique em "New token"
5. Escolha "Read" como tipo de token
6. Copie o token gerado

**Formato**: `hf_...`

**Custo**: Gratuito com limites, pago para uso intensivo

---

### 3. Supabase Configuration
```env
VITE_SUPABASE_URL="your_supabase_project_url"
VITE_SUPABASE_ANON_KEY="your_supabase_anon_key"
```

**Status**: ✅ **OBRIGATÓRIO** (para banco de dados vetorial)

**Descrição**: Configurações do Supabase para armazenamento de dados e busca vetorial.

**Como Obter**:
1. Acesse [supabase.com](https://supabase.com)
2. Crie uma conta ou faça login
3. Crie um novo projeto
4. Vá para "Settings" → "API"
5. Copie a "Project URL" e "anon public" key

**Formatos**:
- URL: `https://xyzcompany.supabase.co`
- Key: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

**Custo**: Gratuito até 500MB, pago para projetos maiores

**Configuração Adicional**:
- Execute os scripts SQL em `database/supabase-schema.sql`
- Configure o storage conforme `database/supabase-storage-setup.md`

## 🔧 Credenciais Opcionais

### 4. Perplexity API Key
```env
PERPLEXITY_API_KEY="your_perplexity_api_key_here"
```

**Status**: 🔶 **OPCIONAL**

**Descrição**: Para usar modelos Perplexity AI.

**Como Obter**:
1. Acesse [perplexity.ai](https://www.perplexity.ai)
2. Crie uma conta e acesse a seção de API
3. Gere uma nova chave de API

**Formato**: `pplx-...`

---

### 5. OpenAI API Key
```env
OPENAI_API_KEY="your_openai_api_key_here"
```

**Status**: 🔶 **OPCIONAL**

**Descrição**: Para usar modelos GPT da OpenAI.

**Como Obter**:
1. Acesse [platform.openai.com](https://platform.openai.com)
2. Faça login ou crie uma conta
3. Vá para "API keys"
4. Clique em "Create new secret key"

**Formato**: `sk-proj-...`

---

### 6. Google API Key
```env
GOOGLE_API_KEY="your_google_api_key_here"
```

**Status**: 🔶 **OPCIONAL**

**Descrição**: Para usar modelos Google Gemini.

**Como Obter**:
1. Acesse [console.cloud.google.com](https://console.cloud.google.com)
2. Crie um projeto ou selecione um existente
3. Ative a API do Gemini
4. Crie credenciais de API

---

### 7. Mistral AI API Key
```env
MISTRAL_API_KEY="your_mistral_key_here"
```

**Status**: 🔶 **OPCIONAL**

**Descrição**: Para usar modelos Mistral AI.

**Como Obter**:
1. Acesse [console.mistral.ai](https://console.mistral.ai)
2. Crie uma conta
3. Gere uma chave de API

---

### 8. xAI API Key
```env
XAI_API_KEY="YOUR_XAI_KEY_HERE"
```

**Status**: 🔶 **OPCIONAL**

**Descrição**: Para usar modelos xAI (Grok).

**Como Obter**:
1. Acesse [x.ai](https://x.ai)
2. Solicite acesso à API
3. Gere uma chave quando aprovado

---

### 9. Groq API Key
```env
GROQ_API_KEY="YOUR_GROQ_KEY_HERE"
```

**Status**: 🔶 **OPCIONAL**

**Descrição**: Para usar modelos Groq (inferência rápida).

**Como Obter**:
1. Acesse [console.groq.com](https://console.groq.com)
2. Crie uma conta
3. Gere uma chave de API

---

### 10. OpenRouter API Key
```env
OPENROUTER_API_KEY="YOUR_OPENROUTER_KEY_HERE"
```

**Status**: 🔶 **OPCIONAL**

**Descrição**: Para acessar múltiplos modelos via OpenRouter.

**Como Obter**:
1. Acesse [openrouter.ai](https://openrouter.ai)
2. Crie uma conta
3. Gere uma chave de API

---

### 11. Azure OpenAI API Key
```env
AZURE_OPENAI_API_KEY="your_azure_key_here"
```

**Status**: 🔶 **OPCIONAL**

**Descrição**: Para usar modelos OpenAI via Azure.

**Como Obter**:
1. Acesse [portal.azure.com](https://portal.azure.com)
2. Crie um recurso Azure OpenAI
3. Obtenha a chave e endpoint
4. Configure o endpoint em `.taskmaster/config.json`

---

### 12. Ollama API Key
```env
OLLAMA_API_KEY="your_ollama_api_key_here"
```

**Status**: 🔶 **OPCIONAL**

**Descrição**: Para servidores Ollama remotos que requerem autenticação.

**Como Obter**:
- Configure conforme a documentação do seu servidor Ollama

---

### 13. GitHub API Key
```env
GITHUB_API_KEY="your_github_api_key_here"
```

**Status**: 🔶 **OPCIONAL**

**Descrição**: Para funcionalidades de importação/exportação do GitHub.

**Como Obter**:
1. Acesse [github.com/settings/tokens](https://github.com/settings/tokens)
2. Clique em "Generate new token"
3. Selecione as permissões necessárias
4. Copie o token gerado

**Formato**: `ghp_...` ou `github_pat_...`

## 🚀 Configuração Rápida

### Configuração Mínima (Funcionalidades Básicas)
```env
# Obrigatórias
ANTHROPIC_API_KEY="sk-ant-api03-..."
VITE_HUGGINGFACE_API_KEY="hf_..."
VITE_SUPABASE_URL="https://seu-projeto.supabase.co"
VITE_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIs..."
```

### Configuração Completa (Todas as Funcionalidades)
```env
# Obrigatórias
ANTHROPIC_API_KEY="sk-ant-api03-..."
VITE_HUGGINGFACE_API_KEY="hf_..."
VITE_SUPABASE_URL="https://seu-projeto.supabase.co"
VITE_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIs..."

# Opcionais (adicione conforme necessário)
OPENAI_API_KEY="sk-proj-..."
GOOGLE_API_KEY="..."
PERPLEXITY_API_KEY="pplx-..."
```

## 🔒 Segurança

### ⚠️ Importantes Considerações de Segurança

1. **NUNCA** commite o arquivo `.env` no Git
2. **SEMPRE** use o arquivo `.env.example` como template
3. **MANTENHA** suas chaves privadas e seguras
4. **ROTACIONE** as chaves periodicamente
5. **MONITORE** o uso das APIs para detectar uso não autorizado

### 🛡️ Boas Práticas

- Use variáveis de ambiente diferentes para desenvolvimento e produção
- Configure limites de uso nas APIs quando possível
- Monitore logs de acesso às APIs
- Use ferramentas como `dotenv-vault` para gerenciamento seguro

## 🆘 Solução de Problemas

### Erro: "API Key não encontrada"
1. Verifique se o arquivo `.env` existe na raiz do projeto
2. Confirme se a variável está corretamente nomeada
3. Reinicie a aplicação após adicionar novas variáveis

### Erro: "Unauthorized" ou "Invalid API Key"
1. Verifique se a chave foi copiada corretamente (sem espaços)
2. Confirme se a chave não expirou
3. Verifique se você tem créditos/quota disponível na API

### Erro: "Supabase connection failed"
1. Verifique se a URL do projeto está correta
2. Confirme se a chave anônima está válida
3. Verifique se o projeto Supabase está ativo
4. Execute os scripts de configuração do banco de dados

## 📞 Suporte

Para problemas específicos:
1. Consulte a documentação oficial de cada provedor
2. Verifique os logs da aplicação
3. Teste as credenciais individualmente
4. Consulte a seção de troubleshooting no README.md

---

**Última Atualização**: Janeiro 2025
**Versão**: 1.1.0
