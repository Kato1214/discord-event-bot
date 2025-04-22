/*───────────────────────────────────────────
 *  Discord ↔ Google Calendar Sync Bot (Unified)
 *  -------------------------------------------------
 *  Usage:
 *    node unifiedBot.js sync       # Sync all Discord events to Google Calendar (default)
 *    node unifiedBot.js clean      # Remove orphaned mappings (Google events that no longer exist)
 *    node unifiedBot.js mark       # Add ␥ mark to Google events NOT managed by this bot
 *    node unifiedBot.js unmark     # Remove ␥ mark from Google events NOT managed by this bot
 *
 *  .env requirements:
 *    TOKEN=                 # Discord Bot token
 *    GOOGLE_CREDENTIALS_B64=# Base64‑encoded service‑account JSON
 *    DRIVE_FILE_ID=         # Google Drive file ID for eventMappings.json
 *    CALENDAR_ID=           # (optional) Google Calendar ID, default aixnexus2025@gmail.com
 *───────────────────────────────────────────*/

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');
const {
  Client,
  GatewayIntentBits,
  GuildScheduledEventStatus,
} = require('discord.js');

/*───────────────────────────────────────────
  Global constants & paths
───────────────────────────────────────────*/
const FILE_ID    = process.env.DRIVE_FILE_ID;
const CALENDAR_ID= process.env.CALENDAR_ID || 'aixnexus2025@gmail.com';
const TOKEN      = process.env.TOKEN;
const mappingsPath = path.join(__dirname, 'eventMappings.json');

if (!TOKEN || !FILE_ID || !process.env.GOOGLE_CREDENTIALS_B64) {
  console.error('❌ .env の必須項目 (TOKEN, DRIVE_FILE_ID, GOOGLE_CREDENTIALS_B64) が不足しています');
  process.exit(1);
}

/*───────────────────────────────────────────
  Google Auth Clients
───────────────────────────────────────────*/
const credJson   = Buffer.from(process.env.GOOGLE_CREDENTIALS_B64, 'base64').toString('utf8');
const credentials= JSON.parse(credJson);

const baseAuth = new google.auth.GoogleAuth({
  credentials,
  scopes: [
    'https://www.googleapis.com/auth/drive',
    'https://www.googleapis.com/auth/calendar',
  ],
});

async function driveClient() {
  const auth = await baseAuth.getClient();
  return google.drive({ version: 'v3', auth });
}
async function calendarClient() {
  const auth = await baseAuth.getClient();
  return google.calendar({ version: 'v3', auth });
}

/*───────────────────────────────────────────
  Google Drive helpers
───────────────────────────────────────────*/
async function downloadFile(fileId, destPath) {
  const drive = await driveClient();
  const res   = await drive.files.get({ fileId, alt: 'media' }, { responseType: 'stream' });
  return new Promise((resolve, reject)=>{
    const dest = fs.createWriteStream(destPath);
    res.data.pipe(dest)
      .on('finish', resolve)
      .on('error', reject);
  });
}
async function uploadFile(fileId, srcPath) {
  const drive = await driveClient();
  await drive.files.update({
    fileId,
    media:{ mimeType:'application/json', body: fs.createReadStream(srcPath) },
  });
}

/*───────────────────────────────────────────
  Mapping helpers (Discord ID ↔ Google ID)
───────────────────────────────────────────*/
async function loadMappings() {
  try {
    await downloadFile(FILE_ID, mappingsPath);
  } catch { /* ファイルがまだ無い場合 */ }
  return fs.existsSync(mappingsPath)
    ? JSON.parse(fs.readFileSync(mappingsPath,'utf8'))
    : {};
}
async function saveMappings(obj) {
  fs.writeFileSync(mappingsPath, JSON.stringify(obj, null, 2));
  await uploadFile(FILE_ID, mappingsPath);
}

