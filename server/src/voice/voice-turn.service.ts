import { BadRequestException, Injectable } from '@nestjs/common';
import { ChatCompletionService } from '../chat/chat-completion.service';
import { MoonshineClient } from './moonshine.client';

@Injectable()
export class VoiceTurnService {
  constructor(
    private readonly moonshine: MoonshineClient,
    private readonly chatCompletion: ChatCompletionService,
  ) {}

  /**
   * STT → LLM (OpenAI-compatible chat) → TTS.
   */
  async runTurn(
    wavBuffer: Buffer,
    language = 'en',
    model?: string,
  ): Promise<{
    transcript: string;
    reply: string;
    encoding: string;
    sampleRate: number;
    replyAudioBase64: string;
  }> {
    const { text } = await this.moonshine.transcribeWav(wavBuffer, language);
    if (!text.trim()) {
      throw new BadRequestException('No speech recognized in audio');
    }

    const reply = await this.chatCompletion.complete(text, model);
    const tts = await this.moonshine.synthesize(reply);

    return {
      transcript: text,
      reply,
      encoding: tts.encoding,
      sampleRate: tts.sampleRate,
      replyAudioBase64: tts.audioBase64,
    };
  }
}
