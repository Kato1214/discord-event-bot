const fs = require('fs');
const path = require('path');
const { Client, GatewayIntentBits } = require('discord.js');
require('dotenv').config();

const { upsertCalendarEvent } = require('./googleCalendar');

const mappingsPath = path.join(__dirname, 'eventMappings.json');
const mappings = fs.existsSync(mappingsPath)
  ? JSON.parse(fs.readFileSync(mappingsPath, 'utf8'))
  : {};

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildScheduledEvents] });

client.once('ready', async () => {
  console.log('🟡 スクリプト起動');
  const guild = client.guilds.cache.first();
  console.log('📥 Guild:', guild.name);

  const events = await guild.scheduledEvents.fetch();
  console.log('📊 イベント件数:', events.size);

  for (const ev of events.values()) {
    console.log('🔎 処理中:', ev.name);
    const oldGoogleId = mappings[ev.id] || null;
    const newGoogleId = await upsertCalendarEvent(ev, oldGoogleId);

    // 🔁 GoogleイベントIDを保存
    mappings[ev.id] = newGoogleId;
    console.log(`✅ 同期完了: ${ev.name} → ${newGoogleId}`);
  }

  fs.writeFileSync(mappingsPath, JSON.stringify(mappings, null, 2));
  console.log('🎉 全イベント同期完了');
  process.exit(0);
});

client.login(process.env.TOKEN);
