import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ChatCompletionService } from './chat-completion.service';
import { ChatController } from './chat.controller';

@Module({
  imports: [HttpModule],
  controllers: [ChatController],
  providers: [ChatCompletionService],
})
export class ChatModule {}
