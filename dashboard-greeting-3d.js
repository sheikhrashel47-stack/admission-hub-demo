/* v110 — 3D Dynamic Dashboard Greeting.
   লাইভ সময় অনুযায়ী শুভেচ্ছা (ভোর→সকাল→দুপুর→বিকেল→সন্ধ্যা→রাত্রি), প্রতি ঢোকায় নতুন মোটিভেশন
   (১২০+ লাইনের পুল), আর streak-কার্ডের ঠিক উপরে বসে। Emerald Academic ঘরানায় হালকা 3D। */
(() => {
  'use strict';

  const QUOTES = [
    'আজকের ছোট পরিশ্রমই আগামীকালের বড় সাফল্যের ভিত্তি!',
    'প্রতিদিন মাত্র ১% উন্নতি — এক বছরে তুমি অন্য মানুষ।',
    'স্বপ্ন বড় হোক, শুরু হোক ছোট পায়ে।',
    'ধারাবাহিকতাই সেই জাদু, যেটা গড়পড়তা মানুষকে অসাধারণ বানায়।',
    'আজ যে পাতা পড়লে, কাল সেটাই তোমার নিরাপত্তা।',
    'অলসতা সুখের বিশ্রাম নয় — স্বপ্নের চুরি!',
    'কঠিন সময় মানেই বাধা নয়; এটা তোমার শক্তি মাপার মাপকাঠি।',
    'ভুল করা মানে শিখছ — ভুল না করে যে কেউ বড় হয়নি।',
    'তোমার প্রতিযোগী অন্য কেউ নয়, গতকালের তুমি।',
    'মন না বসলেও বসে পড়ো — অনুপ্রেরণা পড়া শুরু করার পরেই আসে!',
    'অল্প অল্প করে রোজ — এটাই টপারদের আসল গোপন রহস্য।',
    'আজকের বইয়ের পাতা, আগামীকালের ফলাফলের প্রশ্ন।',
    'যে সময়টা নষ্ট করছ, সেই সময়টাই কেউ কেউ সিলেবাস শেষ করছে!',
    'নিজের ওপর বিশ্বাস রাখো — ফলাফল নিজেই তোমার পক্ষে কথা বলবে।',
    'একদিন থেমে গেলে সব শেষ নয়; আজকেই ফিরে আসাটাই আসল জয়।',
    'পরীক্ষার হলে যে শান্তি, সেটা আসে আজকের প্র্যাকটিস থেকে।',
    'মনে রেখো কেন শুরু করেছিলে — কারণটাই তোমার আসল ইঞ্জিন।',
    'কষ্ট এখন, স্বাচ্ছন্দ্য সারাজীবন। উল্টোটাও সত্যি!',
    'প্রতিদিনের অল্প পড়া, বিপদের দিনে হাজার বন্ধু।',
    'নেতিভাবনা আসবেই — তুমি পড়া চালিয়ে যাও, ও নিজেই চলে যাবে।',
    'সফল মানুষরা অন্যরকম নয়, শুধু প্রতিদিন একটু বেশি করে।',
    'আজ যদি কেবল একটা টপিক পরিষ্কার হয় — তবুও দিনটা জয়ী।',
    'তাড়াহুড়ো নয়, নিয়মিত হও — গন্তব্য দূর নয়।',
    'মোবাইল রেখে বই হাতে নেওয়ার মুহূর্তটাই আসল পরীক্ষা!',
    'তোমার লক্ষ্য তোমাকে ডাকছে — এক পাতা পড়ে সাড়া দাও।',
    'কষ্টের এই দিনগুলোই একদিন গল্প হয়ে গর্ব করাবে।',
    'সিলেবাস বড় মনে হলে ছোট ছোট ভাগে ভাগ করো — ভয় পালাবে।',
    'পরিশ্রমের কোনো বিকল্প নেই, তবে সঠিক পরিকল্পনায় পরিশ্রম অর্ধেক হয়ে যায়।',
    'আজকের রিভিশন, আগামীকালের আত্মবিশ্বাস।',
    'যে শব্দটা বুঝছ না, পাশের শব্দটা দিয়ে শুরু করো — চলতে থেকো।',
    'ফোনের নোটিফিকেশনে নয়, নিজের উন্নতির নোটিফিকেশনে চোখ রাখো।',
    'ছোট ছোট জয় উদযাপন করো — বড় জয় নিজেই খুঁজে আসবে।',
    'আজ মন ভালো নেই? তবু ৫টা MCQ — মন নিজেই সেট হয়ে যাবে।',
    'যে প্রশ্ন ভয় দেখাচ্ছে, সেটাই সবচেয়ে বেশি রিভিশন দরকার।',
    'সময় সবার জন্য সমান — ব্যবহারটা অসমান, ফলাফলও তাই।',
    'তুমি থেমে গেলে সময় থামে না — চলো, আবার শুরু।',
    'বই খোলা মানেই সংগ্রাম নয়; বন্ধ রাখাই আসল সংগ্রাম!',
    'নিজের সামর্থ্যে বিশ্বাস আনো — তুমি ভাবো যতটা, পারো আরও বেশি।',
    'প্রতিটা সঠিক উত্তর তোমাকে সিটের কাছে এক ধাপ এগিয়ে দেয়।',
    'আজকের টেবিল, চেয়ার আর বই — ভবিষ্যতের প্রাসাদের ইঁট।',
    'অন্যের গতি দেখে বিভ্রান্ত হয়ো না; তোমার রাস্তা তোমারই।',
    'ক্লান্তি সাময়িক, গর্ব স্থায়ী।',
    'পড়ার টেবিলে বসা প্রতিটা ঘণ্টা ভবিষ্যতে তোমার হয়ে কথা বলবে।',
    'সাফল্য প্রশ্ন করে না তুমি কে — জিজ্ঞেস করে, কতটা পারিশ্রমী।',
    'ভাঙা ধারাবাহিকতা আবার জোড়া দাও — আজ থেকেই।',
    'মনে রেখো: ফলাফল দেরিতে আসে, অস্বীকার করে না।',
    'আজকে শুধু শুরুটা করো — বাকিটা গতি নিজেই তৈরি করবে।',
    'তোমার এই চুপচাপ পরিশ্রম একদিন সবার সামনে উচ্চস্বরে কথা বলবে।',
    'সাধারণ মানুষ মোটিভেশন খোঁজে, অসাধারণ মানুষ রুটিন মেনে চলে।',
    'একটা টপিক শেষ করে তবেই উঠবে — নিজের সাথে এই চুক্তি করো।',
    'বিজ্ঞাপন বন্ধ, বই চালু — আজকের একটামাত্র সিদ্ধান্ত!',
    'যা পড়ছ, তা শুধু পরীক্ষার জন্য নয় — জীবনের অস্ত্র।',
    'মন যেখানে না থাকুক, শরীরটা বইয়ের পাশে রেখে দাও।',
    'প্রতিদিনের লিখিত পরিকল্পনা, রাতের নিশ্চিন্ত ঘুম।',
    'এখনকার এক সপ্তাহের সংযম, সারাজীবনের স্বাধীনতা।',
    'তুমি অনেক দূর এসেছে — এখন থামার সময় নয়।',
    'নিজেকে প্রমাণ করার দিন শেষ; নিজের জন্য পড়ো।',
    'কেউ দেখুক বা না দেখুক — পরিশ্রমের রং ফলাফলে পড়বেই।',
    'আজকের তালিকার সবচেয়ে অপছন্দের কাজটা আগে করো।',
    'মনে রেখো, তোমার প্রতিযোগিতার মাঠে প্রস্তুতিই একমাত্র ভাষা।',
    'ধীর গতিও গতি — থেমে গেলে তবেই হার।',
    'স্মার্টফোন স্মার্ট পড়ুয়ার হাতে নয়, ব্যাগে ভালো।',
    'আজকের সময়টুকু ঋণ — ভবিষ্যতের নিজের কাছে।',
    'অল্পের যোগফলই বিশাল — রোজ কয়েক পাতাও মহাসমুদ্র।',
    'মন যদি ছুটে বেড়ায়, কলম ধরিয়ে দাও — লেখা মনকে ফেরায়।',
    'তোমার স্ট্রিক ভাঙবে না — কারণ আজকের তুমি গতকালের চেয়ে জেদি।',
    'পরীক্ষা কাছে, সময় হাতের মুঠোয় — আজকের প্র্যাকটিসই পাসওয়ার্ড।',
    'অসম্ভব শব্দটা মেধাবীদের অভিধানে নেই।',
    'আজ নিজেকে একটা প্রশ্ন করো: গতকালের চেয়ে আমি কী শিখলাম?',
    'পড়ার ঘরে যে ঘাম ঝরে, সেটাই সাফল্যের গন্ধ হয়ে ফেরে।',
    'ভয় পাও না বড় লক্ষ্য থেকে — ভয় পাও নিজেকে ছোট করে ফেলা থেকে।',
    'রোজের ছোট লক্ষ্য পূরণ করো — বড় লক্ষ্য লাইনে দাঁড়িয়ে থাকবে।',
    'আজকে এক ঘণ্টা বেশি, আগামীকাল এক ঘণ্টা এগিয়ে।',
    'কেউ কি বলেছ তুমি পারবে না? প্রমাণ করার দিন কাছে।',
    'যে চেষ্টা আজ অদৃশ্য, ফল কাল দৃশ্যমান হয়।',
    'মোটিভেশন মাত্র কয়েক মিনিট থাকে — অভ্যাস থাকে সারাজীবন।',
    'তোমার বসে থাকাও পড়ুয়ার পরাজয়, উঠে পড়াই একমাত্র প্রতিশোধ।',
    'সিট থেকে উঠবে না — টপিক শেষ না হওয়া পর্যন্ত। চ্যালেঞ্জ নাও!',
    'সবচেয়ে দুর্বল অধ্যায়টাই তোমার সবচেয়ে বড় সুযোগ।',
    'কলম ছুটলে মন ছুটে; পড়ো আর লেখো — দুটো একসাথে।',
    'দেরি হয়ে গেছে ভেবে শুরু না করাটাই আসল দেরি।',
    'প্রতিদিনের রিভিশনই পরীক্ষার আগের নিশ্চিন্তির টিকিট।',
    'নিজের সীমা জানতে চাও? আজ একটু বেশি পড়ে দেখো।',
    'সাফল্য একদিনে আসে না — কিন্তু প্রতিদিনই আসতে থাকে।',
    'আজকের অলসতার হিসাব, ফলাফলের দিনে মেলাতে হবে।',
    'যে বই আজ ভারী লাগছে, কাল সেটাই তোমার পাখির মতো হালকা।',
    'মন বদলাতে চাইলে জায়গা বদলাও — পড়ার জায়গা গুছিয়ে নাও।',
    'তোমার ঘুম না আসার কারণ অলসতা নয় — লক্ষ্যহীনতা। লক্ষ্য লিখে ফেলো।',
    'প্রশ্নব্যাংক তোমার বন্ধু — যত মেলামেশা, তত আত্মবিশ্বাস।',
    'আজ সোশ্যাল মিডিয়া ফাস্ট দাও — ফল দেখবে রাতেই।',
    'এক ঘণ্টার ফোনের বিনিময়ে এক টপিক — লাভের ব্যবসা!',
    'আগে শুরু, পরে নিখুঁত — উল্টোটা চলে না।',
    'স্বপ্ন দেখা ফ্রি, বাস্তবায়নের খরচ পরিশ্রম — বাজেট বানিয়ে ফেলো।',
    'তোমার এই সময়টা আর ফিরবে না — সেরাটা এখনই দাও।',
    'মনে রেখো: রেজাল্টের দিনে আফসোসের চেয়ে গর্ব ভালো।',
    'ছোট্ট বিরতিও পরিকল্পনার অংশ — কিন্তু বিরতি জীবন নয়।',
    'আজকে শেষ হোক প্রতিশ্রুতি নয় — অন্তত এক পাতা।',
    'যে সাধনা আজ লুকানো, সেই সাফল্য কাল দুনিয়া দেখবে।',
    'শুধু বেশি পড়া নয় — ভুলগুলো ফিরে দেখাও, সেখানেই লুকিয়ে র‍্যাংক।',
    'তোমার হারানোর কিছু নেই, জেতার সবই বাকি — শুরু করো!',
    'সময়মতো ঘুম, সময়মতো পড়া — টপারদের দুই চাকা।',
    'ক্লাস-নোট ঘেঁটে সময় নষ্ট নয় — নিজের লেখা নিজের শিক্ষক।',
    'আজকের ব্যথা সাময়িক, ব্যর্থতার ব্যথা দীর্ঘ — বেছে নাও।',
    'প্রতিদিন নিজের সাথে প্রতিযোগিতা — এই প্রতিযোগিতায় হার নেই।',
    'যে প্রশ্ন আজ কষ্ট দিচ্ছে, পরীক্ষায় সেটাই বন্ধু হবে।',
    'তোমার জন্ম তো বিজ্ঞাপন স্ক্রল করার জন্য নয় — ইতিহাস গড়ার জন্য!',
    'সময় চলে গেছে বলে কান্না নয় — বাকি সময়টুকুই তোমার রাজত্ব।',
    'প্রস্তুতির কোনো শর্টকাট নেই — তবে রোজ করার একটা রাস্তা আছে।',
    'আজ পড়া প্রতিটি লাইন হবে আগামী স্মার্টলির সিঁড়ি।',
    'নিজের প্রতি সৎ থাকো — রুটিন ভাঙলে বরাবরই মানবে।',
    'মনে রেখো: সামনে বসে থাকা মানুষটাও কাল তোমার গল্প বলবে।',
    'পড়ুয়ার শীতকালের রোদ, গরমের হাওয়া — সবই ফলাফলে মিশে।',
    'আজ একটু বেশি, কাল একটু বেশি — এভাবেই লেখা হয় ইতিহাস।',
    'মোবাইলের ব্যাটারির চিন্তা পড়ুয়ার হয় না — নিজের চার্জ দেখো!',
    'তোমার বর্তমান ক্লান্তি আসলে ভবিষ্যতের শক্তি জমছে।',
    'যে প্রতিজ্ঞা আজ ভাঙবে না, কালকের তুমি সেই ঋণ শোধ করবে গর্বে।',
    'ছোট লক্ষ্য ছোট মনে হয় — কিন্তু এগুলোই বড় স্বপ্নের পাথর।',
    'নতুন দিনের প্রথম প্রশ্ন: আজ কোন টপিক? — উত্তর দিয়েই শুরু করো!'
  ];

  const STYLE_ID = 'ah-greet3d-style';
  const ensureStyle = () => {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
#ahGreet3d{perspective:700px}
#ahGreet3d .p3-header-text{will-change:transform}
#ahGreet3d .p3-kicker-v3{background:linear-gradient(90deg,#10b981 25%,#6ee7b7 50%,#10b981 75%);background-size:200% auto;-webkit-background-clip:text;background-clip:text;color:transparent!important;animation:ahGreetSheen 4s linear infinite}
@keyframes ahGreetSheen{to{background-position:200% center}}
#ahGreet3d .p3-header-text h2{transform:perspective(600px) rotateX(9deg);transform-origin:50% 100%;transition:transform .35s ease;text-shadow:0 1px 0 rgba(255,255,255,.9),0 2px 0 #d7e6de,0 3px 0 #c4dacd,0 8px 16px rgba(15,60,45,.16);animation:ahGreetIn .55s ease both}
#ahGreet3d .p3-header-text h2:hover,#ahGreet3d .p3-header-text h2:active{transform:perspective(600px) rotateX(0) translateY(-2px)}
@keyframes ahGreetIn{from{opacity:0;transform:perspective(600px) rotateX(24deg) translateY(8px)}to{opacity:1;transform:perspective(600px) rotateX(9deg) translateY(0)}}
#ahGreet3d .p3-live-clock{margin:3px 0 0;color:#78958c;font-size:12px;line-height:1.5}
#ahGreet3d .p3-quote-3d{position:relative;margin:9px 0 0;padding:10px 14px 10px 36px;border:1px solid #dcece6;border-radius:14px;background:linear-gradient(135deg,#f6fcf9,#e9f6f0);box-shadow:0 10px 22px rgba(10,74,54,.09),inset 0 1px 0 rgba(255,255,255,.8);color:#3f5d51;font-size:12.5px;line-height:1.6;font-style:italic;max-width:340px}
#ahGreet3d .p3-quote-3d::before{content:'❝';position:absolute;left:11px;top:6px;font-size:20px;color:#10b981;font-style:normal}
#ahGreet3d .p3-quote-3d.ah-quote-swap{animation:ahQuoteIn .5s ease both}
@keyframes ahQuoteIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
@media(max-width:380px){#ahGreet3d .p3-quote-3d{font-size:11.5px;padding:9px 12px 9px 32px}}`;
    document.head.appendChild(style);
  };

  const bn = value => String(value).replace(/\d/g, d => '০১২৩৪৫৬৭৮৯'[d]);
  const WEEKDAYS = ['রবিবার', 'সোমবার', 'মঙ্গলবার', 'বুধবার', 'বৃহস্পতিবার', 'শুক্রবার', 'শনিবার'];
  const MONTHS = ['জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'];
  const greetingOf = h => (h >= 4 && h < 6) ? 'শুভ ভোর' : (h >= 6 && h < 12) ? 'শুভ সকাল' : (h >= 12 && h < 15) ? 'শুভ দুপুর' : (h >= 15 && h < 17) ? 'শুভ বিকেল' : (h >= 17 && h < 20) ? 'শুভ সন্ধ্যা' : 'শুভ রাত্রি';
  const clockText = d => { const h = d.getHours(), m = d.getMinutes(); const period = h < 4 || h >= 20 ? 'রাত' : h < 6 ? 'ভোর' : h < 12 ? 'সকাল' : h < 15 ? 'দুপুর' : h < 17 ? 'বিকেল' : 'সন্ধ্যা'; return `${WEEKDAYS[d.getDay()]}, ${bn(d.getDate())} ${MONTHS[d.getMonth()]} ${bn(d.getFullYear())} | ${period} ${bn(h % 12 || 12)}:${bn(String(m).padStart(2, '0'))}`; };
  const pickQuote = () => QUOTES[Math.floor(Math.random() * QUOTES.length)];

  const enhance = () => {
    const p3 = document.querySelector('#app [data-p3-command]');
    const header = p3?.querySelector('.p3-header-v3');
    if (!header) return false;
    ensureStyle();
    header.id = 'ahGreet3d';
    const now = new Date();
    const text = header.querySelector('.p3-header-text');
    if (!text) return false;
    const title = text.querySelector('h2');
    const wantTitle = `${greetingOf(now.getHours())}, Scholar`;
    if (title && title.textContent !== wantTitle) title.textContent = wantTitle;
    let clock = text.querySelector('.p3-live-clock');
    if (!clock) { clock = document.createElement('p'); clock.className = 'p3-live-clock'; title?.insertAdjacentElement('afterend', clock); }
    if (clock.textContent !== clockText(now)) clock.textContent = clockText(now);
    let quote = text.querySelector('.p3-quote-3d');
    if (!quote) { // পুরনো স্ট্যাটিক কোট <p> থাকলে সেটাই 3D কোটে রূপ নেয়; প্রতি নতুন ঢোকায় নতুন কোট
      const old = text.querySelector('p:not(.p3-live-clock)');
      quote = document.createElement('p');
      quote.className = 'p3-quote-3d ah-quote-swap';
      quote.textContent = '“' + pickQuote() + '”';
      if (old) old.replaceWith(quote); else clock.insertAdjacentElement('afterend', quote);
    }
    // streak-কার্ডের ঠিক উপরে রাখা
    const streak = p3.querySelector('#dailyStreakCard');
    if (streak && streak.previousElementSibling !== header) p3.insertBefore(header, streak);
    else if (!streak && p3.firstElementChild !== header) p3.insertBefore(header, p3.firstChild);
    return true;
  };

  let quoteTimer = null;
  const startLoops = () => {
    if (quoteTimer) return;
    quoteTimer = setInterval(() => {
      const p3 = document.querySelector('#app [data-p3-command]');
      if (!p3) { return; }
      const header = p3.querySelector('#ahGreet3d');
      if (!header) return;
      const now = new Date();
      const title = header.querySelector('.p3-header-text h2');
      if (title && !title.textContent.startsWith(greetingOf(now.getHours()))) title.textContent = `${greetingOf(now.getHours())}, Scholar`;
      const clock = header.querySelector('.p3-live-clock');
      if (clock) clock.textContent = clockText(now);
    }, 30000);
  };

  let lastRun = 0;
  const throttled = () => { const now = Date.now(); if (now - lastRun < 150) return; lastRun = now; enhance(); };
  const observe = () => {
    const app = document.getElementById('app');
    if (!app || window.__ahGreetObserver) return;
    window.__ahGreetObserver = new MutationObserver(() => {
      if (document.querySelector('#app [data-p3-command] .p3-header-v3')) throttled();
    });
    window.__ahGreetObserver.observe(app, { childList: true, subtree: true });
    window.addEventListener?.('hashchange', () => setTimeout(enhance, 250));
    [0, 300, 900, 1800].forEach(delay => setTimeout(enhance, delay));
  };

  window.AhGreeting3D = { enhance, greetingOf, pickQuote, clockText, quoteCount: QUOTES.length };
  if (typeof document !== 'undefined') { observe(); startLoops(); }
})();
