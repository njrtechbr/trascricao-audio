import React, { useState, useCallback, useEffect } from 'react';
import { Header } from './components/Header';
import { AudioUploader } from './components/AudioUploader';
import { TranscriptionDisplay } from './components/TranscriptionDisplay';
import { Loader } from './components/Loader';
import { SettingsModal } from './components/SettingsModal';
import { transcribe } from './services/whisperService';
import { summarizeText } from './services/geminiService';
import { useApiKey } from './contexts/ApiKeyContext';
import { Status, WordTimestamp } from './types';

const App: React.FC = () => {
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [transcription, setTranscription] = useState<WordTimestamp[] | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>(Status.Idle);
  const [error, setError] = useState<string | null>(null);
  const [isSettingsOpen, setSettingsOpen] = useState(false);
  
  const { apiKey, isConfigured } = useApiKey();

  // Abre o modal de configurações na primeira vez se a chave de API não estiver definida
  useEffect(() => {
    if (!isConfigured) {
      setSettingsOpen(true);
    }
  }, [isConfigured]);

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

  const handleProcessAudio = useCallback(async () => {
    if (!audioFile || !apiKey) {
        if (!apiKey) {
            setError("Por favor, configure sua chave de API nas configurações.");
            setStatus(Status.Error);
        }
        return;
    };

    // Reset only processing state
    setTranscription(null);
    setSummary(null);
    setError(null);
    setStatus(Status.Transcribing);

    try {
      const timedTranscription = await transcribe(audioFile, apiKey);
      setTranscription(timedTranscription);
      setStatus(Status.Summarizing);
      
      const plainTextTranscription = timedTranscription.map(item => item.word).join(' ');

      const summarizedText = await summarizeText(plainTextTranscription, apiKey);
      setSummary(summarizedText);
      setStatus(Status.Done);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Ocorreu um erro desconhecido.';
      console.error(errorMessage);
      setError(`Falha ao processar o áudio. ${errorMessage}`);
      setStatus(Status.Error);
    }
  }, [audioFile, apiKey]);

  const isProcessing = status === Status.Transcribing || status === Status.Summarizing;

  return (
    <div className="min-h-screen bg-brand-bg text-brand-text flex flex-col items-center p-4 sm:p-6 md:p-8">
      <Header onSettingsClick={() => setSettingsOpen(true)} />
      <main className="w-full max-w-3xl mx-auto mt-8 flex flex-col gap-6">
        {!isConfigured && !isProcessing && (
          <div className="bg-yellow-900/50 border border-yellow-700 text-yellow-200 rounded-lg p-4 text-center">
              <h3 className="font-bold text-lg">Configuração Necessária</h3>
              <p>Por favor, configure sua chave de API do Google Gemini para começar.</p>
              <button onClick={() => setSettingsOpen(true)} className="mt-2 text-brand-primary font-bold hover:underline">Abrir Configurações</button>
          </div>
        )}
        
        <div className="bg-brand-surface rounded-xl shadow-2xl p-6 md:p-8 border border-gray-700">
          <AudioUploader onFileSelect={handleFileSelect} disabled={isProcessing || !isConfigured} />
          {audioFile && !isProcessing && (
            <div className="mt-6 text-center">
              <button
                onClick={handleProcessAudio}
                disabled={!isConfigured}
                className="bg-brand-primary text-gray-900 font-bold py-3 px-8 rounded-lg shadow-lg hover:bg-brand-primary-hover transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-cyan-500/50 disabled:bg-gray-600 disabled:cursor-not-allowed disabled:transform-none"
              >
                Transcrever e Resumir
              </button>
            </div>
          )}
        </div>

        {isProcessing ? (
          <Loader status={status} />
        ) : error ? (
          <div className="bg-red-900/50 border border-red-700 text-red-200 rounded-lg p-4 text-center">
            <h3 className="font-bold text-lg">Ocorreu um Erro</h3>
            <p>{error}</p>
          </div>
        ) : status === Status.Done && transcription && summary && audioUrl ? (
          <TranscriptionDisplay transcription={transcription} summary={summary} audioUrl={audioUrl} />
        ) : null}
      </main>
      <footer className="text-center mt-12 text-brand-text-secondary text-sm space-y-2">
        <p>Desenvolvido por Nereu Jr</p>
        <div className="flex flex-wrap justify-center items-center gap-x-4 gap-y-1">
          <a href="mailto:contato@nereujr.com.br" className="hover:text-brand-primary transition-colors">contato@nereujr.com.br</a>
          <span className="hidden sm:inline">&bull;</span>
          <a href="tel:+5577998094395" className="hover:text-brand-primary transition-colors">(77) 99809-4395</a>
        </div>
      </footer>
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
};

export default App;