/*───────────────────────────────────────────
  Google Calendar helpers
───────────────────────────────────────────*/
function buildEventResource(ev){
  const start = new Date(ev.scheduledStartTimestamp);
  const end   = new Date(start.getTime()+60*60*1000);
  return {
    summary:     ev.name,
    description: ev.description||'',
    start: { dateTime:start.toISOString(), timeZone:'Asia/Tokyo' },
    end:   { dateTime:end.toISOString(),   timeZone:'Asia/Tokyo' },
  };
}
async function upsertCalendarEvent(ev, googleId){
  const cal = await calendarClient();
  const resource = buildEventResource(ev);
  if (googleId){
    try{
      const { data } = await cal.events.update({ calendarId:CALENDAR_ID, eventId:googleId, resource });
      return data.id;
    }catch(e){ console.warn('更新失敗 → 新規作成へ', e.message); }
  }
  const { data } = await cal.events.insert({ calendarId:CALENDAR_ID, resource });
  return data.id;
}
async function deleteCalendarEvent(id){
  const cal = await calendarClient();
  await cal.events.delete({ calendarId:CALENDAR_ID, eventId:id });
}

/*───────────────────────────────────────────
  Utility: JST formatter
───────────────────────────────────────────*/
function jst(ts){
  const d = new Date(ts+9*60*60*1000);
  const w = '日月火水木金土'[d.getDay()];
  return `${d.getFullYear()}年${d.getMonth()+1}月${d.getDate()}日(${w}) ${`${d.getHours()}`.padStart(2,'0')}:${`${d.getMinutes()}`.padStart(2,'0')}`;
}

/*───────────────────────────────────────────
  Command 1: Full sync (one‑shot)
───────────────────────────────────────────*/
async function runSync(){
  const client = new Client({ intents:[GatewayIntentBits.Guilds, GatewayIntentBits.GuildScheduledEvents] });
  await client.login(TOKEN);
  await client.once('ready', async ()=>{
    const guild = client.guilds.cache.first();
    const events= await guild.scheduledEvents.fetch();

    const mappings = await loadMappings();
    const updated  = { ...mappings };

    for (const ev of events.values()){
      const gId = mappings[ev.id]||null;
      const newId = await upsertCalendarEvent(ev, gId);
      updated[ev.id] = newId;
      console.log(`✅ Synced: ${ev.name}`);
    }
    await saveMappings(updated);
    console.log('🎉 完了: 全イベント同期');
    client.destroy();
  });
}

/*───────────────────────────────────────────
  Command 2: Clean mappings.json (orphaned Google IDs)
───────────────────────────────────────────*/
async function runClean(){
  const cal      = await calendarClient();
  const mappings = await loadMappings();
  const cleaned  = {};
  let removed=0;
  for (const [dId,gId] of Object.entries(mappings)){
    try{ await cal.events.get({ calendarId:CALENDAR_ID, eventId:gId }); cleaned[dId]=gId; }
    catch(e){ if (e.code===404) removed++; else cleaned[dId]=gId; }
  }
  await saveMappings(cleaned);
  console.log(`✅ Clean完了: ${removed}件 削除`);
}

/*───────────────────────────────────────────
  Command 3: Mark / Unmark unmanaged Google events
───────────────────────────────────────────*/
async function runMark(mode='mark'){
  const cal      = await calendarClient();
  const mappings = await loadMappings();
  const managedIds = new Set(Object.values(mappings));
  const { data } = await cal.events.list({ calendarId:CALENDAR_ID, maxResults:2500, singleEvents:true, orderBy:'startTime' });
  let cnt=0;
  for (const ev of data.items||[]){
    const isManaged = managedIds.has(ev.id);
    const hasMark   = /^␥/.test(ev.summary||'');
    if (mode==='mark'   && !isManaged && !hasMark){
      await cal.events.patch({ calendarId:CALENDAR_ID, eventId:ev.id, resource:{ summary:`␥ ${ev.summary}` }});
      cnt++;
    }
    if (mode==='unmark' && !isManaged && hasMark){
      await cal.events.patch({ calendarId:CALENDAR_ID, eventId:ev.id, resource:{ summary:ev.summary.replace(/^␥\s*/,'') }});
      cnt++;
    }
  }
  console.log(`✅ ${mode==='mark'?'Marked':'Unmarked'} ${cnt} events`);
}

/*───────────────────────────────────────────
  CLI router
───────────────────────────────────────────*/
(async ()=>{
  const cmd = (process.argv[2]||'sync').toLowerCase();
  try{
    if (cmd==='sync')      return runSync();
    if (cmd==='clean')     return runClean();
    if (cmd==='mark')      return runMark('mark');
    if (cmd==='unmark')    return runMark('unmark');
    console.error('Unknown command. Use sync | clean | mark | unmark');
  }catch(e){
    console.error('❌ Fatal:', e); process.exit(1);
  }
})();
