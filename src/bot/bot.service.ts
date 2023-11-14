import { Injectable, OnModuleInit } from '@nestjs/common';
import TelegramBot from 'node-telegram-bot-api';
import { PrismaService } from 'src/prisma.service';

@Injectable()
export class BotService implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    await this.$connect();
  }

  async botMessage() {
    const bot = new TelegramBot(process.env.BOT_API_TOKEN, { polling: true });
  }
}
