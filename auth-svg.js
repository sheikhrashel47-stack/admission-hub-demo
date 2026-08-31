/* Inline SVG scenes for auth — no raster heroes. */
window.AHAuthSVG = {
  defs() {
    return `<defs>
      <linearGradient id="gGold" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#fff3c4"/><stop offset="35%" stop-color="#e4c56a"/>
        <stop offset="70%" stop-color="#c9a227"/><stop offset="100%" stop-color="#8a6a18"/>
      </linearGradient>
      <linearGradient id="gEm" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#1c8f63"/><stop offset="100%" stop-color="#07382a"/>
      </linearGradient>
      <radialGradient id="gGlow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#3ee08f" stop-opacity=".55"/><stop offset="100%" stop-color="#3ee08f" stop-opacity="0"/>
      </radialGradient>
      <filter id="soft"><feGaussianBlur stdDeviation="3"/></filter>
    </defs>`;
  },
  welcome() {
    return `<svg class="ah-svg" viewBox="0 0 360 460" aria-hidden="true">${this.defs()}
      <ellipse cx="180" cy="400" rx="120" ry="18" fill="#3ee08f" opacity=".18" filter="url(#soft)"/>
      <ellipse cx="180" cy="392" rx="108" ry="16" fill="none" stroke="#3ee08f" stroke-width="5" opacity=".95"/>
      <ellipse cx="180" cy="372" rx="92" ry="14" fill="#0b3d2e"/>
      <ellipse cx="180" cy="372" rx="92" ry="14" fill="none" stroke="#3ee08f" stroke-width="4"/>
      <ellipse cx="180" cy="354" rx="78" ry="12" fill="#124a38"/>
      <g transform="translate(180 250)">
        <rect x="-78" y="40" width="156" height="28" rx="4" fill="#efe6d0" transform="rotate(-18)"/>
        <rect x="-70" y="48" width="148" height="22" rx="3" fill="#d9cba8" transform="rotate(-18)"/>
        <rect x="-62" y="20" width="124" height="86" rx="6" fill="#f4efe0" transform="rotate(-12)"/>
        <path d="M-50 28 Q0 8 50 28 L50 96 Q0 78 -50 96 Z" fill="#f7f1e2" transform="rotate(-12)"/>
        <path d="M-48 40 L48 40" stroke="#c9b48a" stroke-width="1" transform="rotate(-12)" opacity=".5"/>
      </g>
      <g transform="translate(180 168)">
        <circle cx="0" cy="0" r="92" fill="url(#gGold)"/>
        <circle cx="0" cy="0" r="82" fill="url(#gEm)"/>
        <circle cx="0" cy="0" r="74" fill="none" stroke="url(#gGold)" stroke-width="3"/>
        <path d="M-58 10 C-48 -40 -20 -58 0 -40 C20 -58 48 -40 58 10" fill="none" stroke="url(#gGold)" stroke-width="6" stroke-linecap="round"/>
        <path d="M-58 10 C-40 48 -18 58 0 42 C18 58 40 48 58 10" fill="none" stroke="url(#gGold)" stroke-width="6" stroke-linecap="round"/>
        <g transform="translate(0 -6)">
          <path d="M-28 4 Q0 -18 28 4 L28 22 Q0 8 -28 22 Z" fill="#f7f1e2"/>
          <path d="M0 4 L0 20" stroke="#c9a227" stroke-width="1.5"/>
        </g>
        <polygon points="0,28 -8,42 0,38 8,42" fill="url(#gGold)"/>
      </g>
      <g transform="translate(198 78) rotate(-18)">
        <rect x="-46" y="-6" width="92" height="10" fill="#1a1a1a"/>
        <polygon points="-52,-6 0,-28 52,-6" fill="#111"/>
        <rect x="28" y="-4" width="3" height="52" fill="url(#gGold)"/>
        <circle cx="30" cy="52" r="6" fill="url(#gGold)"/>
      </g>
    </svg>`;
  },
  crest() {
    return `<svg class="ah-svg sm" viewBox="0 0 80 80" aria-hidden="true">${this.defs()}
      <circle cx="40" cy="40" r="36" fill="url(#gGold)"/><circle cx="40" cy="40" r="30" fill="url(#gEm)"/>
      <path d="M22 42 Q40 22 58 42" fill="none" stroke="url(#gGold)" stroke-width="3"/>
      <path d="M26 38 Q40 28 54 38 L54 48 Q40 40 26 48 Z" fill="#f7f1e2"/>
    </svg>`;
  },
  book() {
    return `<svg class="ah-svg" viewBox="0 0 320 240" aria-hidden="true">${this.defs()}
      <ellipse cx="160" cy="210" rx="90" ry="14" fill="none" stroke="#3ee08f" stroke-width="4"/>
      <ellipse cx="160" cy="196" rx="74" ry="12" fill="#0b3d2e" stroke="#3ee08f" stroke-width="3"/>
      <g transform="translate(160 120)">
        <path d="M-70 20 L-8 -10 L-8 70 L-70 92 Z" fill="#0f6b4f"/>
        <path d="M8 -10 L70 20 L70 92 L8 70 Z" fill="#14835c"/>
        <path d="M-8 -10 L8 -10 L8 70 L-8 70 Z" fill="#c9a227"/>
        <path d="M40 -8 Q70 -50 86 -8" fill="none" stroke="url(#gGold)" stroke-width="7" stroke-linecap="round"/>
        <path d="M86 -8 L96 10" stroke="url(#gGold)" stroke-width="5" stroke-linecap="round"/>
      </g>
    </svg>`;
  },
  shield() {
    return `<svg class="ah-svg" viewBox="0 0 280 260" aria-hidden="true">${this.defs()}
      <ellipse cx="140" cy="230" rx="86" ry="14" fill="none" stroke="#3ee08f" stroke-width="4"/>
      <path d="M140 18 L232 52 L232 128 C232 186 180 228 140 246 C100 228 48 186 48 128 L48 52 Z" fill="url(#gEm)" stroke="url(#gGold)" stroke-width="4"/>
      <rect x="118" y="108" width="44" height="52" rx="8" fill="url(#gGold)"/>
      <path d="M126 108 V92 a14 14 0 0 1 28 0 v16" fill="none" stroke="url(#gGold)" stroke-width="6"/>
      <circle cx="196" cy="168" r="22" fill="#12a05f" stroke="#fff" stroke-width="3"/>
      <path d="M186 168 l8 8 16 -16" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round"/>
    </svg>`;
  },
  medal() {
    return `<svg class="ah-svg" viewBox="0 0 280 280" aria-hidden="true">${this.defs()}
      <ellipse cx="140" cy="248" rx="80" ry="12" fill="none" stroke="#3ee08f" stroke-width="4"/>
      <circle cx="140" cy="128" r="78" fill="url(#gGold)"/>
      <circle cx="140" cy="128" r="64" fill="url(#gEm)"/>
      <path d="M112 132 l16 16 28 -32" fill="none" stroke="url(#gGold)" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M62 150 C40 200 90 230 140 200" fill="none" stroke="url(#gGold)" stroke-width="6"/>
      <path d="M218 150 C240 200 190 230 140 200" fill="none" stroke="url(#gGold)" stroke-width="6"/>
    </svg>`;
  }
};
