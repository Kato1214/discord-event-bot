const fs = require('fs');
const path = require('path');
const { Client, GatewayIntentBits } = require('discord.js');
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

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildScheduledEvents],
});

client.once('ready', () => {
  console.log(`✅ Botログイン成功：${client.user.tag}`);
});

client.on('guildScheduledEventCreate', async (event) => {
  const channel = event.guild.channels.cache.find(
    ch => ch.name === 'イベントのお知らせ' && ch.isTextBased()
  );
  if (!channel) return;

  // Googleカレンダーに登録
  try {
    const calendarId = await createCalendarEvent(event);
    const mappings = loadMappings();
    mappings[event.id] = calendarId;
    saveMappings(mappings);
    console.log('✅ GoogleカレンダーイベントIDを保存:', calendarId);
  } catch (error) {
    console.error('❌ Googleカレンダー登録エラー:', error.message);
  }

  // JST表示
  const date = new Date(event.scheduledStartTimestamp);
  date.setHours(date.getHours() + 9);
  const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
  const formattedDate = `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 (${weekdays[date.getDay()]}) ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;

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
  await channel.send(`[⎯⎯⎯⎯⎯⎯⎯⎯] ${event.url}`);
});

client.on('guildScheduledEventUpdate', async (oldEvent, newEvent) => {
  const channel = newEvent.guild.channels.cache.find(
    ch => ch.name === 'イベントのお知らせ' && ch.isTextBased()
  );
  if (!channel) return;

  const date = new Date(newEvent.scheduledStartTimestamp);
  date.setHours(date.getHours() + 9);
  const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
  const formattedDate = `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 (${weekdays[date.getDay()]}) ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}〜`;

  if (oldEvent.status !== newEvent.status && newEvent.status === 2) {
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
    await channel.send(`[⎯⎯⎯⎯⎯⎯⎯⎯] ${newEvent.url}`);
    return;
  }

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
  }
});

client.login(process.env.TOKEN);
