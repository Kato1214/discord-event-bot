const { downloadFile, uploadFile } = require('./driveClient');

// Google Drive で使うファイルID（ユーザーのアップロード済みファイル）
const DRIVE_FILE_ID = '1pbZAusgbk4XcE-3CUR6nRPBmf-ukn7nK';

// イベント同期処理の直前で Drive から最新を取得
await downloadFile(DRIVE_FILE_ID, 'eventMappings.json');

// 同期完了後に Drive にアップロード
fs.writeFileSync(mappingsPath, JSON.stringify(updatedMappings, null, 2));
await uploadFile(DRIVE_FILE_ID, 'eventMappings.json');

require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { upsertCalendarEvent } = require('./googleCalendar');

const mappingsPath = path.join(__dirname, 'eventMappings.json');
const existingMappings = fs.existsSync(mappingsPath)
  ? JSON.parse(fs.readFileSync(mappingsPath, 'utf8'))
  : {};

const updatedMappings = { ...existingMappings };

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildScheduledEvents],
});

client.once('ready', async () => {
  console.log('🟡 スクリプト起動');

  const guild = client.guilds.cache.first();
  console.log('📥 Guild:', guild.name);

  const events = await guild.scheduledEvents.fetch();
  console.log('📊 イベント件数:', events.size);

  for (const ev of events.values()) {
    console.log('🔎 処理中:', ev.name);

    const googleId = updatedMappings[ev.id] || null;
    const newGoogleId = await upsertCalendarEvent(ev, googleId);

    updatedMappings[ev.id] = newGoogleId;
    console.log(`✅ 同期完了: ${ev.name} → ${newGoogleId}`);
  }

  // 保存処理（重複防止のカギ！）
  fs.writeFileSync(mappingsPath, JSON.stringify(updatedMappings, null, 2));
  console.log('🎉 全イベント同期完了');

  process.exit(0);
});

client.login(process.env.TOKEN);
