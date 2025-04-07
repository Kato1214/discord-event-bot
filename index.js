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

  // 開催日を「2025年4月12日 (土) 21:00」形式に整形
  const date = new Date(event.scheduledStartTimestamp);
  const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const weekday = weekdays[date.getDay()];
  const hour = date.getHours().toString().padStart(2, '0');
  const minute = date.getMinutes().toString().padStart(2, '0');
  const formattedDate = `${year}年${month}月${day}日 (${weekday}) ${hour}:${minute}`;

  const message = `@everyone\n📅 新しいイベントが追加されました！\n\n` +
    `**【${event.name}】**\n` +
    `**開催日**：${formattedDate}\n` +
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
