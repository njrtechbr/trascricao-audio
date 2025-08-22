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

export const transcribe = async (audioFile: File, apiKey: string): Promise<WordTimestamp[]> => {
    console.log(`Transcrevendo ${audioFile.name} com a API Gemini...`);

    if (!apiKey) {
         throw new Error("A chave de API do Gemini não foi configurada.");
    }
    
    const ai = new GoogleGenAI({ apiKey });

    // Basic validation
    if (!audioFile.type.startsWith('audio/')) {
        throw new Error('Tipo de arquivo inválido. Por favor, envie um arquivo de áudio.');
    }

    try {
        const audioPart = await fileToGenerativePart(audioFile);
        const textPart = { text: "Transcreva este áudio para texto em português do Brasil. Para cada palavra, forneça seu tempo de início e fim. Se houver partes inaudíveis, use a palavra `[áudio inaudível]`." };

        const response = await ai.models.generateContent({
            model: config.modelName,
            contents: { parts: [audioPart, textPart] },
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
                                },
                                required: ["word", "startTime", "endTime"],
                            },
                        },
                    },
                    required: ["transcription"],
                },
            }
        });

        const jsonString = response.text.trim();
        const result = JSON.parse(jsonString);

        if (!result.transcription || result.transcription.length === 0) {
             throw new Error("A API retornou uma transcrição vazia. O áudio pode estar sem som ou em um formato não suportado.");
        }

        return result.transcription;
    } catch (error) {
        console.error("Erro ao transcrever o áudio com o Gemini:", error);
        const errorMessage = error instanceof Error ? error.message : "Ocorreu um erro desconhecido.";
        // Check for common API key error
        if (typeof errorMessage === 'string' && errorMessage.includes('API key not valid')) {
            throw new Error('A chave de API fornecida é inválida. Verifique-a nas configurações.');
        }
        throw new Error(`Falha ao transcrever o áudio com a API Gemini. ${errorMessage}`);
    }
};