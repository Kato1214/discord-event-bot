require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');
const { Client, GatewayIntentBits, GuildScheduledEventStatus } = require('discord.js');

// ----- Configuration -----
const FILE_ID = process.env.DRIVE_FILE_ID;
const CALENDAR_ID = 'aixnexus2025@gmail.com';
const MAPPINGS_PATH = path.join(__dirname, 'eventMappings.json');

// ----- Google Auth Setup -----
const credJson = Buffer.from(process.env.GOOGLE_CREDENTIALS_B64, 'base64').toString('utf8');
const credentials = JSON.parse(credJson);
const authDrive = new google.auth.GoogleAuth({
  credentials,
  scopes: ['https://www.googleapis.com/auth/drive'],
});
const authCalendar = new google.auth.GoogleAuth({
  credentials,
  scopes: ['https://www.googleapis.com/auth/calendar'],
});

// ----- Drive Client Functions -----
async function getDriveClient() {
  const authClient = await authDrive.getClient();
  return google.drive({ version: 'v3', auth: authClient });
}

async function downloadFile(fileId, destPath) {
  const drive = await getDriveClient();
  console.log('📥 Google Drive ダウンロード開始:', fileId);
  const timeout = setTimeout(() => {
    console.error('⏰ タイムアウト: Google Drive ダウンロードが完了しませんでした');
    process.exit(1);
  }, 10000);
  const res = await drive.files.get({ fileId, alt: 'media' }, { responseType: 'stream' });
  const dest = fs.createWriteStream(destPath);
  await new Promise((resolve, reject) => {
    dest.on('finish', () => {
      clearTimeout(timeout);
      console.log('✅ ダウンロード完了（finish）');
      resolve();
    });
    dest.on('error', (err) => {
      clearTimeout(timeout);
      console.error('❌ 書き込みエラー:', err.message);
      reject(err);
    });
    res.data.pipe(dest);
  });
}

async function uploadFile(filePath) {
  const drive = await getDriveClient();
  const media = { mimeType: 'application/json', body: fs.createReadStream(filePath) };
  await drive.files.update({ fileId: FILE_ID, media });
  console.log('✅ Google Drive に eventMappings.json をアップロードしました');
}

// ----- Calendar Client Functions -----
async function calendarClient() {
  const authClient = await authCalendar.getClient();
  return google.calendar({ version: 'v3', auth: authClient });
}

async function loadMappings() {
  await downloadFile(FILE_ID, MAPPINGS_PATH);
  return fs.existsSync(MAPPINGS_PATH)
    ? JSON.parse(fs.readFileSync(MAPPINGS_PATH, 'utf8'))
    : {};
}

async function saveMappings(map) {
  fs.writeFileSync(MAPPINGS_PATH, JSON.stringify(map, null, 2));
  await uploadFile(MAPPINGS_PATH);
  console.log('💾 eventMappings.json を保存・アップロードしました');
}

async function cleanMappings() {
  const calendar = await calendarClient();
  const mappings = await loadMappings();
  const cleaned = {};
  let removedCount = 0;

  for (const [discordId, googleId] of Object.entries(mappings)) {
    try {
      await calendar.events.get({ calendarId: CALENDAR_ID, eventId: googleId });
      cleaned[discordId] = googleId;
    } catch (err) {
      if (err.code === 404) {
        console.log(`🧹 削除済みGoogleイベント: Discord ID ${discordId} → Google ID ${googleId}`);
        removedCount++;
      } else {
        console.warn(`⚠️ イベント取得中のエラー (ID: ${googleId}):`, err.message);
        cleaned[discordId] = googleId;
      }
    }
  }

  await saveMappings(cleaned);
  console.log(`✅ クリーンアップ完了: ${removedCount} 件のマッピングを削除しました`);
}

// ----- Calendar Event CRUD -----
async function createCalendarEvent(event) {
  const calendar = await calendarClient();
  const start = new Date(event.scheduledStartTimestamp);
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  const res = await calendar.events.insert({
    calendarId: CALENDAR_ID,
    resource: {
      summary: event.name,
      description: event.description || '',
      start: { dateTime: start.toISOString(), timeZone: 'Asia/Tokyo' },
      end: { dateTime: end.toISOString(), timeZone: 'Asia/Tokyo' },
    },
  });
  console.log('✅ Googleカレンダーに登録:', res.data.htmlLink);
  return res.data.id;
}

async function updateCalendarEvent(googleEventId, newEvent) {
  const calendar = await calendarClient();
  const start = new Date(newEvent.scheduledStartTimestamp);
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  await calendar.events.update({
    calendarId: CALENDAR_ID,
    eventId: googleEventId,
    resource: {
      summary: newEvent.name,
      description: newEvent.description || '',
      start: { dateTime: start.toISOString(), timeZone: 'Asia/Tokyo' },
      end: { dateTime: end.toISOString(), timeZone: 'Asia/Tokyo' },
    },
  });
  console.log('🔁 Googleカレンダーを更新しました:', googleEventId);
}

