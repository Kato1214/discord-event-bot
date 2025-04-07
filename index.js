const { Client, GatewayIntentBits } = require('discord.js');
require('dotenv').config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildScheduledEvents
  ]
});

client.once('ready', () => {
  console.log(`✅ Botログイン成功：${client.user.tag}`);
});

// 新しいイベントが作成されたときの通知
client.on('guildScheduledEventCreate', async (event) => {
  const channel = event.guild.channels.cache.find(
    ch => ch.name === 'イベントスケジュール' && ch.isTextBased()
  );
  if (!channel) return;

  const timestamp = Math.floor(event.scheduledStartTimestamp / 1000); // Discordフォーマット用UNIXタイム

  const message = `@everyone\n📅 新しいイベントが追加されました！\n\n` +
    `**【${event.name}】**\n` +
    `**開催日**：<t:${timestamp}:F>\n` +
    `**説明**：${event.description || '（説明なし）'}\n\n` +
    `   ➡︎ [詳細を見る](${event.url})`;

  channel.send(message);
});

// イベントが開始されたときの通知
client.on('guildScheduledEventUpdate', async (oldEvent, newEvent) => {
  if (oldEvent.status !== newEvent.status && newEvent.status === 2) { // 2 = ACTIVE
    const channel = newEvent.guild.channels.cache.find(
      ch => ch.name === 'イベントスケジュール' && ch.isTextBased()
    );
    if (!channel) return;

    const message = `@everyone\n📣 **イベントが始まりました！**\n` +
      `**【${newEvent.name}】**\n` +
      `   ➡︎ [タップで参加する](${newEvent.url})`;

    channel.send(message);
  }
});

client.login(process.env.TOKEN);
