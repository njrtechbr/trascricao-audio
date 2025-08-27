
import React, { useState, useRef, useCallback } from 'react';
import { UploadIcon } from './icons/UploadIcon';
import { FileIcon } from './icons/FileIcon';
import { CloseIcon } from './icons/CloseIcon';
import supabaseStorageService from '../services/supabaseStorageService';

interface AudioUploaderProps {
  onFileSelect: (file: File | null) => void;
  onUploadComplete?: (url: string) => void;
  disabled: boolean;
}

export const AudioUploader: React.FC<AudioUploaderProps> = ({ onFileSelect, onUploadComplete, disabled }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState<number>(0);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const audioRef = useRef<HTMLAudioElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (disabled) return;

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type.startsWith('audio/')) {
        setSelectedFile(file);
        onFileSelect(file);
        // Upload automático
        if (supabaseStorageService.estaConectado()) {
          handleUploadToSupabase(file);
        }
      } else {
        alert('Por favor, solte um arquivo de áudio.');
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      setSelectedFile(file);
      onFileSelect(file);
      // Upload automático
      if (supabaseStorageService.estaConectado()) {
        handleUploadToSupabase(file);
      }
    }
  };
  
  const handleRemoveFile = () => {
      setSelectedFile(null);
      onFileSelect(null);
      setUploadError(null);
      setUploadProgress(0);
      if (inputRef.current) {
          inputRef.current.value = "";
      }
  }

  const handleUploadToSupabase = async (fileToUpload?: File) => {
    const file = fileToUpload || selectedFile;
    if (!file) return;

    setIsUploading(true);
    setUploadError(null);
    setUploadProgress(0);

    try {
      // Simular progresso de upload
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      const resultado = await supabaseStorageService.fazerUploadAudio(file);
      
      clearInterval(progressInterval);
      setUploadProgress(100);

      if (resultado.sucesso && resultado.url) {
        console.log('Upload realizado com sucesso:', resultado.url);
        onUploadComplete?.(resultado.url);
        
        // Resetar após sucesso
        setTimeout(() => {
          setUploadProgress(0);
          setIsUploading(false);
        }, 1000);
      } else {
        throw new Error(resultado.erro || 'Erro desconhecido no upload');
      }
    } catch (erro) {
      console.error('Erro no upload:', erro);
      setUploadError(erro instanceof Error ? erro.message : 'Erro no upload');
      setUploadProgress(0);
      setIsUploading(false);
    }
  };

  const openFileDialog = () => {
    if (inputRef.current) {
      inputRef.current.click();
    }
  };

  const handlePlayPause = () => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (audioRef.current) {
      const time = parseFloat(e.target.value);
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6">
      <input
        type="file"
        ref={inputRef}
        onChange={handleFileChange}
        className="hidden"
        accept="audio/*"
        disabled={disabled}
      />
      
      {!selectedFile ? (
        <div
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={openFileDialog}
          className={`relative overflow-hidden flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-2xl cursor-pointer transition-all duration-300 glass-card ${
            disabled ? 'cursor-not-allowed opacity-50' :
            isDragging ? 'border-cyan-400 bg-gradient-to-br from-cyan-500/30 to-purple-500/30 scale-105 shadow-cyan-500/20' : 
            'border-gray-500/30 hover:border-cyan-400/50 hover:scale-102'
          }`}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-purple-500/5 opacity-0 hover:opacity-100 transition-opacity duration-300"></div>
          <div className="relative z-10 flex flex-col items-center space-y-4">
            <div className="relative mb-4">
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full blur-xl opacity-30 animate-pulse"></div>
              <UploadIcon className="w-16 h-16 text-cyan-400 relative z-10" />
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-2xl font-bold text-white">Arraste seu áudio aqui</h3>
              <p className="text-gray-300 text-lg">ou <span className="text-cyan-400 hover:text-cyan-300 transition-colors">clique para selecionar</span></p>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <span className="px-3 py-1 bg-gray-800/50 rounded-full">MP3</span>
              <span className="px-3 py-1 bg-gray-800/50 rounded-full">WAV</span>
              <span className="px-3 py-1 bg-gray-800/50 rounded-full">M4A</span>
              <span className="px-3 py-1 bg-gray-800/50 rounded-full">FLAC</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Player de Áudio Moderno */}
          <div className="bg-gradient-to-br from-gray-800/40 to-gray-900/40 backdrop-blur-md rounded-3xl p-6 border border-gray-700/30">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-gradient-to-br from-cyan-500/20 to-purple-500/20 rounded-2xl">
                  <FileIcon className="w-8 h-8 text-cyan-400" />
                </div>
                <div>
                  <h4 className="font-semibold text-white text-lg">{selectedFile.name}</h4>
                  <p className="text-sm text-gray-400">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>
              <button 
                onClick={handleRemoveFile} 
                disabled={disabled || isUploading} 
                className="p-2 text-gray-400 hover:text-red-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors rounded-full hover:bg-red-500/10"
              >
                <CloseIcon className="w-6 h-6" />
              </button>
            </div>

            {/* Player Controls */}
            {audioUrl && (
              <>
                <audio
                  ref={audioRef}
                  src={audioUrl}
                  onLoadedMetadata={handleLoadedMetadata}
                  onTimeUpdate={handleTimeUpdate}
                  onEnded={() => setIsPlaying(false)}
                  className="hidden"
                />
                
                <div className="space-y-4">
                  {/* Progress Bar */}
                  <div className="space-y-2">
                    <input
                      type="range"
                      min="0"
                      max={duration || 0}
                      value={currentTime}
                      onChange={handleSeek}
                      className="w-full h-2 bg-gray-700/50 rounded-full appearance-none cursor-pointer slider"
                      style={{
                        background: `linear-gradient(to right, #06b6d4 ${(currentTime / duration) * 100}%, #374151 ${(currentTime / duration) * 100}%)`
                      }}
                    />
                    <div className="flex justify-between text-sm text-gray-400">
                      <span>{formatTime(currentTime)}</span>
                      <span>{formatTime(duration)}</span>
                    </div>
                  </div>

                  {/* Play/Pause Button */}
                  <div className="flex justify-center">
                    <button
                      onClick={handlePlayPause}
                      disabled={disabled}
                      className="p-4 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full text-white hover:from-cyan-400 hover:to-purple-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-110 shadow-lg"
                    >
                      {isPlaying ? (
                        <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
                        </svg>
                      ) : (
                        <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7L8 5z"/>
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Status do Upload */}
          <div className="space-y-4">
            {isUploading && (
              <div className="bg-gradient-to-r from-cyan-500/10 to-purple-500/10 backdrop-blur-sm rounded-2xl p-4 border border-cyan-500/20">
                <div className="flex items-center gap-3">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-cyan-400"></div>
                  <div>
                    <p className="text-cyan-400 font-medium">Enviando para Supabase...</p>
                    <p className="text-sm text-gray-400">{uploadProgress}% concluído</p>
                  </div>
                </div>
                <div className="mt-3 w-full bg-gray-700/30 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-cyan-500 to-purple-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
              </div>
            )}
            
            {uploadError && (
              <div className="bg-red-500/10 backdrop-blur-sm rounded-2xl p-4 border border-red-500/20">
                <div className="flex items-center gap-3">
                  <svg className="w-6 h-6 text-red-400" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                  </svg>
                  <div>
                    <p className="text-red-400 font-medium">Erro no upload</p>
                    <p className="text-sm text-gray-400">{uploadError}</p>
                  </div>
                </div>
              </div>
            )}
            
            {/* Status da Conexão */}
            {!supabaseStorageService.estaConectado() && (
              <div className="text-yellow-400 text-sm p-2 bg-yellow-900/20 rounded border border-yellow-800">
                ⚠️ Serviço de Storage não está conectado - Upload automático desabilitado
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
