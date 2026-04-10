import { Body, Controller, Post } from '@nestjs/common';
import { ChatCompletionService } from './chat-completion.service';
import { ChatMessageDto } from './dto/chat-message.dto';

@Controller()
export class ChatController {
  constructor(private readonly chatCompletion: ChatCompletionService) {}

  @Post('chat')
  async chat(@Body() dto: ChatMessageDto) {
    const reply = await this.chatCompletion.complete(dto.message, dto.model);
    return { reply };
  }
}
