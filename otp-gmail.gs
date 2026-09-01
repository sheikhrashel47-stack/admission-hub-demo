/** Paste in https://script.google.com — Deploy → Web app
 * Execute as: Me
 * Who has access: Anyone
 * Then send the Web App URL as MAIL_HOOK
 *
 * Inbox-এ যেতে: plain Gmail draft পাঠায় (HTML বাটন নয়)।
 */
const SECRET = 'AdmissionHubMail1';

function doPost(e) {
  const d = JSON.parse((e && e.postData && e.postData.contents) || '{}');
  if (d.secret !== SECRET) return ContentService.createTextOutput('no');
  const to = String(d.to || '');
  const subject = String(d.subject || 'Admission Hub');
  const text = String(d.text || '');
  GmailApp.createDraft(to, subject, text).send();
  return ContentService.createTextOutput('ok');
}
