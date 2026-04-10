import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class ChatMessageDto {
  @IsString()
  @IsNotEmpty()
  message!: string;

  /** Optional override; defaults to CHAT_MODEL from env */
  @IsOptional()
  @IsString()
  model?: string;
}
