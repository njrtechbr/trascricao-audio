
import React, { useState, useRef, useCallback } from 'react';
import { UploadIcon } from './icons/UploadIcon';
import { FileIcon } from './icons/FileIcon';
import { CloseIcon } from './icons/CloseIcon';

interface AudioUploaderProps {
  onFileSelect: (file: File | null) => void;
  disabled: boolean;
}

export const AudioUploader: React.FC<AudioUploaderProps> = ({ onFileSelect, disabled }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
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
      } else {
        alert('Por favor, solte um arquivo de áudio.');
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setSelectedFile(files[0]);
      onFileSelect(files[0]);
    }
  };
  
  const handleRemoveFile = () => {
      setSelectedFile(null);
      onFileSelect(null);
      if (inputRef.current) {
          inputRef.current.value = "";
      }
  }

  const openFileDialog = () => {
    if (inputRef.current) {
      inputRef.current.click();
    }
  };

  return (
    <div>
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
          className={`flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg cursor-pointer transition-colors duration-300 ${
            disabled ? 'cursor-not-allowed bg-gray-800/50' :
            isDragging ? 'border-brand-primary bg-cyan-900/20' : 'border-gray-600 hover:border-brand-primary hover:bg-gray-800/50'
          }`}
        >
          <UploadIcon className="w-12 h-12 text-gray-500 mb-4" />
          <p className="text-brand-text font-semibold">
            Arraste e solte seu arquivo de áudio aqui
          </p>
          <p className="text-brand-text-secondary text-sm mt-1">ou clique para procurar</p>
        </div>
      ) : (
        <div className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg border border-gray-700">
          <div className="flex items-center gap-3">
            <FileIcon className="w-6 h-6 text-brand-primary"/>
            <span className="font-medium text-brand-text">{selectedFile.name}</span>
          </div>
          <button onClick={handleRemoveFile} disabled={disabled} className="text-gray-500 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed">
            <CloseIcon className="w-6 h-6" />
          </button>
        </div>
      )}
    </div>
  );
};
