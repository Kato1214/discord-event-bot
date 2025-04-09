const { Client, GatewayIntentBits } = require('discord.js');
const { TwitterApi } = require('twitter-api-v2');
require('dotenv').config();

// Discordクライアント設定
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildScheduledEvents
  ]
});

client.once('ready', () => {
  console.log(`✅ Botログイン成功：${client.user.tag}`);
});

// Twitterクライアント（OAuth 1.0a 認証）
const twitterClient = new TwitterApi({
  appKey: process.env.TWITTER_API_KEY,
  appSecret: process.env.TWITTER_API_SECRET,
  accessToken: process.env.TWITTER_ACCESS_TOKEN,
  accessSecret: process.env.TWITTER_ACCESS_SECRET
});

// 投稿文整形
function formatXPost(eventName, dateStr, description, url, isStart = false) {
  const prefix = isStart ? '📣 イベントが始まりました！' : '📅新しいイベントが追加されました！';
  const maxDescLength = 100;
  const cleanDesc = (description || '').replace(/\n/g, ' ').trim();
  const shortDesc = cleanDesc.length > maxDescLength
    ? cleanDesc.slice(0, maxDescLength).trim() + '…'
    : cleanDesc;
  return `${prefix}\n\n【${eventName}】\n\n${isStart ? '開始時間' : '開催日'}\n${dateStr}\n\n説明\n${shortDesc}\n${url}`;
}

// Xに投稿する関数
async function postToX(text) {
  console.log('📝 Xに投稿する内容:\n', text);
  try {
    await twitterClient.v1.tweet(text);
    console.log('✅ Xに投稿しました');
  } catch (err) {
    console.error('❌ X投稿エラー:', err);
  }
}

// 新しいイベントが作成されたとき
client.on('guildScheduledEventCreate', async (event) => {
  const channel = event.guild.channels.cache.find(
    ch => ch.name === 'イベントのお知らせ' && ch.isTextBased()
  );
  if (!channel) return;

  // JST変換
  const date = new Date(event.scheduledStartTimestamp);
  date.setHours(date.getHours() + 9);

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
  await channel.send(`[⎯⎯⎯⎯⎯⎯⎯⎯] ${event.url} `);

  const xText = formatXPost(event.name, formattedDate, event.description, event.url);
  await postToX(xText);
});

// イベントが開始されたとき
client.on('guildScheduledEventUpdate', async (oldEvent, newEvent) => {
  if (oldEvent.status !== newEvent.status && newEvent.status === 2) {
    const channel = newEvent.guild.channels.cache.find(
      ch => ch.name === 'イベントのお知らせ' && ch.isTextBased()
    );
    if (!channel) return;

    // JST変換
    const date = new Date(newEvent.scheduledStartTimestamp);
    date.setHours(date.getHours() + 9);

    const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
    const formattedDate = `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 (${weekdays[date.getDay()]}) ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}〜`;

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
    await channel.send(`[⎯⎯⎯⎯⎯⎯⎯⎯] ${newEvent.url} `);

    const xText = formatXPost(newEvent.name, formattedDate, newEvent.description, newEvent.url, true);
    await postToX(xText);
  }
});

client.login(process.env.TOKEN);
