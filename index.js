const fs = require('fs');
const path = require('path');
const { Client, GatewayIntentBits } = require('discord.js');
<<<<<<< HEAD
const { createCalendarEvent } = require('./googleCalendar');
require('dotenv').config();

=======
// const { TwitterApi } = require('twitter-api-v2'); // ← Twitter一時停止
const { createCalendarEvent, updateCalendarEvent } = require('./googleCalendar');
require('dotenv').config();

const mappingsPath = path.join(__dirname, 'eventMappings.json');

function loadMappings() {
  if (!fs.existsSync(mappingsPath)) return {};
  return JSON.parse(fs.readFileSync(mappingsPath, 'utf8'));
}

function saveMappings(mappings) {
  fs.writeFileSync(mappingsPath, JSON.stringify(mappings, null, 2));
}

// Discordクライアント設定
>>>>>>> 828231e (Add Google Calendar integration and credentials)
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildScheduledEvents
  ]
});

client.once('ready', () => {
  console.log(`✅ Botログイン成功：${client.user.tag}`);
});

<<<<<<< HEAD
// 📅 イベント作成時：DiscordとGoogleカレンダーに登録
=======
/*
// Twitterクライアント（OAuth 1.0a 認証）
const twitterClient = new TwitterApi({
  appKey: process.env.TWITTER_API_KEY,
  appSecret: process.env.TWITTER_API_SECRET,
  accessToken: process.env.TWITTER_ACCESS_TOKEN,
  accessSecret: process.env.TWITTER_ACCESS_SECRET
});

// 投稿文整形関数
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
*/

// 新しいイベントが作成されたとき
>>>>>>> 828231e (Add Google Calendar integration and credentials)
client.on('guildScheduledEventCreate', async (event) => {
  const channel = event.guild.channels.cache.find(
    ch => ch.name === 'イベントのお知らせ' && ch.isTextBased()
  );
  if (!channel) return;

<<<<<<< HEAD
  const date = new Date(event.scheduledStartTimestamp);
  date.setHours(date.getHours() + 9); // JST変換

=======
  // Googleカレンダーに登録＋ID保存
  try {
    const calendarId = await createCalendarEvent(event);
    const mappings = loadMappings();
    mappings[event.id] = calendarId;
    saveMappings(mappings);
    console.log('✅ GoogleカレンダーイベントIDを保存:', calendarId);
  } catch (error) {
    console.error('❌ Googleカレンダー登録エラー:', error.message);
  }

  // JST変換
  const date = new Date(event.scheduledStartTimestamp);
  date.setHours(date.getHours() + 9);
>>>>>>> 828231e (Add Google Calendar integration and credentials)
  const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
  const formattedDate = `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 (${weekdays[date.getDay()]}) ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;

  // Discord通知
  await channel.send(`@everyone\n📅 **新しいイベントが追加されました！**`);
  await channel.send({
    embeds: [
      {
        title: event.name.replace(/[【】]/g, ''),
        description: `**開催日**\n${formattedDate}\n\n**説明**\n${event.description || '（説明なし）'}`,
        color: 0x00aaff
      }
    ]
  });
<<<<<<< HEAD
  await channel.send(`[⎯⎯⎯⎯⎯⎯⎯](${event.url})`);

  // 🗓 Googleカレンダーに登録
  try {
    const calendarId = await createCalendarEvent(event);
    console.log('✅ GoogleカレンダーイベントID:', calendarId);
    // ※今後、calendarIdを保存しておくと「更新」機能が追加できます
  } catch (error) {
    console.error('❌ Googleカレンダー登録エラー:', error.message);
  }
});

// 🔔 イベント開始通知（変更ではなく「開始」）
=======
  await channel.send(`[⎯⎯⎯⎯⎯⎯⎯⎯] ${event.url}`);

  // const xText = formatXPost(event.name, formattedDate, event.description, event.url);
  // await postToX(xText); // ← Twitter連携を一時停止中
});

// イベントが変更 or 開始されたとき
>>>>>>> 828231e (Add Google Calendar integration and credentials)
client.on('guildScheduledEventUpdate', async (oldEvent, newEvent) => {
  const channel = newEvent.guild.channels.cache.find(
    ch => ch.name === 'イベントのお知らせ' && ch.isTextBased()
  );
  if (!channel) return;

<<<<<<< HEAD
    const date = new Date(newEvent.scheduledStartTimestamp);
    date.setHours(date.getHours() + 9); // JST変換

=======
  // 📢 イベントが開始されたとき
  if (oldEvent.status !== newEvent.status && newEvent.status === 2) {
    const date = new Date(newEvent.scheduledStartTimestamp);
    date.setHours(date.getHours() + 9);
>>>>>>> 828231e (Add Google Calendar integration and credentials)
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
<<<<<<< HEAD
    await channel.send(`[⎯⎯⎯⎯⎯⎯⎯](${newEvent.url})`);
=======
    await channel.send(`[⎯⎯⎯⎯⎯⎯⎯⎯] ${newEvent.url}`);

    // const xText = formatXPost(newEvent.name, formattedDate, newEvent.description, newEvent.url, true);
    // await postToX(xText); // ← Twitter連携を一時停止中
    return;
  }

  // ✏️ イベントが更新されたとき
  const mappings = loadMappings();
  const googleEventId = mappings[newEvent.id];

  if (googleEventId) {
    try {
      await updateCalendarEvent(googleEventId, newEvent);
      console.log('✅ Googleカレンダーを更新しました');
    } catch (error) {
      console.error('❌ Googleカレンダー更新エラー:', error.message);
    }
  } else {
    console.warn('⚠️ GoogleイベントIDが見つからないため、更新できません');
>>>>>>> 828231e (Add Google Calendar integration and credentials)
  }
});

client.login(process.env.TOKEN);
