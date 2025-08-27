import React, { useState, useRef, useEffect, useCallback } from 'react';
import { CopyIcon } from './icons/CopyIcon';
import { CheckIcon } from './icons/CheckIcon';
import { DocumentTextIcon } from './icons/DocumentTextIcon';
import { PlayIcon } from './icons/PlayIcon';
import { PauseIcon } from './icons/PauseIcon';
import { ClockIcon } from './icons/ClockIcon';
import { WordTimestamp } from '../types';
import syncAiService from '../services/syncAiService';
import vectorDatabaseService from '../services/vectorDatabaseService';
import AudioPlayer, { AudioPlayerRef } from './AudioPlayer';

interface TranscriptionDisplayProps {
  transcription: WordTimestamp[];
  audioUrl: string;
}

export const TranscriptionDisplay: React.FC<TranscriptionDisplayProps> = ({ transcription, audioUrl }) => {
  const [copied, setCopied] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [currentWordIndex, setCurrentWordIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioPlayerRef = useRef<AudioPlayerRef>(null);
  const [correctedTranscription, setCorrectedTranscription] = useState<WordTimestamp[]>(transcription);
  const [syncMetrics, setSyncMetrics] = useState(syncAiService.obterMetricas());
  const transcriptionRef = useRef<HTMLDivElement>(null);
  const lastClickTimeRef = useRef<number>(0);

  // Callback para receber atualizações de tempo do AudioPlayer
  const handleTimeUpdate = useCallback((time: number) => {
    setCurrentTime(time);
  }, []);

  // Callback para receber atualizações do estado de reprodução
  const handlePlayStateChange = useCallback((playing: boolean) => {
    setIsPlaying(playing);
  }, []);

  // Inicializar serviço de IA de sincronismo e monitoramento
  useEffect(() => {
    if (transcription.length > 0) {
      const corrigida = syncAiService.corrigirTimestamps(transcription);
      setCorrectedTranscription(corrigida);
    }
    
    // Inicializar monitoramento em tempo real apenas uma vez
    syncAiService.iniciarMonitoramento();
  }, [transcription]);

  // useEffect otimizado para aplicar correção de IA apenas quando necessário
  useEffect(() => {
    if (transcription.length > 0 && currentTime > 0) {
      // Aplicar correção apenas a cada 100ms para evitar loops
      const timeoutId = setTimeout(() => {
        const corrigida = syncAiService.corrigirTimestamps(transcription, currentTime);
        setCorrectedTranscription(prev => {
          // Só atualizar se realmente houver mudanças significativas
          const hasSignificantChanges = prev.some((item, index) => 
            Math.abs(item.startTime - corrigida[index]?.startTime) > 0.01
          );
          return hasSignificantChanges ? corrigida : prev;
        });
      }, 100);
      
      return () => clearTimeout(timeoutId);
    }
  }, [transcription, Math.floor(currentTime * 10)]); // Reduzir frequência de atualizações

  // useEffect para atualizar métricas de sincronismo
  useEffect(() => {
    const interval = setInterval(() => {
      setSyncMetrics(syncAiService.obterMetricas());
    }, 1000);
    
    return () => clearInterval(interval);
  }, []);

  // useEffect separado para atualizar o índice da palavra atual e scroll automático
  useEffect(() => {
    let isCancelled = false;
    
    const findCurrentWord = async () => {
      const promises = correctedTranscription.map(async (item, index) => {
        try {
          // Usar compensação dinâmica da IA com palavra específica
          const compensacao = await syncAiService.calcularCompensacaoTempo(currentTime, item.word) / 1000; // Converter para segundos
          const tempoAjustado = currentTime + compensacao;
          
          const tolerance = 0.02; // 20ms de tolerância para máxima precisão
          return tempoAjustado >= (item.startTime - tolerance) && tempoAjustado <= (item.endTime + tolerance) ? index : -1;
        } catch (error) {
          console.warn('Erro ao calcular compensação:', error);
          return -1;
        }
      });
      
      const results = await Promise.all(promises);
      const newWordIndex = results.find(index => index !== -1) ?? -1;
      
      if (isCancelled) return;
    
      if (newWordIndex !== -1 && newWordIndex !== currentWordIndex) {
        const palavraAtual = correctedTranscription[newWordIndex];
        
        // Registrar palavra no banco de dados vetorial para aprendizado
        if (palavraAtual) {
          const contexto = {
            palavra: palavraAtual.word,
            posicao: newWordIndex,
            frase: correctedTranscription.map(w => w.word).join(' '),
            palavraAnterior: newWordIndex > 0 ? correctedTranscription[newWordIndex - 1]?.word : undefined,
            proximaPalavra: newWordIndex < correctedTranscription.length - 1 ? correctedTranscription[newWordIndex + 1]?.word : undefined
          };
          
          vectorDatabaseService.registrarPalavraComTempo(
            palavraAtual.word,
            currentTime,
            palavraAtual.startTime,
            contexto,
            audioPlayerRef.current?.getPlaybackRate() || 1
          ).catch(error => {
            console.warn('Erro ao registrar palavra no banco vetorial:', error);
          });
        }
        
        setCurrentWordIndex(newWordIndex);
        
        // Scroll automático para manter a palavra visível
        setTimeout(() => {
          const wordElement = document.getElementById(`word-${newWordIndex}`);
          if (wordElement && transcriptionRef.current) {
            const container = transcriptionRef.current;
            const containerRect = container.getBoundingClientRect();
            const wordRect = wordElement.getBoundingClientRect();
            
            // Verifica se a palavra está fora da área visível
            if (wordRect.top < containerRect.top || wordRect.bottom > containerRect.bottom) {
              wordElement.scrollIntoView({
                behavior: 'smooth',
                block: 'center',
                inline: 'nearest'
              });
            }
          }
        }, 50);
      }
    };
    
    findCurrentWord();
    
    return () => {
      isCancelled = true;
    };
  }, [currentTime, correctedTranscription, currentWordIndex]);

  // Registro automático de palavras em tempo real para aprendizado
  useEffect(() => {
    if (currentWordIndex >= 0 && currentWordIndex < correctedTranscription.length && isPlaying) {
      const palavraAtual = correctedTranscription[currentWordIndex];
      
      // Registrar automaticamente a palavra atual para aprendizado
      const registrarPalavraAutomatica = async () => {
        try {
          // Construir contexto da palavra
          const contexto = {
            palavra: palavraAtual.word,
            posicao: currentWordIndex,
            frase: correctedTranscription.slice(
              Math.max(0, currentWordIndex - 3), 
              Math.min(correctedTranscription.length, currentWordIndex + 4)
            ).map(item => item.word).join(' '),
            palavraAnterior: currentWordIndex > 0 ? correctedTranscription[currentWordIndex - 1]?.word : undefined,
            proximaPalavra: currentWordIndex < correctedTranscription.length - 1 ? correctedTranscription[currentWordIndex + 1]?.word : undefined
          };
          
          // Obter velocidade de reprodução atual
          const velocidadeReproducao = audioPlayerRef.current?.getPlaybackRate() || 1;
          
          // Registrar no banco de dados vetorial
          await vectorDatabaseService.registrarPalavraComTempo(
            palavraAtual.word,
            currentTime,
            palavraAtual.startTime,
            contexto,
            velocidadeReproducao
          );
        } catch (error) {
          console.error('Erro ao registrar palavra automaticamente:', error);
        }
      };
      
      // Debounce para evitar registros excessivos
      const timeoutId = setTimeout(registrarPalavraAutomatica, 200);
      
      return () => clearTimeout(timeoutId);
    }
  }, [currentWordIndex, currentTime, correctedTranscription, isPlaying]);

  // Função para registrar clique do usuário (para aprendizado da IA)
  const registrarClique = async (tempoEsperado: number) => {
    const agora = Date.now();
    const tempoReal = currentTime;
    
    // Evitar registros muito próximos
    if (agora - lastClickTimeRef.current > 500) {
      // Encontrar a palavra correspondente ao tempo esperado
      const palavraItem = correctedTranscription.find(item => 
        Math.abs(item.startTime - tempoEsperado) < 0.1
      );
      
      if (palavraItem) {
        // Construir contexto da palavra
        const indice = correctedTranscription.indexOf(palavraItem);
        const contexto = {
          palavra: palavraItem.word,
          posicao: indice,
          frase: correctedTranscription.slice(
            Math.max(0, indice - 3), 
            Math.min(correctedTranscription.length, indice + 4)
          ).map(item => item.word).join(' '),
          palavraAnterior: indice > 0 ? correctedTranscription[indice - 1]?.word : undefined,
          proximaPalavra: indice < correctedTranscription.length - 1 ? correctedTranscription[indice + 1]?.word : undefined
        };
        
        // Obter velocidade de reprodução atual
        const velocidadeReproducao = audioPlayerRef.current?.getPlaybackRate() || 1;
        
        // Registrar no banco de dados vetorial
        await vectorDatabaseService.registrarPalavraComTempo(
          palavraItem.word,
          tempoReal,
          tempoEsperado,
          contexto,
          velocidadeReproducao
        );
      }
      
      // Manter compatibilidade com o sistema antigo
      syncAiService.registrarInteracaoUsuario(tempoEsperado, tempoReal);
      lastClickTimeRef.current = agora;
    }
  };

  // Função removida - agora é gerenciada pelo AudioPlayer

  const plainTextTranscription = correctedTranscription.map((item, index) => {
    // Usar transcrição corrigida pela IA
    // Aplica a mesma lógica avançada de espaçamento da renderização
    const nextWord = correctedTranscription[index + 1]?.word || '';
    const currentWord = item.word;
    
    const needsSpace = index < transcription.length - 1 && 
                      !currentWord.match(/[.!?,:;"'\-]$/) && 
                      !nextWord.match(/^[.!?,:;"'\-]/) &&
                      !currentWord.endsWith('(') &&
                      !nextWord.startsWith(')') &&
                      !currentWord.match(/\w'$/) &&
                      !nextWord.match(/^'\w/);
    return item.word + (needsSpace ? ' ' : '');
  }).join('');

  // Função para lidar com clique em palavra (busca por tempo)
  const handleWordClick = (startTime: number) => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.setTime(startTime);
      audioPlayerRef.current.play();
    }
    registrarClique(startTime);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(plainTextTranscription);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };



  return (
    <div className="glass-card rounded-2xl p-6 border border-white/10 shadow-2xl">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white/90 flex items-center">
          <div className="p-2 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-lg mr-3">
            <DocumentTextIcon className="w-6 h-6 text-white" />
          </div>
          Transcrição Inteligente
        </h2>
        <button
          onClick={handleCopy}
          className="p-3 glass-button text-white/70 hover:text-white hover:bg-white/10 rounded-xl transition-all duration-300 hover:scale-105"
          title="Copiar transcrição"
        >
          {copied ? <CheckIcon className="w-5 h-5 text-green-400" /> : <CopyIcon className="w-5 h-5" />}
        </button>
      </div>

      {/* Player de Áudio Moderno */}
      <div className="mb-8">
        <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
          <AudioPlayer
            ref={audioPlayerRef}
            src={audioUrl}
            onTimeUpdate={handleTimeUpdate}
            onPlayStateChange={handlePlayStateChange}
          />
        </div>
      </div>
      {/* Transcrição com Design Moderno */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white/80 flex items-center">
            <ClockIcon className="w-5 h-5 mr-2 text-blue-400" />
            Texto Transcrito
          </h3>
          <div className="text-sm text-white/60">
            {correctedTranscription.length} palavras
          </div>
        </div>
        
        <div 
          ref={transcriptionRef}
          className="max-h-96 overflow-y-auto p-4 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 custom-scrollbar"
        >
          {/* Métricas de sincronismo da IA */}
          {syncMetrics.confianca > 0.3 && (
            <div className="mb-4 p-3 bg-blue-500/20 rounded-lg border border-blue-400/30">
              <div className="text-xs text-blue-300 mb-1">🤖 IA de Sincronismo Ativa</div>
              <div className="text-xs text-white/60">
                Confiança: {syncMetrics.confianca ? (syncMetrics.confianca * 100).toFixed(1) : '0.0'}% | 
                Atraso médio: {syncMetrics.atrasoMedio ? syncMetrics.atrasoMedio.toFixed(0) : '0'}ms | 
                Amostras: {syncMetrics.amostras || 0}
              </div>
            </div>
          )}
          <div className="flex flex-wrap gap-1.5 leading-relaxed">
            {correctedTranscription.map((item, index) => {
              // Usar compensação dinâmica da IA para sincronização perfeita com palavra específica
              const tolerance = 0.02; // 20ms de tolerância para máxima precisão
              const compensacaoIA = syncAiService.calcularCompensacaoTempo(currentTime, item.word) / 1000;
              const adjustedTime = currentTime + compensacaoIA;
              const isHighlighted = adjustedTime >= (item.startTime - tolerance) && adjustedTime <= (item.endTime + tolerance);
              
              // Criar chave única baseada no timestamp e palavra para evitar duplicatas
              const uniqueKey = `${item.startTime}-${item.endTime}-${item.word}-${index}`;
              
              return (
                <span
                  key={uniqueKey}
                  id={`word-${index}`}
                  className={`px-2 py-1 rounded-lg cursor-pointer transition-all duration-300 text-white/80 ${
                    isHighlighted
                      ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white font-semibold scale-105 shadow-lg shadow-blue-500/30'
                      : 'hover:bg-white/10 hover:text-white'
                  }`}
                  onClick={() => handleWordClick(item.startTime)}
                  title={`${item.startTime?.toFixed(3) || '0.000'}s - ${item.endTime?.toFixed(3) || '0.000'}s${item.confidence ? ` (${(item.confidence * 100).toFixed(1)}%)` : ''}
Clique para buscar este momento`}
                >
                  {item.word}
                </span>
              );
            })}
          </div>
        </div>
      </div>

      {/* Métricas de Aprendizado Modernas */}
      <div className="mt-6 grid grid-cols-3 gap-4">
        <div className="glass-card p-4 rounded-xl text-center">
          <div className="text-2xl font-bold text-blue-400">{syncMetrics.palavrasAprendidas}</div>
          <div className="text-sm text-white/60 mt-1">Palavras Aprendidas</div>
        </div>
        <div className="glass-card p-4 rounded-xl text-center">
          <div className="text-2xl font-bold text-green-400">{syncMetrics.taxaAcerto ? (syncMetrics.taxaAcerto * 100).toFixed(1) : '0.0'}%</div>
          <div className="text-sm text-white/60 mt-1">Taxa de Acerto</div>
        </div>
        <div className="glass-card p-4 rounded-xl text-center">
          <div className="text-2xl font-bold text-purple-400">{syncMetrics.correcoesAplicadas}</div>
          <div className="text-sm text-white/60 mt-1">Correções IA</div>
        </div>
      </div>
    </div>
  );
};