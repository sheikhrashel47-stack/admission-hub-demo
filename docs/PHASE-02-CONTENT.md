# PHASE 02 — CENTRAL CLOUD CONTENT ENGINE · সম্পন্ন-রিপোর্ট
> বৈধ: ২০২৬-০৯-০৪ · চেইন: Control Panel → D1-ড্রাফট → Publish(KV+ভার্সন) → Public App

## আর্কিটেকচার (লাইভ)
- **অ্যাডমিন (ah-admin):** `content_draft` (D1 স্টেজিং) → `/adm/api/sync/publish` → `pubContent`+`pubContentMeta` (KV) + `ahver:vN` স্ন্যাপশট + `qb_versions`/`voc_versions`+`sync_log` (D1) → `/adm/api/sync/rollback` + `history`
- **পাবলিক:** `/api/content/meta` (v+sig+counts) → ক্লায়েন্ট `cloud-content-sync.js`-এ fingerprint-গেট (ইনক্রিমেন্টাল: বদল না হলে pull-না) → localStorage-ক্যাশ → অফলাইনে তাও চলা (`__ahCloudOffline` ফ্ল্যাগ)

## এ-ফেজে যোগ
1. **Pagination:** `/api/content?limit=&offset=` → `{...items, total, page:{limit,offset}}`; limit-না-দিলে পূর্ণ-ডক (backward-compat; pure `paginateContent` — ১৩-অ্যাসার্ট কোর-টেস্ট)
2. **Duplicate-protection:** import-এ টেক্সট-নর্মালাইজড-হ্যাশ → `duplicates` কাউন্টার; একই টেক্সট/শব্দ দ্বিতীয়বার আসলে skip (id-বদল হলেও) — qb+voc উভয়
3. **Offline-marker:** পাবলিক-পুল ফেল → লোকাল-ক্যাশ চালু থাকে
4. **ভার্সন-জীবনচক্র:** publish→ver-diff→rollback (আগে থেকে ছিল; AC-3 ৫০ টেস্টে ঢাকা)

## যাচাই
admin: AC-3 50/50 · demo: phase23-core 13/13 · গার্ড ✓ · সীমা: পাবলিক D1-কনটেন্ট-ডাইরেক্ট (KV-পাবলিশ) — P13/14-স্কোপ।