async function deleteCalendarEvent(googleEventId) {
  const calendar = await calendarClient();
  await calendar.events.delete({ calendarId: CALENDAR_ID, eventId: googleEventId });
  console.log('🗑️ Googleカレンダーから削除しました:', googleEventId);
}

async function upsertCalendarEvent(discordEvent, googleEventId = null) {
  const calendar = await calendarClient();
  const start = new Date(discordEvent.scheduledStartTimestamp);
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  const resource = {
    summary: discordEvent.name,
    description: discordEvent.description || '',
    start: { dateTime: start.toISOString(), timeZone: 'Asia/Tokyo' },
    end: { dateTime: end.toISOString(), timeZone: 'Asia/Tokyo' },
  };

  if (googleEventId) {
    try {
      const res = await calendar.events.update({ calendarId: CALENDAR_ID, eventId: googleEventId, resource });
      console.log('🔁 Googleカレンダーを更新しました:', res.data.id);
      return res.data.id;
    } catch (e) {
      console.warn('⚠️ 更新失敗、新規登録に切り替え:', e.message);
    }
  }

  const res = await calendar.events.insert({ calendarId: CALENDAR_ID, resource });
  console.log('🆕 Googleカレンダーに新規登録:', res.data.id);
  return res.data.id;
}

// ----- Utility -----
function formatJST(ts) {
  const d = new Date(ts + 9 * 60 * 60 * 1000);
  const w = ['日','月','火','水','木','金','土'][d.getDay()];
  return `${d.getFullYear()}年${d.getMonth()+1}月${d.getDate()}日 (${w}) ${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;
}

// ----- Manage Marks on Calendar -----
async function manageMarks(mode = 'mark') {
  const calendar = await calendarClient();
  const mappings = await loadMappings();
  const res = await calendar.events.list({ calendarId: CALENDAR_ID, maxResults: 2500, singleEvents: true, orderBy: 'startTime' });
  const events = res.data.items || [];
  let processed = 0;

  for (const ev of events) {
    const isMapped = Object.values(mappings).includes(ev.id);
    const hasMark = ev.summary?.startsWith('␥');
    if (mode === 'mark' && !isMapped && !hasMark) {
      const newTitle = `␥ ${ev.summary || '無題イベント'}`;
      await calendar.events.patch({ calendarId: CALENDAR_ID, eventId: ev.id, resource: { summary: newTitle } });
      console.log(`␥ マーク付加: ${newTitle}`);
      processed++;
    }
    if (mode === 'unmark' && !isMapped && hasMark) {
      const newTitle = ev.summary.replace(/^␥\s*/, '');
      await calendar.events.patch({ calendarId: CALENDAR_ID, eventId: ev.id, resource: { summary: newTitle } });
      console.log(`🧼 マーク削除: ${newTitle}`);
      processed++;
    }
  }

  console.log(`✅ 完了: ${processed} 件のイベントを ${mode === 'mark' ? '␥マーク付加' : '🧼マーク削除'} しました`);
}

// ----- Discord Event Sync -----
const discordClient = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildScheduledEvents] });

discordClient.on('guildScheduledEventCreate', async (event) => {
  const channel = event.guild.channels.cache.find(ch => ch.name === 'イベントのお知らせ' && ch.isTextBased());
  if (!channel) return;
  
  try {
    // メンバー取得（待機付き）
    await event.guild.members.fetch();
    await new Promise(resolve => setTimeout(resolve, 5000)); // 5秒待機    

    const gEventId = await createCalendarEvent(event);
    const map = await loadMappings();
    map[event.id] = gEventId;
    await saveMappings(map);
  } catch (e) {
    console.error('❌ Googleカレンダー登録エラー:', e.message);
  }
  await channel.send(`@everyone\n📅 **新しいイベントが追加されました！**`);
  await channel.send({ embeds: [{
    title: event.name,
    description: `**開催日**\n${formatJST(event.scheduledStartTimestamp)}\n\n` + `**説明**\n${event.description || '（説明なし）'}`,
    color: 0x00aaff,
  }]});
  await channel.send(event.url);
});


discordClient.on('guildScheduledEventUpdate', async (oldEvent, newEvent) => {
  const channel = newEvent.guild.channels.cache.find(ch => ch.name === 'イベントのお知らせ' && ch.isTextBased());
  if (!channel) return;
  const map = await loadMappings();
  const gEventId = map[newEvent.id];
  // キャンセル
  if (oldEvent.status !== newEvent.status && newEvent.status === GuildScheduledEventStatus.Canceled) {
    if (gEventId) {
      try {
        await deleteCalendarEvent(gEventId);
        delete map[newEvent.id];
        await saveMappings(map);
      } catch (e) { console.error('❌ Googleカレンダー削除エラー:', e.message); }
    }
    await channel.send(`@everyone\n🗑️ **イベントがキャンセルされました！**\n> ${newEvent.name}`);
    return;
  }
  // 開始
  if (oldEvent.status !== newEvent.status && newEvent.status === GuildScheduledEventStatus.Active) {
    await channel.send(`@everyone\n📣 **イベントが始まりました！**\n> ${newEvent.name}`);
    await channel.send(newEvent.url);
    return;
  }
  // 更新
  if (gEventId) {
    try {
      await updateCalendarEvent(gEventId, newEvent);
    } catch (e) { console.error('❌ Googleカレンダー更新エラー:', e.message); }
  } else {
    console.warn('⚠️ GoogleイベントID が見つからず更新できません');
  }
});

discordClient.on('guildScheduledEventDelete', async (event) => {
  const map = await loadMappings();
  const gEventId = map[event.id];
  if (!gEventId) return;
  try {
    await deleteCalendarEvent(gEventId);
    delete map[event.id];
    await saveMappings(map);
  } catch (e) { console.error('❌ Googleカレンダー削除エラー:', e.message); }
});

// ----- メンバー同期機能（GAS連携） -----
async function syncMembersToGAS() {
  const guild = discordClient.guilds.cache.get(process.env.GUILD_ID);
  if (!guild) {
    console.error('❌ 指定されたGUILD_IDのサーバーにBotが参加していません');
    return;
  }

  await guild.members.fetch(); // 全メンバーをキャッシュ

  const members = guild.members.cache.map(member => ({
    username: `${member.user.username}#${member.user.discriminator}`,
    id: member.user.id,
    joinedAt: member.joinedAt ? member.joinedAt.toISOString().split('T')[0] : '',
    roles: member.roles.cache
      .filter(role => role.name !== '@everyone')
      .map(role => role.name)
  }));

  const res = await fetch(process.env.GAS_WEBHOOK, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(members)
  });

  console.log('✅ メンバー情報送信完了：', await res.text());
}

