/* Auth illustrations — coded SVG matching locked 5-screen mockup. No crops, no CSS-3D. */
(() => {
  'use strict';

  function cap() {
    return `<svg class="ah-illu ah-cap-svg" viewBox="0 0 240 170" aria-hidden="true">
      <defs>
        <linearGradient id="capB" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#3a3a3a"/><stop offset="45%" stop-color="#161616"/><stop offset="100%" stop-color="#050505"/>
        </linearGradient>
        <linearGradient id="capS" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#2a2a2a"/><stop offset="100%" stop-color="#0a0a0a"/>
        </linearGradient>
        <linearGradient id="gold" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#f3e0a0"/><stop offset="50%" stop-color="#c9a227"/><stop offset="100%" stop-color="#8a6a18"/>
        </linearGradient>
      </defs>
      <ellipse cx="120" cy="148" rx="48" ry="8" fill="rgba(0,0,0,.28)"/>
      <path d="M78 108c0 22 18 34 42 34s42-12 42-34" fill="url(#capS)"/>
      <ellipse cx="120" cy="108" rx="42" ry="12" fill="#1c1c1c"/>
      <path d="M28 78 L120 42 L212 78 L120 114 Z" fill="url(#capB)"/>
      <path d="M212 78 L212 86 L120 122 L120 114 Z" fill="#0b0b0b"/>
      <path d="M28 78 L28 86 L120 122 L120 114 Z" fill="#1a1a1a"/>
      <circle cx="120" cy="78" r="5" fill="url(#gold)"/>
      <path d="M120 78 C148 70 168 92 172 118" fill="none" stroke="url(#gold)" stroke-width="2.4"/>
      <path d="M166 118 h14 l-3 22 h-8 z" fill="url(#gold)"/>
    </svg>`;
  }

  function wreathLeaves() {
    let s = '';
    for (let i = 0; i < 18; i++) {
      const a = -140 + (i * 280) / 17;
      if (Math.abs(a) < 18) continue;
      s += `<g transform="rotate(${a.toFixed(1)} 100 108)">
        <path d="M100 48 C94 56 94 66 100 74 C106 66 106 56 100 48Z" fill="url(#lf)"/>
      </g>`;
    }
    return s;
  }

  function emblem() {
    return `<svg class="ah-illu ah-emblem" viewBox="0 0 200 200" aria-hidden="true">
      <defs>
        <linearGradient id="lf" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#c8ffd8"/><stop offset="55%" stop-color="#3dcf7a"/><stop offset="100%" stop-color="#0e6b42"/>
        </linearGradient>
        <linearGradient id="pg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#f4fff8"/><stop offset="100%" stop-color="#c5e6d2"/>
        </linearGradient>
        <filter id="eg"><feGaussianBlur stdDeviation="3.5"/></filter>
      </defs>
      <circle cx="100" cy="108" r="72" fill="none" stroke="rgba(130,255,190,.22)" stroke-width="2" filter="url(#eg)"/>
      ${wreathLeaves()}
      <path d="M90 44 l10-14 10 14 h-6 v8 h-8 z" fill="#e8f8ee"/>
      <path d="M100 62 l-20 7 v26 c0 14 20 22 20 22s20-8 20-22 v-26z" fill="url(#pg)" stroke="#b7e0c6" stroke-width="1"/>
      <path d="M100 70 v40" stroke="#2f7a52" stroke-width="1.6"/>
      <path d="M86 82h11M86 92h11M86 102h9M103 82h11M103 92h11M103 102h9" stroke="#1e7a4c" stroke-width="1.2" opacity=".5"/>
    </svg>`;
  }

  function openBook() {
    return `<svg class="ah-illu ah-openbook" viewBox="0 0 140 80" aria-hidden="true">
      <defs>
        <linearGradient id="bL" x1="1" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#f7fff9"/><stop offset="100%" stop-color="#b7d4c2"/></linearGradient>
        <linearGradient id="bR" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#fff"/><stop offset="100%" stop-color="#cfe6d8"/></linearGradient>
      </defs>
      <ellipse cx="70" cy="72" rx="46" ry="6" fill="rgba(0,0,0,.25)"/>
      <path d="M70 16 C30 22 18 30 14 62 c20-8 40-6 56 0z" fill="url(#bL)"/>
      <path d="M70 16 C110 22 122 30 126 62 c-20-8-40-6-56 0z" fill="url(#bR)"/>
      <path d="M70 16 v48" stroke="#1a5c3c" stroke-width="3"/>
    </svg>`;
  }

  function backpack(person) {
    const extra = person ? `
      <g transform="translate(118 70)">
        <ellipse cx="22" cy="62" rx="20" ry="6" fill="rgba(20,40,30,.1)"/>
        <rect x="8" y="22" width="28" height="34" rx="12" fill="#eef3ef"/>
        <circle cx="22" cy="12" r="11" fill="#f4f7f5"/>
        <circle cx="22" cy="11" r="8" fill="#e4ebe6"/>
      </g>` : '';
    return `<svg class="ah-illu ah-bag-svg" viewBox="0 0 180 200" aria-hidden="true">
      <defs>
        <linearGradient id="bag" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#6fd59a"/><stop offset="40%" stop-color="#2f9a5f"/>
          <stop offset="100%" stop-color="#0e5a38"/>
        </linearGradient>
      </defs>
      <ellipse cx="78" cy="188" rx="54" ry="8" fill="rgba(20,40,30,.12)"/>
      <rect x="48" y="168" width="60" height="22" rx="6" fill="#eef3ef"/>
      <path d="M62 62c0-18 36-18 36 0" stroke="#0e5a38" stroke-width="7" fill="none" stroke-linecap="round"/>
      <path d="M42 70c0-18 76-18 76 0l5 88c0 16-86 16-86 0z" fill="url(#bag)"/>
      <path d="M52 82c14-8 44-8 58 4v28c-16-12-44-10-58 2z" fill="#fff" opacity=".22"/>
      <circle cx="80" cy="118" r="16" fill="#eaf7ef"/>
      <path d="M74 122 v-8 c0-4 12-4 12 0 v8" fill="#1e7a4c"/>
      <circle cx="132" cy="78" r="16" fill="url(#bag)"/>
      <circle cx="132" cy="78" r="16" fill="none" stroke="#cfe8d8" stroke-width="1.4"/>
      <path d="M132 64 v28 M120 78 h24" stroke="#eaf7ef" stroke-width="1.2" opacity=".7"/>
      ${extra}
    </svg>`;
  }

  function shield(opts) {
    const lock = opts.lock ? `
      <rect x="78" y="108" width="44" height="34" rx="7" fill="url(#gd)"/>
      <path d="M88 110 v-14 c0-12 24-12 24 0 v14" fill="none" stroke="url(#gd)" stroke-width="6" stroke-linecap="round"/>
      <circle cx="100" cy="124" r="4" fill="#5a4310"/>` : `
      <path d="M72 108 l20 20 40-44" fill="none" stroke="#f4fff8" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/>`;
    const badge = opts.lock ? `<g transform="translate(138 128)"><circle r="16" fill="#2f9a5f"/><path d="M-6 0 l5 5 9-10" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"/></g>` : '';
    const ped = opts.ped ? `<ellipse cx="100" cy="208" rx="70" ry="10" fill="rgba(20,40,30,.1)"/>
      <rect x="48" y="186" width="104" height="18" fill="#e8eee9"/>
      <ellipse cx="100" cy="186" rx="52" ry="12" fill="#fff"/>
      <ellipse cx="100" cy="204" rx="52" ry="10" fill="#d5ddd8"/>` : '';
    return `<svg class="ah-illu ah-shield-svg" viewBox="0 0 200 220" aria-hidden="true">
      <defs>
        <linearGradient id="sh" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#c6ffd8"/><stop offset="35%" stop-color="#4ecf86"/>
          <stop offset="70%" stop-color="#1e8a52"/><stop offset="100%" stop-color="#0b4a2e"/>
        </linearGradient>
        <linearGradient id="gd" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#ffe9a8"/><stop offset="100%" stop-color="#8a6a18"/>
        </linearGradient>
      </defs>
      ${ped}
      <path d="M100 16 L176 44 L168 118 C162 164 100 196 100 196 C100 196 38 164 32 118 L24 44 Z" fill="url(#sh)"/>
      <path d="M100 16 L176 44 L164 52 L100 28 Z" fill="#fff" opacity=".28"/>
      ${lock}${badge}
    </svg>`;
  }

  window.AHAuth3D = {
    welcomeScene() {
      return `<div class="ah-scene ah-scene-welcome">
        <div class="ah-orb o1"></div><div class="ah-orb o2"></div><div class="ah-orb o3"></div>
        <div class="ah-orb o4"></div><div class="ah-orb o5"></div><div class="ah-orb o6"></div>
        ${cap()}${emblem()}${openBook()}
      </div>`;
    },
    loginHero() { return `<div class="ah-hero-illu">${backpack(false)}</div>`; },
    signupHero() { return `<div class="ah-hero-illu">${backpack(true)}</div>`; },
    otpHero() { return `<div class="ah-hero-illu center">${shield({ lock: true })}</div>`; },
    successHero() {
      const bits = Array.from({ length: 18 }, (_, i) => {
        const cols = ['#3dcf7a', '#f2d36b', '#f2a3a0', '#7fd3f0', '#8be0b0'];
        return `<i class="ah-bit" style="left:${8 + (i * 17) % 84}%;top:${4 + (i * 13) % 60}%;background:${cols[i % cols.length]}"></i>`;
      }).join('');
      return `<div class="ah-hero-illu center">${bits}<div class="ah-confetti"></div>${shield({ ped: true })}</div>`;
    },
    ico: {
      back: '<svg viewBox="0 0 24 24" width="22" height="22"><path d="M15 5 L8 12 L15 19" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
      eye: '<svg viewBox="0 0 24 24" width="20" height="20"><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>',
      g: '<svg class="ah-g" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.6 12.23c0-.74-.06-1.45-.18-2.13H12v4.04h5.95a5.09 5.09 0 0 1-2.2 3.34v2.77h3.56c2.08-1.92 3.29-4.75 3.29-8.02z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.77c-.99.66-2.26 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.85A10.99 10.99 0 0 0 12 23z"/><path fill="#FBBC05" d="M5.84 14.1A6.61 6.61 0 0 1 5.5 12c0-.73.13-1.43.34-2.1V7.05H2.18A11 11 0 0 0 1 12c0 1.78.43 3.45 1.18 4.95l3.66-2.85z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.07.56 4.21 1.64l3.16-3.16C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.05l3.66 2.85C6.71 7.31 9.14 5.38 12 5.38z"/></svg>'
    }
  };
})();
