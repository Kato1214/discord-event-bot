const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
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

// 📅 イベント作成通知
client.on('guildScheduledEventCreate', async (event) => {
  const channel = event.guild.channels.cache.find(
    ch => ch.name === 'イベントのお知らせ' && ch.isTextBased()
  );
  if (!channel) return;

  const date = new Date(event.scheduledStartTimestamp);
  const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
  const formattedDate = `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 (${weekdays[date.getDay()]}) ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;

  const coverImage = event.coverImage
    ? `https://cdn.discordapp.com/app-events/${event.id}/${event.coverImage}.png`
    : null;

  const embed = new EmbedBuilder()
    .setTitle(event.name)
    .addFields(
      { name: '開催日', value: formattedDate, inline: false },
      { name: '説明', value: (event.description || '（説明なし）').trim(), inline: false }
    )
    .setURL(event.url)
    .setColor(0x2F3136);

  if (coverImage) {
    embed.setImage(coverImage);
  }

  channel.send({
    content: '@everyone\n📅 **新しいイベントが追加されました！**',
    embeds: [embed]
  });
});

// 📣 イベント開始通知（改訂版）
client.on('guildScheduledEventUpdate', async (oldEvent, newEvent) => {
  if (oldEvent.status !== newEvent.status && newEvent.status === 2) {
    const channel = newEvent.guild.channels.cache.find(
      ch => ch.name === 'イベントのお知らせ' && ch.isTextBased()
    );
    if (!channel) return;

    const date = new Date(newEvent.scheduledStartTimestamp);
    const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
    const formattedDate = `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 (${weekdays[date.getDay()]}) ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}〜`;

    const descriptionText = `**開始時間**\n${formattedDate}\n\n**説明**\n2034年に向けて世の中はどうなっていくのか？AIはどのように進歩してくのか？\n\n具体的なタイムラインに沿った社会変化、各フェーズで要求される適応能力、変化の波に乗るためのポジショニングを考えます。`;

    const coverImage = newEvent.coverImage
      ? `https://cdn.discordapp.com/app-events/${newEvent.id}/${newEvent.coverImage}.png`
      : null;

    const embed = new EmbedBuilder()
      .setTitle(newEvent.name)
      .setDescription(descriptionText)
      .setColor(0xFFB347);

    if (coverImage) {
      embed.setImage(coverImage);
    }

    await channel.send({
      content: '@everyone\n📣 **イベントが始まりました！**',
      embeds: [embed]
    });

    await channel.send(`[⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯](${newEvent.url})`);
  }
});

client.login(process.env.TOKEN);
