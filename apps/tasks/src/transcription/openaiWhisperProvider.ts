import { basename } from 'node:path';
import fs from 'node:fs/promises';

import { TranscriptionProvider, TranscriptionResult } from './provider';

export class OpenAIWhisperProvider implements TranscriptionProvider {
  constructor(private readonly apiKey: string) {}

  async transcribe(filePath: string, model: string): Promise<TranscriptionResult> {
    const audio = await fs.readFile(filePath);
    const fileType = getAudioMimeType(filePath);
    const form = new (globalThis as any).FormData();
    form.set('model', model);
    form.set('response_format', 'json');
    form.set('file', new (globalThis as any).Blob([audio], { type: fileType }), basename(filePath));

    const response = await (globalThis as any).fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`
      },
      body: form
    });

    const body = await response.text();
    if (!response.ok) throw new Error(`openai_http_${response.status}:${body.slice(0, 300)}`);

    const json = JSON.parse(body);
    const text = typeof json?.text === 'string' ? json.text.trim() : '';
    if (!text) throw new Error('openai_transcription_invalid_response:Missing text');

    return {
      text,
      usageSeconds: typeof json?.usage?.seconds === 'number' ? json.usage.seconds : null,
      rawUsage: json?.usage ?? null
    };
  }
}

function getAudioMimeType(filePath: string) {
  const lowerPath = filePath.toLowerCase();
  if (lowerPath.endsWith('.mp3')) return 'audio/mpeg';
  if (lowerPath.endsWith('.flac')) return 'audio/flac';
  if (lowerPath.endsWith('.wav')) return 'audio/wav';
  if (lowerPath.endsWith('.aac')) return 'audio/aac';
  if (lowerPath.endsWith('.ogg')) return 'audio/ogg';
  return 'application/octet-stream';
}
