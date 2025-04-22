require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { upsertCalendarEvent } = require('./googleCalendar'); // ← 実装済み関数を使う
const { downloadFile, uploadFile } = require('./driveClient');

const MAPPINGS_PATH = path.join(__dirname, 'eventMappings.json');

async function loadMappings() {
  const filePath = MAPPINGS_PATH;
  await downloadFile(process.env.DRIVE_FILE_ID, filePath);

  const raw = fs.readFileSync(filePath, 'utf8').trim();
  if (!raw) {
    console.warn('⚠️ 空の eventMappings.json を検出。新規作成として処理します');
    return {};
  }

  try {
    return JSON.parse(raw);
  } catch (e) {
    console.error('❌ JSON解析に失敗しました:', e.message);
    throw e;
  }
}

async function saveMappings(mappings) {
  fs.writeFileSync(MAPPINGS_PATH, JSON.stringify(mappings, null, 2));
  if (process.env.DRIVE_FILE_ID) {
    await uploadFile(MAPPINGS_PATH);
  }
  console.log('💾 eventMappings.json を保存・アップロードしました');
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildScheduledEvents],
});

client.once('ready', async () => {
  console.log('🟡 スクリプト起動');

  const guild = client.guilds.cache.first();
  console.log('📥 Guild:', guild.name);

  const events = await guild.scheduledEvents.fetch();
  console.log('📊 イベント件数:', events.size);

  const existingMappings = await loadMappings();
  const updatedMappings = { ...existingMappings };

  for (const ev of events.values()) {
    console.log('🔎 処理中:', ev.name);
    const googleId = existingMappings.hasOwnProperty(ev.id) ? existingMappings[ev.id] : null;
    console.log(`🧩 DiscordID: ${ev.id}, GoogleID: ${googleId}`);

    const newGoogleId = await upsertCalendarEvent(ev, googleId);
    updatedMappings[ev.id] = newGoogleId;

    console.log(`✅ 同期完了: ${ev.name} → ${newGoogleId}`);
  }

  await saveMappings(updatedMappings);
  console.log('🎉 全イベント同期完了');
  process.exit(0);
});

client.login(process.env.TOKEN);
