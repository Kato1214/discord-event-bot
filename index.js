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
    ch => ch.name === 'イベントのお知らせ' && ch.isTextBased()
  );
  if (!channel) return;

  const date = new Date(event.scheduledStartTimestamp);
  const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
  const formattedDate = `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 (${weekdays[date.getDay()]}) ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;

  await channel.send(`@everyone\n📅 **新しいイベントが追加されました！**`);

  await channel.send({
    embeds: [
      {
        title: event.name.replace(/[【】]/g, ''),
        description:
          `**開催日**\n${formattedDate}\n\n` +
          `**説明**\n${event.description || '（説明なし）'}`,
        color: 0x00aaff
      }
    ]
  });

  // URLを区切り線に埋め込み（非表示にしてカードだけ出す）
  await channel.send(`────────────── ${event.url} ──────────────`);
});

// イベントが開始されたときの通知
client.on('guildScheduledEventUpdate', async (oldEvent, newEvent) => {
  if (oldEvent.status !== newEvent.status && newEvent.status === 2) { // ACTIVE
    const channel = newEvent.guild.channels.cache.find(
      ch => ch.name === 'イベントのお知らせ' && ch.isTextBased()
    );
    if (!channel) return;

    await channel.send(`@everyone\n📣 **イベントが始まりました！**`);

    await channel.send({
      embeds: [
        {
          title: newEvent.name.replace(/[【】]/g, ''),
          description: newEvent.description || '（説明なし）',
          color: 0xff9900
        }
      ]
    });

    await channel.send(`────────────── ${newEvent.url} ──────────────`);
  }
});

client.login(process.env.TOKEN);
