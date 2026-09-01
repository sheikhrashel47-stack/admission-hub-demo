/** Paste in https://script.google.com — Deploy → Web app
 * Execute as: Me
 * Who has access: Anyone
 * Then send the Web App URL as MAIL_HOOK
 */
const SECRET = 'AdmissionHubMail1';

function doPost(e) {
  const d = JSON.parse((e && e.postData && e.postData.contents) || '{}');
  if (d.secret !== SECRET) {
    return ContentService.createTextOutput('no');
  }
  GmailApp.sendEmail(String(d.to || ''), String(d.subject || 'Admission Hub'), String(d.text || ''));
  return ContentService.createTextOutput('ok');
}
