require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');
const { downloadFile, uploadFile } = require('./driveClient');

const FILE_ID = process.env.DRIVE_FILE_ID;
const CALENDAR_ID = 'aixnexus2025@gmail.com';

const mappingsPath = path.join(__dirname, 'eventMappings.json');

// GoogleカレンダーAPI認証
const credJson = Buffer.from(process.env.GOOGLE_CREDENTIALS_B64, 'base64').toString('utf8');
const credentials = JSON.parse(credJson);

const auth = new google.auth.GoogleAuth({
  credentials,
  scopes: ['https://www.googleapis.com/auth/calendar'],
});

async function calendarClient() {
  const authClient = await auth.getClient();
  return google.calendar({ version: 'v3', auth: authClient });
}

async function loadMappings() {
  await downloadFile(FILE_ID, mappingsPath); // Driveからダウンロード
  return fs.existsSync(mappingsPath)
    ? JSON.parse(fs.readFileSync(mappingsPath, 'utf8'))
    : {};
}

async function saveMappings(map) {
  fs.writeFileSync(mappingsPath, JSON.stringify(map, null, 2));
  await uploadFile(FILE_ID, mappingsPath); // Driveに再アップロード
}

async function cleanMappings() {
  const calendar = await calendarClient();
  let mappings = await loadMappings();

  const cleanedMappings = {};
  let removedCount = 0;

  for (const [discordId, googleId] of Object.entries(mappings)) {
    try {
      await calendar.events.get({
        calendarId: CALENDAR_ID,
        eventId: googleId,
      });
      cleanedMappings[discordId] = googleId;
    } catch (err) {
      if (err.code === 404) {
        console.log(`🧹 削除済みGoogleイベント: Discord ID ${discordId} → Google ID ${googleId}`);
        removedCount++;
      } else {
        console.warn(`⚠️ イベント取得中のエラー (ID: ${googleId}):`, err.message);
        cleanedMappings[discordId] = googleId; // 安全のため保持
      }
    }
  }

  await saveMappings(cleanedMappings);
  console.log(`✅ クリーンアップ完了: ${removedCount} 件のマッピングを削除しました`);
}

cleanMappings();
