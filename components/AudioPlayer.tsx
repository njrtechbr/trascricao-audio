import React, { useState, useRef, useEffect, useCallback } from 'react';
import { PlayIcon } from './icons/PlayIcon';
import { PauseIcon } from './icons/PauseIcon';
import { VolumeIcon } from './icons/VolumeIcon';
import { SkipBackIcon } from './icons/SkipBackIcon';
import { SkipForwardIcon } from './icons/SkipForwardIcon';

interface AudioPlayerProps {
  audioUrl: string;
  onTimeUpdate?: (currentTime: number) => void;
  onPlayStateChange?: (isPlaying: boolean) => void;
  className?: string;
}

export interface AudioPlayerRef {
  setTime: (time: number) => void;
  play: () => void;
  pause: () => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  isPlaying: () => boolean;
  getPlaybackRate: () => number;
}

// Hook personalizado para gerenciar o estado do player de áudio
export const useAudioPlayer = (audioSrc: string) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  const play = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.play();
      setIsPlaying(true);
    }
  }, []);

  const pause = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  }, []);

  const setTime = useCallback((time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  }, []);

  const setRate = useCallback((rate: number) => {
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
      setPlaybackRate(rate);
    }
  }, []);

  const setVol = useCallback((vol: number) => {
    if (audioRef.current) {
      audioRef.current.volume = vol;
      setVolume(vol);
      setIsMuted(vol === 0);
    }
  }, []);

  const toggleMute = useCallback(() => {
    if (audioRef.current) {
      if (isMuted) {
        audioRef.current.volume = volume;
        setIsMuted(false);
      } else {
        audioRef.current.volume = 0;
        setIsMuted(true);
      }
    }
  }, [isMuted, volume]);

  const skipForward = useCallback((seconds: number = 10) => {
    if (audioRef.current) {
      const newTime = Math.min(audioRef.current.currentTime + seconds, duration);
      setTime(newTime);
    }
  }, [duration, setTime]);

  const skipBackward = useCallback((seconds: number = 10) => {
    if (audioRef.current) {
      const newTime = Math.max(audioRef.current.currentTime - seconds, 0);
      setTime(newTime);
    }
  }, [setTime]);

  return {
    audioRef,
    isPlaying,
    currentTime,
    duration,
    playbackRate,
    volume,
    isMuted,
    play,
    pause,
    setTime,
    setRate,
    setVol,
    toggleMute,
    skipForward,
    skipBackward
  };
};

