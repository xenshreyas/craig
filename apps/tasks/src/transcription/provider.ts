export interface TranscriptionResult {
  text: string;
  usageSeconds: number | null;
  rawUsage: unknown;
}

export interface TranscriptionProvider {
  transcribe(filePath: string, model: string): Promise<TranscriptionResult>;
}
