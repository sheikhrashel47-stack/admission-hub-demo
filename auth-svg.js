/* Option 1 — Emerald Academic 3D. CSS/SVG only. */
(() => {
  'use strict';

  function wreath(cx, cy, r, n, gap, gid) {
    let s = '';
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      const ang = -128 + t * 256;
      if (Math.abs(ang) < gap) continue;
      const rad = (ang * Math.PI) / 180;
      const x = cx + Math.cos(rad - Math.PI / 2) * r;
      const y = cy + Math.sin(rad - Math.PI / 2) * r;
      const flip = i % 2 ? 1 : -1;
      s += `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${ang.toFixed(1)})">
        <ellipse cx="0" cy="${-10 * flip}" rx="5.4" ry="12.2" fill="url(#${gid})"/>
        <ellipse cx="${1.4 * flip}" cy="${-8 * flip}" rx="2" ry="7" fill="#eafff2" opacity=".3"/>
      </g>`;
    }
    return s;
  }

  function backpack(opts = {}) {
    const person = opts.person
      ? `<div class="ah-bust" aria-hidden="true">
           <i class="hd"></i><i class="bd"></i>
         </div>
         <div class="ah-plinth p3"></div>`
      : '';
    return `<div class="ah-comp ah-comp-bag" data-tilt>
      <div class="ah-plinth p1"></div>
      <div class="ah-plinth p2"></div>
      ${person}
      <div class="ah-globe" aria-hidden="true"><span></span></div>
      <div class="ah-cube c1"><i class="ft"></i><i class="bk"></i><i class="rt"></i><i class="lt"></i><i class="tp"></i><i class="bt"></i></div>
      <div class="ah-cube c2"><i class="ft"></i><i class="bk"></i><i class="rt"></i><i class="lt"></i><i class="tp"></i><i class="bt"></i></div>
      <svg class="ah-bag" viewBox="0 0 160 200" aria-hidden="true">
        <defs>
          <linearGradient id="bagB" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#7fe0a8"/><stop offset="32%" stop-color="#2f9a5a"/>
            <stop offset="72%" stop-color="#146b3d"/><stop offset="100%" stop-color="#0b4a2a"/>
          </linearGradient>
          <linearGradient id="bagH" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#fff" stop-opacity=".5"/><stop offset="50%" stop-color="#fff" stop-opacity="0"/>
          </linearGradient>
        </defs>
        <path d="M58 58c0-18 44-18 44 0" stroke="#0e5a38" stroke-width="8" fill="none" stroke-linecap="round"/>
        <path d="M38 70c0-22 84-22 84 0l6 96c0 18-96 18-96 0z" fill="url(#bagB)"/>
        <path d="M50 78c16-12 52-12 70 2v36c-20-14-52-12-70 4z" fill="url(#bagH)"/>
        <rect x="52" y="108" width="56" height="48" rx="12" fill="#0e5a38" opacity=".28"/>
        <path d="M56 118h48" stroke="#c9a227" stroke-width="2.2" stroke-linecap="round" opacity=".85"/>
        <circle cx="80" cy="96" r="14" fill="#eaf7ef"/>
        <path d="M74 100v-7c0-4 12-4 12 0v7" fill="#1e7a4c"/>
      </svg>
    </div>`;
  }

  function emblem() {
    return `<svg class="ah-emblem" viewBox="0 0 200 200" aria-hidden="true">
      <defs>
        <linearGradient id="wL" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#d4ffe4"/><stop offset="45%" stop-color="#4ad68a"/>
          <stop offset="100%" stop-color="#0e6b42"/>
        </linearGradient>
        <filter id="wGlow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="5" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <linearGradient id="bookPg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#f7fff9"/><stop offset="100%" stop-color="#bfe8cc"/>
        </linearGradient>
      </defs>
      <circle cx="100" cy="110" r="80" fill="none" stroke="rgba(140,255,190,.22)" stroke-width="2" filter="url(#wGlow)"/>
      ${wreath(100, 114, 66, 28, 15, 'wL')}
      <path d="M88 40 l12-16 12 16 h-7 v11 h-10 v-11z" fill="#eefbf3"/>
      <path d="M100 58 l-24 8 v30 c0 18 24 26 24 26s24-8 24-26 v-30z" fill="url(#bookPg)"/>
      <path d="M100 66 v48" stroke="#2f7a52" stroke-width="1.8"/>
      <path d="M84 80h12M84 90h12M84 100h10M104 80h12M104 90h12M104 100h10" stroke="#1e7a4c" stroke-width="1.4" opacity=".55"/>
    </svg>`;
  }

  function openBook() {
    return `<svg class="ah-openbook" viewBox="0 0 160 90" aria-hidden="true">
      <defs>
        <linearGradient id="pgL" x1="1" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#f6fff9"/><stop offset="100%" stop-color="#b7d4c2"/>
        </linearGradient>
        <linearGradient id="pgR" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#fff"/><stop offset="100%" stop-color="#cfe6d8"/>
        </linearGradient>
        <linearGradient id="spine" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#1a6b40"/><stop offset="100%" stop-color="#0b3d26"/>
        </linearGradient>
      </defs>
      <ellipse cx="80" cy="82" rx="54" ry="7" fill="rgba(0,0,0,.3)"/>
      <path d="M18 70c8-40 50-52 62-54v58c-18-8-44-6-62-4z" fill="url(#pgL)"/>
      <path d="M142 70c-8-40-50-52-62-54v58c18-8 44-6 62-4z" fill="url(#pgR)"/>
      <path d="M80 16 v56" stroke="url(#spine)" stroke-width="6" stroke-linecap="round"/>
    </svg>`;
  }

  function otpShield() {
    return `<div class="ah-comp ah-comp-otp" data-tilt>
      <svg class="ah-hex" viewBox="0 0 220 220" aria-hidden="true">
        <defs>
          <linearGradient id="hx" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#c6ffd9"/><stop offset="30%" stop-color="#4ecf86"/>
            <stop offset="70%" stop-color="#1b8a50"/><stop offset="100%" stop-color="#0b4a2c"/>
          </linearGradient>
          <linearGradient id="lockM" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#ffe9a8"/><stop offset="45%" stop-color="#e0b84a"/><stop offset="100%" stop-color="#8a6a18"/>
          </linearGradient>
          <filter id="hxSh"><feDropShadow dx="0" dy="12" stdDeviation="10" flood-color="#0b3a28" flood-opacity=".26"/></filter>
        </defs>
        <path d="M110 16 L186 48 L176 132 C170 176 110 204 110 204 C110 204 50 176 44 132 L34 48 Z" fill="url(#hx)" filter="url(#hxSh)"/>
        <path d="M110 28 L170 54 L162 128 C158 164 110 188 110 188 C110 188 62 164 58 128 L50 54 Z" fill="none" stroke="rgba(255,255,255,.28)" stroke-width="3"/>
        <rect x="82" y="108" width="56" height="42" rx="8" fill="url(#lockM)"/>
        <path d="M94 112 v-18 c0-16 32-16 32 0 v18" fill="none" stroke="url(#lockM)" stroke-width="8" stroke-linecap="round"/>
        <circle cx="110" cy="128" r="5.5" fill="#5a4310"/>
      </svg>
      <div class="ah-checkbadge" aria-hidden="true"><svg viewBox="0 0 32 32"><path d="M8 17 l6 6 10-12" fill="none" stroke="#fff" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
    </div>`;
  }

  function successShield() {
    const bits = [];
    const cols = ['#2f9a5f', '#7fe0a8', '#e0b84a', '#c6ffd9', '#1b8a50', '#f2d36b'];
    for (let i = 0; i < 26; i++) {
      const x = 6 + (i * 19) % 88;
      const y = 2 + (i * 11) % 72;
      const r = 3 + (i % 6);
      bits.push(`<i class="ah-bit b${i % 6}" style="left:${x}%;top:${y}%;width:${r}px;height:${r + (i % 4) + 4}px;background:${cols[i % cols.length]};animation-delay:${(i % 8) * 0.16}s"></i>`);
    }
    return `<div class="ah-comp ah-comp-ok" data-tilt>
      <div class="ah-confetti">${bits.join('')}</div>
      <div class="ah-ped big"><i class="t"></i><i class="s"></i><i class="b"></i></div>
      <svg class="ah-okshield" viewBox="0 0 200 220" aria-hidden="true">
        <defs>
          <linearGradient id="okG" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#c6ffd8"/><stop offset="32%" stop-color="#4ecf86"/>
            <stop offset="68%" stop-color="#1e8a52"/><stop offset="100%" stop-color="#0b4a2e"/>
          </linearGradient>
          <linearGradient id="okHi" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#fff" stop-opacity=".62"/><stop offset="42%" stop-color="#fff" stop-opacity="0"/>
          </linearGradient>
          <filter id="okSh"><feDropShadow dx="0" dy="16" stdDeviation="12" flood-color="#0b3a28" flood-opacity=".3"/></filter>
        </defs>
        <path d="M100 12 L178 40 L170 118 C164 168 100 198 100 198 C100 198 36 168 30 118 L22 40 Z" fill="url(#okG)" filter="url(#okSh)"/>
        <path d="M100 12 L178 40 L166 48 L100 24 Z" fill="url(#okHi)"/>
        <path d="M68 108 l22 22 44-48" fill="none" stroke="#f4fff8" stroke-width="14" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </div>`;
  }

  function cap() {
    return `<div class="ah-cap" aria-hidden="true">
      <div class="ah-cap-board"></div>
      <div class="ah-cap-edge"></div>
      <div class="ah-cap-head"></div>
      <div class="ah-cap-str"></div>
      <div class="ah-cap-tassel"></div>
    </div>`;
  }

  window.AHAuth3D = {
    welcomeScene() {
      return `<div class="ah-scene ah-scene-welcome" data-tilt>
        <div class="ah-orb o1"></div><div class="ah-orb o2"></div><div class="ah-orb o3"></div>
        <div class="ah-orb o4"></div><div class="ah-orb o5"></div><div class="ah-orb o6"></div>
        <div class="ah-orb o7"></div>
        ${cap()}
        ${emblem()}
        ${openBook()}
      </div>`;
    },
    loginHero() { return backpack({}); },
    signupHero() { return backpack({ person: true }); },
    otpHero() { return otpShield(); },
    successHero() { return successShield(); },
    ico: {
      back: '<svg viewBox="0 0 24 24" width="22" height="22"><path d="M15 5 L8 12 L15 19" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
      eye: '<svg viewBox="0 0 24 24" width="20" height="20"><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>',
      g: '<svg class="ah-g" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.6 12.23c0-.74-.06-1.45-.18-2.13H12v4.04h5.95a5.09 5.09 0 0 1-2.2 3.34v2.77h3.56c2.08-1.92 3.29-4.75 3.29-8.02z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.77c-.99.66-2.26 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.85A10.99 10.99 0 0 0 12 23z"/><path fill="#FBBC05" d="M5.84 14.1A6.61 6.61 0 0 1 5.5 12c0-.73.13-1.43.34-2.1V7.05H2.18A11 11 0 0 0 1 12c0 1.78.43 3.45 1.18 4.95l3.66-2.85z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.07.56 4.21 1.64l3.16-3.16C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.05l3.66 2.85C6.71 7.31 9.14 5.38 12 5.38z"/></svg>'
    }
  };
})();
