# PHASE 03 — USER IDENTITY · সম্পন্ন-রিপোর্ট
> বৈধ: ২০২৬-০৯-০৪

## লাইভ-ম্যাট্রিক্স
| পথ | অবস্থা |
|---|---|
| ইমেইল রেজিস্ট্রেশন+OTP | ✓ লাইভ (register/register-email → otp/send+verify → token) |
| পাসওয়ার্ড লগইন | ✓ (PBKDF2 ১০০k+সল্ট; forgot→reset; change-password) |
| Google | ✓ (client-id; link/unlink; এক-ট্যাপ) |
| Passkey/Face-ID | ✓ (register/add/remove/login begin/finish; RS256/ECDSA-যাচাই) |
| মোবাইল/OTP | ⭕ **sms-ready-গেট** — `smsReady(env)` এখন ৪ প্রোভাইডার (TWILIO/GREENWEB/BULKSMS/SMS_API); কোনোটা secret-এ না-থাকা পর্যন্ত মোবাইল-পথে বন্ধু-বান্ধব বার্তা; সেট হলেই অটো-সক্রিয় + `/api/auth/config`-এ `sms:true` |
| Permanent User ID | ✓ (uid; `publicUser`-এ প্রকাশ) |
| সেশন-ম্যানেজমেন্ট | ✓ (tok+sess তালিকা, revoke, delete) |
| অ্যাকাউন্ট-স্ট্যাটাস/মডারেশন | ✓ (admin `/adm/api/users/list`+`users/action`: disable/enable/flag/logout; পাবলিক-পাশে blocked-status যাচাই) |
| প্রোফাইল | ✓ (profile PUT/photo; onboarding-প্রেফারেন্স) |

## এ-ফেজে যোগ
1. `smsReady(env)` pure-ফাংশন + `sms:` computed + `phone:true` ফ্ল্যাগ (config-টেস্ট)
2. otpSend-এ মোবাইল-গেট + authRegister-এ smsReady-অনুমতি (সক্রিয়-না → বন্ধুত্বপূর্ণ নির্দেশনা)

## বাউন্ডারি-নোট
অথ-স্টেট KV→D1-মাইগ্রেশন ইচ্ছাকৃতভাবে **P13/P14** (স্কেল+সিকিউরিটি) — এ-ফেজে লুকানো কাজ নয়; রোডম্যাপ-সেপারেশন।
