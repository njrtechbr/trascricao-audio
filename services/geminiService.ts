import { GoogleGenAI } from "@google/genai";
import { config } from '../config';

export const summarizeText = async (text: string, apiKey: string): Promise<string> => {
    if (!apiKey) {
         throw new Error("A chave de API do Gemini não foi configurada.");
    }
    
    const ai = new GoogleGenAI({ apiKey });

    if (!text) {
        throw new Error("O texto de entrada não pode estar vazio.");
    }

    try {
        const prompt = `Você é um especialista em resumos. Analise a seguinte transcrição de áudio e forneça um resumo conciso e de fácil leitura em português do Brasil. Use marcadores para os tópicos principais.

        TRANSCRIÇÃO:
        ---
        ${text}
        ---

        RESUMO:`;

        const response = await ai.models.generateContent({
            model: config.modelName,
            contents: prompt,
        });

        return response.text;
    } catch (error) {
        console.error("Erro ao resumir o texto com o Gemini:", error);
        const errorMessage = error instanceof Error ? error.message : "Ocorreu um erro desconhecido.";
         if (typeof errorMessage === 'string' && errorMessage.includes('API key not valid')) {
            throw new Error('A chave de API fornecida é inválida. Verifique-a nas configurações.');
        }
        throw new Error("Falha ao gerar o resumo da API Gemini.");
    }
};