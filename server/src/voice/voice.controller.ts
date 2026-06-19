import {
  BadRequestException,
  Controller,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { VoiceTurnService } from './voice-turn.service';

const MAX_AUDIO_BYTES = 12 * 1024 * 1024;

@Controller('voice')
export class VoiceController {
  constructor(private readonly voiceTurn: VoiceTurnService) {}

  /**
   * Multipart field `audio`: WAV file. Optional query: `model`, `language` (STT locale hint).
   */
  @Post('turn')
  @UseInterceptors(
    FileInterceptor('audio', { limits: { fileSize: MAX_AUDIO_BYTES } }),
  )
  async turn(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Query('model') model?: string,
    @Query('language') language?: string,
  ) {
    if (!file?.buffer?.length) {
      throw new BadRequestException('Field "audio" (WAV) is required');
    }
    return this.voiceTurn.runTurn(file.buffer, language ?? 'en', model);
  }
}
