const { google } = require('googleapis');

// Render の環境変数から credentials を復元（\\n → \n）
const credentials = JSON.parse(
  process.env.GOOGLE_CREDENTIALS.replace(/\\n/g, '\n')
);

const auth = new google.auth.GoogleAuth({
  credentials,
  scopes: ['https://www.googleapis.com/auth/calendar'],
});

async function createCalendarEvent(event) {
  const authClient = await auth.getClient();
  const calendar = google.calendar({ version: 'v3', auth: authClient });

  const start = new Date(event.scheduledStartTimestamp);
  const end = new Date(start.getTime() + 60 * 60 * 1000); // 開始から1時間後

  const calendarEvent = {
    summary: event.name,
    description: event.description || '',
    start: { dateTime: start.toISOString(), timeZone: 'Asia/Tokyo' },
    end: { dateTime: end.toISOString(), timeZone: 'Asia/Tokyo' },
  };

  const res = await calendar.events.insert({
    calendarId: 'primary',
    resource: calendarEvent,
  });

  console.log('✅ Googleカレンダーに登録:', res.data.htmlLink);
  return res.data.id;
}

async function updateCalendarEvent(googleEventId, newEvent) {
  const authClient = await auth.getClient();
  const calendar = google.calendar({ version: 'v3', auth: authClient });

  const start = new Date(newEvent.scheduledStartTimestamp);
  const end = new Date(start.getTime() + 60 * 60 * 1000);

  const updatedEvent = {
    summary: newEvent.name,
    description: newEvent.description || '',
    start: { dateTime: start.toISOString(), timeZone: 'Asia/Tokyo' },
    end: { dateTime: end.toISOString(), timeZone: 'Asia/Tokyo' },
  };

  const res = await calendar.events.update({
    calendarId: 'primary',
    eventId: googleEventId,
    resource: updatedEvent,
  });

  console.log('🔁 Googleカレンダーを更新しました:', res.data.htmlLink);
}

module.exports = {
  createCalendarEvent,
  updateCalendarEvent,
};