export const AudioPlayer = React.forwardRef<AudioPlayerRef, AudioPlayerProps>((
  {
    audioUrl,
    onTimeUpdate,
    onPlayStateChange,
    className = ''
  },
  ref
) => {
  const {
    audioRef,
    isPlaying,
    currentTime,
    duration,
    playbackRate,
    volume,
    isMuted,
    play,
    pause,
    setTime,
    setRate,
    setVol,
    toggleMute,
    skipForward,
    skipBackward
  } = useAudioPlayer(audioUrl);

  // Expor métodos através da ref
  React.useImperativeHandle(ref, () => ({
    setTime,
    play,
    pause,
    getCurrentTime: () => currentTime,
    getDuration: () => duration,
    isPlaying: () => isPlaying,
    getPlaybackRate: () => playbackRate
  }), [setTime, play, pause, currentTime, duration, isPlaying, playbackRate]);

  // Atualizar tempo atual e notificar componente pai
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    let animationFrame: number;

    const updateTime = () => {
      if (audio && !audio.paused) {
        const time = audio.currentTime;
        onTimeUpdate?.(time);
        animationFrame = requestAnimationFrame(updateTime);
      }
    };

    const handleTimeUpdate = () => {
      const time = audio.currentTime;
      onTimeUpdate?.(time);
    };

    const handleLoadedMetadata = () => {
      // A duração já é gerenciada pelo hook useAudioPlayer
    };

    const handlePlay = () => {
      onPlayStateChange?.(true);
      updateTime();
    };

    const handlePause = () => {
      onPlayStateChange?.(false);
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };

    const handleEnded = () => {
      onPlayStateChange?.(false);
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [audioUrl, onTimeUpdate, onPlayStateChange]);

  // Atalhos de teclado
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Evitar conflitos quando usuário está digitando
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.code) {
        case 'Space':
          e.preventDefault();
          isPlaying ? pause() : play();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          skipBackward(5);
          break;
        case 'ArrowRight':
          e.preventDefault();
          skipForward(5);
          break;
        case 'ArrowUp':
          e.preventDefault();
          setVol(Math.min(volume + 0.1, 1));
          break;
        case 'ArrowDown':
          e.preventDefault();
          setVol(Math.max(volume - 0.1, 0));
          break;
        case 'KeyM':
          e.preventDefault();
          toggleMute();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [isPlaying, volume, play, pause, skipForward, skipBackward, setVol, toggleMute]);

  // Formatar tempo em MM:SS
  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Calcular porcentagem do progresso
  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Manipular clique na barra de progresso
  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width;
    const newTime = percentage * duration;
    setTime(newTime);
  };

  return (
    <div className={`bg-gray-800/50 rounded-lg p-4 space-y-4 ${className}`}>
      {/* Elemento de áudio oculto */}
      <audio
        ref={audioRef}
        src={audioUrl}
        preload="metadata"
      />

      {/* Barra de progresso */}
      <div className="space-y-2">
        <div
          className="w-full h-2 bg-gray-700 rounded-full cursor-pointer relative overflow-hidden"
          onClick={handleProgressClick}
        >
          <div
            className="h-full bg-brand-primary rounded-full transition-all duration-150"
            style={{ width: `${progressPercentage}%` }}
          />
          {/* Indicador de posição */}
          <div
            className="absolute top-1/2 transform -translate-y-1/2 w-4 h-4 bg-brand-primary rounded-full shadow-lg transition-all duration-150"
            style={{ left: `calc(${progressPercentage}% - 8px)` }}
          />
        </div>
        <div className="flex justify-between text-xs text-brand-text-secondary">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Controles principais */}
      <div className="flex items-center justify-center gap-4">
        {/* Retroceder */}
        <button
          onClick={() => skipBackward(10)}
          className="p-2 text-brand-text hover:text-brand-primary transition-colors"
          title="Retroceder 10s (←)"
        >
          <SkipBackIcon className="w-6 h-6" />
        </button>

        {/* Play/Pause */}
        <button
          onClick={isPlaying ? pause : play}
          className="p-3 bg-brand-primary text-gray-900 rounded-full hover:bg-brand-primary-hover transition-all duration-200 transform hover:scale-105"
          title={isPlaying ? 'Pausar (Espaço)' : 'Reproduzir (Espaço)'}
        >
          {isPlaying ? (
            <PauseIcon className="w-6 h-6" />
          ) : (
            <PlayIcon className="w-6 h-6" />
          )}
        </button>

        {/* Avançar */}
        <button
          onClick={() => skipForward(10)}
          className="p-2 text-brand-text hover:text-brand-primary transition-colors"
          title="Avançar 10s (→)"
        >
          <SkipForwardIcon className="w-6 h-6" />
        </button>
      </div>

      {/* Controles secundários */}
      <div className="flex items-center justify-between">
        {/* Controle de volume */}
        <div className="flex items-center gap-2">
          <button
            onClick={toggleMute}
            className="p-1 text-brand-text hover:text-brand-primary transition-colors"
            title={isMuted ? 'Ativar som (M)' : 'Silenciar (M)'}
          >
            <VolumeIcon className={`w-5 h-5 ${isMuted ? 'text-red-400' : ''}`} />
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={isMuted ? 0 : volume}
            onChange={(e) => setVol(parseFloat(e.target.value))}
            className="w-20 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
            title="Volume (↑↓)"
          />
        </div>

        {/* Controle de velocidade */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-brand-text">Velocidade:</span>
          <div className="flex gap-1">
            {[0.5, 0.75, 1, 1.25, 1.5, 2].map((rate) => (
              <button
                key={rate}
                onClick={() => setRate(rate)}
                className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
                  playbackRate === rate
                    ? 'bg-brand-primary text-gray-900'
                    : 'bg-gray-700 text-brand-text hover:bg-gray-600'
                }`}
                title={`Velocidade ${rate}x`}
              >
                {rate}x
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Dicas de atalhos */}
      <div className="text-xs text-brand-text-secondary text-center space-y-1">
        <p>Atalhos: Espaço (Play/Pause) • ← → (Pular) • ↑ ↓ (Volume) • M (Mute)</p>
      </div>
    </div>
  );
});

AudioPlayer.displayName = 'AudioPlayer';

export default AudioPlayer;