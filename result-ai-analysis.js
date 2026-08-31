/*
 * Result AI Analysis foundation — Admission Hub
 *
 * This layer never stores or exposes an API key. The frontend builds a small,
 * verified result summary. A future secure backend may be configured through
 * window.ADMISSION_HUB_AI_ENDPOINT and will receive only that summary.
 */
(() => {
  'use strict';

  const safe = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[c]);
  const number = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
  const round = (value, digits = 2) => Number(number(value).toFixed(digits));
  const cache = () => typeof CACHE !== 'undefined' ? CACHE : { examResults: [], questions: [], subjects: [], topics: [] };
  const resultId = (result) => String(result?.id || result?.resultId || '');
  const snapshot = (result) => Array.isArray(result?.snapshot) ? result.snapshot : [];
  const totalOf = (result) => Math.max(0, number(result?.questionCount || result?.totalQuestions || snapshot(result).length));
  const countsOf = (result) => {
    const rows = snapshot(result);
    if (rows.length) return rows.reduce((out, row) => {
      if (row?.status === 'correct') out.correct += 1;
      else if (row?.status === 'wrong') out.wrong += 1;
      else out.skipped += 1;
      return out;
    }, { correct: 0, wrong: 0, skipped: 0 });
    const correct = Math.max(0, number(result?.correct));
    const wrong = Math.max(0, number(result?.wrong));
    const total = totalOf(result);
    return { correct, wrong, skipped: Math.max(0, number(result?.skipped, total - correct - wrong)) };
  };
  const dateOf = (result) => number(result?.completedAt || result?.date || result?.createdAt, Date.now());
  const accuracyOf = (result, counts = countsOf(result)) => {
    const attempted = counts.correct + counts.wrong;
    return attempted ? round(counts.correct / attempted * 100, 1) : 0;
  };
  const metricsOf = (result) => {
    const total = totalOf(result);
    const counts = countsOf(result);
    const attempted = counts.correct + counts.wrong;
    const marks = Math.max(0.01, number(result?.configuration?.marksPerQ || result?.marksPerQ, 1));
    const positive = number(result?.positive, counts.correct * marks);
    const negative = Math.max(0, number(result?.negativeMarks ?? result?.negative));
    const score = number(result?.score, positive - negative);
    const maxScore = total * marks;
    return {
      total,
      correct: counts.correct,
      wrong: counts.wrong,
      skipped: counts.skipped,
      attempted,
      accuracy: accuracyOf(result, counts),
      attemptRate: total ? round(attempted / total * 100, 1) : 0,
      marks,
      positive: round(positive),
      negative: round(negative),
      score: round(score),
      maxScore: round(maxScore),
      scorePercent: maxScore ? round(score / maxScore * 100, 1) : 0,
      timeUsed: number(result?.timeUsed),
      averageTimePerQuestion: total ? round(number(result?.timeUsed) / total, 1) : 0
    };
  };
  const questionById = (id) => (cache().questions || []).find((item) => String(item?.id) === String(id));
  const labelFor = (kind, id, row) => {
    const list = kind === 'subject' ? (cache().subjects || []) : (cache().topics || []);
    const found = list.find((item) => String(item?.id) === String(id));
    return found?.name || row?.[kind === 'subject' ? 'subjectName' : 'topicName'] || id || 'অজানা';
  };
  const breakdown = (result, kind) => {
    const groups = new Map();
    snapshot(result).forEach((row) => {
      const live = questionById(row?.questionId);
      const id = kind === 'subject' ? (live?.subjectId || row?.subjectId || '') : (live?.topicId || row?.topicId || '');
      const key = String(id || `${kind}-unknown`);
      const group = groups.get(key) || { id: id || key, name: labelFor(kind, id, row), total: 0, correct: 0, wrong: 0, skipped: 0 };
      group.total += 1;
      if (row?.status === 'correct') group.correct += 1;
      else if (row?.status === 'wrong') group.wrong += 1;
      else group.skipped += 1;
      groups.set(key, group);
    });
    return [...groups.values()].map((row) => ({
      ...row,
      attempted: row.correct + row.wrong,
      accuracy: row.correct + row.wrong ? round(row.correct / (row.correct + row.wrong) * 100, 1) : 0
    }));
  };
  const historyOf = (result) => (cache().examResults || [])
    .filter((item) => String(item?.id || '') !== resultId(result) && item?.status !== 'running' && item?.status !== 'incomplete' && item?.status !== 'abandoned')
    .sort((a, b) => dateOf(b) - dateOf(a))
    .reverse()
    .map((item) => {
      const metrics = metricsOf(item);
      return {
        id: resultId(item),
        label: item?.title || item?.name || 'আগের পরীক্ষা',
        date: new Date(dateOf(item)).toISOString(),
        score: metrics.score,
        accuracy: metrics.accuracy,
        total: metrics.total,
        correct: metrics.correct,
        wrong: metrics.wrong,
        skipped: metrics.skipped,
        negative: metrics.negative,
        marks: metrics.marks,
        timeUsed: metrics.timeUsed
      };
    });
  function buildPayload(result) {
    const metrics = metricsOf(result);
    return {
      schemaVersion: 'admission-hub-result-analysis-v1',
      result: {
        id: resultId(result),
        title: result?.title || result?.name || 'Admission Hub পরীক্ষা',
        examType: result?.testType || result?.examType || 'প্র্যাকটিস পরীক্ষা',
        completedAt: new Date(dateOf(result)).toISOString(),
        ...metrics
      },
      previousResults: historyOf(result),
      lifetime: (() => { const rows = (cache().examResults || []).filter((item) => item?.status !== 'running' && item?.status !== 'incomplete' && item?.status !== 'abandoned'); const n = rows.length; if (!n) return null; const sum = (fn) => rows.reduce((acc, row) => acc + number(fn(row)), 0); return { exams: n, totalQuestions: round(sum((item) => metricsOf(item).total)), avgScore: round(sum((item) => metricsOf(item).score) / n), avgAccuracy: round(sum((item) => metricsOf(item).accuracy) / n, 1), totalNegative: round(sum((item) => item?.negativeMarks ?? item?.negative ?? 0)) }; })(),
      subjectPerformance: breakdown(result, 'subject').sort((a, b) => b.total - a.total).slice(0, 12),
      topicPerformance: breakdown(result, 'topic').sort((a, b) => (b.wrong + b.skipped) - (a.wrong + a.skipped)).slice(0, 20),
      questions: snapshot(result).map((row, index) => {
        const live = questionById(row?.questionId) || {};
        const options = Array.isArray(live.options) ? live.options : Array.isArray(row?.options) ? row.options : [];
        const optionText = (value) => Number.isInteger(Number(value)) && options[Number(value)] != null ? options[Number(value)] : value;
        return {
          id: String(row?.questionId || `result-question-${index + 1}`), number: index + 1,
          subject: labelFor('subject', live.subjectId || row?.subjectId, row), topic: labelFor('topic', live.topicId || row?.topicId, row),
          prompt: live.question || live.text || row?.question || `প্রশ্ন ${index + 1}`,
                    selected: optionText(row?.selected ?? row?.selectedIndex ?? row?.answer),
          selectedIndex: Number.isInteger(Number(row?.selectedIndex)) ? Number(row.selectedIndex) : (Number.isInteger(Number(row?.answer)) ? Number(row.answer) : -1),
          correct: optionText(row?.answerIndex ?? row?.correctIndex ?? live.answerIndex ?? live.correctIndex ?? row?.correctAnswer),
          correctIndex: Number.isInteger(Number(row?.answerIndex)) ? Number(row.answerIndex) : (Number.isInteger(Number(row?.correctIndex)) ? Number(row.correctIndex) : (Number.isInteger(Number(live.answerIndex)) ? Number(live.answerIndex) : Number(live.correctIndex))),
          options, status: row?.status || 'skipped', category: row?.status === 'wrong' ? 'ভুল উত্তর review' : 'Correct', difficulty: live.difficulty || row?.difficulty || 'মাঝারি', time: Number(row?.timing?.ms || 0) / 1000
        };
      }),
      constraints: {
        dailyAiAnalysisLimit: 3,
        explanationStyle: 'সহজ, সরাসরি, স্বাভাবিক, শিক্ষকের মতো বাংলা; কোনো guarantee নয়',
        doNotInventNumbers: true,
        apiKeyInFrontend: false
      }
    };
  }
  window.AdmissionHubResultAI = { buildPayload };

  const style = document.createElement('style');
  style.id = 'result-ai-foundation-style';
  style.textContent = `
    .result-ai-entry{position:relative;display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:12px;padding:12px 13px;border:1px solid #b9dfd0;border-radius:16px;background:linear-gradient(135deg,#effbf5,#f8fffc);box-shadow:0 6px 18px rgba(15,107,79,.06)}
    .result-ai-entry-copy{min-width:0}.result-ai-entry-copy strong{display:block;color:#145b47;font-size:13px;line-height:1.3}.result-ai-entry-copy span{display:block;margin-top:3px;color:#64867b;font-size:10px;line-height:1.45}
    .result-ai-button{flex:0 0 auto;border:0;border-radius:11px;padding:10px 12px;background:#0b765a;color:#fff;font:800 11px inherit;box-shadow:0 5px 12px rgba(11,118,90,.18);cursor:pointer;transition:transform .16s ease,filter .16s ease}.result-ai-button:active{transform:scale(.97)}.result-ai-button:hover{filter:brightness(1.05)}
    .result-ai-fullscreen{position:fixed;inset:0;z-index:10000;background:#060b13;overflow:hidden}.result-ai-fullscreen iframe{display:block;width:100%;height:100%;border:0;background:#060b13}.result-ai-overlay{position:fixed;inset:0;z-index:9999;display:grid;place-items:center;padding:16px;background:rgba(11,33,27,.42);backdrop-filter:blur(5px)}.result-ai-modal{width:min(680px,100%);max-height:min(760px,92vh);overflow:auto;border:1px solid #b9dfd0;border-radius:22px;background:#f7fcf9;box-shadow:0 24px 80px rgba(0,0,0,.25);padding:18px;color:#173d31}.result-ai-modal-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}.result-ai-modal-head span{display:block;color:#157457;font-size:10px;font-weight:900;letter-spacing:.11em}.result-ai-modal h2{margin:5px 0 0;color:#153e34;font-size:22px;line-height:1.25}.result-ai-close{width:34px;height:34px;border:1px solid #c9e2d8;border-radius:10px;background:#fff;color:#426b5d;font-size:20px;cursor:pointer}.result-ai-status{margin-top:14px;padding:12px;border-radius:14px;background:#eaf8f0;border:1px solid #c5e4d5;color:#3d6d5e;font-size:12px;line-height:1.6}.result-ai-status b{color:#126b51}.result-ai-metric-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:7px;margin-top:12px}.result-ai-metric{padding:10px 7px;border-radius:12px;background:#fff;border:1px solid #d9ebe2;text-align:center}.result-ai-metric b{display:block;color:#155740;font-size:17px;line-height:1.2}.result-ai-metric span{display:block;margin-top:3px;color:#779389;font-size:9px}.result-ai-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px}.result-ai-actions button{border:1px solid #badbcc;border-radius:11px;padding:10px 12px;background:#0b765a;color:#fff;font:800 11px inherit;cursor:pointer}.result-ai-actions button.secondary{background:#fff;color:#176b54}.result-ai-payload{display:none;margin-top:12px;padding:10px;border-radius:12px;background:#13231e;color:#d8f3e7;font:11px/1.55 ui-monospace,SFMono-Regular,Menlo,monospace;white-space:pre-wrap;overflow:auto;max-height:250px}.result-ai-payload.open{display:block}.result-ai-note{margin-top:13px;color:#78948a;font-size:10px;line-height:1.55}.result-ai-live-result{display:none;margin-top:14px;color:#2f5c4e;font-size:13px;line-height:1.65}.result-ai-live-result.open{display:block}.result-ai-turnstile{margin-top:14px;min-height:65px;color:#6c8c80;font-size:11px;line-height:1.5}.result-ai-rich{display:grid;gap:11px;margin-top:14px}.result-ai-rich-card{padding:14px;border:1px solid #cde5d9;border-radius:16px;background:#fff;box-shadow:0 5px 16px rgba(15,107,79,.06)}.result-ai-rich-hero{padding:16px;border-radius:18px;background:linear-gradient(135deg,#e5f7ee,#f8fffc);border:1px solid #b9dfd0}.result-ai-rich-kicker{font-size:10px;font-weight:900;letter-spacing:.08em;color:#157457;text-transform:uppercase}.result-ai-rich h3{margin:4px 0 0;color:#155740;font-size:20px;line-height:1.35}.result-ai-rich h4{margin:0 0 10px;color:#155740;font-size:14px}.result-ai-rich p{margin:0;color:#416b5d;white-space:pre-line}.result-ai-rich-metrics{display:grid;grid-template-columns:repeat(4,1fr);gap:7px}.result-ai-rich-metric{padding:10px 7px;text-align:center;border-radius:12px;background:#f4fbf7;border:1px solid #d9ebe2}.result-ai-rich-metric b{display:block;color:#155740;font-size:17px}.result-ai-rich-metric span{display:block;margin-top:3px;color:#779389;font-size:9px}.result-ai-rich-head{display:flex;align-items:center;justify-content:space-between;gap:9px;margin-bottom:8px}.result-ai-rich-badge{font-size:10px;font-weight:800;color:#157457;background:#eaf8f0;border-radius:999px;padding:4px 7px}.result-ai-trend{display:flex;align-items:flex-end;gap:8px;height:120px;padding:8px 2px 22px;border-bottom:1px solid #d9ebe2}.result-ai-trend-col{position:relative;display:flex;align-items:center;justify-content:flex-end;flex-direction:column;gap:5px;flex:1;height:100%;min-width:28px}.result-ai-trend-bar{width:min(28px,70%);min-height:5px;border-radius:8px 8px 3px 3px;background:linear-gradient(180deg,#4fc997,#0b765a);transition:height .22s ease-out}.result-ai-trend-col.current .result-ai-trend-bar{background:linear-gradient(180deg,#f4aa72,#e47746)}.result-ai-trend-col small{position:absolute;bottom:-19px;max-width:58px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#78948a;font-size:9px}.result-ai-bar-row{display:grid;gap:5px;margin:10px 0}.result-ai-bar-label{display:flex;justify-content:space-between;gap:8px;font-size:11px;color:#416b5d}.result-ai-bar-label b{color:#155740}.result-ai-bar-track{height:9px;overflow:hidden;border-radius:99px;background:#eaf5ef}.result-ai-bar-track i{display:block;height:100%;border-radius:inherit;background:linear-gradient(90deg,#70d5ae,#0b765a);transition:width .25s ease-out}.result-ai-bar-row.watch .result-ai-bar-track i{background:linear-gradient(90deg,#f7ce7a,#d88a28)}.result-ai-bar-row.focus .result-ai-bar-track i{background:linear-gradient(90deg,#f4a18d,#c84e3c)}.result-ai-list{display:grid;gap:7px;margin:0;padding:0;list-style:none}.result-ai-list li{padding:9px 10px;border-radius:11px;background:#f6fbf8;color:#416b5d}.result-ai-list li::before{content:'✓';margin-right:7px;color:#16805f;font-weight:900}.result-ai-list.weak li::before{content:'!';color:#c84e3c}.result-ai-tabs{display:flex;gap:6px;overflow-x:auto;margin-bottom:10px}.result-ai-tab{flex:0 0 auto;border:1px solid #cde5d9;border-radius:999px;padding:8px 11px;background:#fff;color:#176b54;font:800 11px inherit;cursor:pointer}.result-ai-tab.active{background:#0b765a;color:#fff}.result-ai-plan{display:none}.result-ai-plan.active{display:block}.result-ai-insights{display:flex;flex-wrap:wrap;gap:7px}.result-ai-insight{padding:8px 10px;border-radius:11px;background:#f4fbf7;color:#416b5d;font-size:11px}.result-ai-insight b{display:block;color:#155740;font-size:12px}.result-ai-fallback{padding:13px;border-radius:14px;background:#fff8ee;border:1px solid #f2d9b2;color:#5e543f;white-space:pre-wrap;overflow-wrap:anywhere}@media(max-width:460px){.result-ai-rich-metrics{grid-template-columns:repeat(2,1fr)}.result-ai-rich h3{font-size:18px}}
    @media(max-width:460px){.result-ai-entry{align-items:stretch;flex-direction:column}.result-ai-button{width:100%}.result-ai-metric-grid{grid-template-columns:repeat(2,1fr)}.result-ai-modal{padding:15px;border-radius:18px}.result-ai-modal h2{font-size:20px}}
    @media(prefers-reduced-motion:reduce){.result-ai-button{transition:none}}
  `;
  document.head.appendChild(style);

  function closeModal(node) { node?.remove(); }
  const analysisCacheKey = (payload) => { const result = payload?.result || {}; const history = (payload?.previousResults || []).map(item => `${item.id}:${item.score}:${item.accuracy}`).join('|'); return `admission-hub-ai-analysis:v2:${result.id || 'unknown'}:${result.score}:${result.accuracy}:${result.correct}:${result.wrong}:${result.skipped}:${history}`; };
  const readCachedAnalysis = (key) => { try { return localStorage.getItem(key) || ''; } catch (_) { return ''; } };
  const writeCachedAnalysis = (key, text) => { try { localStorage.setItem(key, text); } catch (_) {} };
  async function waitForRun(endpoint, runId, onProgress) {
    const url = `${endpoint.replace(/\/$/, '')}/${encodeURIComponent(runId)}`;
    const deadline = Date.now() + 120000;
    while (Date.now() < deadline) {
      const response = await fetch(url, { headers: { Accept: 'application/json' } });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const status = String(data.status || '').toLowerCase();
      if (status === 'completed') return String(data.analysis || data.result || data.text || 'Analysis response পাওয়া যায়নি।');
      if (['failed', 'cancelled'].includes(status)) throw new Error('AI run সম্পন্ন হয়নি');
      onProgress?.(status || 'running');
      await new Promise(resolve => setTimeout(resolve, 2500));
    }
    throw new Error('Analysis timeout');
  }
  const clamp = (value, min = 0, max = 100) => Math.min(max, Math.max(min, number(value)));
  const parseAnalysis = (text) => {
    const raw = String(text || '').trim();
    try { const parsed = JSON.parse(raw); return parsed && typeof parsed === 'object' ? parsed : null; } catch (_) {}
    const start = raw.indexOf('{');
    const end = raw.lastIndexOf('}');
    if (start >= 0 && end > start) { try { const parsed = JSON.parse(raw.slice(start, end + 1)); return parsed && typeof parsed === 'object' ? parsed : null; } catch (_) {} }
    return null;
  };
  const textList = (value) => Array.isArray(value) ? value.filter(Boolean).map((item) => String(item)) : [];
  const toneClass = (tone) => ['strong', 'watch', 'focus'].includes(String(tone)) ? String(tone) : 'watch';
  function renderStructuredAnalysis(host, text, payload) {
    const data = parseAnalysis(text);
    if (!data) { host.innerHTML = `<div class="result-ai-fallback">${safe(text || 'Analysis response পাওয়া যায়নি।')}</div>`; host.classList.add('open'); return; }
    const result = payload?.result || {};
    const previous = Array.isArray(payload?.previousResults) ? payload.previousResults : [];
    const trend = [...previous, { ...result, date: result.completedAt || 'বর্তমান' }].slice(-8);
    const maxTrend = Math.max(1, ...trend.map((row) => number(row.score)));
    const trendHtml = trend.map((row, index) => `<div class="result-ai-trend-col ${index === trend.length - 1 ? 'current' : ''}"><div class="result-ai-trend-bar" style="height:${Math.max(7, clamp(number(row.score) / maxTrend * 82, 7, 82))}%"></div><small>${index === trend.length - 1 ? 'এখন' : `পরীক্ষা ${index + 1}`}</small></div>`).join('');
    const subjects = Array.isArray(payload?.subjectPerformance) ? payload.subjectPerformance.slice(0, 8) : [];
    const topics = Array.isArray(payload?.topicPerformance) ? payload.topicPerformance.slice(0, 8) : [];
    const bars = (rows) => rows.length ? rows.map((row) => `<div class="result-ai-bar-row ${toneClass(row.accuracy < 50 ? 'focus' : row.accuracy < 70 ? 'watch' : 'strong')}"><div class="result-ai-bar-label"><span>${safe(row.name)}</span><b>${number(row.accuracy).toFixed(1)}%</b></div><div class="result-ai-bar-track"><i style="width:${clamp(row.accuracy)}%"></i></div></div>`).join('') : '<p>এখনো পর্যাপ্ত breakdown নেই।</p>';
    const strengths = textList(data.strengths);
    const weaknesses = textList(data.weaknesses);
    const insights = Array.isArray(data.visualInsights) ? data.visualInsights.slice(0, 8) : [];
    host.innerHTML = `<div class="result-ai-rich"><div class="result-ai-rich-hero"><div class="result-ai-rich-kicker">Personal performance briefing</div><h3>${safe(data.headline || 'তোমার ফলাফলের বিশ্লেষণ')}</h3><p style="margin-top:8px">${safe(data.summary || 'ফলাফলটি ধাপে ধাপে দেখে উন্নতির জায়গা চিহ্নিত করা হয়েছে।')}</p></div><div class="result-ai-rich-metrics"><div class="result-ai-rich-metric"><b>${number(result.score).toFixed(2)}</b><span>নেট স্কোর</span></div><div class="result-ai-rich-metric"><b>${number(result.accuracy).toFixed(1)}%</b><span>নির্ভুলতা</span></div><div class="result-ai-rich-metric"><b>${number(result.correct)}/${number(result.total)}</b><span>সঠিক</span></div><div class="result-ai-rich-metric"><b>${number(result.negative).toFixed(2)}</b><span>নেগেটিভ</span></div></div><div class="result-ai-rich-card"><div class="result-ai-rich-head"><h4>স্কোরের যাত্রা</h4><span class="result-ai-rich-badge">বর্তমান বনাম আগের পরীক্ষা</span></div><div class="result-ai-trend">${trendHtml}</div></div><div class="result-ai-rich-card"><div class="result-ai-rich-head"><h4>বিষয়ভিত্তিক শক্তি</h4><span class="result-ai-rich-badge">Verified local data</span></div>${bars(subjects)}</div><div class="result-ai-rich-card"><div class="result-ai-rich-head"><h4>Topic focus map</h4><span class="result-ai-rich-badge">Revision priority</span></div>${bars(topics)}</div>${insights.length ? `<div class="result-ai-rich-card"><h4>দ্রুত visual insights</h4><div class="result-ai-insights">${insights.map((item) => `<div class="result-ai-insight"><b>${safe(item.label || 'Insight')}</b>${safe(item.value || '')}</div>`).join('')}</div></div>` : ''}<div class="result-ai-rich-card"><h4>যা ভালো হয়েছে</h4>${strengths.length ? `<ul class="result-ai-list">${strengths.map((item) => `<li>${safe(item)}</li>`).join('')}</ul>` : '<p>Strength পাওয়া যায়নি।</p>'}</div><div class="result-ai-rich-card"><h4>যেখানে কাজ দরকার</h4>${weaknesses.length ? `<ul class="result-ai-list weak">${weaknesses.map((item) => `<li>${safe(item)}</li>`).join('')}</ul>` : '<p>Weakness পাওয়া যায়নি।</p>'}</div><div class="result-ai-rich-card"><h4>ভুলের ধরন ও target advice</h4><p>${safe(data.mistakePattern || 'ভুলের pattern এখনো পাওয়া যায়নি।')}</p><p style="margin-top:9px"><b>পরের লক্ষ্য:</b> ${safe(data.targetAdvice || 'ভুল কমিয়ে নির্ভুলতা বাড়ানোর দিকে মন দাও।')}</p></div><div class="result-ai-rich-card"><div class="result-ai-tabs"><button class="result-ai-tab active" type="button" data-ai-tab="day1">১ দিন</button><button class="result-ai-tab" type="button" data-ai-tab="day3">৩ দিন</button><button class="result-ai-tab" type="button" data-ai-tab="day7">৭ দিন</button></div><div class="result-ai-plan active" data-ai-plan="day1"><h4>আজকের plan</h4><p>${safe(data.plan1Day || 'আজ ভুলগুলোর কারণ দেখে ছোট practice session দাও।')}</p></div><div class="result-ai-plan" data-ai-plan="day3"><h4>৩ দিনের plan</h4><p>${safe(data.plan3Days || 'তিন দিনে দুর্বল topic revise করে timed practice দাও।')}</p></div><div class="result-ai-plan" data-ai-plan="day7"><h4>৭ দিনের plan</h4><p>${safe(data.plan7Days || 'সপ্তাহ শেষে পূর্ণাঙ্গ পরীক্ষা দিয়ে আবার তুলনা করো।')}</p></div></div><div class="result-ai-rich-card"><h4>বন্ধুর মতো শেষ কথা</h4><p>${safe(data.motivation || 'ধারাবাহিক practice করলে উন্নতি সম্ভব।')}</p></div></div>`;
    host.classList.add('open');
    host.querySelectorAll('[data-ai-tab]').forEach((tab) => tab.addEventListener('click', () => {
      host.querySelectorAll('[data-ai-tab]').forEach((item) => item.classList.toggle('active', item === tab));
      host.querySelectorAll('[data-ai-plan]').forEach((plan) => plan.classList.toggle('active', plan.dataset.aiPlan === tab.dataset.aiTab));
    }));
  }
  let turnstileScriptPromise;
  function ensureTurnstile() {
    if (window.turnstile) return Promise.resolve(window.turnstile);
    if (turnstileScriptPromise) return turnstileScriptPromise;
    turnstileScriptPromise = new Promise((resolve, reject) => {
      const existing = document.querySelector('script[data-admission-hub-turnstile]');
      if (existing) {
        existing.addEventListener('load', () => window.turnstile ? resolve(window.turnstile) : reject(new Error('Turnstile unavailable')), { once: true });
        existing.addEventListener('error', () => reject(new Error('Turnstile script failed')), { once: true });
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      script.async = true;
      script.defer = true;
      script.dataset.admissionHubTurnstile = 'true';
      script.onload = () => window.turnstile ? resolve(window.turnstile) : reject(new Error('Turnstile unavailable'));
      script.onerror = () => reject(new Error('Turnstile script failed'));
      document.head.appendChild(script);
    });
    return turnstileScriptPromise;
  }
  function launchLiveAnalysisTool(result) {
    const payload = buildPayload(result);
    const endpoint = String(window.ADMISSION_HUB_AI_ENDPOINT || '').trim();
    const siteKey = String(window.ADMISSION_HUB_TURNSTILE_SITEKEY || '').trim();
    const cacheKey = analysisCacheKey(payload);
    let cached = readCachedAnalysis(cacheKey);
    try {
      sessionStorage.setItem('admission-hub-ai-live-input', JSON.stringify({ ...payload, turnstileSiteKey: siteKey, endpoint }));
      sessionStorage.setItem('admission-hub-ai-live-cached-analysis', cached || '');
    } catch (_) {}
    const overlay = document.createElement('div');
    overlay.className = 'result-ai-fullscreen';
    overlay.innerHTML = `<iframe title="Admission Hub AI Performance Analysis" src="./ai-performance-analysis-live.html?v=live-tool-v9-aireal" loading="eager"></iframe>`;
    document.body.appendChild(overlay);
    const close = () => { overlay.remove(); try { sessionStorage.removeItem('admission-hub-ai-live-input'); sessionStorage.removeItem('admission-hub-ai-live-cached-analysis'); } catch (_) {} };
    window.addEventListener('message', (event) => { if (event.source === overlay.querySelector('iframe')?.contentWindow && event.data?.type === 'admission-hub-ai-close') close(); }, { once: true });
    overlay.addEventListener('click', (event) => { if (event.target === overlay) close(); });
  }

  function openModal(result) {
    const payload = buildPayload(result);
    const m = payload.result;
    const endpoint = String(window.ADMISSION_HUB_AI_ENDPOINT || '').trim();
    const cacheKey = analysisCacheKey(payload);
    const cachedAnalysis = readCachedAnalysis(cacheKey);
    const overlay = document.createElement('div');
    overlay.className = 'result-ai-overlay';
    overlay.innerHTML = `<section class="result-ai-modal" role="dialog" aria-modal="true" aria-label="AI Result Analysis"><div class="result-ai-modal-head"><div><span>ON-DEMAND AI ANALYSIS</span><h2>তোমার ফলাফল বিশ্লেষণ</h2></div><button class="result-ai-close" type="button" aria-label="বন্ধ করুন">×</button></div><div class="result-ai-status"><b>${endpoint ? 'AI connection ready' : 'প্রথম ধাপ প্রস্তুত'}</b><br>${endpoint ? 'Analysis button চাপলে secure endpoint-এ শুধু verified result summary যাবে।' : 'App তোমার result-এর verified summary তৈরি করেছে। এখন secure backend বসলে এখান থেকেই AI analysis নেওয়া যাবে।'}</div><div class="result-ai-metric-grid"><div class="result-ai-metric"><b>${m.score.toFixed(2)}</b><span>নেট স্কোর</span></div><div class="result-ai-metric"><b>${m.accuracy}%</b><span>নির্ভুলতা</span></div><div class="result-ai-metric"><b>${m.correct}/${m.total}</b><span>সঠিক</span></div><div class="result-ai-metric"><b>${m.wrong}</b><span>ভুল</span></div></div><div class="result-ai-turnstile" data-ai-turnstile></div><div class="result-ai-actions"><button type="button" data-ai-generate>${endpoint ? 'AI Analysis তৈরি করুন' : 'Secure setup pending'}</button><button type="button" class="secondary" data-ai-payload>Data summary দেখুন</button></div><pre class="result-ai-payload" data-ai-payload-box></pre><div class="result-ai-live-result" data-ai-live-result></div><p class="result-ai-note">API key কখনো frontend-এ থাকবে না। দিনে সর্বোচ্চ ৩টি নতুন request এবং একই result-এর cached response রাখা হবে।</p></section>`;
    document.body.appendChild(overlay);
    const close = () => closeModal(overlay);
    overlay.querySelector('.result-ai-close').addEventListener('click', close);
    overlay.addEventListener('click', (event) => { if (event.target === overlay) close(); });
    overlay.querySelector('[data-ai-payload]').addEventListener('click', () => {
      const box = overlay.querySelector('[data-ai-payload-box]');
      box.textContent = JSON.stringify(payload, null, 2);
      box.classList.toggle('open');
    });
    const live = overlay.querySelector('[data-ai-live-result]');
    const generateButton = overlay.querySelector('[data-ai-generate]');
    const turnstileBox = overlay.querySelector('[data-ai-turnstile]');
    const turnstileSiteKey = String(window.ADMISSION_HUB_TURNSTILE_SITEKEY || '').trim();
    let turnstileToken = '';
    let turnstileWidgetId = null;
    let turnstileUnavailable = !turnstileSiteKey;
    if (cachedAnalysis) renderStructuredAnalysis(live, cachedAnalysis, payload);
    if (endpoint && !cachedAnalysis) {
      if (!turnstileSiteKey) {
        turnstileUnavailable = true;
        turnstileBox.textContent = 'Human verification unavailable; secure AI request চালু রাখা হলো।';
        generateButton.disabled = false;
      } else {
        turnstileBox.textContent = 'Human verification চালু হচ্ছে…';
        ensureTurnstile().then((api) => {
          if (!overlay.isConnected) return;
          turnstileBox.textContent = '';
          turnstileUnavailable = false;
          turnstileWidgetId = api.render(turnstileBox, {
            sitekey: turnstileSiteKey,
            action: 'result_analysis',
            callback: (token) => { turnstileToken = String(token || ''); generateButton.disabled = !turnstileToken; },
            'expired-callback': () => { turnstileToken = ''; generateButton.disabled = true; },
            'error-callback': () => { turnstileToken = ''; generateButton.disabled = true; turnstileBox.textContent = 'Human verification পাওয়া যায়নি। আবার চেষ্টা করো।'; }
          });
          generateButton.disabled = true;
        }).catch(() => {
          turnstileUnavailable = true;
          turnstileBox.textContent = 'Human verification লোড হয়নি; secure AI request চালু রাখা হলো।';
          generateButton.disabled = false;
        });
      }
    }
    generateButton.addEventListener('click', async (event) => {
      const button = event.currentTarget;
      if (cachedAnalysis) { live.textContent = cachedAnalysis; live.classList.add('open'); return; }
      if (!endpoint) {
        live.textContent = 'AI Analysis চালু করার আগে secure backend endpoint সেট করতে হবে। এই ধাপে কোনো API key app-এ রাখা হয়নি।';
        live.classList.add('open');
        return;
      }
      if (!turnstileUnavailable && !turnstileToken) {
        live.textContent = 'Human verification এখনো শেষ হয়নি। একটু অপেক্ষা করে আবার চেষ্টা করো।';
        live.classList.add('open');
        return;
      }
      button.disabled = true;
      button.textContent = 'Analysis তৈরি হচ্ছে…';
      try {
        const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...payload, turnstileToken }) });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) { if (response.status === 429) throw new Error('আজকের ১০টি নতুন analysis-এর সীমা পূর্ণ হয়েছে। Cached report থাকলে সেটি দেখা যাবে।'); throw new Error(data.error || `HTTP ${response.status}`); }
        const text = data.analysis || data.result || data.text || (data.runId ? await waitForRun(endpoint, data.runId, (status) => { button.textContent = status === 'queued' ? 'Queue-তে আছে…' : 'Analysis তৈরি হচ্ছে…'; }) : 'Analysis response পাওয়া যায়নি।');
        renderStructuredAnalysis(live, String(text), payload);
        writeCachedAnalysis(cacheKey, String(text));
      } catch (error) {
        live.textContent = `AI Analysis পাওয়া যায়নি। Local result ঠিক আছে। পরে আবার চেষ্টা করো। (${error.message})`;
        live.classList.add('open');
      } finally {
        turnstileToken = '';
        if (window.turnstile && turnstileWidgetId !== null) window.turnstile.reset(turnstileWidgetId);
        button.disabled = false;
        button.textContent = 'AI Analysis তৈরি করুন';
      }
    });
  }

  window.addEventListener('message', (event) => {
    const data = event && event.data;
    if (!data || data.type !== 'admission-hub-ai-flash-test' || !Array.isArray(data.questionIds)) return;
    try {
      document.querySelectorAll('.result-ai-fullscreen').forEach((node) => node.remove());
      sessionStorage.removeItem('admission-hub-ai-live-input');
      sessionStorage.removeItem('admission-hub-ai-live-cached-analysis');
    } catch (_) {}
    if (typeof window.startAiFlashTest === 'function') window.startAiFlashTest(data.questionIds);
  });

  function install() {
    const base = window.renderResultView;
    if (typeof base !== 'function' || base.__ahResultAI) return;
    const wrapped = function resultAIWrapped(result) {
      const out = base.apply(this, arguments);
      window.setTimeout(() => {
        const story = document.querySelector('.result-report-story');
        if (!story || story.querySelector('.result-ai-entry')) return;
        const entry = document.createElement('div');
        entry.className = 'result-ai-entry';
        entry.innerHTML = '<div class="result-ai-entry-copy"><strong>আরও বিস্তারিত AI Analysis</strong><span>বর্তমান ফল, আগের trend ও topic performance দেখে বন্ধুর মতো পরামর্শ · দিনে ৩টি নতুন analysis</span></div><button class="result-ai-button" type="button">✦ Analysis</button>';
        entry.querySelector('button').addEventListener('click', () => launchLiveAnalysisTool(result));
        story.appendChild(entry);
      }, 0);
      return out;
    };
    wrapped.__ahResultAI = true;
    wrapped.__ahOriginal = base;
    window.renderResultView = wrapped;
  }

  install();
  window.setTimeout(install, 0);
  window.setTimeout(install, 250);
})();
