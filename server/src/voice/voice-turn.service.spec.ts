import { BadRequestException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ChatCompletionService } from '../chat/chat-completion.service';
import { MoonshineClient } from './moonshine.client';
import { VoiceTurnService } from './voice-turn.service';

describe('VoiceTurnService', () => {
  let service: VoiceTurnService;
  let moonshine: {
    transcribeWav: jest.Mock;
    synthesize: jest.Mock;
  };
  let chatCompletion: { complete: jest.Mock };

  beforeEach(async () => {
    moonshine = {
      transcribeWav: jest.fn().mockResolvedValue({ text: ' hello ' }),
      synthesize: jest.fn().mockResolvedValue({
        encoding: 'wav',
        sampleRate: 24000,
        audioBase64: 'QQ==',
      }),
    };
    chatCompletion = {
      complete: jest.fn().mockResolvedValue('AI says hi'),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        VoiceTurnService,
        { provide: MoonshineClient, useValue: moonshine },
        { provide: ChatCompletionService, useValue: chatCompletion },
      ],
    }).compile();

    service = moduleRef.get(VoiceTurnService);
  });

  it('runs STT → chat → TTS', async () => {
    const wav = Buffer.from('fake-wav');
    const out = await service.runTurn(wav, 'en', 'my-model');

    expect(moonshine.transcribeWav).toHaveBeenCalledWith(wav, 'en');
    expect(chatCompletion.complete).toHaveBeenCalledWith(' hello ', 'my-model');
    expect(moonshine.synthesize).toHaveBeenCalledWith('AI says hi');

    expect(out.transcript).toBe(' hello ');
    expect(out.reply).toBe('AI says hi');
    expect(out.encoding).toBe('wav');
    expect(out.sampleRate).toBe(24000);
    expect(out.replyAudioBase64).toBe('QQ==');
  });

  it('rejects empty transcript', async () => {
    moonshine.transcribeWav.mockResolvedValue({ text: '   \n' });
    await expect(service.runTurn(Buffer.from('x'))).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(chatCompletion.complete).not.toHaveBeenCalled();
    expect(moonshine.synthesize).not.toHaveBeenCalled();
  });
});
