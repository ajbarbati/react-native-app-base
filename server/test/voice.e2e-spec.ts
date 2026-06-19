import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import nock from 'nock';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { ChatCompletionService } from '../src/chat/chat-completion.service';

const MOONSHINE_BASE = 'http://127.0.0.1:8765';

/** Minimal valid mono 16-bit PCM WAV (silence) for multipart uploads. */
function minimalWavBuffer(): Buffer {
  const sampleRate = 16000;
  const numSamples = 320;
  const dataSize = numSamples * 2;
  const byteRate = sampleRate * 2;
  const blockAlign = 2;
  const buf = Buffer.alloc(44 + dataSize);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + dataSize, 4);
  buf.write('WAVE', 8);
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE(byteRate, 28);
  buf.writeUInt16LE(blockAlign, 32);
  buf.writeUInt16LE(16, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(dataSize, 40);
  return buf;
}

describe('VoiceController (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(() => {
    process.env.MOONSHINE_SERVICE_URL = MOONSHINE_BASE;
  });

  afterEach(() => {
    nock.cleanAll();
  });

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(ChatCompletionService)
      .useValue({ complete: async () => 'Short reply.' })
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('POST /voice/turn chains Moonshine STT/TTS and chat', async () => {
    nock(MOONSHINE_BASE)
      .post('/v1/stt')
      .reply(200, { text: 'User spoke', language: 'en', sampleRate: 16000 });

    const ttsPayload = {
      encoding: 'wav',
      sampleRate: 24000,
      audioBase64: minimalWavBuffer().toString('base64'),
    };
    nock(MOONSHINE_BASE).post('/v1/tts').reply(200, ttsPayload);

    const wav = minimalWavBuffer();
    const res = await request(app.getHttpServer())
      .post('/voice/turn')
      .query({ model: 'test-model', language: 'en' })
      .attach('audio', wav, { filename: 'turn.wav', contentType: 'audio/wav' })
      .expect(201);

    expect(res.body.transcript).toBe('User spoke');
    expect(res.body.reply).toBe('Short reply.');
    expect(res.body.encoding).toBe('wav');
    expect(res.body.sampleRate).toBe(24000);
    expect(typeof res.body.replyAudioBase64).toBe('string');
  });
});
