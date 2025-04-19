// googleCalendar.js
const { google } = require('googleapis');

const credJson    = Buffer.from(process.env.GOOGLE_CREDENTIALS_B64, 'base64').toString('utf8');
const credentials = JSON.parse(credJson);
const CALENDAR_ID = 'aixnexus2025@gmail.com';

const auth = new google.auth.GoogleAuth({
  credentials,
  scopes: ['https://www.googleapis.com/auth/calendar'],
});

async function calendarClient() {
  const authClient = await auth.getClient();
  return google.calendar({ version: 'v3', auth: authClient });
}

async function createCalendarEvent(event) {
  const calendar = await calendarClient();
  const start = new Date(event.scheduledStartTimestamp);
  const end   = new Date(start.getTime() + 60 * 60 * 1000);

  const res = await calendar.events.insert({
    calendarId: CALENDAR_ID,
    resource: {
      summary:     event.name,
      description: event.description || '',
      start: { dateTime: start.toISOString(), timeZone: 'Asia/Tokyo' },
      end:   { dateTime: end.toISOString(),   timeZone: 'Asia/Tokyo' },
    },
  });

  console.log('✅ Googleカレンダーに登録:', res.data.htmlLink);
  return res.data.id;
}

async function updateCalendarEvent(googleEventId, newEvent) {
  const calendar = await calendarClient();
  const start = new Date(newEvent.scheduledStartTimestamp);
  const end   = new Date(start.getTime() + 60 * 60 * 1000);

  await calendar.events.update({
    calendarId: CALENDAR_ID,
    eventId:    googleEventId,
    resource: {
      summary:     newEvent.name,
      description: newEvent.description || '',
      start: { dateTime: start.toISOString(), timeZone: 'Asia/Tokyo' },
      end:   { dateTime: end.toISOString(),   timeZone: 'Asia/Tokyo' },
    },
  });

  console.log('🔁 Googleカレンダーを更新しました:', googleEventId);
}

async function upsertCalendarEvent(event, existingEventId) {
  if (existingEventId) {
    try {
      await updateCalendarEvent(existingEventId, event);
      return existingEventId;
    } catch (err) {
      console.warn('⚠️ 更新失敗 → 新規作成に切り替え:', err.message);
    }
  }
  return await createCalendarEvent(event);
}

module.exports = {
  createCalendarEvent,
  updateCalendarEvent,
  upsertCalendarEvent,
};
