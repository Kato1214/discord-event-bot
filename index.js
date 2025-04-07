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

// 📅 新しいイベントが作成されたときの通知
client.on('guildScheduledEventCreate', async (event) => {
  const channel = event.guild.channels.cache.find(
    ch => ch.name === 'イベントのお知らせ' && ch.isTextBased()
  );
  if (!channel) return;

  const date = new Date(event.scheduledStartTimestamp);
  const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
  const formattedDate = `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 (${weekdays[date.getDay()]}) ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;

  const embed = new EmbedBuilder()
    .setTitle(`【${event.name}】`)
    .addFields(
      { name: '開催日', value: formattedDate, inline: false },
      { name: '説明', value: (event.description || '（説明なし）').trim(), inline: false }
    )
    .setURL(event.url)
    .setColor(0x2F3136) // ダークグレー
    .setFooter({ text: '▶︎ 詳細を見るにはタイトルをタップ' });

  channel.send({
    content: '@everyone\n📅 **新しいイベントが追加されました！**',
    embeds: [embed]
  });
});

// 📣 イベントが開始されたときの通知
client.on('guildScheduledEventUpdate', async (oldEvent, newEvent) => {
  if (oldEvent.status !== newEvent.status && newEvent.status === 2) { // 2 = ACTIVE
    const channel = newEvent.guild.channels.cache.find(
      ch => ch.name === 'イベントのお知らせ' && ch.isTextBased()
    );
    if (!channel) return;

    const embed = new EmbedBuilder()
      .setTitle(`【${newEvent.name}】`)
      .setDescription(`[▶︎ ここをタップして参加](${newEvent.url})`)
      .setColor(0xFFB347) // オレンジで注意喚起
      .setFooter({ text: 'イベントはすでに始まっています！' });

    channel.send({
      content: '@everyone\n📣 **イベントが始まりました！**',
      embeds: [embed]
    });
  }
});

client.login(process.env.TOKEN);
