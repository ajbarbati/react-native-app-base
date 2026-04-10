import { HttpService } from '@nestjs/axios';
import {
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AxiosError } from 'axios';
import { firstValueFrom } from 'rxjs';

/** OpenAI-compatible chat completion response (subset). */
interface ChatCompletionResponse {
  choices?: Array<{
    message?: { content?: string | null };
  }>;
}

/**
 * Calls any OpenAI-compatible `POST /v1/chat/completions` endpoint.
 * Defaults match local Ollama (`http://127.0.0.1:11434`).
 */
@Injectable()
export class ChatCompletionService {
  private readonly logger = new Logger(ChatCompletionService.name);

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {}

  async complete(userMessage: string, modelOverride?: string): Promise<string> {
    const baseUrl =
      this.config.get<string>('CHAT_API_BASE_URL')?.trim() ||
      'http://127.0.0.1:11434';
    const model =
      modelOverride?.trim() ||
      this.config.get<string>('CHAT_MODEL')?.trim() ||
      'glm-4.7-flash';
    const apiKey = this.config.get<string>('CHAT_API_KEY')?.trim();

    const url = `${baseUrl.replace(/\/$/, '')}/v1/chat/completions`;
    const body = {
      model,
      messages: [{ role: 'user' as const, content: userMessage }],
    };

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (apiKey) {
      headers.Authorization = `Bearer ${apiKey}`;
    }

    try {
      const { data } = await firstValueFrom(
        this.http.post<ChatCompletionResponse>(url, body, {
          headers,
          timeout: 120_000,
        }),
      );

      const content = data?.choices?.[0]?.message?.content;
      if (typeof content !== 'string' || !content.length) {
        this.logger.warn('Unexpected chat completion response shape');
        throw new HttpException(
          'Empty or invalid response from LLM API',
          HttpStatus.BAD_GATEWAY,
        );
      }
      return content;
    } catch (err) {
      if (err instanceof HttpException) throw err;

      const ax = err as AxiosError<{ error?: { message?: string }; message?: string }>;
      const status = ax.response?.status ?? HttpStatus.BAD_GATEWAY;
      const upstream =
        ax.response?.data?.error?.message ??
        ax.response?.data?.message ??
        ax.message;

      this.logger.warn(`Chat completion error: ${status} ${upstream}`);

      throw new HttpException(
        typeof upstream === 'string' ? upstream : 'LLM request failed',
        status >= 400 && status < 600 ? status : HttpStatus.BAD_GATEWAY,
      );
    }
  }
}
