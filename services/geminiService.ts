import { GoogleGenAI } from "@google/genai";
import { config } from '../config';

export const summarizeText = async (text: string, apiKey: string): Promise<string> => {
    const startTime = Date.now();
    console.log(`📝 [RESUMO] Iniciando geração de resumo`);
    console.log(`📊 [RESUMO] Detalhes do texto:`, {
        tamanho: text.length,
        palavras: text.split(' ').length,
        linhas: text.split('\n').length,
        primeiros100Chars: text.substring(0, 100) + (text.length > 100 ? '...' : '')
    });

    if (!apiKey) {
        console.error(`❌ [RESUMO] Erro: Chave de API não configurada`);
        throw new Error("A chave de API do Gemini não foi configurada.");
    }
    
    console.log(`🔑 [RESUMO] Chave de API configurada (${apiKey.substring(0, 10)}...)`);
    const ai = new GoogleGenAI({ apiKey });

    if (!text) {
        console.error(`❌ [RESUMO] Erro: Texto de entrada vazio`);
        throw new Error("O texto de entrada não pode estar vazio.");
    }

    console.log(`✅ [RESUMO] Validações aprovadas`);

    try {
        const prompt = `Você é um especialista em resumos. Analise a seguinte transcrição de áudio e forneça um resumo conciso e de fácil leitura em português do Brasil. Use marcadores para os tópicos principais.

        TRANSCRIÇÃO:
        ---
        ${text}
        ---

        RESUMO:`;

        console.log(`🚀 [RESUMO] Enviando requisição para API Gemini...`);
        console.log(`🔧 [RESUMO] Modelo utilizado: ${config.modelName}`);
        console.log(`📏 [RESUMO] Tamanho do prompt: ${prompt.length} caracteres`);

        const response = await ai.models.generateContent({
            model: config.modelName,
            contents: prompt,
        });

        console.log(`✅ [RESUMO] Resposta recebida da API Gemini`);
        const resumo = response.text;
        
        const endTime = Date.now();
        const duration = (endTime - startTime) / 1000;
        
        console.log(`🎉 [RESUMO] Resumo gerado com sucesso!`);
        console.log(`📊 [RESUMO] Estatísticas finais:`, {
            tamanhoResumo: resumo.length,
            palavrasResumo: resumo.split(' ').length,
            tempoProcessamento: `${duration?.toFixed(2) || '0.00'}s`,
            primeiros100CharsResumo: resumo.substring(0, 100) + (resumo.length > 100 ? '...' : '')
        });

        return resumo;
    } catch (error) {
        const endTime = Date.now();
        const duration = (endTime - startTime) / 1000;
        
        console.error(`❌ [RESUMO] Erro durante a geração do resumo:`, error);
        console.error(`⏱️ [RESUMO] Tempo decorrido até o erro: ${duration?.toFixed(2) || '0.00'}s`);
        
        const errorMessage = error instanceof Error ? error.message : "Ocorreu um erro desconhecido.";
        
        console.error(`📋 [RESUMO] Detalhes do erro:`, {
            tipo: error instanceof Error ? error.constructor.name : typeof error,
            mensagem: errorMessage,
            stack: error instanceof Error ? error.stack : 'N/A',
            tamanhoTexto: text.length
        });
        
        if (typeof errorMessage === 'string' && errorMessage.includes('API key not valid')) {
            console.error(`🔑 [RESUMO] Erro de autenticação: Chave de API inválida`);
            throw new Error('A chave de API fornecida é inválida. Verifique-a nas configurações.');
        }
        
        if (typeof errorMessage === 'string' && errorMessage.includes('quota')) {
            console.error(`💰 [RESUMO] Erro de quota: Limite da API excedido`);
            throw new Error('Limite de uso da API excedido. Tente novamente mais tarde.');
        }
        
        if (typeof errorMessage === 'string' && errorMessage.includes('network')) {
            console.error(`🌐 [RESUMO] Erro de rede: Problema de conectividade`);
            throw new Error('Erro de conectividade. Verifique sua conexão com a internet.');
        }
        
        console.error(`💥 [RESUMO] Erro geral na geração do resumo`);
        throw new Error(`Falha ao gerar o resumo: ${errorMessage}`);
    }
};