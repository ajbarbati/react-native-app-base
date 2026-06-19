import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ChatModule } from '../chat/chat.module';
import { MoonshineClient } from './moonshine.client';
import { VoiceController } from './voice.controller';
import { VoiceTurnService } from './voice-turn.service';

@Module({
  imports: [
    HttpModule.register({
      timeout: 120_000,
      maxRedirects: 0,
    }),
    ChatModule,
  ],
  controllers: [VoiceController],
  providers: [MoonshineClient, VoiceTurnService],
})
export class VoiceModule {}
