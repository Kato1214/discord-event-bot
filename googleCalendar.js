// googleCalendar.js
const { google } = require('googleapis');

/* ───── Google サービスアカウント認証 ───── */
const credJson    = Buffer.from(process.env.GOOGLE_CREDENTIALS_B64, 'base64').toString('utf8');
const credentials = JSON.parse(credJson);

/* ★ ここをあなたの Gmail カレンダー ID に固定 ★ */
const CALENDAR_ID = 'aixnexus2025@gmail.com';

const auth = new google.auth.GoogleAuth({
  credentials,
  scopes: ['https://www.googleapis.com/auth/calendar'],
});

/* クライアント生成 */
async function calendarClient() {
  const authClient = await auth.getClient();
  return google.calendar({ version: 'v3', auth: authClient });
}

/* 1. 作成 */
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

/* 2. 更新 */
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

/* 3. 削除 */
async function deleteCalendarEvent(googleEventId) {
  const calendar = await calendarClient();
  await calendar.events.delete({ calendarId: CALENDAR_ID, eventId: googleEventId });
  console.log('🗑️ Googleカレンダーから削除しました:', googleEventId);
}

module.exports = {
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
};
