// importEvents.js
require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { upsertCalendarEvent } = require('./googleCalendar');

const mappingsPath = path.join(__dirname, 'eventMappings.json');
const mappings = fs.existsSync(mappingsPath) ? JSON.parse(fs.readFileSync(mappingsPath)) : {};

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildScheduledEvents] });

client.once('ready', async () => {
  console.log('🟡 スクリプト起動');
  const guild = client.guilds.cache.first();
  console.log('📥 Guild:', guild.name);

  const events = await guild.scheduledEvents.fetch();
  console.log('📊 イベント件数:', events.size);

  for (const ev of events.values()) {
    console.log('🔎 処理中:', ev.name);
    const googleId = mappings[ev.id] || null;
    const newGoogleId = await upsertCalendarEvent(ev, googleId);
    console.log(`✅ 同期完了: ${ev.name} → ${newGoogleId}`);
  }

  console.log('🎉 全イベント同期完了');
  process.exit(0);
});

client.login(process.env.TOKEN);
