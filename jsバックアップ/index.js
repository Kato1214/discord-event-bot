/*───────────────────────────────────
 *  Discord → Google Calendar 連携 Bot
 *───────────────────────────────────*/

const fs   = require('fs');
const path = require('path');
const {
  Client,
  GatewayIntentBits,
  GuildScheduledEventStatus,
} = require('discord.js');
require('dotenv').config();

const {
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
} = require('./googleCalendar');

/*───────────────────────────────────
  Discord ⇔ Google イベント ID 対応テーブル
───────────────────────────────────*/
const mappingsPath = path.join(__dirname, 'eventMappings.json');

function loadMappings() {
  if (!fs.existsSync(mappingsPath)) return {};
  return JSON.parse(fs.readFileSync(mappingsPath, 'utf8'));
}
function saveMappings(obj) {
  fs.writeFileSync(mappingsPath, JSON.stringify(obj, null, 2));
}

/*───────────────────────────
  Discord クライアント
───────────────────────────*/
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildScheduledEvents],
});

client.once('ready', () => {
  console.log(`✅ Botログイン成功：${client.user.tag}`);
});

/* JST で日時を整形 */
function formatJST(ts) {
  const d = new Date(ts + 9 * 60 * 60 * 1000);
  const w = ['日','月','火','水','木','金','土'][d.getDay()];
  return `${d.getFullYear()}年${d.getMonth()+1}月${d.getDate()}日 (${w}) ${d
    .getHours()
    .toString()
    .padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;
}

/*───────────────────────────
  1. イベント作成 → Google へ登録
───────────────────────────*/
client.on('guildScheduledEventCreate', async (event) => {
  const channel = event.guild.channels.cache.find(
    ch => ch.name === 'イベントのお知らせ' && ch.isTextBased()
  );
  if (!channel) return;

  /* Google カレンダーへ登録 */
  try {
    const gEventId = await createCalendarEvent(event);
    const map = loadMappings();
    map[event.id] = gEventId;
    saveMappings(map);
    console.log('✅ GoogleカレンダーイベントIDを保存:', gEventId);
  } catch (e) {
    console.error('❌ Googleカレンダー登録エラー:', e.message);
  }

  /* Discord に通知 */
  await channel.send(`@everyone\n📅 **新しいイベントが追加されました！**`);
  await channel.send({
    embeds: [{
      title: event.name,
      description:
        `**開催日**\n${formatJST(event.scheduledStartTimestamp)}\n\n` +
        `**説明**\n${event.description || '（説明なし）'}`,
      color: 0x00aaff,
    }],
  });
  await channel.send(event.url);
});

/*───────────────────────────
  2. イベントの更新・開始・キャンセル
───────────────────────────*/
client.on('guildScheduledEventUpdate', async (oldEvent, newEvent) => {
  const channel = newEvent.guild.channels.cache.find(
    ch => ch.name === 'イベントのお知らせ' && ch.isTextBased()
  );
  if (!channel) return;

  const map      = loadMappings();
  const gEventId = map[newEvent.id];

  /*――― キャンセル（ステータス変更）―――*/
  if (
    oldEvent.status !== newEvent.status &&
    newEvent.status === GuildScheduledEventStatus.Canceled
  ) {
    if (gEventId) {
      try {
        await deleteCalendarEvent(gEventId);
        delete map[newEvent.id];
        saveMappings(map);
      } catch (e) {
        console.error('❌ Googleカレンダー削除エラー:', e.message);
      }
    }
    await channel.send(`@everyone\n🗑️ **イベントがキャンセルされました！**\n> ${newEvent.name}`);
    return;
  }

  /*――― 開始 ―――*/
  if (
    oldEvent.status !== newEvent.status &&
    newEvent.status === GuildScheduledEventStatus.Active
  ) {
    await channel.send(`@everyone\n📣 **イベントが始まりました！**\n> ${newEvent.name}`);
    await channel.send(newEvent.url);
    return;
  }

  /*――― 内容変更 ―――*/
  if (gEventId) {
    try {
      await updateCalendarEvent(gEventId, newEvent);
    } catch (e) {
      console.error('❌ Googleカレンダー更新エラー:', e.message);
    }
  } else {
    console.warn('⚠️ GoogleイベントID が見つからず更新できません');
  }
});

/*───────────────────────────
  3. Discord からイベントそのものが削除されたとき
───────────────────────────*/
client.on('guildScheduledEventDelete', async (event) => {
  const map      = loadMappings();
  const gEventId = map[event.id];
  if (!gEventId) return;  // 既に削除済み／登録されていない

  try {
    await deleteCalendarEvent(gEventId);
    delete map[event.id];
    saveMappings(map);
    console.log('🗑️ Discord削除 → Google も削除完了:', gEventId);
  } catch (e) {
    console.error('❌ Googleカレンダー削除エラー:', e.message);
  }
});

/*───────────────────────────*/
client.login(process.env.TOKEN);