const express = require('express');
const app = express();
app.use(express.json());

// 🔗 GASからのWebhookを受け取るエンドポイント
app.post('/sync-members', async (req, res) => {
  console.log('📥 GASから同期リクエスト受信');
  try {
    await discordClient.login(process.env.TOKEN);
    await syncMembersToGAS();
    discordClient.destroy();
    res.status(200).send('✅ 同期完了');
  } catch (e) {
    console.error('❌ 同期エラー:', e.message);
    res.status(500).send('❌ 同期失敗');
  }
});

// ポート指定
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🌐 Webhookサーバー起動中：ポート${PORT}`);
});


// ----- Main Command Dispatcher -----
(async () => {
  const [,, cmd] = process.argv;
  switch (cmd) {
    case 'sync':
      discordClient.once('ready', async () => {
        console.log('🟡 初回同期開始');
        const guild = discordClient.guilds.cache.first();
        const events = await guild.scheduledEvents.fetch();
        console.log('📊 イベント件数:', events.size);
        const existing = await loadMappings();
        const updated = { ...existing };
        for (const ev of events.values()) {
          console.log('🔎 処理中:', ev.name);
          const prevId = existing[ev.id] || null;
          const newId = await upsertCalendarEvent(ev, prevId);
          updated[ev.id] = newId;
          console.log(`✅ 同期完了: ${ev.name} → ${newId}`);
        }
        await saveMappings(updated);
        console.log('🎉 初回同期完了');
        process.exit(0);
      });
      await discordClient.login(process.env.TOKEN);
      break;

    case 'serve':
      discordClient.once('ready', () => console.log(`✅ Botログイン成功：${discordClient.user.tag}`));
      await discordClient.login(process.env.TOKEN);
      break;

    case 'cleanMappings':
      await cleanMappings();
      process.exit(0);

    case 'mark':
      await manageMarks('mark');
      process.exit(0);

    case 'unmark':
      await manageMarks('unmark');
      process.exit(0);

    case 'syncMembers':
      discordClient.once('ready', async () => {
      console.log('🟡 メンバー同期開始');
      await syncMembersToGAS();
      process.exit(0);
    });
      await discordClient.login(process.env.TOKEN);
      break;


    default:
      console.log(`使い方: node ${path.basename(process.argv[1])} <sync|serve|cleanMappings|mark|unmark>`);
      process.exit(1);
  }
})();

