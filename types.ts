
export enum Status {
  Idle = 'idle',
  Transcribing = 'transcribing',
  Saving = 'saving',
  Summarizing = 'summarizing',
  Done = 'done',
  Error = 'error',
}

export interface WordTimestamp {
  word: string;
  startTime: number; // Tempo de início em segundos com precisão de milissegundos (ex: 1.234)
  endTime: number;   // Tempo de fim em segundos com precisão de milissegundos (ex: 1.567)
  confidence?: number; // Confiança da transcrição (0-1), opcional
  speaker?: string;    // Identificação do falante, opcional
}
