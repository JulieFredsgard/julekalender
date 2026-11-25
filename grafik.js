/* =====================================================
   TEGNINGER TIL REGNEOPGAVERNE – behøver ikke rettes.
   I indhold.js vælger du en tegning med f.eks.  grafik: "disc"
   ===================================================== */

const PIL = '<defs><marker id="pil" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#866617"/></marker></defs>';
const T = 'font-family="Barlow, system-ui, sans-serif" font-size="12" fill="#1b2a24"';
const TF = 'font-family="Barlow, system-ui, sans-serif" font-size="13" font-weight="700" fill="#866617"';
const P = 'stroke="#866617" stroke-width="2.5" marker-end="url(#pil)"';
// En lille disc golf-kurv, som flere tegninger bruger
const KURV = (x, y, s) => `<g transform="translate(${x} ${y}) scale(${s})"><path d="M0 0V40" stroke="#58655e" stroke-width="2.4"/><path d="M-13 5Q-11 16 -1 21H0V5Z" fill="#e2e6e2"/><path d="M13 5Q11 16 1 21H0V5Z" fill="#cfd6d1"/><path d="M-13 5Q-11 16 -1 21M-6 5Q-5 15 -.5 21M6 5Q5 15 .5 21M13 5Q11 16 1 21" fill="none" stroke="#8b9790" stroke-width=".8"/><path d="M-14 21L-11.500 30H0V21Z" fill="#d3dad4"/><path d="M14 21L11.500 30H0V21Z" fill="#b9c3bc"/><path d="M-14 21L-11.500 30H11.500L14 21Z M-8 21L-6.500 30M8 21L6.500 30" fill="none" stroke="#58655e" stroke-width="1.200"/><rect x="-13" y="0" width="26" height="6" fill="#c9a24b"/><rect x="0" y="0" width="13" height="6" fill="#b08a38"/></g>`;

