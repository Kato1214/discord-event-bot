const { google } = require('googleapis');

// 環境変数から Base64 エンコードされた Google サービスアカウント JSON を復号
const credJson = Buffer.from(process.env.GOOGLE_CREDENTIALS_B64, 'base64').toString('utf-8');
const credentials = JSON.parse(credJson);

// GoogleAuth に credentials を直接渡す
const auth = new google.auth.GoogleAuth({
  credentials,
  scopes: ['https://www.googleapis.com/auth/calendar'],
});

/**
 * Discord イベントを Google カレンダーに登録
 * @param {Object} event Discord の ScheduledEvent オブジェクト
 * @returns {Promise<string>} Google カレンダーのイベント ID
 */
async function createCalendarEvent(event) {
  const authClient = await auth.getClient();
  const calendar = google.calendar({ version: 'v3', auth: authClient });

  const start = new Date(event.scheduledStartTimestamp);
  const end = new Date(start.getTime() + 60 * 60 * 1000); // 1時間後

  const calendarEvent = {
    summary: event.name,
    description: event.description || '',
    start: { dateTime: start.toISOString(), timeZone: 'Asia/Tokyo' },
    end:   { dateTime: end.toISOString(),   timeZone: 'Asia/Tokyo' },
  };

  const res = await calendar.events.insert({
    calendarId: 'aixnexus2025@gmail.com',
    resource: calendarEvent,
  });

  console.log('✅ Googleカレンダーに登録:', res.data.htmlLink);
  return res.data.id;
}

/**
 * 既存の Google カレンダーイベントを更新
 * @param {string} googleEventId 更新対象の Google イベント ID
 * @param {Object} newEvent Discord の ScheduledEvent オブジェクト
 */
async function updateCalendarEvent(googleEventId, newEvent) {
  const authClient = await auth.getClient();
  const calendar = google.calendar({ version: 'v3', auth: authClient });

  const start = new Date(newEvent.scheduledStartTimestamp);
  const end   = new Date(start.getTime() + 60 * 60 * 1000);

  const updatedEvent = {
    summary: newEvent.name,
    description: newEvent.description || '',
    start: { dateTime: start.toISOString(), timeZone: 'Asia/Tokyo' },
    end:   { dateTime: end.toISOString(),   timeZone: 'Asia/Tokyo' },
  };

  const res = await calendar.events.update({
    calendarId: 'aixnexus2025@gmail.com',
    eventId: googleEventId,
    resource: updatedEvent,
  });

  console.log('🔁 Googleカレンダーを更新しました:', res.data.htmlLink);
}

module.exports = {
  createCalendarEvent,
  updateCalendarEvent,
};
