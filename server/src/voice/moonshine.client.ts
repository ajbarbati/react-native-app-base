import { HttpService } from '@nestjs/axios';
import {
  BadGatewayException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AxiosError } from 'axios';
import FormData from 'form-data';
import { firstValueFrom } from 'rxjs';

export interface SttResponse {
  text: string;
  language?: string;
  sampleRate?: number;
}

export interface TtsResponse {
  encoding: string;
  sampleRate: number;
  audioBase64: string;
}

function formatUpstreamDetail(detail: unknown): string {
  if (typeof detail === 'string') return detail;
  if (detail === undefined || detail === null) return '';
  try {
    return JSON.stringify(detail);
  } catch {
    return String(detail);
  }
}

@Injectable()
export class MoonshineClient {
  private readonly logger = new Logger(MoonshineClient.name);

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {}

  private baseUrl(): string {
    const raw =
      this.config.get<string>('MOONSHINE_SERVICE_URL')?.trim() ||
      'http://127.0.0.1:8765';
    return raw.replace(/\/$/, '');
  }

  async transcribeWav(wavBuffer: Buffer, language = 'en'): Promise<SttResponse> {
    const form = new FormData();
    form.append('audio', wavBuffer, {
      filename: 'turn.wav',
      contentType: 'audio/wav',
    });
    form.append('language', language);

    const url = `${this.baseUrl()}/v1/stt`;
    try {
      const { data } = await firstValueFrom(
        this.http.post<SttResponse>(url, form, {
          headers: form.getHeaders(),
          timeout: 120_000,
          maxBodyLength: Infinity,
          maxContentLength: Infinity,
        }),
      );
      if (typeof data?.text !== 'string') {
        throw new BadGatewayException('Invalid STT response shape');
      }
      return data;
    } catch (err) {
      this.rethrowVoiceHttp('STT', err);
    }
  }

  async synthesize(
    text: string,
    opts?: { language?: string; voice?: string },
  ): Promise<TtsResponse> {
    const url = `${this.baseUrl()}/v1/tts`;
    try {
      const { data } = await firstValueFrom(
        this.http.post<TtsResponse>(
          url,
          {
            text,
            language: opts?.language,
            voice: opts?.voice,
          },
          {
            headers: { 'Content-Type': 'application/json' },
            timeout: 120_000,
          },
        ),
      );
      if (
        typeof data?.audioBase64 !== 'string' ||
        typeof data?.sampleRate !== 'number' ||
        typeof data?.encoding !== 'string'
      ) {
        throw new BadGatewayException('Invalid TTS response shape');
      }
      return data;
    } catch (err) {
      this.rethrowVoiceHttp('TTS', err);
    }
  }

  private rethrowVoiceHttp(label: string, err: unknown): never {
    if (err instanceof BadGatewayException) throw err;

    const ax = err as AxiosError<{ detail?: unknown }>;
    const status = ax.response?.status;
    const detail = formatUpstreamDetail(ax.response?.data?.detail);
    const fallback = ax.message || `${label} request failed`;

    this.logger.warn(
      `${label} voice-service error: ${status ?? 'no-status'} ${detail || fallback}`,
    );

    if (!ax.response) {
      throw new ServiceUnavailableException(
        `Voice service unreachable: ${fallback}`,
      );
    }

    if (status === 503) {
      throw new ServiceUnavailableException(detail || 'Voice service unavailable');
    }

    throw new BadGatewayException(detail || `${label} request failed`);
  }
}
