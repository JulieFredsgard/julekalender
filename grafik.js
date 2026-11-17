/* =====================================================
   TEGNINGER TIL REGNEOPGAVERNE – behøver ikke rettes.
   I indhold.js vælger du en tegning med f.eks.  grafik: "kane"
   ===================================================== */

// Pilespids, som alle tegninger bruger
const PIL = '<defs><marker id="pil" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#b3202a"/></marker></defs>';
const T = 'font-family="system-ui, sans-serif" font-size="12" fill="#2b2118"';
const TF = 'font-family="system-ui, sans-serif" font-size="13" font-weight="700" fill="#b3202a"';
const P = 'stroke="#b3202a" stroke-width="2.5" marker-end="url(#pil)"';

const GRAFIK = {
  // Kane på sne med trækkraft, gnidning og tyngde
  kane: `<svg viewBox="0 0 300 160" role="img" aria-label="Kane med kræfter">${PIL}
    <rect x="0" y="118" width="300" height="42" fill="#eef3f6"/>
    <line x1="0" y1="118" x2="300" y2="118" stroke="#9bb0bd" stroke-width="2"/>
    <path d="M78 116 H196 Q210 116 212 102" fill="none" stroke="#6d4c2f" stroke-width="4" stroke-linecap="round"/>
    <rect x="88" y="78" width="104" height="30" rx="5" fill="#b3202a"/>
    <line x1="100" y1="108" x2="100" y2="116" stroke="#6d4c2f" stroke-width="3"/>
    <line x1="180" y1="108" x2="180" y2="116" stroke="#6d4c2f" stroke-width="3"/>
    <rect x="98" y="54" width="26" height="24" fill="#2e7d32"/><rect x="108" y="54" width="5" height="24" fill="#e8c46a"/>
    <rect x="130" y="44" width="32" height="34" fill="#e8c46a"/><rect x="143" y="44" width="6" height="34" fill="#b3202a"/>
    <text x="140" y="98" text-anchor="middle" font-family="system-ui, sans-serif" font-size="13" font-weight="700" fill="#fff">400 kg</text>
    <line x1="214" y1="92" x2="284" y2="92" ${P}/><text x="248" y="83" text-anchor="middle" ${TF}>F = ?</text>
    <line x1="120" y1="132" x2="64" y2="132" ${P}/><text x="92" y="150" text-anchor="middle" ${T}>gnidning, μ = 0,04</text>
    <line x1="232" y1="104" x2="232" y2="148" ${P}/><text x="240" y="140" ${T}>m · g</text>
  </svg>`,

  // Gearkasse i to trin
  gear: `<svg viewBox="0 0 300 160" role="img" aria-label="Gearkasse med fire tandhjul">${PIL}
    <rect x="6" y="62" width="36" height="28" rx="4" fill="#6d7378"/><text x="24" y="80" text-anchor="middle" font-family="system-ui, sans-serif" font-size="10" fill="#fff">Motor</text>
    <text x="4" y="104" ${T}>1440 o/min</text>
    <line x1="42" y1="76" x2="62" y2="76" stroke="#6d7378" stroke-width="4"/>
    <circle cx="62" cy="76" r="14" fill="#e8c46a" stroke="#9a7a10" stroke-width="5" stroke-dasharray="4 3"/>
    <text x="62" y="80" text-anchor="middle" ${T} font-weight="700">18</text>
    <circle cx="119" cy="76" r="43" fill="#f3e3b5" stroke="#9a7a10" stroke-width="5" stroke-dasharray="4 3"/>
    <text x="119" y="26" text-anchor="middle" ${T} font-weight="700">54</text>
    <circle cx="119" cy="76" r="10" fill="#b3202a" stroke="#7a1520" stroke-width="5" stroke-dasharray="3 3"/>
    <text x="119" y="80" text-anchor="middle" font-family="system-ui, sans-serif" font-size="10" font-weight="700" fill="#fff">12</text>
    <circle cx="167" cy="76" r="38" fill="#f1d9d9" stroke="#7a1520" stroke-width="5" stroke-dasharray="4 3"/>
    <text x="167" y="80" text-anchor="middle" ${T} font-weight="700">48</text>
    <line x1="207" y1="76" x2="232" y2="76" stroke="#6d7378" stroke-width="4"/>
    <text x="262" y="72" text-anchor="middle" ${TF}>? o/min</text>
    <text x="150" y="150" text-anchor="middle" ${T}>Tallene er antal tænder. 54 og 12 sidder på samme aksel.</text>
  </svg>`,

  // Momentnøgle på en møtrik
  moment: `<svg viewBox="0 0 300 160" role="img" aria-label="Momentnøgle">${PIL}
    <polygon points="60,58 75,67 75,85 60,94 45,85 45,67" fill="#8c8478" stroke="#5a544b" stroke-width="2"/>
    <circle cx="60" cy="76" r="6" fill="#5a544b"/>
    <rect x="72" y="69" width="186" height="14" rx="7" fill="#6d7378"/>
    <rect x="226" y="66" width="40" height="20" rx="8" fill="#2b2118"/>
    <path d="M38 50 A32 32 0 0 1 86 48" fill="none" ${P}/><text x="60" y="34" text-anchor="middle" ${TF}>110 Nm</text>
    <line x1="246" y1="20" x2="246" y2="62" ${P}/><text x="256" y="36" ${TF}>F = ?</text>
    <line x1="60" y1="112" x2="246" y2="112" stroke="#2b2118" stroke-width="1.5"/>
    <line x1="60" y1="104" x2="60" y2="120" stroke="#2b2118" stroke-width="1.5"/>
    <line x1="246" y1="104" x2="246" y2="120" stroke="#2b2118" stroke-width="1.5"/>
    <text x="153" y="132" text-anchor="middle" ${T}>0,35 m</text>
  </svg>`,

  // Discens kastebane
  disc: `<svg viewBox="0 0 300 160" role="img" aria-label="Discens kastebane">${PIL}
    <line x1="0" y1="122" x2="300" y2="122" stroke="#7aa36a" stroke-width="3"/>
    <path d="M24 120 Q150 70 276 120" fill="none" stroke="#e8590c" stroke-width="2" stroke-dasharray="5 4"/>
    <ellipse cx="24" cy="118" rx="9" ry="4" fill="#e8590c"/>
    <line x1="24" y1="118" x2="92" y2="94" ${P}/><text x="70" y="84" ${TF}>25 m/s</text>
    <line x1="24" y1="118" x2="74" y2="118" stroke="#2b2118" stroke-width="1"/>
    <path d="M58 118 A34 34 0 0 0 56 107" fill="none" stroke="#2b2118" stroke-width="1.5"/><text x="62" y="114" ${T}>10°</text>
    <g transform="translate(270 90)"><rect x="-2" y="0" width="4" height="32" fill="#6d7378"/><rect x="-12" y="0" width="24" height="5" fill="#e2b31b"/><rect x="-12" y="16" width="24" height="7" rx="3" fill="#e2b31b"/></g>
    <line x1="24" y1="140" x2="276" y2="140" stroke="#2b2118" stroke-width="1.5" marker-start="url(#pil)" marker-end="url(#pil)"/>
    <text x="150" y="156" text-anchor="middle" ${TF}>R = ?</text>
  </svg>`,

  // Julemanden i skorstenen
  skorsten: `<svg viewBox="0 0 300 170" role="img" aria-label="Julemanden i skorstenen">${PIL}
    <polygon points="40,70 150,14 260,70" fill="#8a1620"/>
    <rect x="56" y="70" width="188" height="90" fill="#fbe9c8" stroke="#b39b72"/>
    <rect x="178" y="10" width="40" height="150" fill="#b5563b" stroke="#7d3524" stroke-width="2"/>
    <rect x="172" y="4" width="52" height="10" fill="#7d3524"/>
    <circle cx="198" cy="26" r="10" fill="#b3202a"/><circle cx="198" cy="18" r="5" fill="#fff"/>
    <line x1="198" y1="42" x2="198" y2="132" ${P}/><text x="226" y="120" ${TF}>v = ?</text>
    <rect x="168" y="134" width="60" height="26" fill="#2b2118"/><path d="M186 160 q6 -16 12 -4 q6 -14 12 4z" fill="#e8590c"/>
    <line x1="160" y1="20" x2="160" y2="140" stroke="#2b2118" stroke-width="1.5" marker-start="url(#pil)" marker-end="url(#pil)"/>
    <text x="150" y="84" text-anchor="end" ${TF}>6 m</text>
    <text x="80" y="110" ${T}>110 kg</text>
  </svg>`,

  // Filamentrulle og julestjerner
  filament: `<svg viewBox="0 0 300 160" role="img" aria-label="Filamentrulle og julestjerner">
    <circle cx="70" cy="78" r="58" fill="#2e7d32"/><circle cx="70" cy="78" r="44" fill="#4caf50" stroke="#2e7d32" stroke-width="2" stroke-dasharray="2 2"/>
    <circle cx="70" cy="78" r="16" fill="#fbf3e4" stroke="#2b2118"/>
    <text x="70" y="146" text-anchor="middle" ${T} font-weight="700">1 kg PLA</text>
    <path d="M120 64 C150 50 160 90 186 76" fill="none" stroke="#4caf50" stroke-width="3"/>
    <g fill="#e8c46a" stroke="#9a7a10" stroke-width="1.5">
      <polygon transform="translate(214 70)" points="0,-22 6,-7 22,-7 9,3 14,19 0,9 -14,19 -9,3 -22,-7 -6,-7"/>
      <polygon transform="translate(262 70) scale(.8)" points="0,-22 6,-7 22,-7 9,3 14,19 0,9 -14,19 -9,3 -22,-7 -6,-7"/>
      <polygon transform="translate(238 110) scale(.65)" points="0,-22 6,-7 22,-7 9,3 14,19 0,9 -14,19 -9,3 -22,-7 -6,-7"/>
    </g>
    <text x="238" y="140" text-anchor="middle" ${T}>38 g pr. stjerne</text>
    <text x="238" y="155" text-anchor="middle" ${T}>+ 5 g spild pr. print</text>
    <text x="238" y="30" text-anchor="middle" ${TF}>Hvor mange?</text>
  </svg>`,

  // 3D-printet juletræ med lag
  printtid: `<svg viewBox="0 0 300 170" role="img" aria-label="3D-printet juletræ">${PIL}
    <rect x="70" y="6" width="160" height="10" fill="#6d7378"/>
    <rect x="138" y="16" width="24" height="16" fill="#9aa0a5"/><polygon points="144,32 156,32 150,40" fill="#9aa0a5"/>
    <g fill="#2e7d32">${Array.from({ length: 12 }, (_, i) => {
      const y = 148 - i * 9, w = 100 - i * 7.5;
      return `<rect x="${150 - w / 2}" y="${y}" width="${w}" height="8" rx="1"/>`;
    }).join("")}</g>
    <rect x="80" y="156" width="140" height="6" fill="#6d7378"/>
    <line x1="60" y1="48" x2="60" y2="156" stroke="#2b2118" stroke-width="1.5" marker-start="url(#pil)" marker-end="url(#pil)"/>
    <text x="52" y="106" text-anchor="end" ${TF}>72 mm</text>
    <line x1="190" y1="140" x2="204" y2="126" stroke="#2b2118" stroke-width="1"/>
    <text x="206" y="112" ${T}>1 lag = 0,2 mm</text>
    <text x="206" y="127" ${T}>18 s pr. lag</text>
  </svg>`
};
