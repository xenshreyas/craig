import { SYSTEM_PROMPT } from './prompt';

export class OpenAISummaryProvider {
  constructor(private readonly apiKey: string) {}

  async summarize(transcript: string, model: string): Promise<string> {
    const response = await (globalThis as any).fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model,
        input: [
          {
            role: 'system',
            content: [{ type: 'input_text', text: SYSTEM_PROMPT }]
          },
          {
            role: 'user',
            content: [{ type: 'input_text', text: `Create meeting notes from this transcript:\n\n${transcript}` }]
          }
        ]
      })
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(`summary_request_failed:${response.status}:${body.slice(0, 300)}`);
    }

    const json = await response.json();
    const text =
      json?.output_text ??
      json?.output
        ?.find((item: any) => item.type === 'message')
        ?.content?.find((c: any) => c.type === 'output_text')?.text;
    if (!text || typeof text !== 'string') {
      console.error('Summary response keys:', Object.keys(json || {}));
      console.error('Summary response output preview:', JSON.stringify(json?.output ?? null).slice(0, 4000));
      throw new Error('summary_invalid_response:Missing output_text');
    }
    return text.trim();
  }
}
