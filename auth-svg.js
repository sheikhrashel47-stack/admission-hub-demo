/* Phase 3 auth 3D scenes — CSS/SVG/procedural only. No raster assets. */
(() => {
  'use strict';
  const leafG = (id) => `
    <linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#c8ffd8"/><stop offset="45%" stop-color="#4ad68a"/>
      <stop offset="100%" stop-color="#0e6b42"/>
    </linearGradient>`;

  function wreath(cx, cy, r, n, gap, gid) {
    let s = '';
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      const ang = -130 + t * 260;
      if (Math.abs(ang) < gap) continue;
      const rad = (ang * Math.PI) / 180;
      const x = cx + Math.cos(rad - Math.PI / 2) * r;
      const y = cy + Math.sin(rad - Math.PI / 2) * r;
      const flip = i % 2 ? 1 : -1;
      s += `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${ang.toFixed(1)})">
        <ellipse cx="0" cy="${-10 * flip}" rx="5.2" ry="12" fill="url(#${gid})" opacity=".95"/>
        <ellipse cx="${1.6 * flip}" cy="${-9 * flip}" rx="2.1" ry="8" fill="#eafff2" opacity=".28"/>
      </g>`;
    }
    return s;
  }

  function backpack(opts = {}) {
    const extra = opts.person
      ? `<g transform="translate(132 78)">
           <ellipse cx="22" cy="58" rx="22" ry="7" fill="rgba(20,40,30,.1)"/>
           <rect x="8" y="18" width="28" height="36" rx="12" fill="url(#bust)"/>
           <circle cx="22" cy="10" r="12" fill="#f4f7f5"/>
           <circle cx="22" cy="9" r="9.5" fill="#e8eeea"/>
           <path d="M13 12c2-6 16-6 18 0" fill="#d7e0da"/>
         </g>`
      : '';
    return `<div class="ah-comp ah-comp-bag" data-tilt>
      <div class="ah-ped"><i class="t"></i><i class="s"></i><i class="b"></i></div>
      <div class="ah-globe" aria-hidden="true"><span></span></div>
      <div class="ah-cube c1"><i class="ft"></i><i class="bk"></i><i class="rt"></i><i class="lt"></i><i class="tp"></i><i class="bt"></i></div>
      <div class="ah-cube c2"><i class="ft"></i><i class="bk"></i><i class="rt"></i><i class="lt"></i><i class="tp"></i><i class="bt"></i></div>
      <svg class="ah-bag" viewBox="0 0 200 240" aria-hidden="true">
        <defs>
          <linearGradient id="bagB" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#6fd59a"/><stop offset="38%" stop-color="#2f9a5f"/>
            <stop offset="78%" stop-color="#157046"/><stop offset="100%" stop-color="#0b4a2e"/>
          </linearGradient>
          <linearGradient id="bagH" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#fff" stop-opacity=".5"/><stop offset="45%" stop-color="#fff" stop-opacity="0"/>
          </linearGradient>
          <linearGradient id="bust" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#fff"/><stop offset="100%" stop-color="#d5ddd8"/>
          </linearGradient>
        </defs>
        <ellipse cx="96" cy="222" rx="62" ry="9" fill="rgba(20,40,30,.12)"/>
        <path d="M72 58c0-22 52-22 52 0" stroke="#1a5c3c" stroke-width="9" fill="none" stroke-linecap="round"/>
        <rect x="42" y="56" width="110" height="142" rx="30" fill="url(#bagB)"/>
        <path d="M54 70c18-10 50-12 84 4v40c-28-16-62-14-84 2z" fill="url(#bagH)"/>
        <circle cx="97" cy="122" r="26" fill="#eef7f1"/>
        <circle cx="97" cy="122" r="22" fill="#1f7a4d"/>
        <path d="M86 128v-10c0-6 22-6 22 0v10" fill="#eef7f1"/>
        <path d="M86 118h22" stroke="#cfe8d8" stroke-width="1.4"/>
        <rect x="48" y="168" width="98" height="18" rx="8" fill="#0e5a38" opacity=".35"/>
        ${extra}
      </svg>
    </div>`;
  }

  function emblem() {
    return `<svg class="ah-emblem" viewBox="0 0 200 200" aria-hidden="true">
      <defs>
        ${leafG('wL')}
        <filter id="wGlow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="4" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <linearGradient id="bookPg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#f4fff8"/><stop offset="100%" stop-color="#cfe8d6"/>
        </linearGradient>
      </defs>
      <circle cx="100" cy="108" r="78" fill="none" stroke="rgba(120,255,180,.18)" stroke-width="2" filter="url(#wGlow)"/>
      ${wreath(100, 112, 64, 26, 16, 'wL')}
      <path d="M88 42 l12-16 12 16 h-8 v10 h-8 v-10z" fill="#e8f8ee" opacity=".95"/>
      <path d="M100 58 l-22 8 v28 c0 16 22 24 22 24s22-8 22-24 v-28z" fill="url(#bookPg)" stroke="#b7e0c6" stroke-width="1"/>
      <path d="M100 66 v46" stroke="#7cbc94" stroke-width="1.6"/>
      <path d="M86 78h10M86 88h10M86 98h8M104 78h10M104 88h10M104 98h8" stroke="#2f7a52" stroke-width="1.3" opacity=".55"/>
    </svg>`;
  }

  function openBook() {
    return `<svg class="ah-openbook" viewBox="0 0 140 80" aria-hidden="true">
      <defs>
        <linearGradient id="pgL" x1="1" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#f6fff9"/><stop offset="100%" stop-color="#c5ddce"/>
        </linearGradient>
        <linearGradient id="pgR" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#fff"/><stop offset="100%" stop-color="#d5e8dc"/>
        </linearGradient>
      </defs>
      <ellipse cx="70" cy="72" rx="48" ry="6" fill="rgba(0,0,0,.28)"/>
      <path d="M70 16 C28 20 16 28 12 62 c22-10 42-8 58-2z" fill="url(#pgL)"/>
      <path d="M70 16 C112 20 124 28 128 62 c-22-10-42-8-58-2z" fill="url(#pgR)"/>
      <path d="M70 16 v48" stroke="#8aa896" stroke-width="2"/>
      <path d="M28 36h28M26 46h30M30 54h24M84 36h28M84 46h30M86 54h24" stroke="#6f8c7c" stroke-width="1.2" opacity=".45"/>
    </svg>`;
  }

  function hexShield() {
    return `<div class="ah-comp ah-comp-otp" data-tilt>
      <svg class="ah-hex" viewBox="0 0 220 220" aria-hidden="true">
        <defs>
          <linearGradient id="hx" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#d9ffe8"/><stop offset="28%" stop-color="#7fe0b0"/>
            <stop offset="62%" stop-color="#2f9a5f"/><stop offset="100%" stop-color="#0e5a38"/>
          </linearGradient>
          <linearGradient id="hxHi" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#fff" stop-opacity=".55"/><stop offset="50%" stop-color="#fff" stop-opacity="0"/>
          </linearGradient>
          <linearGradient id="lockM" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#f3e7b0"/><stop offset="50%" stop-color="#c9a227"/><stop offset="100%" stop-color="#8a6a18"/>
          </linearGradient>
          <filter id="hxSh"><feDropShadow dx="0" dy="12" stdDeviation="10" flood-color="#0b3a28" flood-opacity=".28"/></filter>
        </defs>
        <path d="M110 18 L186 58 V132 L110 186 L34 132 V58 Z" fill="url(#hx)" filter="url(#hxSh)"/>
        <path d="M110 28 L174 62 V124 L110 170 L46 124 V62 Z" fill="none" stroke="rgba(255,255,255,.28)" stroke-width="2"/>
        <path d="M110 18 L186 58 L174 62 L110 28 Z" fill="url(#hxHi)"/>
        <rect x="84" y="108" width="52" height="40" rx="8" fill="url(#lockM)"/>
        <path d="M94 112 v-16 c0-16 32-16 32 0 v16" fill="none" stroke="url(#lockM)" stroke-width="7" stroke-linecap="round"/>
        <circle cx="110" cy="128" r="5" fill="#5a4310"/>
        <g transform="translate(8 150)">
          <rect x="0" y="8" width="36" height="26" rx="4" fill="#1f7a4d"/>
          <rect x="14" y="0" width="22" height="28" rx="3" fill="#2f9a5f"/>
        </g>
      </svg>
      <div class="ah-checkbadge" aria-hidden="true"><svg viewBox="0 0 32 32"><path d="M8 17 l6 6 10-12" fill="none" stroke="#fff" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
    </div>`;
  }

  function successShield() {
    const bits = [];
    const cols = ['#3dcf7a', '#f2a3a0', '#f2d36b', '#7fd3f0', '#c9a0f0', '#8be0b0', '#f0b27a'];
    for (let i = 0; i < 22; i++) {
      const x = 8 + (i * 17) % 90;
      const y = 4 + (i * 13) % 70;
      const r = 4 + (i % 5);
      bits.push(`<i class="ah-bit b${i % 7}" style="left:${x}%;top:${y}%;width:${r}px;height:${r + (i % 3)}px;background:${cols[i % cols.length]};animation-delay:${(i % 8) * 0.18}s"></i>`);
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
    otpHero() { return hexShield(); },
    successHero() { return successShield(); },
    ico: {
      back: '<svg viewBox="0 0 24 24" width="22" height="22"><path d="M15 5 L8 12 L15 19" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
      eye: '<svg viewBox="0 0 24 24" width="20" height="20"><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>',
      g: '<svg class="ah-g" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.6 12.23c0-.74-.06-1.45-.18-2.13H12v4.04h5.95a5.09 5.09 0 0 1-2.2 3.34v2.77h3.56c2.08-1.92 3.29-4.75 3.29-8.02z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.77c-.99.66-2.26 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.85A10.99 10.99 0 0 0 12 23z"/><path fill="#FBBC05" d="M5.84 14.1A6.61 6.61 0 0 1 5.5 12c0-.73.13-1.43.34-2.1V7.05H2.18A11 11 0 0 0 1 12c0 1.78.43 3.45 1.18 4.95l3.66-2.85z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.07.56 4.21 1.64l3.16-3.16C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.05l3.66 2.85C6.71 7.31 9.14 5.38 12 5.38z"/></svg>'
    }
  };
})();
