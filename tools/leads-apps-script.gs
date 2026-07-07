/**
 * Приёмник лидов Shopifier: Google Apps Script Web App.
 * Пишет лид в таблицу и шлёт уведомление в Telegram.
 * Деплой и настройка: см. tools/LEADS-SETUP.md
 */

const SHEET_NAME = 'Лиды';

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.tryLock(5000);
  try {
    const data = JSON.parse((e.postData && e.postData.contents) || '{}');
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sh = ss.getSheetByName(SHEET_NAME);
    if (!sh) {
      sh = ss.insertSheet(SHEET_NAME);
      sh.appendRow(['Дата', 'Канал', 'Username', 'Тариф', 'Форма', 'utm_source',
                    'utm_campaign', 'utm_content', 'Страница', 'Статус', 'Комментарий']);
      sh.setFrozenRows(1);
    }
    const utm = data.utm || {};
    sh.appendRow([
      new Date(), data.channel || '', data.username || '', data.plan || '',
      data.form || '', utm.utm_source || '', utm.utm_campaign || '',
      utm.utm_content || '', data.page || '', 'новый', ''
    ]);
    notifyTelegram(data, utm);
    return ContentService.createTextOutput('ok');
  } catch (err) {
    return ContentService.createTextOutput('err: ' + err);
  } finally {
    lock.releaseLock();
  }
}

function notifyTelegram(data, utm) {
  const props = PropertiesService.getScriptProperties();
  const token = props.getProperty('TG_BOT_TOKEN');
  const chatId = props.getProperty('TG_CHAT_ID');
  if (!token || !chatId) return;
  const text = [
    '🔥 Новый лид на Shopifier',
    'Канал: ' + (data.channel || '?'),
    'TG: ' + (data.username || '?'),
    data.plan ? 'Выбирал тариф: ' + data.plan : '',
    utm.utm_content ? 'Из рассылки: ' + utm.utm_content : '',
    data.form ? 'Форма: ' + data.form : ''
  ].filter(Boolean).join('\n');
  UrlFetchApp.fetch('https://api.telegram.org/bot' + token + '/sendMessage', {
    method: 'post',
    payload: { chat_id: chatId, text: text },
    muteHttpExceptions: true
  });
}

/** Запусти вручную один раз после настройки свойств, чтобы проверить уведомление. */
function testNotify() {
  notifyTelegram(
    { channel: 't.me/test_channel', username: '@test', plan: 'rost', form: 'hero' },
    { utm_content: 'проверка' }
  );
}
