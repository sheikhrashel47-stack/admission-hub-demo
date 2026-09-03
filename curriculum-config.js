/* ============================================================
   ADMISSION HUB — CENTRALIZED CURRICULUM CONFIG (v1 · 2026-09-03)
   🎯 নিয়ম: ইউজারের University + Unit = একমাত্র সত্য (source of truth)।
   কোনো component নিজে থেকে subject তৈরি করবে না — সব এখান থেকে নেবে।
   গঠন: university → unit → subjects[{name, bank, count, weight}]
     - name  = UI-তে দেখানোর বাংলা নাম
     - bank  = প্রশ্ন-ব্যাংকের (CACHE) subject-এর সাথে ম্যাপিং (থাকলে)
     - count = ঐ ইউনিটের পরীক্ষায় প্রশ্ন-বণ্টন (MCQ মোট ১০০ ধরে)
     - weight = আপেক্ষিক গুরুত্ব (ফোকাস সাজাতে)
   নতুন বিশ্ববিদ্যালয়/ইউনিট যোগ করতে শুধু এই ফাইল বদলাও।
   ============================================================ */
(function () {
  'use strict';
  if (window.ADM_CURRICULUM) return;

  var SUBJ = {
    bangla:  { name: 'বাংলা',               bank: 'Bangla 1st' },
    bangla2: { name: 'বাংলা (২য়)',          bank: 'Bangla 2nd' },
    eng:     { name: 'English',             bank: 'English' },
    gk:      { name: 'সাধারণ জ্ঞান',          bank: 'GK' },
    gkInt:   { name: 'আন্তর্জাতিক বিষয়াবলি',  bank: 'GK' },
    ict:     { name: 'তথ্য ও যোগাযোগ প্রযুক্তি', bank: 'GK' },
    phy:     { name: 'পদার্থবিজ্ঞান',        bank: '' },
    chem:    { name: 'রসায়ন',              bank: '' },
    bio:     { name: 'জীববিজ্ঞান',          bank: '' },
    math:    { name: 'উচ্চতর গণিত',          bank: '' },
    bmath:   { name: 'ব্যবসায় গণিত',         bank: '' },
    acc:     { name: 'হিসাববিজ্ঞান',         bank: '' },
    mgmt:    { name: 'ব্যবস্থাপনা',          bank: '' },
    social:  { name: 'সমাজবিজ্ঞান',          bank: '' }
  };
  var s = function (key, count) { return { name: SUBJ[key].name, bank: SUBJ[key].bank, count: count, weight: count }; };

  var CURRICULUM = {
    units: {
      du:  ['A', 'B', 'C', 'D'],
      cu:  ['A', 'B', 'C', 'D'],
      ru:  ['A', 'B', 'C', 'D'],
      ju:  ['A', 'B', 'C', 'D'],
      ku:  ['A', 'B', 'C', 'D'],
      cou: ['A', 'B', 'C'],
      bau: ['A'],
      other: ['A', 'B', 'C', 'D']
    },
    subjects: {
      du: {
        A: [s('bangla', 25), s('eng', 25), s('gk', 25), s('gkInt', 25)],
        B: [s('bangla', 15), s('eng', 15), s('phy', 20), s('chem', 20), s('math', 20), s('bio', 10)],
        C: [s('bangla', 15), s('eng', 15), s('bmath', 20), s('acc', 20), s('mgmt', 15), s('gk', 15)],
        D: [s('bangla', 20), s('eng', 20), s('gk', 25), s('social', 20), s('ict', 15)]
      },
      cu: {
        A: [s('bangla', 25), s('eng', 25), s('gk', 25), s('gkInt', 25)],
        B: [s('bangla', 15), s('eng', 15), s('phy', 20), s('chem', 20), s('math', 20), s('bio', 10)],
        C: [s('bangla', 15), s('eng', 15), s('bmath', 20), s('acc', 20), s('mgmt', 15), s('gk', 15)],
        D: [s('bangla', 20), s('eng', 20), s('gk', 25), s('social', 20), s('ict', 15)]
      },
      ru: {
        A: [s('bangla', 25), s('eng', 25), s('gk', 25), s('gkInt', 25)],
        B: [s('bangla', 15), s('eng', 15), s('phy', 20), s('chem', 20), s('math', 20), s('bio', 10)],
        C: [s('bangla', 15), s('eng', 15), s('bmath', 20), s('acc', 20), s('mgmt', 15), s('gk', 15)],
        D: [s('bangla', 20), s('eng', 20), s('gk', 25), s('social', 20), s('ict', 15)]
      },
      ju: {
        A: [s('bangla', 25), s('eng', 25), s('gk', 25), s('gkInt', 25)],
        B: [s('bangla', 20), s('eng', 20), s('gk', 25), s('social', 20), s('ict', 15)],
        C: [s('bangla', 15), s('eng', 15), s('phy', 20), s('chem', 20), s('math', 20), s('bio', 10)],
        D: [s('bangla', 15), s('eng', 15), s('bmath', 20), s('acc', 20), s('mgmt', 15), s('gk', 15)]
      },
      ku: {
        A: [s('phy', 20), s('chem', 20), s('math', 20), s('bio', 15), s('eng', 15), s('bangla', 10)],
        B: [s('bangla', 25), s('eng', 25), s('gk', 25), s('gkInt', 25)],
        C: [s('bangla', 15), s('eng', 15), s('bmath', 20), s('acc', 20), s('mgmt', 15), s('gk', 15)],
        D: [s('bangla', 20), s('eng', 20), s('gk', 25), s('social', 20), s('ict', 15)]
      },
      cou: {
        A: [s('bangla', 25), s('eng', 25), s('gk', 25), s('gkInt', 25)],
        B: [s('bangla', 20), s('eng', 20), s('gk', 25), s('social', 20), s('ict', 15)],
        C: [s('bangla', 15), s('eng', 15), s('bmath', 20), s('acc', 20), s('mgmt', 15), s('gk', 15)]
      },
      bau: {
        A: [s('phy', 20), s('chem', 20), s('bio', 20), s('math', 10), s('eng', 15), s('bangla', 15)]
      },
      other: {
        A: [s('bangla', 25), s('eng', 25), s('gk', 25), s('gkInt', 25)],
        B: [s('bangla', 15), s('eng', 15), s('phy', 20), s('chem', 20), s('math', 20), s('bio', 10)],
        C: [s('bangla', 15), s('eng', 15), s('bmath', 20), s('acc', 20), s('mgmt', 15), s('gk', 15)],
        D: [s('bangla', 20), s('eng', 20), s('gk', 25), s('social', 20), s('ict', 15)]
      }
    }
  };

  function codeOf(uni) { return String(uni || '').toLowerCase(); }
  function unitList(uni) { return (CURRICULUM.units[codeOf(uni)] || []).slice(); }
  function subjectsFor(uni, unit) {
    var u = CURRICULUM.subjects[codeOf(uni)];
    if (!u) return [];
    var list = u[String(unit || '').toUpperCase()] || u[unit] || [];
    return list.map(function (x) { return { name: x.name, bank: x.bank || '', count: Number(x.count) || 0, weight: Number(x.weight) || 0 }; });
  }
  function focusFor(uni, unit, n) {
    var list = subjectsFor(uni, unit);
    if (!list.length) return [];
    return list.slice().sort(function (a, b) { return b.weight - a.weight; }).slice(0, n || 3);
  }
  // বর্তমান ইউজারের নির্বাচিত [uniCode, unit]
  function userTarget() {
    var t = { uni: '', unit: '' };
    try {
      var o = JSON.parse(localStorage.getItem('ahOnboard:' + (function () {
        try { var u = JSON.parse(localStorage.getItem('ahPubUser') || sessionStorage.getItem('ahPubUser') || 'null'); return (u && (u.uid || u.id)) || 'anon'; } catch (e) { return 'anon'; }
      })()) || 'null');
      if (o && o.targetUniversityIds && o.targetUniversityIds[0]) t.uni = o.targetUniversityIds[0];
      if (o && o.targetUnits && o.targetUnits[0]) t.unit = o.targetUnits[0];
    } catch (e) {}
    if (!t.uni) {
      try {
        var u2 = JSON.parse(localStorage.getItem('ahPubUser') || sessionStorage.getItem('ahPubUser') || 'null');
        if (u2 && u2.targetUniversity) { /* নাম থেকে কোড ম্যাপ */ }
      } catch (e) {}
    }
    return t;
  }

  window.ADM_CURRICULUM = CURRICULUM;
  window.ADM = { unitList: unitList, subjectsFor: subjectsFor, focusFor: focusFor, userTarget: userTarget };
})();
