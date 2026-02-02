import { ElevenLabsClient } from 'elevenlabs';
import * as fs from 'fs';
import * as path from 'path';

const AMUN_VOICE_ID = 'RXPQcKYH6wnQn5NLiWCD';

let connectionSettings: any;

async function getCredentials(): Promise<string> {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=elevenlabs',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  if (!connectionSettings || !connectionSettings.settings.api_key) {
    throw new Error('ElevenLabs no conectado');
  }
  return connectionSettings.settings.api_key;
}

async function getElevenLabsClient(): Promise<ElevenLabsClient> {
  const apiKey = await getCredentials();
  return new ElevenLabsClient({ apiKey });
}

class VoiceService {
  private initialized = false;

  async initialize(): Promise<boolean> {
    try {
      await getCredentials();
      this.initialized = true;
      console.log('[Voice] ElevenLabs conectado con voz AMUN');
      return true;
    } catch (err) {
      console.log('[Voice] ElevenLabs no disponible:', (err as Error).message);
      return false;
    }
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  async textToSpeech(text: string): Promise<{ success: boolean; audioPath?: string; error?: string }> {
    try {
      const client = await getElevenLabsClient();
      
      const audioStream = await client.textToSpeech.convert(AMUN_VOICE_ID, {
        text: text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.3,
          use_speaker_boost: true
        }
      });

      const generatedDir = path.join(process.cwd(), 'generated');
      if (!fs.existsSync(generatedDir)) {
        fs.mkdirSync(generatedDir, { recursive: true });
      }

      const filename = `voice_${Date.now()}.mp3`;
      const filepath = path.join(generatedDir, filename);

      const chunks: Buffer[] = [];
      for await (const chunk of audioStream) {
        chunks.push(Buffer.from(chunk));
      }
      
      fs.writeFileSync(filepath, Buffer.concat(chunks));
      console.log(`[Voice] Audio generado: ${filepath}`);

      return { success: true, audioPath: filepath };
    } catch (err) {
      console.error('[Voice] Error generando audio:', err);
      return { success: false, error: (err as Error).message };
    }
  }

  async transcribeAudio(audioBuffer: Buffer, filename: string): Promise<{ success: boolean; text?: string; error?: string }> {
    try {
      const apiKey = await getCredentials();
      
      const formData = new FormData();
      formData.append('file', new Blob([audioBuffer]), filename);
      formData.append('model_id', 'scribe_v1');
      
      const response = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
        method: 'POST',
        headers: { 'xi-api-key': apiKey },
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Transcripción fallida: ' + response.statusText);
      }
      
      const result = await response.json();
      console.log(`[Voice] Audio transcrito: "${result.text}"`);
      return { success: true, text: result.text };
    } catch (err) {
      console.error('[Voice] Error transcribiendo:', err);
      return { success: false, error: (err as Error).message };
    }
  }
}

export const voiceService = new VoiceService();
