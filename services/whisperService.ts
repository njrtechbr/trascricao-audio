import { GoogleGenAI, Type } from "@google/genai";
import { config } from '../config';
import { WordTimestamp } from "../types";

// Helper function to convert a File object to a base64 string and format for the API
const fileToGenerativePart = async (file: File) => {
    const base64EncodedDataPromise = new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            if (typeof reader.result === 'string') {
                // The result includes the data URI prefix (e.g., "data:audio/mpeg;base64,"),
                // which needs to be removed.
                const base64Data = reader.result.split(',')[1];
                if (base64Data) {
                    resolve(base64Data);
                } else {
                    reject(new Error("Falha ao ler o arquivo como base64."));
                }
            } else {
                 reject(new Error("Tipo de resultado de FileReader inesperado."));
            }
        };
        reader.onerror = (error) => {
            reject(error);
        };
        reader.readAsDataURL(file);
    });

    return {
        inlineData: {
            data: await base64EncodedDataPromise,
            mimeType: file.type,
        },
    };
};

export const transcribe = async (audioSource: File | string, apiKey: string): Promise<WordTimestamp[]> => {
    // Agora é possível receber tanto um objeto File quanto uma URL (string) de um arquivo hospedado (ex.: Supabase Storage)
    let audioFile: File;

    // Caso seja fornecida uma URL, baixar o arquivo e criar um objeto File para processar normalmente
    if (typeof audioSource === 'string') {
        console.log(`🌐 [TRANSCRIÇÃO] Baixando arquivo de áudio da URL: ${audioSource}`);
        const respostaDownload = await fetch(audioSource);
        if (!respostaDownload.ok) {
            throw new Error(`Falha ao baixar o áudio da URL fornecida. Status: ${respostaDownload.status}`);
        }
        const blobAudio = await respostaDownload.blob();
        const tipoMime = blobAudio.type || 'audio/mpeg';
        const extensao = tipoMime.split('/')[1] || 'mpeg';
        audioFile = new File([blobAudio], `audio.${extensao}`, { type: tipoMime });
    } else {
        audioFile = audioSource;
    }

    const startTime = Date.now();
    console.log(`🎵 [TRANSCRIÇÃO] Iniciando transcrição do arquivo: ${audioFile.name}`);
    console.log(`📊 [TRANSCRIÇÃO] Detalhes do arquivo:`, {
        nome: audioFile.name,
        tamanho: `${(audioFile.size / 1024 / 1024).toFixed(2)} MB`,
        tipo: audioFile.type,
        ultimaModificacao: new Date(audioFile.lastModified).toLocaleString('pt-BR')
    });

    if (!apiKey) {
        console.error(`❌ [TRANSCRIÇÃO] Erro: Chave de API não configurada`);
        throw new Error("A chave de API do Gemini não foi configurada.");
    }
    
    console.log(`🔑 [TRANSCRIÇÃO] Chave de API configurada (${apiKey.substring(0, 10)}...)`);
    const ai = new GoogleGenAI({ apiKey });

    // Basic validation
    if (!audioFile.type.startsWith('audio/')) {
        console.error(`❌ [TRANSCRIÇÃO] Erro: Tipo de arquivo inválido - ${audioFile.type}`);
        throw new Error('Tipo de arquivo inválido. Por favor, envie um arquivo de áudio.');
    }

    console.log(`✅ [TRANSCRIÇÃO] Validação do arquivo aprovada`);

    try {
        console.log(`🔄 [TRANSCRIÇÃO] Convertendo arquivo para base64...`);
        const audioPart = await fileToGenerativePart(audioFile);
        console.log(`✅ [TRANSCRIÇÃO] Conversão para base64 concluída`);
        const textPart = { 
            text: `Transcreva este áudio para texto em português do Brasil com máxima precisão nos timestamps.

IMPORTANTE: Retorne APENAS um JSON válido no seguinte formato:
{
  "transcricao": [
    {
      "startTime": 0.0,
      "endTime": 1.5,
      "word": "primeira"
    },
    {
      "startTime": 1.5,
      "endTime": 2.8,
      "word": "palavra"
    }
  ]
}

Regras:
- Cada palavra deve ter seu timestamp preciso
- Use números decimais para os tempos (em segundos)
- Mantenha a ordem cronológica
- Não inclua texto adicional, apenas o JSON
- Se não conseguir transcrever, retorne: {"transcricao": [], "erro": "motivo"}`
        };

        console.log(`🚀 [TRANSCRIÇÃO] Enviando requisição para API Gemini...`);
        console.log(`🔧 [TRANSCRIÇÃO] Modelo utilizado: ${config.modelName}`);
        
        const response = await ai.models.generateContent({
            model: config.modelName,
            contents: [audioPart, textPart],
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        transcription: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    word: { type: Type.STRING },
                                    startTime: { type: Type.NUMBER },
                                    endTime: { type: Type.NUMBER },
                                    confidence: { type: Type.NUMBER },
                                    speaker: { type: Type.STRING },
                                },
                                required: ["word", "startTime", "endTime"],
                            },
                        },
                    },
                    required: ["transcription"],
                },
            }
        });

        console.log(`✅ [TRANSCRIÇÃO] Resposta recebida da API Gemini`);
        const jsonString = response.text.trim();
        console.log(`📝 [TRANSCRIÇÃO] Resposta bruta da API:`, jsonString);

        // Parse JSON response
        console.log(`🔍 [TRANSCRIÇÃO] Iniciando parse da resposta JSON...`);
        let result;
        try {
            result = JSON.parse(jsonString);
            console.log(`✅ [TRANSCRIÇÃO] Parse JSON bem-sucedido`);
            console.log(`📊 [TRANSCRIÇÃO] Estrutura da resposta:`, {
                temTranscription: !!result.transcription,
                tipoTranscription: Array.isArray(result.transcription) ? 'array' : typeof result.transcription,
                quantidadePalavras: Array.isArray(result.transcription) ? result.transcription.length : 0,
                temErro: !!result.erro
            });
        } catch (parseError) {
            console.error(`❌ [TRANSCRIÇÃO] Erro ao fazer parse da resposta JSON:`, parseError);
            console.error(`📝 [TRANSCRIÇÃO] Resposta que causou erro:`, jsonString);
            throw new Error('Resposta da API não está em formato JSON válido');
        }

        if (result.erro) {
            console.error(`❌ [TRANSCRIÇÃO] Erro retornado pela API:`, result.erro);
            throw new Error(`Erro na transcrição: ${result.erro}`);
        }

        if (!result.transcription || !Array.isArray(result.transcription)) {
            console.error(`❌ [TRANSCRIÇÃO] Formato de resposta inválido:`, {
                temTranscription: !!result.transcription,
                tipoTranscription: typeof result.transcription,
                estruturaCompleta: result
            });
            throw new Error('Formato de resposta inválido: transcription não encontrada ou não é um array');
        }

        if (result.transcription.length === 0) {
            console.warn(`⚠️ [TRANSCRIÇÃO] Transcrição vazia retornada`);
            throw new Error("A API retornou uma transcrição vazia. O áudio pode estar sem som ou em um formato não suportado.");
        }

        const endTime = Date.now();
        const duration = (endTime - startTime) / 1000;
        console.log(`🎉 [TRANSCRIÇÃO] Transcrição concluída com sucesso!`);
        console.log(`📊 [TRANSCRIÇÃO] Estatísticas finais:`, {
            palavrasTranscritas: result.transcription.length,
            tempoProcessamento: `${duration.toFixed(2)}s`,
            primeirasPalavras: result.transcription.slice(0, 5).map(w => w.word).join(' '),
            duracaoAudio: result.transcription.length > 0 && result.transcription[result.transcription.length - 1]?.endTime ? 
                `${result.transcription[result.transcription.length - 1].endTime.toFixed(2)}s` : '0s'
        });

        return result.transcription;
    } catch (error) {
        const endTime = Date.now();
        const duration = (endTime - startTime) / 1000;
        
        console.error(`❌ [TRANSCRIÇÃO] Erro durante o processo de transcrição:`, error);
        console.error(`⏱️ [TRANSCRIÇÃO] Tempo decorrido até o erro: ${duration?.toFixed(2) || '0.00'}s`);
        
        const errorMessage = error instanceof Error ? error.message : "Ocorreu um erro desconhecido.";
        
        console.error(`📋 [TRANSCRIÇÃO] Detalhes do erro:`, {
            tipo: error instanceof Error ? error.constructor.name : typeof error,
            mensagem: errorMessage,
            stack: error instanceof Error ? error.stack : 'N/A',
            arquivo: audioFile.name,
            tamanhoArquivo: `${(audioFile.size / 1024 / 1024).toFixed(2)} MB`
        });
        
        if (typeof errorMessage === 'string' && errorMessage.includes('API key not valid')) {
            console.error(`🔑 [TRANSCRIÇÃO] Erro de autenticação: Chave de API inválida`);
            throw new Error('A chave de API fornecida é inválida. Verifique-a nas configurações.');
        }
        
        if (typeof errorMessage === 'string' && errorMessage.includes('quota')) {
            console.error(`💰 [TRANSCRIÇÃO] Erro de quota: Limite da API excedido`);
            throw new Error('Limite de uso da API excedido. Tente novamente mais tarde.');
        }
        
        if (typeof errorMessage === 'string' && errorMessage.includes('network')) {
            console.error(`🌐 [TRANSCRIÇÃO] Erro de rede: Problema de conectividade`);
            throw new Error('Erro de conectividade. Verifique sua conexão com a internet.');
        }
        
        console.error(`💥 [TRANSCRIÇÃO] Erro geral na transcrição`);
        throw new Error(`Falha ao transcrever o áudio: ${errorMessage}`);
    }
};