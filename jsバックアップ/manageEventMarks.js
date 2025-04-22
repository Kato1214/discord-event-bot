require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');
const { downloadFile } = require('./driveClient');

const FILE_ID = process.env.DRIVE_FILE_ID;
const CALENDAR_ID = 'aixnexus2025@gmail.com';
const mappingsPath = path.join(__dirname, 'eventMappings.json');

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
  await downloadFile(FILE_ID, mappingsPath);
  return fs.existsSync(mappingsPath)
    ? JSON.parse(fs.readFileSync(mappingsPath, 'utf8'))
    : {};
}

async function manageMarks(mode = 'mark') {
  const calendar = await calendarClient();
  const mappings = await loadMappings();

  const eventsRes = await calendar.events.list({
    calendarId: CALENDAR_ID,
    maxResults: 2500,
    singleEvents: true,
    orderBy: 'startTime',
  });

  const events = eventsRes.data.items || [];
  let processed = 0;

  for (const event of events) {
    const isMapped = Object.values(mappings).includes(event.id);
    const hasMark = event.summary?.startsWith('␥');

    if (mode === 'mark' && !isMapped && !hasMark) {
      const newTitle = `␥ ${event.summary || '無題イベント'}`;
      await calendar.events.patch({
        calendarId: CALENDAR_ID,
        eventId: event.id,
        resource: { summary: newTitle },
      });
      console.log(`␥ マーク付加: ${newTitle}`);
      processed++;
    }

    if (mode === 'unmark' && !isMapped && hasMark) {
      const newTitle = event.summary.replace(/^␥\s*/, '');
      await calendar.events.patch({
        calendarId: CALENDAR_ID,
        eventId: event.id,
        resource: { summary: newTitle },
      });
      console.log(`🧼 マーク削除: ${newTitle}`);
      processed++;
    }
  }

  console.log(`✅ 完了: ${processed} 件のイベントを ${mode === 'mark' ? '␥マーク付加' : '␥マーク削除'} しました`);
}

const modeArg = process.argv[2];
const mode = modeArg === '--unmark' ? 'unmark' : 'mark';

manageMarks(mode);
