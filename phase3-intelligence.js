/* ================= PHASE 3: INTELLIGENCE LAYER =================
   Additive only: reads existing CACHE/IndexedDB records and preserves Mock Test behavior.
*/
(function(){
  'use strict';
  const LS={tasks:'admission_phase3_tasks', notifications:'admission_phase3_notifications', notificationSettings:'admission_phase3_notification_settings', motivation:'admission_phase3_motivation_state'};
  const CATEGORIES=['Study','Revision','Exam','Result','Streak','Progress','Achievement','System'];
  const MOTIVATIONS=[
    ['আজকের ফলাফল তোমার অগ্রগতি দেখাচ্ছে।','এই ধারাবাহিকতাই তোমার শক্তি।','আরও এক ধাপ এগিয়ে যাও।'],
    ['তোমার accuracy ভালো পথে আছে।','যে বিষয়গুলো শক্তিশালী সেগুলো ধরে রাখো।','এবার দুর্বল অংশে মন দাও।'],
    ['ভুলগুলো তোমার শেখার মানচিত্র।','প্রতিটি ভুল আলাদা করে বুঝে নাও।','পরের চেষ্টায় এগুলোই শক্তি হবে।'],
    ['আজ কম হয়েছে, তবু থেমে যেও না।','ছোট একটি practice set শুরু করো।','ধারাবাহিকতাই বড় ফল আনে।'],
    ['তোমার সাম্প্রতিক performance উন্নত হয়েছে।','এই momentum নষ্ট হতে দিও না।','একটি focused revision করো।'],
    ['সাম্প্রতিক ফলাফলে একটু চাপ দেখা যাচ্ছে।','দুর্বল topic-এ ফিরে যাও।','বোঝার পর আবার timed practice করো।'],
    ['একই ভুল বারবার হচ্ছে।','ভুলের কারণ লিখে পুনরায় solve করো।','আজকের revision হবে লক্ষ্যভিত্তিক।'],
    ['তোমার streak তৈরি হচ্ছে।','প্রতিদিনের ছোট পদক্ষেপ জমা হচ্ছে।','আজও একটি session সম্পূর্ণ করো।'],
    ['দীর্ঘদিন mock test হয়নি।','একটি বাস্তবসম্মত mock-এর সময় ঠিক করো।','ফলাফল দিয়ে পরের plan বদলাও।'],
    ['তুমি নিয়মিত mock দিচ্ছো।','এখন ভুলের trend কমানোই লক্ষ্য।','accuracy-কে score-এর সঙ্গে এগিয়ে নাও।'],
    ['তোমার প্রশ্ন সমাধানের গতি বাড়ছে।','সঠিকতার সঙ্গে গতি মিলিয়ে নাও।','অযথা তাড়াহুড়ো এড়িয়ে চলো।'],
    ['Skipped প্রশ্নগুলোও গুরুত্বপূর্ণ সংকেত।','যেগুলো বাদ গেছে সেগুলোর কারণ খুঁজে দেখো।','পরের mock-এ attempt strategy ঠিক করো।'],
    ['তোমার overall progress স্থিরভাবে এগোচ্ছে।','আজ একটি weak topic বেছে নাও।','লক্ষ্য পূরণ হলে নিজেকে credit দাও।'],
    ['আজকের কাজের তালিকা তোমার হাতে।','প্রথমে সবচেয়ে জরুরি task-টি শেষ করো।','তারপর revision-এ যাও।'],
    ['একটি subject তোমার বেশি practice চাইছে।','ভয় না পেয়ে ছোট অংশে ভাগ করো।','আজ শুধু প্রথম অংশটি জয় করো।'],
    ['তোমার recent accuracy তথ্য দিচ্ছে।','শুধু score নয়, pattern-ও দেখো।','এই insight-কে কাজে লাগাও।'],
    ['প্রস্তুতি কখনও একদিনে শেষ হয় না।','আজকের session-টি সম্পূর্ণ করাই সাফল্য।','ধীরে, কিন্তু থেমো না।'],
    ['তুমি যত solve করছো, তত পরিষ্কার হচ্ছে।','প্রশ্নের মানও খেয়াল রাখো।','বোঝার practice-ই দীর্ঘস্থায়ী হয়।'],
    ['Revision priority স্পষ্ট হয়ে গেছে।','সবকিছু একসঙ্গে নয়, আগে দুর্বল topic।','ফোকাসড কাজ দ্রুত ফল দেয়।'],
    ['তোমার best score একটি প্রমাণ।','তুমি আরও ভালো করতে পারো।','পরের লক্ষ্যটি বাস্তব ও নির্দিষ্ট রাখো।'],
    ['আজকের performance বিশ্লেষণ করো।','যা ঠিক হয়েছে তা ধরে রাখো।','যা আটকে দিয়েছে তা ভেঙে অনুশীলন করো।'],
    ['তোমার consistency-ই বড় advantage।','একটি missed day তোমার গল্প বদলায় না।','আজ আবার শুরু করাই যথেষ্ট।'],
    ['প্রতিটি practice তোমাকে exam-ready করছে।','দুর্বলতার সামনে দাঁড়াও।','সেখানেই তোমার পরের উন্নতি।'],
    ['আজ progress কম হলেও data নষ্ট হয়নি।','এটি পরের সিদ্ধান্তের ভিত্তি।','একটি ছোট action এখনই নাও.']
  ];
  const read=(key,fallback)=>{try{const v=JSON.parse(localStorage.getItem(key)||'null');return v==null?fallback:v}catch(_){return fallback}};
  const write=(key,value)=>{try{localStorage.setItem(key,JSON.stringify(value))}catch(_){} };
  const esc3=v=>typeof esc==='function'?esc(String(v??'')):String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const pct=(n,d)=>d?Math.round(n/d*100):0;
  const keyOf=d=>typeof todayKey==='function'?todayKey(new Date(d)):new Date(d).toISOString().slice(0,10);
  const dateMs=k=>new Date(k+'T00:00:00').getTime();
  function results(){return typeof CACHE!=='undefined'&&Array.isArray(CACHE.examResults)?CACHE.examResults.filter(Boolean):[]}
  function snaps(){return results().flatMap(r=>(r.snapshot||[]).map(s=>({...s,examDate:r.date||r.createdAt||Date.now(),examId:r.id})))}
  function subjectLabel(id){try{return typeof subjectName==='function'?subjectName(id):id||'Unknown subject'}catch(_){return id||'Unknown subject'}}
  function topicLabel(id){try{return typeof topicName==='function'?topicName(id):id||'Unknown topic'}catch(_){return id||'Unknown topic'}}
  function aggregate(items,name){const m={};items.forEach(x=>{const id=x[name]||'unknown';m[id]??={id,name:name==='subjectId'?subjectLabel(id):topicLabel(id),attempts:0,correct:0,wrong:0,skipped:0,lastAt:0};m[id].attempts++;m[id][x.status]=(m[id][x.status]||0)+1;m[id].lastAt=Math.max(m[id].lastAt,Number(x.examDate)||0)});return Object.values(m).map(x=>({...x,accuracy:pct(x.correct,x.correct+x.wrong),answered:x.correct+x.wrong}))}
  function summary(){const s=snaps(),answered=s.filter(x=>x.status!=='skipped'),correct=s.filter(x=>x.status==='correct'),wrong=s.filter(x=>x.status==='wrong'),skipped=s.filter(x=>x.status==='skipped'),rs=results();const days=new Set(s.map(x=>keyOf(x.examDate)));const ordered=[...days].sort();let streak=0,run=0,last='';ordered.forEach(k=>{if(last&&dateMs(k)-dateMs(last)===86400000)run++;else run=1;streak=Math.max(streak,run);last=k});const today=keyOf(Date.now()),todayItems=s.filter(x=>keyOf(x.examDate)===today),recent=rs.slice(-5),scores=rs.map(r=>Number(r.score)||0);return {s,answered,correct,wrong,skipped,rs,days,streak,todayItems,recent,scores,accuracy:pct(correct.length,answered.length),todayAnswered:todayItems.filter(x=>x.status!=='skipped').length,todayCorrect:todayItems.filter(x=>x.status==='correct').length}};
  function tasks(){const v=read(LS.tasks,[]);return Array.isArray(v)?v:[]}
  function saveTasks(v){write(LS.tasks,v)}
  function settings(){const s=read(LS.notificationSettings,{});return Object.fromEntries(CATEGORIES.map(c=>[c,s[c]!==false]))}
  function saveSettings(v){write(LS.notificationSettings,v)}
  function notifications(){const v=read(LS.notifications,[]);return Array.isArray(v)?v:[]}
  function addNotification(category,title,body,dedupe){if(!settings()[category])return;let ns=notifications();if(ns.some(n=>n.dedupeKey===dedupe))return;ns=[{id:'n-'+Date.now()+'-'+Math.random().toString(36).slice(2,7),category,title,body,dedupeKey:dedupe,read:false,createdAt:Date.now()},...ns].slice(0,100);write(LS.notifications,ns)}
  function derive(){const z=summary(),bySubject=aggregate(z.s,'subjectId'),byTopic=aggregate(z.s,'topicId');const weakTopics=byTopic.filter(x=>x.answered>0).sort((a,b)=>a.accuracy-b.accuracy||b.wrong-a.wrong);const weakSubjects=bySubject.filter(x=>x.answered>0).sort((a,b)=>a.accuracy-b.accuracy);const mistakeMap={};(CACHE.mistakes||[]).forEach(m=>{const id=m.topicId||m.questionId;mistakeMap[id]=(mistakeMap[id]||0)+Number(m.wrongCount||1)});const repeated=Object.entries(mistakeMap).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([id,count])=>({name:topicLabel(id),count,id}));const target=Number(CACHE.settings?.dailyTarget||read('dailyTarget',100))||100;const dayKey=keyOf(Date.now()),daily=(CACHE.dailyStats||[]).find(x=>String(x.id)===String(dayKey))||{},done=Math.max(Number(daily.questions||0),z.todayAnswered);const pending=Math.max(0,target-done);const recent=z.recent.map(r=>({date:keyOf(r.date||r.createdAt),score:Number(r.score)||0,accuracy:Number(r.accuracy)||0}));const todayActivity=z.todayItems.reduce((acc,item)=>{const sub=subjectLabel(item.subjectId);if(!acc[sub])acc[sub]={correct:0,total:0};if(item.status==='correct')acc[sub].correct++;if(item.status!=='skipped')acc[sub].total++;return acc},{});const activityText=Object.entries(todayActivity).map(([name,stats])=>`${name}: ${stats.correct}/${stats.total}`).join(', ')||'No activity yet';const last=recent.at(-1),prev=recent.at(-2);let recommendation='প্রথমে একটি ছোট practice set সম্পূর্ণ করুন।',action="navigate('exam/setup')";if(repeated[0]){recommendation=`${repeated[0].name}-এ ${repeated[0].count}টি stored mistake আছে। আগে এই topic revise করুন।`;action=`startPhase3Topic('${String(repeated[0].id).replace(/'/g,"\\'")}')`}else if(weakTopics[0]){recommendation=`${weakTopics[0].name}-এর accuracy ${weakTopics[0].accuracy}%। focused revision দিয়ে শুরু করুন।`;action=`startPhase3Topic('${String(weakTopics[0].id).replace(/'/g,"\\'")}')`}else if(pending>0){recommendation=`আজকের target পূরণে আরও ${pending}টি প্রশ্ন বাকি।`;action="navigate('exam/setup')"}else if(last&&prev&&last.score>prev.score){recommendation='সাম্প্রতিক score বেড়েছে। এই momentum ধরে একটি revision করুন।';action="navigate('progress')"}return {z,bySubject,byTopic,weakTopics,weakSubjects,repeated,target,done,pending,recent,recommendation,action,activityText}};
  function streak(){return summary().streak}
  function motivation(){const d=derive(),z=d.z;let idx=0;if(z.s.length===0)idx=16;else if(z.scores.at(-1)>=80)idx=0;else if(z.accuracy<60)idx=5;else if(d.repeated[0])idx=6;else if(z.recent.length<2)idx=3;else if(z.recent.at(-1).score>z.recent.at(-2).score)idx=4;else if(streak()>=3)idx=7;else if(d.weakTopics[0])idx=18;const state=read(LS.motivation,{last:-1});if(idx===state.last)idx=(idx+1)%MOTIVATIONS.length;write(LS.motivation,{last:idx,updatedAt:Date.now()});return MOTIVATIONS[idx]}
  function fmtTime(ms){const n=Math.round(Number(ms||0)/60000);return n?`${n} min`:'0 min'}
  function fmtTimeClock(ms){
    const totalSeconds = Math.floor(Number(ms||0) / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  }

  // Dashboard-only mirror of the existing 90 Day Routine data. It never navigates;
  // it reads/writes only the routine's existing localStorage record.
  const ROUTINE90_KEY = 'routine90_data';
  const ROUTINE90_SUBJECTS = ['Bangla 1st','Bangla 2nd','English 2nd','Memorizing','বিরচন','GK'];
  const ROUTINE90_ALIASES = { Bangla:'Bangla 1st', English:'English 2nd', Vocabulary:'Memorizing' };
  const routine90DateKey = date => { const d = new Date(date); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
  const routine90Read = () => { try { return JSON.parse(localStorage.getItem(ROUTINE90_KEY) || '{}') || {}; } catch (_) { return {}; } };
  function routine90Today(){
    const raw = routine90Read(), today = routine90DateKey(new Date()), days = raw.days && typeof raw.days === 'object' ? raw.days : {};
    const day = Object.values(days).find(item => String(item?.date || '') === today) || null;
    const source = Array.isArray(day?.items) ? day.items : [];
    const normalized = source.map(item => ({ id:String(item?.id || ''), subject:ROUTINE90_ALIASES[item?.subject] || item?.subject || 'Custom', topic:String(item?.topic || ''), done:!!item?.done }));
    const items = ROUTINE90_SUBJECTS.map(subject => normalized.find(item => item.subject === subject) || { id:`placeholder-${subject}`, subject, topic:'', done:false, placeholder:true });
    normalized.filter(item => !ROUTINE90_SUBJECTS.includes(item.subject)).forEach(item => items.push(item));
    return { raw, day, today, items };
  }
  const routine90Esc = value => esc3(value);
  function routine90CardHTML(){
    const { day, today, items } = routine90Today();
    const active = items.filter(item => item.topic), done = active.filter(item => item.done).length;
    const dateLabel = day?.date ? new Date(`${day.date}T00:00:00`).toLocaleDateString('bn-BD',{day:'numeric',month:'long',weekday:'long'}) : 'আজকের দিনের পরিকল্পনা';
    const rows = items.map(item => item.topic
      ? `<div class="p3-routine-topic-v3" role="button" tabindex="0" onclick="if(!event.target.closest('button'))window.__toggleTodayRoutineTopic('${routine90Esc(item.id)}')"><button type="button" class="p3-routine-check-v3 ${item.done?'is-done':''}" aria-pressed="${item.done}" aria-label="${routine90Esc(item.done?'চিহ্নিত: '+item.topic:'শেষ হিসেবে চিহ্নিত করুন: '+item.topic)}" onclick="window.__toggleTodayRoutineTopic('${routine90Esc(item.id)}')">${item.done?'✓':''}</button><span><b>${routine90Esc(item.subject)}</b><small class="${item.done?'is-done':''}">${routine90Esc(item.topic)}</small></span></div>`
      : `<div class="p3-routine-topic-v3 is-empty"><span class="p3-routine-empty-dot"></span><span><b>${routine90Esc(item.subject)}</b><small>আজকের topic এখনো যোগ করা হয়নি</small></span></div>`).join('');
    return `<section class="p3-card-v3 p3-routine-today-v3" data-today-routine data-routine-date="${today}"><div class="p3-routine-decor" aria-hidden="true"></div><div class="p3-routine-head-v3"><div><div class="p3-routine-kicker-v3">TODAY'S 90 DAY ROUTINE</div><h3>আজকের পড়ার card</h3><p>${routine90Esc(dateLabel)}</p></div><div class="p3-routine-count-v3"><b>${done}/${active.length || 0}</b><small>COMPLETED</small></div></div><div class="p3-routine-list-v3">${rows}</div></section>`;
  }
  function replaceTodayRoutineCard(){
    const dashboardPath = String((window.Router && window.Router.path) || location.hash.replace(/^#\/?/,'').split('?')[0] || 'dashboard');
    if (dashboardPath !== 'dashboard') return;
    const current = document.querySelector('[data-today-routine]');
    if (!current) return;
    const holder = document.createElement('div'); holder.innerHTML = routine90CardHTML(); current.replaceWith(holder.firstElementChild);
  }
  window.__toggleTodayRoutineTopic = function(id){
    const { raw, day } = routine90Today();
    if (!day || !Array.isArray(day.items)) return;
    const item = day.items.find(row => String(row?.id || '') === String(id));
    if (!item) return;
    item.done = !item.done;
    try { localStorage.setItem(ROUTINE90_KEY, JSON.stringify(raw)); } catch (_) {}
    window.dispatchEvent(new CustomEvent('routine90-updated'));
    replaceTodayRoutineCard();
  };
  window.addEventListener('routine90-updated', replaceTodayRoutineCard);
  window.addEventListener('storage', event => { if (event.key === ROUTINE90_KEY) replaceTodayRoutineCard(); });
  function bars(items,label){if(!items.length)return '<div class="p3-empty">এই সময়সীমায় কোনো stored data নেই।</div>';return items.map(x=>`<div class="p3-bar-row"><div class="p3-bar-label"><span>${esc3(x.name)}</span><b>${x.accuracy}%</b></div><div class="p3-bar"><i style="width:${Math.min(100,Math.max(0,x.accuracy))}%"></i></div><small>${x.answered||0} answered · ${x.wrong||0} wrong</small></div>`).join('')}
  const ICONS = {
    crown: `<svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7z"></path></svg>`,
    target: `<svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="6"></circle><circle cx="12" cy="12" r="2"></circle></svg>`,
    tasks: `<svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect><path d="M9 14l2 2 4-4"></path></svg>`,
    accuracy: `<svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"></path><path d="M22 12A10 10 0 0 0 12 2v10z"></path></svg>`,
    streak: `<svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.5 3.5 6 1.5 1.5 2 2.75 2 4.25a6.5 6.5 0 1 1-9 1.25z"></path></svg>`,
    star: `<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>`,
    check: `<svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`,
    x: `<svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`,
    question: `<svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`,
    lightbulb: `<svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18h6"></path><path d="M10 22h4"></path><path d="M12 2a7 7 0 0 0-7 7c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74a7 7 0 0 0-7-7z"></path></svg>`,
    clock: `<svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>`,
    trophy: `<svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"></path><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"></path><path d="M4 22h16"></path><path d="M10 14.66V17c0 .55-.45 1-1 1H4v2h16v-2h-5c-.55 0-1-.45-1-1v-2.34"></path><path d="M18 4H6v7a6 6 0 0 0 12 0V4z"></path></svg>`,
    arrow: `<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>`,
    trend: `<svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>`,
    pencil: `<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>`
  };

  function widgetHTML(){
    const d=derive(),z=d.z,st=streak(),t=tasks(),done=t.filter(x=>x.completed).length,pending=t.length-done,study=Number((CACHE.dailyStats||[]).find(x=>String(x.id)===String(keyOf(Date.now())))?.timeMs||0);
    const mock=z.rs.length,unread=notifications().filter(n=>!n.read).length;
    const targetPct = Math.min(100, Math.round(d.done/Math.max(1,d.target)*100));
    const tasksPct = Math.min(100, Math.round(done/Math.max(1,t.length||1)*100));
    
    // Original data points
    const unfinished = typeof CACHE !== 'undefined' && Array.isArray(CACHE.exams) ? CACHE.exams.find((exam) => exam.status === 'running') : null;
    const smartFocus = typeof getSmartFocusTopics === 'function' ? getSmartFocusTopics() : [];
    const stats = typeof computeLifetimeStats === 'function' ? computeLifetimeStats() : {totalQuestions: 0};

    const commandTools = [
      ['📚', 'Bank', 'প্রশ্নভাণ্ডার', 'question-bank'],
      ['📘', 'Courses', 'exact source courses', 'source-courses'],
      ['📋', 'Mock', 'মক টেস্ট', 'exam/setup'],
      ['⚡', 'Quick', 'দ্রুত অনুশীলন', 'exam/setup'],
      ['📊', 'Progress', 'প্রস্তুতির অগ্রগতি', 'progress-overview'],
      ['🧠', 'Mistakes', 'ভুল প্রশ্নের ব্যাংক', 'mistakes-bank'],
      ['📓', 'Notebook', 'ভুলের খাতা + AI', 'mistake-notebook'],
      ['🎯', 'Goals', 'দৈনিক লক্ষ্য', 'progress/plan'],
      ['🔁', 'Revision', 'স্মার্ট রিভিশন', 'smart-revision'],
      ['🕐', 'History', 'পরীক্ষার ইতিহাস', 'history'],
      ['🔍', 'Search', 'প্রশ্ন খুঁজুন', 'question-bank'],
      ['📥', 'Inbox', 'নোটিফিকেশন', 'notifications'],
    ];

    const commandPages = Array.from({length:Math.ceil(commandTools.length/6)},(_,pageIndex) => commandTools.slice(pageIndex*6,pageIndex*6+6).map(tool => tool ? (() => { const [icon,title,subtitle,route] = tool; return `
      <button class="p3-command-card-v3" onclick="${route === 'source-courses' ? "location.hash='#source-courses'" : `navigate('${route}')` }" type="button">
        <span class="p3-command-icon-v3">${icon}</span>
        <span class="p3-command-title-v3">${title}</span>
        <span class="p3-command-subtitle-v3">${subtitle}</span>
      </button>`; })() : '<div class="p3-command-card-v3 p3-command-empty-slot-v3" aria-hidden="true"></div>').join(''));

    const specialTools = [];

    const focusMarkup = smartFocus.length
      ? smartFocus.map((item) => `
          <div class="p3-focus-row-v3">
            <div class="p3-focus-info-v3">
              <strong>${esc3(item.name)}</strong>
              <small>${item.mCount} mistakes · ${typeof round2 === 'function' ? round2(item.acc) : item.acc}% accuracy</small>
            </div>
            <em class="p3-focus-tag-v3 ${item.cls}">${item.label}</em>
          </div>`).join('')
      : '<p class="p3-muted-v3">অনুশীলন শুরু করলে আপনার দুর্বল topic এখানে দেখা যাবে।</p>';

    const todayDaily = (CACHE.dailyStats||[]).find(x=>String(x.id)===String(keyOf(Date.now())))||{};
    const todayCorrect = Math.max(z.todayCorrect || 0, Number(todayDaily.correct||0));
    const todayWrong = Math.max(0, Number(todayDaily.wrong||0), z.todayAnswered - todayCorrect);
    const todayAttempts = Math.max(d.done, todayCorrect + todayWrong);
    const todayAccuracy = todayAttempts ? pct(todayCorrect, todayAttempts) : 0;
    const studyClock = fmtTimeClock(study);
    const goalComplete = d.done >= d.target;
    const chartSource = z.recent.length ? z.recent.slice(-7).map(item => Math.max(8, Math.min(96, Number(item.accuracy || item.score || 0)))) : [28,46,35,58,51,70,86];
    const quickChartPoints = chartSource.map((value,index) => `${14 + index * 25},${66 - Math.round(value * .45)}`).join(' ');

    return `
    <section class="p3-dashboard-v3" data-p3-command>
      <header class="p3-header-v3">
        <div class="p3-header-left">
          <div class="p3-crown-circle">${ICONS.crown}</div>
          <div class="p3-header-text">
            <div class="p3-kicker-v3">EMERALD ACADEMIC</div>
            <h2>সুপ্রভাত, Scholar</h2>
            <p>"আজকের পরিশ্রমই তোমার আগামীকালের সাফল্য!"</p>
          </div>
        </div>
        <div class="p3-header-right">
          <button class="p3-inbox-btn" onclick="navigate('notifications')"><span>Inbox</span>${unread ? `<i class="p3-badge">${unread}</i>` : ''}</button>
        </div>
      </header>

      <article class="p3-card-v3 p3-today-hero-card">
        <div class="p3-today-head">
          <div class="p3-today-copy">
            <div class="p3-hero-kicker">TODAY COMMAND CENTER</div>
            <h3 class="p3-hero-title">আজকের MCQ লক্ষ্য</h3>
            <div class="p3-hero-num"><strong data-today-done>${d.done}</strong><small>/ <span data-today-goal>${d.target}</span> MCQ</small></div>
          </div>
          <div class="p3-today-dial" data-today-dial style="--today-progress:${targetPct}%"><b data-today-percent>${targetPct}%</b><small>COMPLETE</small></div>
        </div>
        <div class="p3-card-progress p3-today-progress"><i data-today-progress style="width:${targetPct}%"></i></div>
        <div class="p3-today-progress-meta"><span class="p3-goal-status-v3 ${goalComplete?'is-complete':''}" data-today-goal-status>${goalComplete?'আজকের লক্ষ্য পূর্ণ ✓':`${d.pending} MCQ বাকি`}</span><small>আজকের অগ্রগতি</small></div>
        <div class="p3-hero-stats-row">
          <div class="p3-hero-stat-item">
            <span class="p3-stat-badge green">${ICONS.check}</span>
            <div><b data-today-correct>${todayCorrect}</b><small>Correct</small></div>
          </div>
          <div class="p3-hero-stat-item">
            <span class="p3-stat-badge red">${ICONS.x}</span>
            <div><b data-today-wrong>${todayWrong}</b><small>Wrong</small></div>
          </div>
          <div class="p3-hero-stat-item p3-accuracy-stat" title="${esc3(d.activityText)}">
            <span class="p3-stat-badge blue">${ICONS.trend}</span>
            <div>
              <b data-today-accuracy>${todayAccuracy}%</b>
              <small>Accuracy</small>
            </div>
            <div class="p3-accuracy-popup">${esc3(d.activityText)}</div>
          </div>
          <div class="p3-hero-stat-item">
            <span class="p3-stat-badge purple">${ICONS.clock}</span>
            <div><b data-today-study-time>${studyClock}</b><small>Study Time</small></div>
          </div>
        </div>
      </article>




      <section class="p3-card-v3 p3-command-section-v3">
        <div class="p3-section-head-v3">
          <b>Your Command Center</b>
          <span class="p3-swipe-hint-v3">Swipe to explore · ${commandTools.length} tools</span>
        </div>
        <div class="command-carousel" aria-label="Quick access study tools">
          <div class="command-track" id="commandTrack" style="--command-pages:${commandPages.length};width:${commandPages.length*100}%">
            ${commandPages.map((page,index)=>`<div class="command-slide" data-command-page="${index}">${page}</div>`).join('')}
          </div>
        </div>
        <div class="command-dots" role="tablist" aria-label="Command Center pages">
          ${commandPages.map((_,index)=>`<button class="command-dot ${index===0?'active':''}" type="button" role="tab" aria-label="Page ${index+1}" aria-selected="${index===0?'true':'false'}" onclick="goCommandPage(${index})"></button>`).join('')}
        </div>
      </section>


      <div class="p3-two-col-v3">
        <section class="p3-card-v3 p3-progress-v3">
          <div class="p3-section-head-v3">
            <div class="p3-title-with-icon">${ICONS.trend} <span>Current Study<br>Progress</span></div>
          </div>
          <div class="p3-progress-body-v3">
            <div class="p3-circle-container p3-multi-ring-v3">
              <svg viewBox="0 0 120 120" class="p3-circular-chart p3-rings-chart" aria-label="${targetPct}% progress">
                <circle class="p3-ring-track" cx="60" cy="60" r="47"></circle>
                <circle class="p3-ring ring-green" cx="60" cy="60" r="47" pathLength="100" stroke-dasharray="${targetPct} 100"></circle>
                <circle class="p3-ring ring-blue" cx="60" cy="60" r="35" pathLength="100" stroke-dasharray="${Math.min(100,z.accuracy||0)} 100"></circle>
                <circle class="p3-ring ring-purple" cx="60" cy="60" r="23" pathLength="100" stroke-dasharray="${Math.max(18,Math.min(100,Math.round((z.answered.length/Math.max(1,d.target))*100)))} 100"></circle>
                <text x="60" y="66" class="p3-percentage">${targetPct}%</text>
              </svg>
            </div>
            <div class="p3-progress-stats-v3">
              <div class="p3-prog-stat">
                <span class="p3-prog-dot dot-green"></span>
                <div><small>Questions solved</small><b>${z.answered.length||0}</b></div>
              </div>
              <div class="p3-prog-stat">
                <span class="p3-prog-dot dot-purple"></span>
                <div><small>Study time</small><b>${fmtTime(study)}</b></div>
              </div>
            </div>
          </div>
        </section>

        <section class="p3-card-v3 p3-quick-stats-v3">
          <div class="p3-section-head-v3">
            <b>Quick Stats</b>
            <button class="p3-more-btn" aria-label="More quick stats">⋮</button>
          </div>
          <div class="p3-quick-grid-v3">
            <div class="p3-quick-box"><div class="p3-quick-icon q1">${ICONS.question}</div><div class="p3-quick-data"><b>${z.answered.length||0}</b><small>Questions solved</small></div></div>
            <div class="p3-quick-box"><div class="p3-quick-icon q2">${ICONS.check}</div><div class="p3-quick-data"><b>${z.correct.length||0}</b><small>Correct</small></div></div>
            <div class="p3-quick-box"><div class="p3-quick-icon q4">${ICONS.target}</div><div class="p3-quick-data"><b>${z.accuracy||0}%</b><small>Accuracy</small></div></div>
          </div>
          <svg class="p3-quick-line-v3" viewBox="0 0 180 80" preserveAspectRatio="none" aria-hidden="true"><polyline points="${quickChartPoints}" fill="none" stroke="#76bde2" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"></polyline>${chartSource.map((value,index)=>`<circle cx="${14 + index * 25}" cy="${66 - Math.round(value * .45)}" r="3.2" fill="${index > chartSource.length-3 ? '#aa8ce7' : '#62b9df'}"></circle>`).join('')}</svg>
        </section>
      </div>

      ${routine90CardHTML()}

      <section class="p3-special-section-v3">
        <div class="p3-section-head-v3">
          <b>Study Tools</b>
          <span class="p3-dashboard-only-v3">Review & analysis</span>
        </div>
        <div class="p3-special-grid-v3" data-unified-study-tools-list>
          <button class="p3-special-card-v3 p3-unified-tool-row-v3 p3-notes-card-v3" data-notes-tool-card onclick="navigate('notes')" type="button">
            <span class="p3-special-icon-v3">📝</span>
            <div class="p3-special-info-v3">
              <strong>নোট</strong>
              <small>ভুল প্রশ্ন ও AI Explain সংরক্ষণ</small>
            </div>
            <span class="p3-special-arrow-v3">${ICONS.arrow}</span>
          </button>
        </div>
      </section>
    </section>`;
  }

  window.__phase3DashboardMarkup = widgetHTML;

  function injectDashboard(){
    if(Router.path!=='dashboard')return;
    const page=document.querySelector('#app .page');
    if(!page)return;
    
    // Hide original dashboard elements to avoid duplicates
    const oldDash = page.querySelector('.dashboard-v2') || page.querySelector(':scope > .fade-in');
    if(oldDash && !oldDash.matches('[data-p3-command]')) oldDash.style.display = 'none';
    
    // Inject or update our super dashboard
    let dash = page.querySelector('[data-p3-command]');
    if(!dash){
      page.insertAdjacentHTML('afterbegin', widgetHTML());
    } else {
      dash.outerHTML = widgetHTML();
    }
    
    // Re-initialize carousel if needed
    if(typeof installCarousel === 'function') installCarousel(page);
  }
  let analyticsRange=7;window.phase3SetAnalyticsRange=function(n){analyticsRange=Number(n)||7;render()};function analyticsHTML(){const d=derive(),z=d.z,bySubject=d.bySubject,byTopic=d.byTopic;const daily=Array.from({length:analyticsRange},(_,i)=>{const dt=new Date();dt.setDate(dt.getDate()-(analyticsRange-1-i));const k=keyOf(dt);const s=z.s.filter(x=>keyOf(x.examDate)===k);return {name:k.slice(5),accuracy:pct(s.filter(x=>x.status==='correct').length,s.filter(x=>x.status!=='skipped').length),answered:s.filter(x=>x.status!=='skipped').length}});const weekly=(CACHE.dailyStats||[]).slice(-7).reduce((a,x)=>a+Number(x.timeMs||0),0);const monthly=(CACHE.dailyStats||[]).slice(-30).reduce((a,x)=>a+Number(x.timeMs||0),0);const best=z.scores.length?Math.max(...z.scores):0,low=z.scores.length?Math.min(...z.scores):0;return `<div class="explorer-head"><div class="explorer-kicker">Stored Learning Intelligence</div><div class="explorer-title">Advanced Analytics</div><div class="explorer-subtitle">শুধু তোমার IndexedDB ও localStorage-এর বাস্তব record থেকে গণনা করা হয়েছে।</div></div><div class="p3-analytics-tabs"><button class="chip ${analyticsRange===7?'active':''}" onclick="phase3SetAnalyticsRange(7)">Last 7 days</button><button class="chip ${analyticsRange===30?'active':''}" onclick="phase3SetAnalyticsRange(30)">Last 30 days</button><button class="chip ${analyticsRange===90?'active':''}" onclick="phase3SetAnalyticsRange(90)">Last 90 days</button></div><div class="phase5-grid three"><div class="phase5-kpi"><b>${z.rs.length}</b><span>Mock tests</span></div><div class="phase5-kpi"><b>${z.accuracy}%</b><span>Average accuracy</span></div><div class="phase5-kpi"><b>${best||0}</b><span>Best score</span></div><div class="phase5-kpi"><b>${low||0}</b><span>Lowest score</span></div><div class="phase5-kpi"><b>${z.correct.length}</b><span>Correct</span></div><div class="phase5-kpi"><b>${z.wrong.length}</b><span>Wrong · ${z.skipped.length} skipped</span></div></div><div class="p3-analytics-grid"><section class="card"><div class="p3-section-head"><b>Accuracy trend</b><span>${z.s.length?'Last 7 stored days':'Zero state'}</span></div>${bars(daily,'accuracy')}</section><section class="card"><div class="p3-section-head"><b>Time analysis</b><span>${fmtTime(weekly)} / ${fmtTime(monthly)}</span></div><div class="p3-time-cards"><span><b>${fmtTime(weekly)}</b>Last 7 days</span><span><b>${fmtTime(monthly)}</b>Last 30 days</span><span><b>${z.days.size}</b>Active days</span><span><b>${z.rs.length?Math.round(z.rs.reduce((a,r)=>a+Number(r.duration||0),0)/z.rs.length/60000):0} min</b>Avg session</span></div></section><section class="card"><div class="p3-section-head"><b>Subject performance</b><span>${bySubject.length} subjects</span></div>${bars(bySubject,'accuracy')}</section><section class="card"><div class="p3-section-head"><b>Topic performance & mistakes</b><span>${byTopic.length} topics</span></div>${bars(byTopic.slice(0,10),'accuracy')}${!byTopic.length?'<div class="p3-empty">Practice data জমা হলে topic insight দেখা যাবে।</div>':''}</section></div><div class="card"><div class="p3-section-head"><b>Recent performance</b><span>${z.recent.length} stored results</span></div>${z.recent.length?`<div class="p3-result-list">${z.recent.slice().reverse().map(r=>`<span><b>${r.score}</b><small>${r.date} · ${r.accuracy||0}% accuracy</small></span>`).join('')}</div>`:'<div class="p3-empty">কোনো mock result নেই। প্রথম real result submit হলে এখানে trend তৈরি হবে।</div>'}</div><button class="btn secondary" onclick="exportAnalytics()">Export analytics CSV</button>`}
  function motivationHTML(){const m=motivation();return `<section class="card p3-motivation"><div class="p3-kicker">আজকের অনুপ্রেরণা</div>${m.map(x=>`<div>${esc3(x)}</div>`).join('')}</section>`}
  window.__phase3ProgressExtras=()=>motivationHTML()+`<section class="card" data-p3-progress><div class="p3-section-head"><b>Learning intelligence</b><button class="btn secondary sm" onclick="navigate('analytics')">Open analytics</button></div><p>${esc3(derive().recommendation)}</p></section>`;
  function notificationsHTML(){const ns=notifications(),unread=ns.filter(n=>!n.read).length;return `<div class="explorer-head"><div class="explorer-kicker">Unified Inbox</div><div class="explorer-title">Notification Center</div><div class="explorer-subtitle">Study, revision, exam and progress alerts এক জায়গায়।</div></div><div class="p3-notify-toolbar"><span>${unread} unread · ${ns.length} history</span><button class="btn secondary sm" onclick="phase3MarkAllRead()">Mark all as read</button></div>${ns.length?`<div class="p3-notification-list">${ns.map(n=>`<article class="card ${n.read?'':'is-unread'}"><div class="row between"><span class="pill">${esc3(n.category)}</span><small>${new Date(n.createdAt).toLocaleString()}</small></div><b>${esc3(n.title)}</b><p>${esc3(n.body)}</p><button class="linkbtn" onclick="phase3MarkRead('${n.id}')">${n.read?'Read':'Mark read'}</button></article>`).join('')}</div>`:'<div class="card p3-empty">এখনও কোনো notification তৈরি হয়নি।</div>'}`}
  function hookRender(){const old=window.render;if(window.__phase3RenderHook)return;window.__phase3RenderHook=true;window.render=function(){const p=Router.path;if(p==='analytics')return renderShell(analyticsHTML(),{title:'Analytics',back:"navigate('dashboard')"});if(p==='notifications')return renderShell(notificationsHTML(),{title:'Notifications',back:"navigate('dashboard')"});if(p==='profile'&&typeof window.__admissionIntegratedProfileRender==='function')return window.__admissionIntegratedProfileRender();const result=old.apply(this,arguments);if(p==='dashboard')setTimeout(injectDashboard,0);return result;};}
  window.startPhase3Topic=function(id){const pool=(CACHE.questions||[]).filter(q=>q.topicId===id);if(pool.length&&typeof beginExamFromPool==='function')return beginExamFromPool(pool.slice(0,20),'flash');toast('এই topic-এ practice question নেই');};
  window.phase3AddTask=function(){const title=prompt('আজকের task লিখুন');if(!title?.trim())return;saveTasks([...tasks(),{id:'t-'+Date.now(),title:title.trim(),completed:false,createdAt:Date.now()}]);render()};
  window.phase3CompleteTask=function(id){saveTasks(tasks().map(t=>t.id===id?{...t,completed:!t.completed,completedAt:Date.now()}:t));render()};
  window.phase3MarkRead=function(id){write(LS.notifications,notifications().map(n=>n.id===id?{...n,read:true}:n));render()};
  window.phase3MarkAllRead=function(){write(LS.notifications,notifications().map(n=>({...n,read:true})));render()};
  function init(){hookRender();try{derive()}catch(e){console.warn('Phase 3 intelligence init failed',e)}[0,100,500,1200].forEach(ms=>setTimeout(injectDashboard,ms));window.addEventListener('load',()=>[0,150,600].forEach(ms=>setTimeout(injectDashboard,ms)));window.addEventListener('hashchange',()=>setTimeout(injectDashboard,80));}
  const style=document.createElement('style');style.textContent=`
    .p3-dashboard-v3{padding:10px 0;color:#1e293b;max-width:600px;margin:0 auto}
    .p3-header-v3{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px;padding:0 5px}
    .p3-header-left{display:flex;gap:15px;align-items:center}
    .p3-crown-circle{width:45px;height:45px;background:#10b981;color:#fff;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(16,185,129,0.3)}
    .p3-header-text h2{margin:2px 0;font-size:22px;font-weight:800;color:#0f172a}
    .p3-header-text p{margin:0;font-size:12px;color:#64748b}
    .p3-header-right{display:flex;align-items:center}.p3-inbox-btn{border:0;background:transparent;color:#1683d8;font-size:18px;font-weight:800;display:flex;align-items:flex-start;gap:7px;cursor:pointer}.p3-badge{background:#10b981;color:#fff;border-radius:99px;min-width:18px;height:18px;padding:0 5px;font-size:10px;display:grid;place-items:center;font-style:normal}
    .p3-kicker-v3{font-size:10px;font-weight:800;letter-spacing:0.1em;color:#10b981}
    .p3-header-right{display:flex;gap:8px;align-items:center}
    .p3-live-badge{font-size:9px;font-weight:800;padding:5px 10px;border:1.5px solid #cbd5e1;border-radius:20px;color:#64748b}

    .p3-card-v3{background:#fff;border-radius:20px;padding:16px;box-shadow:0 4px 20px rgba(0,0,0,0.04);border:1px solid #f1f5f9;margin-bottom:12px}
    .p3-grid-v3{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px}
    .p3-card-icon-row{display:flex;align-items:center;gap:10px;margin-bottom:12px}
    .p3-icon-box{width:36px;height:36px;border-radius:10px;display:flex;align-items:center;justify-content:center}
    .p3-icon-box.target{background:#ecfdf5;color:#10b981}
    .p3-icon-box.tasks{background:#fffbeb;color:#f59e0b}
    .p3-icon-box.accuracy{background:#eff6ff;color:#3b82f6}
    .p3-icon-box.streak{background:#f5f3ff;color:#8b5cf6}
    .p3-card-label{font-size:12px;font-weight:700;color:#64748b}
    .p3-card-value{font-size:24px;font-weight:800;color:#0f172a;margin:4px 0}
    .p3-card-sub{font-size:11px;color:#94a3b8}
    .p3-card-progress{height:6px;background:#f1f5f9;border-radius:10px;margin-top:12px;overflow:hidden}
    .p3-card-progress i{display:block;height:100%;border-radius:inherit}
    .p3-card-target .p3-card-progress i{background:#10b981}
    .p3-card-tasks .p3-card-progress i{background:#f59e0b}
    .p3-card-accuracy .p3-card-progress i{background:#3b82f6}
    .p3-card-streak .p3-card-progress i{background:#8b5cf6}

    .p3-recommend-v3{display:flex;gap:20px;position:relative;overflow:hidden}
    .p3-recommend-content{flex:1}
    .p3-recommend-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px}
    .p3-recommend-title{display:flex;align-items:center;gap:8px;font-weight:800;color:#10b981;font-size:15px}
    .p3-star-icon{color:#10b981}
    .p3-open-btn{background:#f8fafc;border:1px solid #e2e8f0;padding:6px 12px;border-radius:10px;font-size:12px;font-weight:700;display:flex;align-items:center;gap:5px;cursor:pointer}
    .p3-recommend-text{font-size:14px;line-height:1.5;margin-bottom:15px;color:#334155;font-weight:500}
    .p3-recommend-list{display:grid;gap:8px}
    .p3-rec-item{display:flex;align-items:center;gap:10px;font-size:12px;color:#64748b}
    .p3-rec-icon{width:24px;height:24px;border-radius:6px;display:flex;align-items:center;justify-content:center}
    .p3-rec-icon.target{background:#ecfdf5;color:#10b981}
    .p3-rec-icon.book{background:#fff7ed;color:#ea580c}
    .p3-rec-icon.trend{background:#f0fdf4;color:#22c55e}
    .p3-recommend-illustration{width:100px;display:flex;align-items:center;justify-content:center}
    .p3-3d-placeholder{position:relative;width:80px;height:80px}
    .p3-3d-clipboard{width:60px;height:70px;background:#e2e8f0;border-radius:5px;position:relative;box-shadow:4px 4px 0 #cbd5e1}
    .p3-3d-lines{position:absolute;top:20px;left:10px;right:10px;height:2px;background:#cbd5e1;box-shadow:0 8px 0 #cbd5e1, 0 16px 0 #cbd5e1, 0 24px 0 #cbd5e1}
    .p3-3d-books{position:absolute;bottom:-10px;right:-20px}
    .p3-book-1{width:40px;height:8px;background:#ef4444;border-radius:2px;margin-bottom:2px}
    .p3-book-2{width:40px;height:8px;background:#3b82f6;border-radius:2px;margin-bottom:2px}
    .p3-book-3{width:40px;height:8px;background:#10b981;border-radius:2px}

    .p3-section-head-v3{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px}
    .p3-section-head-v3 b{font-size:15px;font-weight:800;color:#0f172a;display:flex;align-items:center;gap:8px}
    .p3-swipe-hint-v3{font-size:11px;color:#94a3b8;font-weight:500}
    .p3-add-task-btn{color:#10b981;background:none;border:0;font-weight:800;font-size:13px;cursor:pointer}

    .p3-today-hero-card{background:#fff;border:1px solid #f1f5f9;border-radius:22px;padding:20px;box-shadow:0 10px 30px rgba(0,0,0,0.04)}
    .p3-hero-top-row{display:flex;justify-content:space-between;align-items:flex-start}
    .p3-hero-kicker{font-size:10px;font-weight:800;letter-spacing:0.12em;color:#10b981;text-transform:uppercase;margin-bottom:4px}
    .p3-hero-title{font-size:17px;font-weight:800;color:#0f172a;margin:0 0 6px}
    .p3-hero-num{font-size:36px;font-weight:900;color:#0f172a;letter-spacing:-0.03em;line-height:1}
    .p3-hero-num strong{color:#10b981}
    .p3-hero-num small{font-size:16px;color:#94a3b8;font-weight:600}
    .p3-hero-illustration{display:flex;flex-direction:column;align-items:center;position:relative}
    .p3-target-graphic{width:64px;height:64px;background:radial-gradient(circle, #dcfce7 0%, #bbf7d0 100%);border-radius:50%;position:relative;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(16,185,129,0.15)}
    .p3-target-rings{width:44px;height:44px;border:3px solid #10b981;border-radius:50%;position:relative}
    .p3-target-rings::after{content:'';position:absolute;inset:8px;border:2px solid #10b981;border-radius:50%}
    .p3-target-dart{position:absolute;top:10px;right:10px;width:14px;height:14px;background:#ef4444;transform:rotate(45deg);clip-path:polygon(0 0, 100% 0, 0 100%)}
    .p3-hero-pct-tag{font-size:12px;font-weight:800;color:#10b981;margin-top:4px}
    .p3-hero-stats-row{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;padding-top:4px}
    .p3-hero-stat-item{display:flex;align-items:center;gap:8px}
    .p3-stat-badge{width:28px;height:28px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:12px;flex-shrink:0}
    .p3-stat-badge.green{background:#dcfce7;color:#16a34a}
    .p3-stat-badge.red{background:#fee2e2;color:#ef4444}
    .p3-stat-badge.blue{background:#eff6ff;color:#3b82f6}
    .p3-stat-badge.purple{background:#f3e8ff;color:#9333ea}
    .p3-hero-stat-item b{display:block;font-size:13px;color:#0f172a;line-height:1.2}
    .p3-hero-stat-item small{display:block;font-size:9px;color:#94a3b8;font-weight:700;text-transform:uppercase}
    .p3-accuracy-stat{position:relative}
    .p3-accuracy-popup{display:none;position:absolute;top:100%;left:0;background:#fff;border:1px solid #e2e8f0;padding:8px;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,0.1);z-index:10;width:150px;font-size:11px;color:#475569}
    .p3-accuracy-stat:hover .p3-accuracy-popup{display:block}

    .p3-command-section-v3{padding:16px 0;overflow:hidden}
    .p3-command-section-v3 .p3-section-head-v3{padding:0 16px}
    .p3-command-card-v3{background:#fff;border:1px solid #f1f5f9;border-radius:15px;padding:12px;display:flex;flex-direction:column;align-items:flex-start;gap:5px;box-shadow:0 2px 10px rgba(0,0,0,0.02);cursor:pointer;text-align:left;transition:transform 0.1s ease;min-height:96px}
    .p3-command-card-v3:active{transform:scale(0.96)}
    .p3-command-icon-v3{font-size:24px;margin-bottom:4px}
    .p3-command-title-v3{font-weight:800;font-size:13px;color:#0f172a}
    .p3-command-subtitle-v3{font-size:10px;color:#64748b}

    .command-carousel{position:relative;display:block;overflow:hidden;width:100%;max-width:100%;touch-action:pan-y;overscroll-behavior-x:contain}
    .command-track{display:flex;transition:transform 0.28s cubic-bezier(0.23, 1, 0.32, 1);will-change:transform}
    .command-slide{width:calc(100% / var(--command-pages, 2));flex:0 0 calc(100% / var(--command-pages, 2));display:grid;grid-template-columns:repeat(3, 1fr) !important;grid-template-rows:repeat(2, 1fr);gap:10px;padding:0 16px}
    .command-dots{display:flex;justify-content:center;gap:8px;margin-top:8px}
    .command-dot{width:7px;height:7px;border:0;border-radius:50%;background:#e2e8f0;cursor:pointer;transition:all 0.2s ease}
    .command-dot.active{width:20px;border-radius:10px;background:#10b981}

    @media(max-width:480px){
      .p3-hero-stats-row{grid-template-columns:repeat(2,1fr);gap:12px}
    }

    .p3-special-section-v3{margin-top:20px}
    .p3-special-grid-v3{display:block;overflow:hidden;background:#fff;border:1px solid #dfece6;border-radius:18px;box-shadow:0 8px 20px rgba(15,107,79,.05)}
    .p3-special-card-v3{width:100%;background:#fff;border:0;border-bottom:1px solid #e5efe9;border-radius:0;padding:14px 16px;display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:13px;box-shadow:none;cursor:pointer;text-align:left;transition:background .14s ease,transform .1s ease}
    .p3-special-card-v3:last-child{border-bottom:0}
    .p3-special-card-v3:active{transform:scale(0.98)}
    .p3-special-card-v3:hover{background:#fbfefc}
    .p3-special-icon-v3{display:grid;place-items:center;width:40px;height:40px;border-radius:12px;background:#edf8f2;font-size:21px}
    .p3-special-info-v3 strong{display:block;font-size:14px;color:#173128;font-weight:800}
    .p3-special-info-v3 small{display:block;font-size:11px;color:#71867c;margin-top:3px}
    .p3-special-arrow-v3{color:#8da39a;font-size:18px}
    .p3-trash-card-v3 .p3-special-icon-v3{background:#fff1ef}.p3-notes-card-v3 .p3-special-icon-v3{background:#edf5ff}
    .p3-dashboard-only-v3{font-size:11px;color:#94a3b8}

    .p3-resume-card-v3, .p3-start-card-v3{display:flex;align-items:center;justify-content:space-between;gap:12px;background:#fffaf1;border:1px solid rgba(201,138,44,0.2)}
    .p3-resume-info-v3 strong, .p3-start-info-v3 strong{display:block;font-size:15px;color:#0f172a}
    .p3-resume-info-v3 p, .p3-start-info-v3 p{margin:4px 0 0;font-size:12px;color:#64748b}
    .p3-resume-btn-v3{background:#10b981;color:#fff;border:0;padding:8px 16px;border-radius:10px;font-weight:700;font-size:13px;cursor:pointer}

    .p3-focus-section-v3{margin-top:20px}
    .p3-focus-count-v3{font-size:11px;color:#94a3b8}
    .p3-focus-list-v3{margin-top:10px}
    .p3-focus-row-v3{display:flex;align-items:center;justify-content:space-between;padding:12px 0;border-bottom:1px solid #f1f5f9}
    .p3-focus-row-v3:last-of-type{border-bottom:0}
    .p3-focus-info-v3 strong{display:block;font-size:14px;color:#0f172a}
    .p3-focus-info-v3 small{display:block;font-size:12px;color:#64748b;margin-top:2px}
    .p3-focus-tag-v3{font-size:10px;font-weight:800;text-transform:uppercase;padding:4px 8px;border-radius:6px;font-style:normal}
    .p3-focus-tag-v3.revision{background:#fee2e2;color:#ef4444}
    .p3-focus-tag-v3.improving{background:#fef3c7;color:#d97706}
    .p3-focus-tag-v3.strong{background:#dcfce7;color:#16a34a}
    .p3-btn-v3{width:100%;padding:12px;border-radius:12px;font-weight:700;font-size:14px;cursor:pointer;border:0;margin-top:15px}
    .p3-btn-secondary-v3{background:#f1f5f9;color:#0f172a}
    .p3-muted-v3{font-size:13px;color:#94a3b8;text-align:center;padding:20px 0}
    .p3-task-list-v3{display:grid;gap:8px}
    .p3-task-item-v3{display:flex;gap:10px;align-items:center;padding:10px;background:#f8fafc;border-radius:12px;font-size:13px}
    .p3-task-item-v3 input{accent-color:#10b981}
    .p3-task-item-v3 .done{text-decoration:line-through;color:#94a3b8}
    .p3-empty-tasks{padding:10px;text-align:center;color:#94a3b8;font-size:12px}

    .p3-two-col-v3{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px}
    .p3-progress-body-v3{display:flex;align-items:center;gap:15px}
    .p3-circle-container{width:70px;height:70px}
    .p3-circular-chart{display:block;margin:0 auto;max-width:100%;max-height:100%}
    .p3-circle-bg{fill:none;stroke:#f1f5f9;stroke-width:3.8}
    .p3-circle{fill:none;stroke:#10b981;stroke-width:2.8;stroke-linecap:round;transition:stroke-dasharray 0.3s ease}
    .p3-percentage{fill:#0f172a;font-size:8px;font-weight:800;text-anchor:middle}
    .p3-progress-stats-v3{flex:1;display:grid;gap:10px}
    .p3-prog-stat{display:flex;align-items:center;gap:10px}
    .p3-prog-icon-box{width:28px;height:28px;background:#f8fafc;border-radius:8px;display:flex;align-items:center;justify-content:center;color:#64748b}
    .p3-prog-stat small{display:block;font-size:10px;color:#94a3b8}
    .p3-prog-stat b{font-size:13px;color:#1e293b}
    .p3-trend-text{color:#10b981 !important}

    .p3-more-btn{background:none;border:0;color:#94a3b8;font-size:18px;cursor:pointer}
    .p3-quick-grid-v3{display:grid;grid-template-columns:1fr 1fr;gap:10px}
    .p3-quick-box{background:#f8fafc;padding:12px;border-radius:15px;display:flex;flex-direction:column;gap:8px}
    .p3-quick-icon{width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff}
    .p3-quick-icon.q1{background:#3b82f6}
    .p3-quick-icon.q2{background:#10b981}
    .p3-quick-icon.q3{background:#ef4444}
    .p3-quick-icon.q4{background:#f59e0b}
    .p3-quick-data b{font-size:18px;display:block;color:#0f172a}
    .p3-quick-data small{font-size:9px;color:#64748b;font-weight:700;text-transform:uppercase}

    .p3-bottom-row-v3{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
    .p3-bottom-card{padding:12px;display:flex;flex-direction:column;gap:5px}
    .p3-bottom-icon-row{display:flex;justify-content:space-between;align-items:center;margin-bottom:5px}
    .p3-bottom-icon{width:32px;height:32px;border-radius:10px;display:flex;align-items:center;justify-content:center}
    .p3-bottom-icon.b1{background:#fef9c3;color:#ca8a04}
    .p3-bottom-icon.b2{background:#f5f3ff;color:#8b5cf6}
    .p3-bottom-icon.b3{background:#ecfdf5;color:#10b981}
    .p3-bottom-arrow{color:#cbd5e1}
    .p3-bottom-label{font-size:10px;font-weight:800;color:#94a3b8;text-transform:uppercase}
    .p3-bottom-value{font-size:13px;font-weight:800;color:#1e293b}
    .p3-bottom-sub{font-size:10px;color:#94a3b8}

    .p3-routine-today-v3{position:relative;isolation:isolate;overflow:hidden;margin-bottom:12px;padding:18px!important;border:1.5px solid #bcdace!important;border-radius:22px!important;background:linear-gradient(145deg,#ffffff 0%,#effaf4 100%)!important;box-shadow:0 7px 0 #cce8db,0 16px 28px rgba(13,76,57,.10)!important}
    .p3-routine-decor{position:absolute;z-index:-1;right:-42px;top:-55px;width:150px;height:150px;border:1px solid rgba(43,155,124,.16);border-radius:50%;background:radial-gradient(circle at 35% 35%,rgba(169,238,216,.28),rgba(169,238,216,0) 68%);pointer-events:none}
    .p3-routine-decor:after{content:"";position:absolute;right:18px;bottom:8px;width:78px;height:78px;border:1px solid rgba(43,155,124,.10);border-radius:50%}
    .p3-routine-head-v3{position:relative;display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding-bottom:13px;border-bottom:1px solid #dceee5}
    .p3-routine-kicker-v3{color:#2a8368;font-size:9px;font-weight:900;letter-spacing:.14em}
    .p3-routine-head-v3 h3{margin:5px 0 2px;color:#174b3a;font-size:18px;line-height:1.2}
    .p3-routine-head-v3 p{margin:0;color:#719082;font-size:11px}
    .p3-routine-count-v3{flex:0 0 auto;min-width:58px;padding:7px 8px;border:1px solid #c3e4d5;border-radius:12px;background:#f4fcf8;text-align:center}
    .p3-routine-count-v3 b,.p3-routine-count-v3 small{display:block}.p3-routine-count-v3 b{color:#167153;font-size:16px;line-height:1.05}.p3-routine-count-v3 small{margin-top:3px;color:#719082;font-size:7px;font-weight:900;letter-spacing:.08em}
    .p3-routine-list-v3{display:grid;gap:2px;margin-top:10px}
    .p3-routine-topic-v3{display:flex;align-items:center;gap:9px;min-width:0;padding:8px 0;border-bottom:1px solid rgba(211,235,224,.72);cursor:pointer}
    .p3-routine-topic-v3:last-child{border-bottom:0}
    .p3-routine-topic-v3>span:last-child{display:grid;min-width:0;gap:2px}.p3-routine-topic-v3 b{color:#235b48;font-size:12px}.p3-routine-topic-v3 small{color:#4e7566;font-size:12px;line-height:1.35;overflow-wrap:anywhere}.p3-routine-topic-v3 small.is-done{color:#8ba79b;text-decoration:line-through}.p3-routine-topic-v3.is-empty{opacity:.62}.p3-routine-empty-dot{width:19px;height:19px;flex:0 0 19px;border:1.5px solid #acd5c2;border-radius:7px;background:#fbfffd}
    .p3-routine-check-v3{display:grid;place-items:center;width:22px;height:22px;flex:0 0 22px;padding:0;border:1.5px solid #8ec9b0;border-radius:7px;background:#fbfffd;color:#fff;font-size:14px;font-weight:900;line-height:1;cursor:pointer}.p3-routine-check-v3.is-done{border-color:#1c9a6b;background:#1c9a6b}.p3-routine-check-v3:active{transform:none}
    /* Aurora Data Dashboard visual layer — scoped to the dashboard only. */
    #app:has(.p3-dashboard-v3){background:linear-gradient(145deg,#eaf7f2 0%,#eef8fa 46%,#f8f5ff 100%)!important}

    .p3-dashboard-v3{position:relative;z-index:0;width:calc(100% + 32px);max-width:none;margin:-18px -16px 0;padding:18px 0 92px;color:#183246;background:linear-gradient(145deg,#eaf7f2 0%,#eef8fa 46%,#f8f5ff 100%);border-radius:0;overflow:hidden}
    .p3-dashboard-v3:before{content:"";position:absolute;z-index:-1;inset:-18% -18% 36%;pointer-events:none;background:radial-gradient(circle at 10% 28%,rgba(74,210,184,.16),transparent 28%),radial-gradient(circle at 92% 10%,rgba(148,176,255,.18),transparent 30%),radial-gradient(circle at 70% 82%,rgba(212,187,255,.14),transparent 26%)}
    .p3-header-v3{margin:0 16px 12px;padding:0;align-items:center}.p3-header-left{gap:13px}.p3-crown-circle{width:50px;height:50px;background:linear-gradient(145deg,#21c59c,#0b997b);box-shadow:0 8px 20px rgba(18,169,132,.22),0 0 0 10px rgba(112,224,198,.12)}.p3-header-text h2{font-size:23px;color:#142d44;letter-spacing:-.03em}.p3-header-text p{color:#718594}.p3-kicker-v3{color:#18a784;letter-spacing:.14em}.p3-inbox-btn{color:#2784d8;font-size:18px}
    .p3-today-hero-card{position:relative;overflow:hidden;margin:0 14px 12px;background:linear-gradient(140deg,rgba(255,255,255,.92),rgba(235,251,248,.88) 55%,rgba(241,237,255,.92));border:1px solid rgba(125,188,212,.38);border-radius:25px;padding:22px;box-shadow:0 12px 30px rgba(61,123,163,.12),0 0 0 1px rgba(255,255,255,.72) inset}.p3-today-hero-card:before{content:"";position:absolute;right:-32px;top:-48px;width:210px;height:210px;border:1px solid rgba(74,178,194,.18);border-radius:50%;box-shadow:0 0 0 22px rgba(112,205,198,.05),0 0 0 48px rgba(156,180,255,.04);pointer-events:none}.p3-today-hero-card:after{content:"";position:absolute;left:-55px;bottom:-92px;width:190px;height:190px;border:1px solid rgba(78,195,165,.13);border-radius:50%;pointer-events:none}.p3-today-head{position:relative;z-index:1;display:flex;align-items:center;justify-content:space-between;gap:16px}.p3-today-copy{min-width:0}.p3-hero-kicker{color:#168b75;font-size:10px;letter-spacing:.16em}.p3-hero-title{font-size:18px;color:#1a4351;margin:5px 0 8px}.p3-hero-num{font-size:48px;color:#173b4c;letter-spacing:-.05em}.p3-hero-num strong{color:#159f7b}.p3-hero-num small{font-size:16px;color:#6f818d}.p3-today-dial{position:relative;flex:0 0 126px;width:126px;height:126px;border-radius:50%;display:grid;place-items:center;align-content:center;background:conic-gradient(from 220deg,#16a27e 0 var(--today-progress),#d9eee8 var(--today-progress) 100%);box-shadow:0 0 0 8px rgba(255,255,255,.45),0 10px 24px rgba(21,159,123,.12)}.p3-today-dial:before{content:"";position:absolute;inset:10px;border-radius:50%;background:rgba(249,255,254,.94);box-shadow:0 0 0 1px rgba(255,255,255,.8) inset}.p3-today-dial b,.p3-today-dial small{position:relative;z-index:1;display:block;text-align:center}.p3-today-dial b{font-size:27px;color:#13795f}.p3-today-dial small{margin-top:2px;font-size:9px;letter-spacing:.15em;color:#6e8987;font-weight:900}.p3-card-progress.p3-today-progress{position:relative;z-index:1;height:8px;margin-top:20px;background:rgba(205,232,226,.75)}.p3-card-progress.p3-today-progress i{background:linear-gradient(90deg,#1a9c79,#52cdb0);box-shadow:0 2px 7px rgba(28,165,126,.22)}.p3-today-progress-meta{position:relative;z-index:1}.p3-goal-status-v3{background:rgba(225,248,240,.88);color:#21866d;border:1px solid rgba(92,194,161,.2)}.p3-hero-stats-row{position:relative;z-index:1;margin-top:17px;padding-top:16px;border-top:1px solid rgba(132,190,191,.22);gap:0}.p3-hero-stat-item{padding:0 13px;border-right:1px solid rgba(132,190,191,.22)}.p3-hero-stat-item:first-child{padding-left:0}.p3-hero-stat-item:last-child{border-right:0;padding-right:0}.p3-stat-badge{background:rgba(255,255,255,.6)!important;border:1px solid rgba(114,191,195,.22)}.p3-hero-stat-item b{color:#1b5d61}.p3-hero-stat-item small{color:#7d9298}
    .p3-command-section-v3{margin:10px 14px 14px;padding:17px 0 14px;background:rgba(255,255,255,.67);border:1px solid rgba(255,255,255,.9);border-radius:26px;box-shadow:0 11px 26px rgba(82,128,164,.09);backdrop-filter:blur(16px)}.p3-command-section-v3 .p3-section-head-v3{padding:0 19px}.p3-section-head-v3 b{color:#18344a}.p3-swipe-hint-v3{color:#8396a7}.p3-command-card-v3{position:relative;overflow:hidden;min-height:100px;padding:14px 13px;background:rgba(255,255,255,.78);border:1px solid rgba(255,255,255,.95);border-radius:18px;box-shadow:0 7px 17px rgba(93,138,170,.10),0 0 0 1px rgba(161,210,212,.08) inset;transition:transform .16s ease,box-shadow .16s ease}.p3-command-card-v3:before{content:"";position:absolute;right:-16px;top:-22px;width:56px;height:56px;border:1px solid rgba(113,192,198,.15);border-radius:50%;pointer-events:none}.p3-command-card-v3:after{content:"›";position:absolute;right:10px;top:50%;width:20px;height:20px;transform:translateY(-50%);display:grid;place-items:center;border:1px solid rgba(123,165,185,.2);border-radius:50%;color:#7e9bae;font-size:18px;line-height:1}.p3-command-card-v3:active{transform:scale(.985);box-shadow:0 3px 8px rgba(93,138,170,.10)}.p3-command-icon-v3{font-size:26px}.p3-command-title-v3{font-size:14px;color:#18344a}.p3-command-subtitle-v3{font-size:10px;color:#718796}
    .p3-two-col-v3{gap:14px;margin:0 14px 14px}.p3-progress-v3,.p3-quick-stats-v3{position:relative;min-height:280px;background:linear-gradient(145deg,rgba(255,255,255,.86),rgba(239,250,253,.76));border:1px solid rgba(255,255,255,.96);border-radius:25px;box-shadow:0 12px 27px rgba(92,132,165,.10),0 0 0 1px rgba(149,203,220,.10) inset;overflow:hidden}.p3-section-head-v3{position:relative;z-index:1}.p3-progress-body-v3{gap:12px;min-height:210px;align-items:center}.p3-circle-container{position:relative;width:108px;height:108px;flex:0 0 108px}.p3-circle-container:before,.p3-circle-container:after{content:"";position:absolute;border:3px solid rgba(102,194,210,.16);border-radius:50%;pointer-events:none}.p3-circle-container:before{inset:-9px}.p3-circle-container:after{inset:8px;border-color:rgba(157,155,237,.14)}.p3-circular-chart{position:relative;z-index:1}.p3-circle-bg{stroke:#e7f1f4}.p3-circle{stroke:#20b795}.p3-percentage{fill:#1a5262}.p3-prog-icon-box{background:rgba(241,250,252,.75);color:#4e8e9a;border:1px solid rgba(145,204,211,.18)}.p3-prog-stat small{color:#879aa5;font-size:11px}.p3-prog-stat b{color:#1d5360;font-size:15px}.p3-more-btn{color:#8295a7}.p3-quick-grid-v3{position:relative;z-index:1;gap:11px}.p3-quick-stats-v3:after{content:"";position:absolute;left:20px;right:20px;bottom:17px;height:45px;opacity:.42;background:linear-gradient(160deg,transparent 42%,#77bde0 44%,#77bde0 48%,transparent 50%) 0 21px/48px 30px repeat-x;pointer-events:none}.p3-quick-box{background:rgba(255,255,255,.58);border:1px solid rgba(255,255,255,.86);box-shadow:0 5px 14px rgba(111,149,179,.07);min-height:90px;padding:13px}.p3-quick-data b{color:#18344a;font-size:21px}.p3-quick-data small{color:#758a99;font-size:10px}.p3-special-section-v3{margin:18px 14px 0}.p3-special-grid-v3{background:rgba(255,255,255,.68);border-color:rgba(179,211,222,.42);box-shadow:0 9px 21px rgba(85,132,168,.07)}.p3-special-card-v3{background:rgba(255,255,255,.46)}.p3-routine-today-v3{margin-left:14px;margin-right:14px;background:linear-gradient(140deg,rgba(255,255,255,.82),rgba(232,251,248,.88),rgba(244,240,255,.82))!important;border-color:rgba(137,205,209,.42)!important;box-shadow:0 8px 0 rgba(190,225,225,.64),0 16px 25px rgba(69,127,158,.09)!important}
    .p3-progress-v3,.p3-quick-stats-v3{min-height:0;height:250px;padding:16px}.p3-progress-v3 .p3-title-with-icon{font-size:16px;line-height:1.18}.p3-progress-v3 .p3-title-with-icon svg{flex:0 0 20px;color:#39aeb4}.p3-progress-body-v3{min-height:192px;align-items:center}.p3-rings-chart{width:100%;height:100%;overflow:visible}.p3-ring-track,.p3-ring{fill:none;transform:rotate(-90deg);transform-origin:60px 60px;stroke-linecap:round}.p3-ring-track{stroke:#e9f1f2;stroke-width:7}.p3-ring{stroke-width:7}.p3-ring.ring-green{stroke:#48cda6}.p3-ring.ring-blue{stroke:#7fa7e7}.p3-ring.ring-purple{stroke:#a697dd}.p3-multi-ring-v3 .p3-percentage{font-size:15px;font-weight:800}.p3-progress-stats-v3{gap:22px;min-width:0}.p3-prog-stat{gap:8px;min-width:0}.p3-prog-stat>div{min-width:0}.p3-prog-dot{width:12px;height:12px;flex:0 0 12px;border-radius:50%;background:#42c6a2}.p3-prog-dot.dot-purple{background:#a694de}.p3-prog-stat small{display:block;max-width:110px;white-space:normal;overflow-wrap:normal;word-break:normal;font-size:11px;line-height:1.25}.p3-prog-stat b{display:block;font-size:17px;margin-top:4px}.p3-quick-grid-v3{grid-template-columns:repeat(3,1fr);gap:9px}.p3-quick-box{display:flex;align-items:center;justify-content:flex-start;text-align:center;min-width:0;min-height:112px;padding:10px 6px}.p3-quick-icon{width:38px;height:38px;flex:0 0 38px}.p3-quick-data{min-width:0;width:100%}.p3-quick-data b{font-size:20px;margin-top:8px}.p3-quick-data small{display:block;white-space:normal;overflow-wrap:normal;word-break:normal;line-height:1.2;font-size:10px}.p3-quick-line-v3{display:block;position:relative;z-index:2;width:100%;height:48px;margin-top:3px;overflow:visible}.p3-quick-stats-v3:after{display:none}
    @media(max-width:620px){
      .p3-grid-v3, .p3-two-col-v3{grid-template-columns:1fr 1fr}
      .p3-dashboard-v3{width:calc(100% + 24px);margin:-13px -12px 0;padding:13px 0 92px}.p3-header-v3{padding-top:0}.p3-today-head{gap:10px}.p3-today-dial{flex-basis:112px;width:112px;height:112px}.p3-today-hero-card{margin-left:12px;margin-right:12px}.p3-command-section-v3{margin-left:12px;margin-right:12px}.p3-two-col-v3{margin-left:12px;margin-right:12px;gap:10px}.p3-progress-v3,.p3-quick-stats-v3{height:232px;padding:13px 10px}.p3-progress-v3 .p3-title-with-icon{font-size:14px}.p3-progress-body-v3{gap:5px;min-height:178px}.p3-circle-container{width:74px;height:74px;flex-basis:74px}.p3-ring-track,.p3-ring{stroke-width:6;transform-origin:60px 60px}.p3-progress-stats-v3{gap:15px}.p3-prog-dot{width:9px;height:9px;flex-basis:9px}.p3-prog-stat small{font-size:9px;max-width:74px}.p3-prog-stat b{font-size:14px}.p3-quick-box{min-height:96px;padding:7px 3px}.p3-quick-icon{width:30px;height:30px;flex-basis:30px}.p3-quick-data b{font-size:16px;margin-top:5px}.p3-quick-data small{font-size:8px}.p3-quick-line-v3{height:37px}.p3-routine-today-v3{margin-left:12px;margin-right:12px}.p3-special-section-v3{margin-left:12px;margin-right:12px}
      .p3-bottom-row-v3{grid-template-columns:1fr}
      .p3-recommend-illustration{display:none}
    }
    @media(max-width:380px){
      .p3-grid-v3{grid-template-columns:1fr}
    }
  `;
  document.head.appendChild(style);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else setTimeout(init,0);
})();
/* ================= END PHASE 3 ================= */

(function(){
  const oldRenderAnalytics=window.exportAnalytics;
  if(typeof oldRenderAnalytics==='function') window.exportAnalytics=oldRenderAnalytics;
})();
