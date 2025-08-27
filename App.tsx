import React, { useState, useCallback, useEffect } from 'react';
import { Header } from './components/Header';
import { AudioUploader } from './components/AudioUploader';
import { TranscriptionDisplay } from './components/TranscriptionDisplay';
import { Loader } from './components/Loader';
import { SettingsModal } from './components/SettingsModal';
import { Navigation } from './components/Navigation';
import { useFeedback } from './components/Feedback';
import LearningReport from './components/LearningReport';
import { ToastProvider, useToastNotification } from './components/Toast';
import { LoadingSpinner, ErrorState, SuccessState } from './components/LoadingSpinner';
import { transcribe } from './services/whisperService';
import { summarizeText } from './services/geminiService';
import { useApiKey } from './contexts/ApiKeyContext';
import { useTheme } from './contexts/ThemeContext';
import { useTranscriptionShortcuts } from './hooks/useKeyboardShortcuts';
import { usePreferences, useRecentFiles } from './hooks/usePreferences';
import { Status, WordTimestamp } from './types';
import learningAlgorithmService from './services/learningAlgorithmService';
import supabaseService from './services/supabaseService';

const App: React.FC = () => {
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [transcription, setTranscription] = useState<WordTimestamp[] | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>(Status.Idle);
  const [error, setError] = useState<string | null>(null);
  const [isSettingsOpen, setSettingsOpen] = useState(false);
  const [isLearningReportOpen, setLearningReportOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState<'upload' | 'processing' | 'transcription' | 'completed'>('upload');
  
  const { apiKey, isConfigured } = useApiKey();
  const { theme, toggleTheme } = useTheme();
  const { preferences } = usePreferences();
  const { addRecentFile } = useRecentFiles();
  const { showSuccess, showError, showWarning, showInfo, FeedbackContainer } = useFeedback();

  // Estado para controlar se os serviços foram inicializados
  const [servicosInicializados, setServicosInicializados] = useState(false);

  // Função para inicializar serviços apenas quando necessário
  const inicializarServicos = async () => {
    if (servicosInicializados) {
      console.log('🔄 [SERVICES] Serviços já inicializados, reutilizando...');
      return;
    }

    try {
      console.log('🚀 [SERVICES] Iniciando serviços para transcrição...');
      
      // Primeiro inicializar o Supabase
      await supabaseService.inicializar();
      console.log('✅ [SERVICES] Supabase inicializado');
      
      // Depois o algoritmo de aprendizado
      await learningAlgorithmService.inicializar();
      console.log('✅ [SERVICES] Algoritmo de aprendizado inicializado');
      
      setServicosInicializados(true);
      console.log('✅ [SERVICES] Todos os serviços inicializados com sucesso');
      showSuccess('Serviços inicializados para transcrição!');
    } catch (error) {
      console.error('❌ [SERVICES] Erro ao inicializar serviços:', error);
      showError(`Erro ao inicializar serviços: ${error.message}`);
      throw error;
    }
  };

  // Função para encerrar serviços após transcrição
  const encerrarServicos = () => {
    try {
      console.log('🛑 [SERVICES] Encerrando serviços após transcrição...');
      
      // Parar o algoritmo de aprendizado
      learningAlgorithmService.parar();
      console.log('✅ [SERVICES] Algoritmo de aprendizado parado');
      
      setServicosInicializados(false);
      console.log('✅ [SERVICES] Serviços encerrados com sucesso');
      showInfo('Serviços encerrados após transcrição.');
    } catch (error) {
      console.error('❌ [SERVICES] Erro ao encerrar serviços:', error);
      showError(`Erro ao encerrar serviços: ${error.message}`);
    }
  };

  // Abre o modal de configurações na primeira vez se a chave de API não estiver definida
  useEffect(() => {
    if (!isConfigured) {
      setSettingsOpen(true);
      showWarning('Configure sua chave de API para começar a usar a aplicação.');
    }
  }, [isConfigured, showWarning]);

  // Atualizar step baseado no status
  useEffect(() => {
    switch (status) {
      case Status.Idle:
        setCurrentStep('upload');
        break;
      case Status.Transcribing:
      case Status.Summarizing:
        setCurrentStep('processing');
        break;
      case Status.Done:
        if (transcription) {
          setCurrentStep('transcription');
        }
        break;
    }
  }, [status, transcription]);

  const resetState = () => {
    setTranscription(null);
    setSummary(null);
    setError(null);
    setStatus(Status.Idle);
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
  };

  const handleFileSelect = (file: File | null) => {
    setAudioFile(file);
    resetState();
    if (file) {
      setAudioUrl(URL.createObjectURL(file));
    }
  };

  const handleNewTranscription = useCallback(() => {
    setAudioFile(null);
    setAudioUrl(null);
    setTranscription(null);
    setSummary(null);
    setError(null);
    setStatus(Status.Idle);
    setCurrentStep('upload');
    showInfo('Nova transcrição iniciada.');
  }, [showInfo]);

  const handleExportTranscription = useCallback(() => {
    if (!transcription) {
      showWarning('Nenhuma transcrição disponível para exportar.');
      return;
    }

    try {
      let content = '';
      const format = preferences.exportFormat;

      switch (format) {
        case 'txt':
          content = transcription.map(word => word.word).join(' ');
          break;
        case 'json':
          content = JSON.stringify(transcription, null, 2);
          break;
        case 'srt':
          content = transcription.map((word, index) => {
            const start = word.start || 0;
            const end = word.end || start + 1;
            return `${index + 1}\n${formatTime(start)} --> ${formatTime(end)}\n${word.word}\n`;
          }).join('\n');
          break;
        case 'vtt':
          content = 'WEBVTT\n\n' + transcription.map((word, index) => {
            const start = word.start || 0;
            const end = word.end || start + 1;
            return `${formatTime(start)} --> ${formatTime(end)}\n${word.word}`;
          }).join('\n\n');
          break;
      }

      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `transcricao.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      showSuccess(`Transcrição exportada como ${format.toUpperCase()}`);
    } catch (err) {
      showError('Erro ao exportar transcrição.');
    }
  }, [transcription, preferences.exportFormat, showSuccess, showError, showWarning]);

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
  };

  // Configurar atalhos de teclado
  useTranscriptionShortcuts({
    onToggleSettings: () => setSettingsOpen(prev => !prev),
    onToggleTheme: toggleTheme,
    onNewTranscription: handleNewTranscription,
    onExportTranscription: handleExportTranscription,
    enabled: preferences.keyboardShortcutsEnabled
  });

  const handleProcessAudio = useCallback(async () => {
    const processStartTime = Date.now();
    console.log(`🚀 [PROCESSO] ========== INICIANDO PROCESSAMENTO DE ÁUDIO ==========`);
    console.log(`📁 [PROCESSO] Arquivo selecionado:`, {
      nome: audioFile?.name,
      tamanho: audioFile ? `${(audioFile.size / 1024 / 1024).toFixed(2)} MB` : 'N/A',
      tipo: audioFile?.type,
      temChaveAPI: !!apiKey
    });

    if (!audioFile || !apiKey) {
        console.error(`❌ [PROCESSO] Pré-requisitos não atendidos:`, {
          temArquivo: !!audioFile,
          temChaveAPI: !!apiKey
        });
        if (!apiKey) {
            const errorMsg = "Por favor, configure sua chave de API nas configurações.";
            setError(errorMsg);
            showError(errorMsg);
            setStatus(Status.Error);
        }
        return;
    };

    console.log(`🔄 [PROCESSO] Iniciando fluxo de processamento...`);
    // Reset only processing state
    setTranscription(null);
    setSummary(null);
    setError(null);
    setStatus(Status.Transcribing);

    // Adicionar aos arquivos recentes
    console.log(`📋 [PROCESSO] Adicionando arquivo aos recentes...`);
    addRecentFile({
      name: audioFile.name,
      path: audioUrl || '',
      size: audioFile.size
    });

    try {
      // Inicializar serviços apenas quando necessário
      console.log(`🔧 [PROCESSO] === ETAPA 0: INICIALIZAÇÃO DE SERVIÇOS ===`);
      await inicializarServicos();
      console.log(`📝 [PROCESSO] === ETAPA 1: TRANSCRIÇÃO ===`);
      showInfo('Iniciando transcrição do áudio...');

      // Selecionar a fonte de áudio: prioriza a URL (Supabase) se existir, caso contrário usa o arquivo local
      const fonteAudio = audioUrl ? audioUrl : audioFile;
      // Transcrição (agora aceita File ou URL)
      const transcricaoData = await transcribe(fonteAudio as any, apiKey);
      console.log(`✅ [PROCESSO] Transcrição concluída:`, {
        palavrasTranscritas: transcricaoData?.length || 0,
        primeirasPalavras: transcricaoData?.slice(0, 3).map(w => w.word).join(' ') || 'N/A'
      });
      
      if (transcricaoData && transcricaoData.length > 0) {
        console.log(`📋 [PROCESSO] Definindo transcrição no estado...`);
        setTranscription(transcricaoData);
        setStatus(Status.Summarizing);
        showInfo('Transcrição concluída! Gerando resumo...');

        // Gerar texto completo transcrito
        const textoTranscritoCompleto = transcricaoData.map(word => word.word).join(' ');

        // Salvar dados de aprendizado
        console.log(`🧠 [PROCESSO] === ETAPA 2: SALVAMENTO DE DADOS DE APRENDIZADO ===`);
        try {
          const dadosAprendizado = {
            palavras: transcricaoData.map(w => w.word),
            tempoProcessamento: Date.now(),
            tamanhoAudio: audioFile.size,
            qualidadeTranscricao: 0.9
          };
          console.log(`💾 [PROCESSO] Dados de aprendizado preparados:`, {
            totalPalavras: dadosAprendizado.palavras.length,
            tamanhoAudio: `${(dadosAprendizado.tamanhoAudio / 1024 / 1024).toFixed(2)} MB`,
            qualidade: dadosAprendizado.qualidadeTranscricao,
            timestamp: new Date(dadosAprendizado.tempoProcessamento).toLocaleString('pt-BR')
          });
          
          await learningAlgorithmService.analisarTranscricao(dadosAprendizado);
          console.log(`✅ [PROCESSO] Dados de aprendizado salvos com sucesso`);
        } catch (learningError) {
          console.error('❌ [PROCESSO] Erro ao salvar dados de aprendizado:', learningError);
        }

        // Salvar no Supabase
        console.log(`🗄️ [PROCESSO] === ETAPA 3: SALVAMENTO NO SUPABASE ===`);
        try {
          const dadosSupabase = {
            nomeArquivo: audioFile.name,
            transcricao: textoTranscritoCompleto,
            tamanhoArquivo: audioFile.size
          };
          console.log(`💾 [PROCESSO] Dados para Supabase preparados:`, {
            nomeArquivo: dadosSupabase.nomeArquivo,
            palavrasTranscricao: transcricaoData.length,
            tamanhoArquivo: `${(dadosSupabase.tamanhoArquivo / 1024 / 1024).toFixed(2)} MB`
          });
          
          // Salvar transcrição completa com embeddings
          console.log(`🔄 [PROCESSO] Salvando transcrição completa com embeddings...`);
          await supabaseService.salvarTranscricaoComEmbeddingCompleto(textoTranscritoCompleto, audioFile.name);
          
          // Salvar palavras individuais com embeddings
          console.log(`🔄 [PROCESSO] Salvando palavras individuais com embeddings...`);
          await supabaseService.salvarTranscricaoComEmbeddings(transcricaoData, audioFile.name);
          
          // Manter compatibilidade com versão sem embeddings
          await supabaseService.salvarTranscricao(textoTranscritoCompleto, audioFile.name);
          await supabaseService.salvarTranscricaoCompleta(transcricaoData, audioFile.name);
          
          console.log(`✅ [PROCESSO] Dados salvos no Supabase com sucesso (com embeddings)`);
        } catch (supabaseError) {
          console.error('❌ [PROCESSO] Erro ao salvar no Supabase:', supabaseError);
        }

        // Resumo
        console.log(`📝 [PROCESSO] === ETAPA 4: GERAÇÃO DE RESUMO ===`);
        const textoTranscrito = transcricaoData.map(word => word.word).join(' ');
        console.log(`📄 [PROCESSO] Texto para resumo:`, {
          tamanho: textoTranscrito.length,
          palavras: textoTranscrito.split(' ').length,
          primeiros50Chars: textoTranscrito.substring(0, 50) + '...'
        });
        
        const resumoResult = await summarizeText(textoTranscrito, apiKey);
        console.log(`✅ [PROCESSO] Resumo gerado:`, {
          sucesso: resumoResult.success,
          tamanho: resumoResult.data?.length || 0,
          primeiros50Chars: resumoResult.data?.substring(0, 50) + '...' || 'N/A'
        });
        
        if (resumoResult.success && resumoResult.data) {
          setSummary(resumoResult.data);
          setStatus(Status.Done);
          setCurrentStep('completed');
          
          const processEndTime = Date.now();
          const totalDuration = (processEndTime - processStartTime) / 1000;
          console.log(`🎉 [PROCESSO] ========== PROCESSAMENTO CONCLUÍDO COM SUCESSO ==========`);
          console.log(`📊 [PROCESSO] Estatísticas finais:`, {
            tempoTotal: `${totalDuration.toFixed(2)}s`,
            arquivo: audioFile.name,
            palavrasTranscritas: transcricaoData.length,
            tamanhoResumo: resumoResult.data.length,
            etapasConcluidas: ['Inicialização', 'Transcrição', 'Aprendizado', 'Supabase', 'Resumo']
          });
          
          // Encerrar serviços após conclusão
          console.log(`🔧 [PROCESSO] === ETAPA FINAL: ENCERRAMENTO DE SERVIÇOS ===`);
          encerrarServicos();
          
          showSuccess('Transcrição e resumo concluídos com sucesso!');
        } else {
          console.warn(`⚠️ [PROCESSO] Resumo não foi gerado:`, resumoResult.error);
          setStatus(Status.Done);
          setCurrentStep('completed');
          
          // Encerrar serviços mesmo sem resumo
          console.log(`🔧 [PROCESSO] === ETAPA FINAL: ENCERRAMENTO DE SERVIÇOS ===`);
          encerrarServicos();
          
          showWarning('Transcrição concluída, mas não foi possível gerar o resumo.');
        }
      } else {
        console.error(`❌ [PROCESSO] Transcrição vazia ou inválida`);
        throw new Error('Transcrição vazia ou inválida');
      }
    } catch (err) {
      const processEndTime = Date.now();
      const totalDuration = (processEndTime - processStartTime) / 1000;
      
      console.error(`❌ [PROCESSO] ========== ERRO NO PROCESSAMENTO ==========`);
      console.error(`💥 [PROCESSO] Erro capturado:`, err);
      console.error(`⏱️ [PROCESSO] Tempo até o erro: ${totalDuration?.toFixed(2) || '0.00'}s`);
      
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      
      console.error(`📋 [PROCESSO] Detalhes do erro:`, {
        tipo: err instanceof Error ? err.constructor.name : typeof err,
        mensagem: errorMessage,
        stack: err instanceof Error ? err.stack : 'N/A',
        arquivo: audioFile?.name || 'N/A',
        tamanhoArquivo: audioFile ? `${(audioFile.size / 1024 / 1024).toFixed(2)} MB` : 'N/A',
        tempoProcessamento: `${totalDuration.toFixed(2)}s`
      });
      
      setError(errorMessage);
      setStatus(Status.Error);
      showError(`Erro: ${errorMessage}`);
      
      // Encerrar serviços em caso de erro
      console.log(`🔧 [PROCESSO] === ENCERRAMENTO DE SERVIÇOS APÓS ERRO ===`);
      encerrarServicos();
      
      console.error(`🔚 [PROCESSO] ========== FIM DO PROCESSAMENTO COM ERRO ==========`);
    }
  }, [audioFile, apiKey, audioUrl, addRecentFile, showInfo, showSuccess, showError, showWarning]);

  const renderContent = () => {
    switch (currentStep) {
      case 'upload':
        return (
          <div className="space-y-8">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-white mb-2">Comece sua transcrição</h2>
              <p className="text-gray-400">Envie seu arquivo de áudio e deixe a IA fazer o trabalho</p>
            </div>
            <AudioUploader 
              onFileSelect={handleFileSelect}
              disabled={!isConfigured}
            />
            {audioFile && (
              <div className="flex justify-center">
                <button
                  onClick={handleProcessAudio}
                  disabled={!isConfigured || status !== Status.Idle}
                  className="px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold rounded-xl hover:from-cyan-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 shadow-lg"
                >
                  {status === Status.Idle ? 'Iniciar Transcrição' : 'Processando...'}
                </button>
              </div>
            )}
          </div>
        );
      case 'processing':
        return (
          <div className="flex flex-col items-center justify-center space-y-6">
            <Loader />
            <div className="text-center">
              <h3 className="text-xl font-semibold text-white mb-2">
                {status === Status.Transcribing ? 'Transcrevendo áudio...' : 'Gerando resumo...'}
              </h3>
              <p className="text-gray-400">Isso pode levar alguns momentos</p>
            </div>
          </div>
        );
      case 'transcription':
      case 'completed':
        return (
          <div className="space-y-6">
            <TranscriptionDisplay 
              transcription={transcription}
              summary={summary}
              audioUrl={audioUrl}
              onNewTranscription={handleNewTranscription}
              onExport={handleExportTranscription}
            />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <ToastProvider>
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%239C92AC%22%20fill-opacity%3D%220.05%22%3E%3Cpath%20d%3D%22M36%2034v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6%2034v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6%204V0H4v4H0v2h4v4h2V6h4V4H6z%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-20"></div>
        
        <div className="relative z-10">
        <Header onSettingsClick={() => setSettingsOpen(true)} />
        
        <main className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <div className="bg-gray-800/40 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-8 shadow-2xl">
              <Navigation 
                currentStep={currentStep}
                onNewTranscription={handleNewTranscription}
              />
              
              <div className="mt-8">
                {renderContent()}
              </div>
            </div>
          </div>
        </main>

        <SettingsModal 
          isOpen={isSettingsOpen}
          onClose={() => setSettingsOpen(false)}
        />

        <LearningReport 
          isOpen={isLearningReportOpen}
          onClose={() => setLearningReportOpen(false)}
        />

        <div className="fixed bottom-8 right-8 space-y-4">
          <button
            onClick={() => setLearningReportOpen(true)}
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all duration-300 transform hover:scale-105 shadow-lg"
          >
            Relatório de Aprendizado
          </button>
        </div>

        <FeedbackContainer />
        
        <footer className="text-center mt-12 pb-8">
          <p className="text-sm text-gray-400">
            Desenvolvido com <span className="text-red-400">❤️</span> e inteligência artificial
          </p>
        </footer>
      </div>
    </div>
    </ToastProvider>
  );
};

export default App;