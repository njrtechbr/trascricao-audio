import { GoogleGenerativeAI } from "@google/generative-ai";
import { config } from '../config';

type SummarizeResult = {
    success: boolean;
    data: string | null;
    error: string | null;
};

export const summarizeText = async (text: string, apiKey: string): Promise<SummarizeResult> => {
    const startTime = Date.now();
    console.log(`📝 [RESUMO] Iniciando geração de resumo`);
    console.log(`📊 [RESUMO] Detalhes do texto:`, {
        tamanho: text?.length || 0,
        palavras: text?.split(' ').length || 0,
        linhas: text?.split('\n').length || 0,
        primeiros100Chars: text?.substring(0, 100) + (text?.length > 100 ? '...' : '')
    });

    if (!apiKey) {
        const errorMsg = "A chave de API do Gemini não foi configurada.";
        console.error(`❌ [RESUMO] Erro: ${errorMsg}`);
        return { success: false, data: null, error: errorMsg };
    }
    
    console.log(`🔑 [RESUMO] Chave de API configurada (${apiKey.substring(0, 10)}...)`);
    const genAI = new GoogleGenerativeAI(apiKey);

    if (!text || text.trim().length === 0) {
        const errorMsg = "O texto de entrada não pode estar vazio.";
        console.error(`❌ [RESUMO] Erro: ${errorMsg}`);
        return { success: false, data: null, error: errorMsg };
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

        const model = genAI.getGenerativeModel({ model: config.modelName });
        const result = await model.generateContent(prompt);
        const response = await result.response;

        console.log(`✅ [RESUMO] Resposta recebida da API Gemini`);
        // Log the full response for debugging purposes
        console.log(`🔍 [RESUMO] Resposta completa da API:`, JSON.stringify(response, null, 2));

        const resumo = response.text();

        if (!resumo || typeof resumo !== 'string' || resumo.trim().length === 0) {
            console.error('❌ [RESUMO] A API não retornou um resumo válido.', resumo);
            return { success: false, data: null, error: 'A API não retornou um resumo válido.' };
        }
        
        const endTime = Date.now();
        const duration = (endTime - startTime) / 1000;
        
        console.log(`🎉 [RESUMO] Resumo gerado com sucesso!`);
        console.log(`📊 [RESUMO] Estatísticas finais:`, {
            tamanhoResumo: resumo.length,
            palavrasResumo: resumo.split(' ').length,
            tempoProcessamento: `${duration?.toFixed(2) || '0.00'}s`,
            primeiros100CharsResumo: resumo.substring(0, 100) + (resumo.length > 100 ? '...' : '')
        });

        return { success: true, data: resumo, error: null };
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
            tamanhoTexto: text?.length || 0
        });
        
        let userFriendlyError = 'Falha ao gerar o resumo.';
        if (typeof errorMessage === 'string') {
            if (errorMessage.includes('API key not valid')) {
                userFriendlyError = 'A chave de API fornecida é inválida. Verifique-a nas configurações.';
                console.error(`🔑 [RESUMO] Erro de autenticação: ${userFriendlyError}`);
            } else if (errorMessage.includes('quota')) {
                userFriendlyError = 'Limite de uso da API excedido. Tente novamente mais tarde.';
                console.error(`💰 [RESUMO] Erro de quota: ${userFriendlyError}`);
            } else if (errorMessage.includes('network')) {
                userFriendlyError = 'Erro de conectividade. Verifique sua conexão com a internet.';
                console.error(`🌐 [RESUMO] Erro de rede: ${userFriendlyError}`);
            }
        }
        
        console.error(`💥 [RESUMO] Erro geral na geração do resumo`);
        return { success: false, data: null, error: `${userFriendlyError} (${errorMessage})` };
    }
};