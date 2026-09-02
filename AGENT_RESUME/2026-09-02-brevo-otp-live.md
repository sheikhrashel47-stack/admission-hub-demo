# Resume — 2026-09-02 · Brevo OTP LIVE (মেইল ডেলিভারি ফিক্সড)

## সমস্যা
- ইউজার signup-এ OTP পাচ্ছিল না — verify-তে আটকে। UI ঠিক ছিল, সমস্যা ছিল **মেইল ডেলিভারি**।
- Root cause: worker-এ `MAIL_HOOK` (নষ্ট, "ok" ভান) MAIL_HOOK→BREVO→RESEND order-এ আগে ছিল; MAIL_HOOK ok return করে মেইল পৌঁছাত না।
- আরেকটা: `MAIL_FROM` = `onboarding@resend.dev` (Resend-এর) — Brevo-তে sender হিসেবে অননুমোদিত → Brevo reject (যদিও BREVO_KEY সেট)।

## ফিক্স (worker deploy `383b7d8a`)
1. `sendEmail` + `sendOtpMessage` দুটোতেই **Brevo primary** (MAIL_HOOK-এর আগে)
2. **BREVO_KEY secret put** = ভাইয়ের `xkeysib-...`
3. **BREVO_FROM secret put** = `mahmudrashel1034@gmail.com` (Brevo-তে verified sender; Brevo account email = mahmudrashel1034@gmail.com, sender "Admission hub")

## লাইভ প্রমাণ (Brevo events API)
- `delivered | afrinjahansorna+done<ts>@gmail.com | "Admission Hub | Email Verification"` ✅
- আগের test OTP-ও delivered+opened
- Brevo account API: organization 6a97c2be..., plan free

## ব্যবহারকারীর সেটআপ
- Brevo API key (xkeysib-) + account mahmudrashel1034@gmail.com
- Brevo "Authorized IPs" restriction বন্ধ করতে হয়েছে (আমার curl IP-তে unauthorized দিচ্ছিল)
- Apps Script backup এখনো নেই — চাইলে পরে যোগ (MAIL_HOOK-এ URL দিলেই Brevo fail-এ ব্যবহার হবে; এখন Brevo primary)

## পরের ধাপ
- resume commit+push (demo + control), deploy master sync
- ভাইকে: এখনই সত্যিকারের signup চেষ্টা → OTP inbox-এ আসবে
