
export enum Status {
  Idle = 'idle',
  Transcribing = 'transcribing',
  Summarizing = 'summarizing',
  Done = 'done',
  Error = 'error',
}

export interface WordTimestamp {
  word: string;
  startTime: number;
  endTime: number;
}
