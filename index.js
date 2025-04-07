// index.js
const { Client, GatewayIntentBits, Partials, Events } = require('discord.js');
require('dotenv').config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildScheduledEvents
  ],
  partials: [Partials.GuildScheduledEvent]
});

// ✅ Bot起動時
client.once(Events.ClientReady, () => {
  console.log(`✅ Botログイン成功：${client.user.tag}`);
});

// ✅ イベント作成通知
client.on(Events.GuildScheduledEventCreate, async (event) => {
  const channel = event.guild.channels.cache.find(c => c.name === 'イベントのお知らせ' && c.isTextBased());
  if (!channel) return;

  const timestamp = Math.floor(event.scheduledStartTimestamp / 1000);

  await channel.send({
    content: `@everyone\n📅 **新しいイベントが追加されました！**\n\n**タイトル**：${event.name}\n**開催日**：<t:${timestamp}:F>\n**説明**：${event.description || '（説明なし）'}\n\n**参加URL**：[イベントを見る](${event.url})`
  });
});

// ✅ イベント開始通知
client.on(Events.GuildScheduledEventUpdate, async (oldEvent, newEvent) => {
  if (oldEvent.status !== newEvent.status && newEvent.status === 2) { // status 2 = ACTIVE
    const channel = newEvent.guild.channels.cache.find(c => c.name === 'イベントのお知らせ' && c.isTextBased());
    if (!channel) return;

    await channel.send({
      content: `@everyone\n📣 **イベントが始まりました！**\n\n**タイトル**：${newEvent.name}\n➡︎ [タップで参加する](${newEvent.url})`
    });
  }
});

client.login(process.env.TOKEN);
