/* =====================================================
   TEGNINGER TIL REGNEOPGAVERNE – behøver ikke rettes.
   I indhold.js vælger du en tegning med f.eks.  grafik: "disc"
   ===================================================== */

const PIL = '<defs><marker id="pil" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#b3202a"/></marker></defs>';
const T = 'font-family="system-ui, sans-serif" font-size="12" fill="#2b2118"';
const TF = 'font-family="system-ui, sans-serif" font-size="13" font-weight="700" fill="#b3202a"';
const P = 'stroke="#b3202a" stroke-width="2.5" marker-end="url(#pil)"';
// En lille disc golf-kurv, som flere tegninger bruger
const KURV = (x, y, s) => `<g transform="translate(${x} ${y}) scale(${s})"><rect x="-2" y="0" width="4" height="40" fill="#6d7378"/><rect x="-14" y="0" width="28" height="6" rx="2" fill="#e2b31b"/><g stroke="#8e959b" stroke-width="1.5">${[-9, -5, -1, 3, 7].map(i => `<line x1="${i}" y1="6" x2="${i + 1}" y2="20"/>`).join("")}</g><rect x="-14" y="20" width="28" height="8" rx="4" fill="#e2b31b"/></g>`;

const GRAFIK = {
  // Discens kastebane
  disc: `<svg viewBox="0 0 300 160" role="img" aria-label="Discens kastebane">${PIL}
    <line x1="0" y1="122" x2="300" y2="122" stroke="#7aa36a" stroke-width="3"/>
    <path d="M24 120 Q150 70 276 120" fill="none" stroke="#e8590c" stroke-width="2" stroke-dasharray="5 4"/>
    <ellipse cx="24" cy="118" rx="9" ry="4" fill="#e8590c"/>
    <line x1="24" y1="118" x2="92" y2="94" ${P}/><text x="70" y="84" ${TF}>25 m/s</text>
    <line x1="24" y1="118" x2="74" y2="118" stroke="#2b2118" stroke-width="1"/>
    <path d="M58 118 A34 34 0 0 0 56 107" fill="none" stroke="#2b2118" stroke-width="1.5"/><text x="62" y="114" ${T}>10°</text>
    ${KURV(270, 82, 1)}
    <line x1="24" y1="140" x2="276" y2="140" stroke="#2b2118" stroke-width="1.5" marker-start="url(#pil)" marker-end="url(#pil)"/>
    <text x="150" y="156" text-anchor="middle" ${TF}>R = ?</text>
  </svg>`,

  // Scorekort med par for 18 huller
  scorekort: `<svg viewBox="0 0 300 150" role="img" aria-label="Scorekort">
    <rect x="10" y="14" width="280" height="96" rx="6" fill="#fff" stroke="#d8cdb8" stroke-width="2"/>
    <text x="20" y="38" ${T} font-weight="700">Hul</text><text x="20" y="64" ${T} font-weight="700">Par</text><text x="20" y="90" ${T} font-weight="700">Dig</text>
    ${Array.from({ length: 9 }, (_, i) => {
      const x = 62 + i * 25, par = i < 6 ? 3 : 4;
      const mig = [2, 3, 3, 4, 3, 2, 4, 5, 3][i];
      const sym = mig < par ? `<circle cx="${x}" cy="86" r="9" fill="none" stroke="#2e7d32" stroke-width="1.5"/>`
                : mig > par ? `<rect x="${x - 9}" y="77" width="18" height="18" fill="none" stroke="#b3202a" stroke-width="1.5"/>` : "";
      return `<text x="${x}" y="38" text-anchor="middle" ${T}>${i + 1}</text><text x="${x}" y="64" text-anchor="middle" ${T}>${par}</text>${sym}<text x="${x}" y="90" text-anchor="middle" ${T}>${mig}</text>`;
    }).join("")}
    <line x1="14" y1="46" x2="286" y2="46" stroke="#e3d9c6"/><line x1="14" y1="72" x2="286" y2="72" stroke="#e3d9c6"/>
    <text x="150" y="130" text-anchor="middle" ${T}>○ = birdie (et kast under par)   □ = bogey (et kast over par)</text>
  </svg>`,

  // Disc set ovenfra med rotation
  spin: `<svg viewBox="0 0 300 160" role="img" aria-label="Roterende disc">${PIL}
    <circle cx="120" cy="80" r="62" fill="#e8590c" stroke="#b8440a" stroke-width="3"/>
    <circle cx="120" cy="80" r="46" fill="none" stroke="#ff9e5e" stroke-width="2"/>
    <circle cx="120" cy="80" r="3" fill="#7a2a0a"/>
    <path d="M178 46 A70 70 0 0 1 178 114" fill="none" ${P}/>
    <text x="196" y="84" ${TF}>15 omdr./s</text>
    <line x1="58" y1="150" x2="182" y2="150" stroke="#2b2118" stroke-width="1.5" marker-start="url(#pil)" marker-end="url(#pil)"/>
    <text x="120" y="146" text-anchor="middle" ${T}>21 cm</text>
    <text x="196" y="104" ${T}>kantens fart = ?</text>
  </svg>`,

  // Sidevind skubber disc'en
  vind: `<svg viewBox="0 0 300 160" role="img" aria-label="Sidevind">${PIL}
    <rect x="0" y="0" width="300" height="160" fill="#eef3f6"/>
    <ellipse cx="40" cy="130" rx="10" ry="5" fill="#e8590c"/>
    <line x1="40" y1="126" x2="40" y2="30" stroke="#9bb0bd" stroke-width="2" stroke-dasharray="5 4"/>
    <path d="M40 126 Q46 70 92 30" fill="none" stroke="#e8590c" stroke-width="2.5"/>
    <ellipse cx="92" cy="30" rx="10" ry="5" fill="#e8590c"/>
    <line x1="40" y1="16" x2="90" y2="16" stroke="#2b2118" stroke-width="1.5" marker-start="url(#pil)" marker-end="url(#pil)"/>
    <text x="65" y="12" text-anchor="middle" ${TF}>? m</text>
    ${[50, 80, 110].map(y => `<line x1="170" y1="${y}" x2="240" y2="${y}" ${P}/>`).join("")}
    <text x="205" y="138" text-anchor="middle" ${T}>sidevind 2,5 m/s</text>
    <text x="120" y="150" text-anchor="middle" ${T}>4 s i luften</text>
  </svg>`,

  // Putteren stopper i kæderne
  kaeder: `<svg viewBox="0 0 300 160" role="img" aria-label="Putt i kæderne">${PIL}
    ${KURV(200, 20, 3)}
    <ellipse cx="70" cy="70" rx="16" ry="6" fill="#e8590c"/>
    <line x1="92" y1="70" x2="150" y2="70" ${P}/>
    <text x="120" y="60" text-anchor="middle" ${TF}>8 m/s</text>
    <text x="70" y="95" text-anchor="middle" ${T}>175 g</text>
    <text x="70" y="140" text-anchor="middle" ${T}>stopper på 0,05 s</text>
  </svg>`
};
