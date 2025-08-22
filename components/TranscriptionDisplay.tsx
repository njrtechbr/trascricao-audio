import React, { useState, useRef, useEffect } from 'react';
import { CopyIcon } from './icons/CopyIcon';
import { CheckIcon } from './icons/CheckIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import { DocumentTextIcon } from './icons/DocumentTextIcon';
import { WordTimestamp } from '../types';

interface TranscriptionDisplayProps {
  transcription: WordTimestamp[];
  summary: string;
  audioUrl: string;
}

export const TranscriptionDisplay: React.FC<TranscriptionDisplayProps> = ({ transcription, summary, audioUrl }) => {
  const [copied, setCopied] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    
    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };
    
    audio.addEventListener('timeupdate', handleTimeUpdate);
    
    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
    };
  }, [audioUrl]);

  const plainTextTranscription = transcription.map(item => item.word).join(' ');

  const handleCopy = () => {
    navigator.clipboard.writeText(plainTextTranscription);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Simple markdown-like parser for bold text and bullet points
  const formatSummary = (text: string) => {
    return text
      .split('\n')
      .map((line, index) => {
        if (line.startsWith('* ')) {
          return <li key={index} className="ml-5 list-disc">{line.substring(2)}</li>;
        }
        if(line.trim() === '') return <br key={index} />;
        return <p key={index}>{line}</p>;
      })
  };

  return (
    <div className="bg-brand-surface rounded-xl shadow-2xl p-6 md:p-8 border border-gray-700 flex flex-col gap-8 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold text-brand-primary mb-4 flex items-center gap-2">
          <SparklesIcon className="w-6 h-6" />
          Resumo da IA
        </h2>
        <div className="prose prose-invert max-w-none text-brand-text space-y-2">
            {formatSummary(summary)}
        </div>
      </div>
      <div className="border-t border-gray-700"></div>
      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-brand-primary flex items-center gap-2">
            <DocumentTextIcon className="w-6 h-6" />
            Transcrição Completa
          </h2>
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-gray-700 hover:bg-gray-600 rounded-md transition-colors"
          >
            {copied ? <CheckIcon className="w-5 h-5 text-green-400" /> : <CopyIcon className="w-5 h-5" />}
            {copied ? 'Copiado!' : 'Copiar'}
          </button>
        </div>
        <div className="mb-4">
            <audio ref={audioRef} src={audioUrl} controls className="w-full"></audio>
        </div>
        <div className="max-h-60 overflow-y-auto p-4 bg-gray-900/50 rounded-md text-brand-text-secondary leading-relaxed">
          <p>
            {transcription.map((item, index) => {
              const isHighlighted = currentTime >= item.startTime && currentTime < item.endTime;
              return (
                <span key={index} className={isHighlighted ? 'highlight' : ''}>
                  {item.word}{' '}
                </span>
              );
            })}
          </p>
        </div>
      </div>
    </div>
  );
};