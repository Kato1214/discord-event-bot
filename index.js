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

client.on('guildScheduledEventCreate', async (event) => {
  const channel = event.guild.channels.cache.find(
    ch => ch.name === 'イベントスケジュール' && ch.isTextBased()
  );
  if (!channel) return;

  const message = `@everyone\n📅 **新しいイベントが追加されました！**\n\n` +
    `**タイトル**：${event.name}\n` +
    `**開催日**：<t:${Math.floor(event.scheduledStartTimestamp / 1000)}:F>\n` +
    `**説明**：${event.description || '（説明なし）'}\n` +
    `**参加URL**：[イベントを見る](${event.url})`;

  channel.send(message);
});

client.login(process.env.TOKEN);
