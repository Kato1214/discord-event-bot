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

// ✅ イベント登録時の通知
client.on('guildScheduledEventCreate', async (event) => {
  const channel = event.guild.channels.cache.find(
    ch => ch.name === 'イベントのお知らせ' && ch.isTextBased()
  );
  if (!channel) return;

  const date = new Date(event.scheduledStartTimestamp);
  const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
  const formattedDate = `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 (${weekdays[date.getDay()]}) ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;

  const embed = new EmbedBuilder()
    .setTitle(event.name.replace(/【|】/g, '')) // 【】除去
    .setDescription(event.description || '（説明なし）')
    .addFields(
      { name: '開催日', value: formattedDate }
    )
    .setColor(0xF59E0B) // オレンジ
    .setImage(event.image || null); // カバー画像がある場合のみ表示

  await channel.send({ content: '@everyone\n📅 新しいイベントが追加されました！', embeds: [embed] });
  await channel.send(`\n${event.url}\n`);
});

// ✅ イベント開始時の通知
client.on('guildScheduledEventUpdate', async (oldEvent, newEvent) => {
  if (oldEvent.status !== newEvent.status && newEvent.status === 2) { // 2 = ACTIVE
    const channel = newEvent.guild.channels.cache.find(
      ch => ch.name === 'イベントのお知らせ' && ch.isTextBased()
    );
    if (!channel) return;

    const embed = new EmbedBuilder()
      .setTitle(newEvent.name.replace(/【|】/g, ''))
      .setDescription(newEvent.description || '（説明なし）')
      .setColor(0x22C55E) // 緑
      .setImage(newEvent.image || null); // カバー画像がある場合のみ表示

    await channel.send({ content: '@everyone\n📣 イベントが始まりました！', embeds: [embed] });
    await channel.send(`\n${newEvent.url}\n`);
  }
});

client.login(process.env.TOKEN);
