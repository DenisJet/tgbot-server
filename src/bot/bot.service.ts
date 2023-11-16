import { Injectable, OnModuleInit } from '@nestjs/common';
import { Prisma, Reputations } from '@prisma/client';
import TelegramBot = require('node-telegram-bot-api');
import { PrismaService } from 'src/prisma.service';

@Injectable()
export class BotService implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    this.botMessage();
  }

  async botMessage() {
    const bot = new TelegramBot(process.env.BOT_API_TOKEN, { polling: true });
    const thanksWords = [
      'спасибо',
      'спс',
      'благодарю',
      'заработало',
      'сработало',
      '👍',
    ];

    bot.on('new_chat_members', (msg) =>
      bot.sendMessage(
        msg.chat.id,
        `Привет, ${msg.new_chat_members[0].first_name}! Это чат тестового приложения tgBot.`,
      ),
    );

    bot.on('message', (msg) => {
      if (msg?.sticker) {
        if (msg.sticker.emoji === '👍') {
          this.handleThanksWordReaction(msg, bot);
        }
        return;
      }

      if (msg?.reply_to_message) {
        if (
          msg.reply_to_message.from.username === 'tgBot' ||
          msg.reply_to_message.from.username ===
            msg.reply_to_message.from.username
        ) {
          return;
        }

        const thanksWord = msg.text
          .toLowerCase()
          .split(' ')
          .find((word) =>
            thanksWords.includes(
              word.replace(/[&\/\\#,+()$~%.'":*?!<>{}]/g, ''),
            ),
          );

        if (thanksWord) {
          this.handleThanksWordReaction(msg, bot);
        }
      }
    });
  }

  async sendReputationMessage(
    chatId: number,
    replyUserName: string,
    fromUserName: string,
    bot: TelegramBot,
    telegramId: string,
  ) {
    const reputationData = await this.getReputation(telegramId);
    bot.sendMessage(
      chatId,
      `Поздравляю, ${replyUserName}! Участник ${fromUserName} повысил твою репутацию! Твоя репутация ${reputationData.reputation}`,
      {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: 'Статистика чата',
                url: 'http://google.com',
              },
            ],
          ],
        },
      },
    );
  }

  async getReputation(telegramId: string): Promise<Reputations> {
    return await this.prisma.reputations.findFirst({
      where: { telegramId },
    });
  }

  async updateReputation(reputation: number, id: number): Promise<void> {
    await this.prisma.reputations.update({
      where: { id },
      data: { reputation },
    });
  }

  async addNewReputation(data: Prisma.ReputationsCreateInput): Promise<void> {
    await this.prisma.reputations.create({ data });
  }

  async increaseReputation(
    telegramId: string,
    userName: string,
    fullName: string,
    userAvatar,
  ) {
    const reputationData = await this.getReputation(telegramId);

    if (reputationData) {
      await this.updateReputation(
        reputationData.reputation + 1,
        reputationData.id,
      );
      return;
    }

    await this.addNewReputation({
      telegramId,
      userName,
      userAvatar,
      fullName,
      reputation: 1,
    });
  }

  async handleThanksWordReaction(msg: TelegramBot.Message, bot: TelegramBot) {
    const telegramId = String(msg.reply_to_message.from.id);
    const avatarUrl = await this.getUserAvatarUrl(
      msg.reply_to_message.from.id,
      bot,
    );

    await this.increaseReputation(
      telegramId,
      msg.reply_to_message.from?.username
        ? msg.reply_to_message.from.username
        : '',
      avatarUrl,
      `${msg.reply_to_message.from?.first_name} ${msg.reply_to_message.from?.last_name}`,
    );

    await this.sendReputationMessage(
      msg.chat.id,
      `${msg.reply_to_message.from.first_name} ${
        msg.reply_to_message.from?.username
          ? `(@${msg.reply_to_message.from?.username})`
          : ''
      }`,
      msg.from.first_name,
      bot,
      telegramId,
    );
  }

  async getUserAvatarUrl(userId: number, bot: TelegramBot) {
    const userProfile = await bot.getUserProfilePhotos(userId);

    if (!userProfile.photos.length) {
      return '';
    }

    const fileId = userProfile.photos[0][0].file_id;
    const file = await bot.getFile(fileId);
    const filePath = file.file_path;

    return `https://api.telegram.org/file/bot${process.env.BOT_API_TOKEN}/${filePath}`;
  }
}