const GRAFIK = {
  // Discens kastebane
  disc: `<svg viewBox="0 0 300 160" role="img" aria-label="Discens kastebane">${PIL}
    <line x1="0" y1="122" x2="300" y2="122" stroke="#2b6049" stroke-width="3"/>
    <path d="M24 120 Q150 70 276 120" fill="none" stroke="#16352a" stroke-width="2" stroke-dasharray="5 4"/>
    <ellipse cx="24" cy="118" rx="9" ry="4" fill="#c9a24b" stroke="#866617" stroke-width="1.5"/>
    <line x1="24" y1="118" x2="92" y2="94" ${P}/><text x="70" y="84" ${TF}>25 m/s</text>
    <line x1="24" y1="118" x2="100" y2="118" stroke="#1b2a24" stroke-width="1"/>
    <path d="M58 118 A34 34 0 0 0 56 107" fill="none" stroke="#1b2a24" stroke-width="1.5"/><text x="78" y="116" ${T}>10°</text>
    ${KURV(270, 82, 1)}
    <line x1="24" y1="140" x2="276" y2="140" stroke="#1b2a24" stroke-width="1.5" marker-start="url(#pil)" marker-end="url(#pil)"/>
    <text x="150" y="156" text-anchor="middle" ${TF}>R = ?</text>
  </svg>`,

  // Scorekort med par for 9 huller
  scorekort: `<svg viewBox="0 0 300 124" role="img" aria-label="Scorekort">
    <rect x="10" y="14" width="280" height="96" fill="#fff" stroke="#d8cdb8" stroke-width="2"/>
    <text x="20" y="38" ${T} font-weight="700">Hul</text><text x="20" y="64" ${T} font-weight="700">Par</text><text x="20" y="90" ${T} font-weight="700">Dig</text>
    ${Array.from({ length: 9 }, (_, i) => {
      const x = 62 + i * 25, par = i < 6 ? 3 : 4;
      return `<text x="${x}" y="38" text-anchor="middle" ${T}>${i + 1}</text><text x="${x}" y="64" text-anchor="middle" ${T}>${par}</text><text x="${x}" y="90" text-anchor="middle" ${TF}>?</text>`;
    }).join("")}
    <line x1="14" y1="46" x2="286" y2="46" stroke="#e3d9c6"/><line x1="14" y1="72" x2="286" y2="72" stroke="#e3d9c6"/>
  </svg>`,

  // Disc set ovenfra med rotation
  spin: `<svg viewBox="0 0 300 174" role="img" aria-label="Roterende disc">${PIL}
    <circle cx="120" cy="80" r="62" fill="#c9a24b" stroke="#866617" stroke-width="3"/>
    <circle cx="120" cy="80" r="46" fill="none" stroke="#f0dfae" stroke-width="2"/>
    <circle cx="120" cy="80" r="3" fill="#866617"/>
    <path d="M178 46 A70 70 0 0 1 178 114" fill="none" ${P}/>
    <text x="196" y="84" ${TF}>15 omdr./s</text>
    <line x1="58" y1="150" x2="182" y2="150" stroke="#1b2a24" stroke-width="1.5" marker-start="url(#pil)" marker-end="url(#pil)"/>
    <text x="120" y="168" text-anchor="middle" ${T}>21 cm</text>
    <text x="196" y="104" ${T}>kantens fart = ?</text>
  </svg>`,

  // Putteren stopper i kæderne
  kaeder: `<svg viewBox="0 0 300 160" role="img" aria-label="Putt i kæderne">${PIL}
    ${KURV(200, 20, 3)}
    <ellipse cx="70" cy="70" rx="16" ry="6" fill="#c9a24b" stroke="#866617" stroke-width="1.5"/>
    <line x1="92" y1="70" x2="150" y2="70" ${P}/>
    <text x="120" y="60" text-anchor="middle" ${TF}>8 m/s</text>
    <text x="70" y="95" text-anchor="middle" ${T}>175 g</text>
    <text x="70" y="140" text-anchor="middle" ${T}>stopper på 0,05 s</text>
  </svg>`,

  // Filament på spole
  filament: `<svg viewBox="0 0 300 160" role="img" aria-label="Filamentspole">
    <path d="M92 18H205Q240 18 240 50V58" fill="none" stroke="#c9a24b" stroke-width="4"/>
    <circle cx="92" cy="80" r="66" fill="#16352a"/>
    <circle cx="92" cy="80" r="60" fill="#c9a24b"/>
    ${[54, 48, 42, 36].map(r => `<circle cx="92" cy="80" r="${r}" fill="none" stroke="#866617" stroke-width="1"/>`).join("")}
    <circle cx="92" cy="80" r="30" fill="#16352a"/><circle cx="92" cy="80" r="11" fill="#f7f4ec"/>
    <path d="M228 58H252V74L244 86H236L228 74Z" fill="#58655e"/><path d="M240 58H252V74L244 86H240Z" fill="#3f4a44"/>
    <text x="180" y="112" ${TF}>1 kg · Ø 1,75 mm</text>
    <text x="180" y="130" ${T}>1,24 g pr. cm³</text>
    <text x="180" y="148" ${T}>længde = ?</text>
  </svg>`,

  // Aktiekurs op og ned
  aktier: `<svg viewBox="0 0 300 160" role="img" aria-label="Aktiekurs">
    <path d="M34 14V132H286" fill="none" stroke="#1b2a24" stroke-width="1.5"/>
    ${[44, 74, 104].map(y => `<line x1="34" y1="${y}" x2="286" y2="${y}" stroke="#e3d9c6"/>`).join("")}
    <path d="M50 104L74 97L94 101L118 78L136 82L164 40L186 52L204 47L226 80L244 76L264 96" fill="none" stroke="#16352a" stroke-width="2.5" stroke-linejoin="round"/>
    <circle cx="50" cy="104" r="4.5" fill="#c9a24b" stroke="#866617" stroke-width="1.5"/><circle cx="164" cy="40" r="4.5" fill="#c9a24b" stroke="#866617" stroke-width="1.5"/><circle cx="264" cy="96" r="4.5" fill="#c9a24b" stroke="#866617" stroke-width="1.5"/>
    <text x="40" y="124" ${T}>125 kr.</text>
    <text x="96" y="62" text-anchor="middle" ${TF}>+12 %</text><text x="240" y="52" text-anchor="middle" ${TF}>−10 %</text>
    <text x="264" y="118" text-anchor="middle" ${TF}>?</text>
    <text x="160" y="151" text-anchor="middle" ${T}>40 aktier</text>
  </svg>`,

  // Lyd fra en højttaler
  lyd: `<svg viewBox="0 0 300 160" role="img" aria-label="Højttaler og afstand">${PIL}
    <rect x="12" y="14" width="46" height="106" fill="#16352a"/><rect x="35" y="14" width="23" height="106" fill="#1f4636"/>
    <circle cx="35" cy="38" r="10" fill="#58655e"/><circle cx="35" cy="38" r="4" fill="#c9a24b"/>
    <circle cx="35" cy="84" r="20" fill="#58655e"/><circle cx="35" cy="84" r="14" fill="#3f4a44"/><circle cx="35" cy="84" r="5" fill="#c9a24b"/>
    ${[26, 46, 66, 86].map((r, i) => `<path d="M${58 + r * 0.5} ${67 - r * 0.6}A${r} ${r} 0 0 1 ${58 + r * 0.5} ${67 + r * 0.6}" fill="none" stroke="#866617" stroke-width="2" opacity="${1 - i * 0.2}"/>`).join("")}
    <line x1="112" y1="26" x2="112" y2="120" stroke="#1b2a24" stroke-width="1" stroke-dasharray="4 4"/><line x1="274" y1="26" x2="274" y2="120" stroke="#1b2a24" stroke-width="1" stroke-dasharray="4 4"/>
    <text x="118" y="22" ${TF}>88 dB</text><text x="274" y="20" text-anchor="middle" ${TF}>? dB</text>
    <line x1="58" y1="130" x2="112" y2="130" stroke="#1b2a24" stroke-width="1.5" marker-start="url(#pil)" marker-end="url(#pil)"/><text x="85" y="126" text-anchor="middle" ${T}>1 m</text>
    <line x1="58" y1="148" x2="274" y2="148" stroke="#1b2a24" stroke-width="1.5" marker-start="url(#pil)" marker-end="url(#pil)"/><text x="190" y="144" text-anchor="middle" ${T}>4 m</text>
  </svg>`,

  // Batteri, der driver en boremaskine
  batteri: `<svg viewBox="0 0 300 160" role="img" aria-label="Batteri og maskine">${PIL}
    <path d="M22 60H104V118H22Z" fill="#16352a"/><path d="M63 60H104V118H63Z" fill="#1f4636"/>
    <path d="M32 46H94V60H32Z" fill="#58655e"/><path d="M42 40H50V46H42ZM76 40H84V46H76Z" fill="#c9a24b"/>
    ${[0, 1, 2, 3].map(i => `<rect x="${36 + i * 14}" y="100" width="9" height="6" fill="#c9a24b"/>`).join("")}
    <text x="63" y="86" text-anchor="middle" font-family="Barlow, system-ui, sans-serif" font-size="15" font-weight="700" fill="#f4f1e8">18 V · 5 Ah</text>
    <line x1="116" y1="88" x2="158" y2="88" ${P}/>
    <path d="M176 44H246V72H176Z" fill="#16352a"/><path d="M176 58H246V72H176Z" fill="#1f4636"/>
    <path d="M246 48H260L268 54V62L260 68H246Z" fill="#58655e"/><path d="M268 56.500H292V59.500H268Z" fill="#8b9790"/>
    <path d="M184 72H208L202 106H178Z" fill="#16352a"/><path d="M196 72H208L202 106H190Z" fill="#1f4636"/><path d="M170 106H212V122H170Z" fill="#58655e"/><path d="M208 76H216V86H207Z" fill="#c9a24b"/>
    <text x="254" y="100" text-anchor="middle" ${TF}>360 W</text>
    <text x="150" y="148" text-anchor="middle" ${T}>holder i ? minutter</text>
  </svg>`,

  // Årsdag: to kalenderblade
  aarsdag: `<svg viewBox="0 0 300 130" role="img" aria-label="Fra 18. december 2017 til i dag">${PIL}
    ${[[14, "2017"], [212, "I DAG"]].map(([x, t]) => `<rect x="${x}" y="18" width="74" height="84" fill="#fff" stroke="#d8cdb8" stroke-width="1.5"/><rect x="${x}" y="18" width="74" height="22" fill="#16352a"/>
      <text x="${x + 37}" y="34" text-anchor="middle" font-family="Barlow, system-ui, sans-serif" font-size="12" font-weight="700" fill="#f4f1e8">${t}</text>
      <text x="${x + 37}" y="76" text-anchor="middle" font-family="Barlow Condensed, Barlow, sans-serif" font-size="34" font-weight="700" fill="#1b2a24">18</text>
      <text x="${x + 37}" y="93" text-anchor="middle" ${T}>december</text>`).join("")}
    <line x1="98" y1="66" x2="202" y2="66" ${P}/>
    <path d="M150 55l-12-12.500a7.600 7.600 0 0 1 12-9a7.600 7.600 0 0 1 12 9z" fill="#c9a24b" stroke="#866617" stroke-width="1.5"/>
    <text x="150" y="88" text-anchor="middle" ${TF}>? dage</text>
  </svg>`,

  // Risengrød før julemaden
  groed: `<svg viewBox="0 0 300 150" role="img" aria-label="Tre portioner risengrød og en mave på 1,5 liter">${PIL}
    ${[0, 1, 2].map(i => `<g transform="translate(${12 + i * 52} 44)"><ellipse cx="22" cy="10" rx="22" ry="7" fill="#f7f4ec" stroke="#58655e" stroke-width="1.2"/><path d="M0 10Q2 36 14 38H30Q42 36 44 10A22 7 0 0 1 0 10Z" fill="#16352a"/><path d="M22 17A22 7 0 0 0 44 10Q42 36 30 38H22Z" fill="#1f4636"/><ellipse cx="22" cy="10" rx="17" ry="4.600" fill="#fff"/><path d="M17 7.500L25 6.500L27 10L19 11.500Z" fill="#c9a24b"/><circle cx="12" cy="10" r="1" fill="#866617"/><circle cx="31" cy="11" r="1" fill="#866617"/><circle cx="33" cy="8.500" r="1" fill="#866617"/><text x="22" y="56" text-anchor="middle" ${T}>3 dl</text></g>`).join("")}
    <line x1="170" y1="66" x2="206" y2="66" ${P}/>
    <path d="M220 24V116H284V24" fill="none" stroke="#16352a" stroke-width="3"/>
    <rect x="222" y="61" width="60" height="53" fill="#c9a24b"/><rect x="252" y="61" width="30" height="53" fill="#b08a38"/>
    <text x="252" y="92" text-anchor="middle" font-family="Barlow, system-ui, sans-serif" font-size="12" font-weight="700" fill="#1b2a24">grød</text>
    <text x="252" y="46" text-anchor="middle" ${TF}>? %</text>
    <text x="252" y="134" text-anchor="middle" ${T}>1,5 liter</text>
  </svg>`
};
