// importEvents.js
require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { upsertCalendarEvent } = require('./googleCalendar');
const { downloadFile, uploadFile } = require('./driveClient');

const mappingsPath = path.join(__dirname, 'eventMappings.json');

const FILE_ID = process.env.DRIVE_FILE_ID;

async function loadMappings() {
  await downloadFile(FILE_ID, mappingsPath); // ← Driveから取得
  return fs.existsSync(mappingsPath)
    ? JSON.parse(fs.readFileSync(mappingsPath, 'utf8'))
    : {};
}

async function saveMappings(map) {
  fs.writeFileSync(mappingsPath, JSON.stringify(map, null, 2));
  await uploadFile(FILE_ID, mappingsPath); // ← Driveに保存
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildScheduledEvents],
});

client.once('ready', async () => {
  console.log('🟡 スクリプト起動');

  const guild = client.guilds.cache.first();
  const events = await guild.scheduledEvents.fetch();

  console.log('📊 イベント件数:', events.size);

  const mappings = await loadMappings();

  for (const ev of events.values()) {
    console.log('🔎 処理中:', ev.name);

    const googleId = mappings[ev.id] || null;
    const newGoogleId = await upsertCalendarEvent(ev, googleId);

    mappings[ev.id] = newGoogleId;
    console.log(`✅ 同期完了: ${ev.name} → ${newGoogleId}`);
  }

  await saveMappings(mappings);
  console.log('🎉 全イベント同期完了');
  process.exit(0);
});

client.login(process.env.TOKEN);
