# Configuração do Supabase Storage para Arquivos de Áudio

Este documento descreve como configurar o bucket de storage no Supabase para armazenar arquivos de áudio da aplicação.

## Pré-requisitos

- Conta no Supabase
- Projeto criado no Supabase
- Service Role Key configurada no arquivo `.env`

## Passos para Configuração

### 1. Acessar o Dashboard do Supabase

1. Acesse [https://supabase.com](https://supabase.com)
2. Faça login na sua conta
3. Selecione o projeto: `uhzqchkehypuqveijegh`

### 2. Criar o Bucket de Storage

1. No painel lateral, clique em **Storage**
2. Clique em **Create bucket**
3. Configure o bucket com as seguintes informações:
   - **Name**: `audio-files`
   - **Public bucket**: ✅ Marcar como público
   - **File size limit**: 50 MB (ou conforme necessário)
   - **Allowed MIME types**: `audio/*`

### 3. Configurar Políticas de Segurança (RLS)

#### Política para Upload (INSERT)
```sql
CREATE POLICY "Permitir upload de áudio para usuários autenticados" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'audio-files' AND
  auth.role() = 'authenticated'
);
```

#### Política para Leitura (SELECT)
```sql
CREATE POLICY "Permitir leitura pública de áudios" ON storage.objects
FOR SELECT USING (
  bucket_id = 'audio-files'
);
```

#### Política para Exclusão (DELETE)
```sql
CREATE POLICY "Permitir exclusão de áudio pelo proprietário" ON storage.objects
FOR DELETE USING (
  bucket_id = 'audio-files' AND
  auth.uid() = owner
);
```

### 4. Estrutura de Pastas

O serviço criará automaticamente a seguinte estrutura:

```
audio-files/
└── audios/
    ├── audio_1234567890_exemplo.mp3
    ├── audio_1234567891_gravacao.wav
    └── ...
```

### 5. Configuração no Código

O serviço `supabaseStorageService.ts` já está configurado para:

- **Bucket**: `audio-files`
- **Pasta**: `audios/`
- **Nomenclatura**: `audio_{timestamp}_{nome_original}`
- **Cache**: 3600 segundos (1 hora)
- **Upsert**: Desabilitado (não sobrescrever arquivos)

### 6. Variáveis de Ambiente

Certifique-se de que as seguintes variáveis estão configuradas no `.env`:

```env
REACT_APP_SUPABASE_URL=https://uhzqchkehypuqveijegh.supabase.co
REACT_APP_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
REACT_APP_SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Funcionalidades Implementadas

### Upload de Áudio
- Interface drag-and-drop no componente `AudioUploader`
- Barra de progresso durante upload
- Tratamento de erros
- Validação de tipos de arquivo

### Gerenciamento de Arquivos
- Upload com nomenclatura única
- Obtenção de URL pública
- Listagem de arquivos
- Remoção de arquivos

## Limitações e Considerações

### Tamanho de Arquivo
- Limite padrão: 50 MB por arquivo
- Pode ser ajustado nas configurações do bucket

### Tipos de Arquivo Suportados
- Todos os formatos de áudio (`audio/*`)
- MP3, WAV, M4A, OGG, etc.

### Segurança
- Service Role Key permite operações administrativas
- Políticas RLS controlam acesso aos arquivos
- URLs públicas para facilitar reprodução

## Monitoramento

### Logs de Upload
Os uploads são registrados no console do navegador:
```
Upload realizado com sucesso: https://uhzqchkehypuqveijegh.supabase.co/storage/v1/object/public/audio-files/audios/audio_1234567890_exemplo.mp3
```

### Verificação de Status
O serviço verifica automaticamente a conexão:
```typescript
supabaseStorageService.estaConectado() // true/false
```

## Troubleshooting

### Erro: "Bucket não encontrado"
- Verificar se o bucket `audio-files` foi criado
- Confirmar nome exato do bucket

### Erro: "Permissão negada"
- Verificar políticas RLS
- Confirmar Service Role Key

### Erro: "Arquivo muito grande"
- Verificar limite de tamanho do bucket
- Reduzir tamanho do arquivo de áudio

### Erro: "Tipo de arquivo não suportado"
- Verificar se o arquivo é realmente de áudio
- Confirmar MIME type permitido

## Próximos Passos

1. ✅ Configurar bucket `audio-files`
2. ✅ Implementar políticas de segurança
3. ✅ Testar upload de arquivos
4. ⏳ Implementar sincronização com transcrições
5. ⏳ Adicionar histórico de uploads
6. ⏳ Implementar limpeza automática de arquivos antigos