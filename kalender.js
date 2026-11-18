/* =====================================================
   LOGIK – her behøver du ikke rette noget.
   Indhold og indstillinger ligger i indhold.js.
   ===================================================== */

const PARAMS = new URLSearchParams(location.search);
// ?test: alle huller kan spilles, og intet gemmes på hans rigtige plads. Send IKKE det link til ham.
// ?test=navn giver en separat testplads. ?test&nulstil rydder testpladsen.
const TEST = PARAMS.has("test");
// ?spilleder: din oversigt over hans scorer, point og køb
const SPILLEDER = PARAMS.has("spilleder");
const DAGE = Array.from({ length: 24 }, (_, i) => i + 1);

/* ---------- DATA ----------
   Alt gemmes i ét objekt D, lokalt i browseren og i Firebase. */
const SAMLINGER = ["aabnet", "hul", "hulstate", "caddie", "caddiestate", "koeb", "rekord"];
const LOKAL_NOEGLE = "julekalender-vinteropen-" + AAR;
if (PARAMS.has("nulstil")) { try { localStorage.removeItem(LOKAL_NOEGLE); } catch {} }

function tomtData() { const d = {}; SAMLINGER.forEach(s => d[s] = {}); return d; }
let D = tomtData();
if (!TEST) {
  try { const gemt = JSON.parse(localStorage.getItem(LOKAL_NOEGLE)); if (gemt) SAMLINGER.forEach(s => D[s] = gemt[s] || {}); } catch {}
}
function gemLokalt() {
  if (TEST) return;
  try { localStorage.setItem(LOKAL_NOEGLE, JSON.stringify(D)); } catch {}
}

const SYNK = Boolean(DATABASE_URL && KODE);
const TESTNAVN = (PARAMS.get("test") || "").replace(/[^a-z0-9-]/gi, "");
// Data ligger under kalender/<KODE>-vinteropen, adskilt fra den gamle udgave
const BASE = DATABASE_URL.replace(/\/$/, "") + "/kalender/" + KODE + "-vinteropen" + (TEST ? "-test" + (TESTNAVN ? "-" + TESTNAVN : "") : "");

async function skriv(sti, data) {
  if (!SYNK) return;
  try {
    await fetch(BASE + "/" + sti + ".json", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
  } catch (e) { console.warn("Kunne ikke gemme online:", e); }
}
// Gem én værdi (null sletter den)
function gem(samling, noegle, vaerdi) {
  if (vaerdi === null) delete D[samling][noegle]; else D[samling][noegle] = vaerdi;
  gemLokalt();
  skriv(samling, { [noegle]: vaerdi });
}
function tilObjekt(x) {
  const o = {};
  if (!x) return o;
  Object.keys(x).forEach(k => { if (x[k] !== null && x[k] !== undefined) o[k] = x[k]; });
  return o;
}
async function hentData() {
  const svar = await fetch(BASE + ".json", { cache: "no-store" });
  if (!svar.ok) throw new Error("HTTP " + svar.status);
  return (await svar.json()) || {};
}
async function hentOnline() {
  if (!SYNK) return;
  try {
    const data = await hentData();
    SAMLINGER.forEach(s => {
      const online = tilObjekt(data[s]), lokal = D[s], op = {};
      Object.keys(lokal).forEach(k => {
        // Rekorder: behold den bedste. Ellers: send det op, der kun findes lokalt.
        if (s === "rekord" ? (online[k] === undefined || lokal[k] < online[k]) : !(k in online)) { op[k] = lokal[k]; online[k] = lokal[k]; }
      });
      if (Object.keys(op).length) skriv(s, op);
      D[s] = { ...lokal, ...online };
    });
    gemLokalt();
    opdaterTop();
    tegnBanekort();
  } catch (e) { console.warn("Kunne ikke hente online, bruger det lokale:", e); }
}

/* ---------- POINT OG SCORE ---------- */
function samlet() {
  return Object.values(D.hul).reduce((s, x) => s + (x.point || 0), 0)
       + Object.values(D.caddie).reduce((s, x) => s + (x.point || 0), 0);
}
function brugt() { return Object.values(D.koeb).reduce((s, x) => s + (x.pris || 0), 0); }
function saldo() { return samlet() - brugt(); }
function titel(p) { let t = TITLER[0][1]; for (const [min, n] of TITLER) if (p >= min) t = n; return t; }
// Samlet score mod par, f.eks. "−3"
function scoreTekst(rel) { return rel === 0 ? "0" : (rel > 0 ? "+" : "−") + Math.abs(rel); }
function samletRel() { return Object.keys(D.hul).reduce((s, d) => s + D.hul[d].kast - HULLER[d].par, 0); }

function scoreNavn(kast, par) {
  if (kast === 1) return { navn: "Ace!", noegle: "ace" };
  const rel = kast - par;
  if (rel <= -2) return { navn: "Eagle!", noegle: "eagle" };
  if (rel === -1) return { navn: "Birdie!", noegle: "birdie" };
  if (rel === 0) return { navn: "Par", noegle: "par" };
  if (rel === 1) return { navn: "Bogey", noegle: "bogey" };
  if (rel === 2) return { navn: "Dobbelt bogey", noegle: "dobbeltbogey" };
  if (rel === 3) return { navn: "Tripel bogey", noegle: "vaerre" };
  return { navn: "+" + rel, noegle: "vaerre" };
}

function opdaterTop() {
  const p = samlet();
  const i = TITLER.reduce((idx, [min], n) => (p >= min ? n : idx), 0);
  const naeste = TITLER[i + 1];
  document.getElementById("titel-navn").textContent = titel(p);
  // Niveauet bygger på alle de præmiepoint, han har vundet (også dem, han har brugt)
  document.getElementById("stilling").textContent = naeste ? p + " / " + naeste[0] + " point · næste niveau: " + naeste[1] : p + " point · højeste niveau!";
  const andel = naeste ? (p - TITLER[i][0]) / (naeste[0] - TITLER[i][0]) : 1;
  document.getElementById("niveau-fyld").style.width = Math.min(100, andel * 100) + "%";
  const niv = document.getElementById("niveauer");
  niv.innerHTML = "";
  TITLER.forEach(([min, navn], n) => { const li = el("li", n <= i ? "naaet" : "", navn); li.title = min + " præmiepoint"; niv.appendChild(li); });
  // Disc golf-scoren (lav er godt) og præmiepointene vises hver for sig
  const antal = Object.keys(D.hul).length;
  document.getElementById("samlet-score").textContent = antal ? scoreTekst(samletRel()) : "–";
  document.getElementById("score-under").textContent = antal ? "efter " + antal + " " + (antal === 1 ? "hul" : "huller") : "starter 1. december";
  document.getElementById("saldo-stor").textContent = saldo();
}

/* ---------- DATOER ---------- */
function maaSpilles(dag) { return TEST || new Date() >= new Date(AAR, 11, dag); }
function erIdag(dag) { const n = new Date(); return n.getMonth() === 11 && n.getDate() === dag; }

/* ---------- HJÆLPERE ---------- */
function el(tag, klasse, tekst) {
  const e = document.createElement(tag);
  if (klasse) e.className = klasse;
  if (tekst !== undefined) e.textContent = tekst;
  return e;
}
function knapEl(tekst, klasse, handling) { const k = el("button", klasse, tekst); k.type = "button"; k.addEventListener("click", handling); return k; }
function svarFelt(handling, knaptekst, ved, inputmode) {
  const formular = el("form", "tekstsvar");
  const felt = el("input");
  felt.type = "text"; felt.autocomplete = "off"; felt.setAttribute("aria-label", "Dit svar");
  if (inputmode) felt.inputMode = inputmode;
  const k = el("button", "svar-knap", knaptekst); k.type = "submit";
  formular.append(felt, k);
  formular.addEventListener("submit", e => { e.preventDefault(); const v = felt.value.trim(); if (v) ved(v, felt); });
  handling.appendChild(formular);
  return formular;
}
function pointTaeller(handling, start, regel) {
  const boks = el("div", "live-point");
  const tal = el("strong");
  boks.append(el("span", "praemie-navn", "Præmie "), tal); boks.insertAdjacentHTML("beforeend", P_IKON); boks.appendChild(el("small", null, regel));
  handling.appendChild(boks);
  const saet = p => { tal.textContent = Math.max(0, Math.round(p)); };
  saet(start);
  return saet;
}
// Tilfældige tal, der altid er ens for samme frø (så hvert hul altid ser ens ud)
function frøRandom(frø) {
  let a = frø >>> 0;
  return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
const afstand = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

/* =====================================================
   SCOREKORTET (som på UDisc)
   ===================================================== */
function tegnScorekort() {
  const boks = document.getElementById("scorekort");
  if (!boks) return;
  boks.innerHTML = "";
  [[1, 12], [13, 24]].forEach(([fra, til]) => {
    const huller = DAGE.filter(d => d >= fra && d <= til);
    const tabel = el("table", "scorekort-tabel");
    const raekke = (navn, celler, klasse) => {
      const tr = el("tr", klasse);
      tr.appendChild(el("th", null, navn));
      celler.forEach(c => tr.appendChild(c));
      return tr;
    };
    // Første række: sum for hul 1-12. Anden række: total for hele banen.
    const total = fra === 13;
    const medIsum = total ? DAGE : huller;
    const spillede = medIsum.filter(d => D.hul[d]);
    const sumKast = spillede.reduce((s, d) => s + D.hul[d].kast, 0);
    const sumPar = medIsum.reduce((s, d) => s + HULLER[d].par, 0);
    tabel.append(
      raekke("Hul", huller.map(d => el("td", erIdag(d) ? "i-dag" : "", String(d))).concat([el("td", "sum", total ? "Total" : "Sum")]), "hul-raekke"),
      raekke("Par", huller.map(d => el("td", null, String(HULLER[d].par))).concat([el("td", "sum", String(sumPar))]), "par-raekke"),
      raekke("Score", huller.map(d => {
        const td = el("td");
        const r = D.hul[d];
        if (r) { const s = el("span", "score s-" + scoreNavn(r.kast, HULLER[d].par).noegle, String(r.kast)); td.appendChild(s); }
        return td;
      }).concat([el("td", "sum", spillede.length ? String(sumKast) : "")]), "score-raekke")
    );
    boks.appendChild(tabel);
  });
}

/* =====================================================
   BANEKORTET: et tegnet vinterlandskab, hvor en snesti snor sig
   fra hul 1 øverst til venstre til hul 24 nederst til højre.
   Hvert hul er en kurv med datoen.
   ===================================================== */
const KORT_B = 400, KORT_H = 560;
// Hullernes placering på kortet (håndplaceret, så stien slynger sig pænt)
const HUL_PLACERING = {
  1: [45, 62], 2: [108, 88], 3: [172, 60], 4: [238, 88], 5: [302, 64], 6: [356, 108],
  7: [326, 170], 8: [258, 196], 9: [192, 172], 10: [126, 200], 11: [62, 180],
  12: [44, 248], 13: [104, 292], 14: [170, 270], 15: [236, 298], 16: [300, 276], 17: [356, 318],
  18: [326, 384], 19: [258, 408], 20: [190, 386], 21: [122, 414],
  22: [58, 466], 23: [176, 500], 24: [344, 512]
};

// Blød kurve gennem punkterne (Catmull-Rom omsat til Bézier)
function bloedSti(pkt) {
  let d = "M" + pkt[0][0] + " " + pkt[0][1];
  const prove = [];
  for (let i = 0; i < pkt.length - 1; i++) {
    const p0 = pkt[i - 1] || pkt[i], p1 = pkt[i], p2 = pkt[i + 1], p3 = pkt[i + 2] || p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += " C" + c1.join(" ") + " " + c2.join(" ") + " " + p2.join(" ");
    for (let t = 0; t <= 1; t += 0.1) {   // punkter langs stien, så pynten kan holde afstand
      const u = 1 - t;
      prove.push([u * u * u * p1[0] + 3 * u * u * t * c1[0] + 3 * u * t * t * c2[0] + t * t * t * p2[0],
                  u * u * u * p1[1] + 3 * u * u * t * c1[1] + 3 * u * t * t * c2[1] + t * t * t * p2[1]]);
    }
  }
  return { d, prove };
}

function tegnBanekort() {
  tegnScorekort();
  const kort = document.getElementById("banekort");
  kort.style.aspectRatio = KORT_B + " / " + KORT_H;
  kort.innerHTML = "";
  const pkt = [[14, 22]].concat(DAGE.map(d => HUL_PLACERING[d]), [[392, 545]]);
  const sti = bloedSti(pkt);
  const tilSti = (x, y) => Math.min(...sti.prove.map(p => Math.hypot(p[0] - x, p[1] - y)));
  const r = frøRandom(1224);
  let s = "";

  // Himmel-agtig sne og bløde bakker
  s += `<defs>
    <linearGradient id="sne" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e3ece8"/><stop offset="1" stop-color="#f6f9f8"/></linearGradient>
    <radialGradient id="bakke" cx=".5" cy=".4" r=".6"><stop offset="0" stop-color="#ffffff" stop-opacity=".9"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/></radialGradient>
    <radialGradient id="is" cx=".4" cy=".35" r=".7"><stop offset="0" stop-color="#e6f5fb"/><stop offset="1" stop-color="#a9d6ea"/></radialGradient>
  </defs>
  <rect width="${KORT_B}" height="${KORT_H}" fill="url(#sne)"/>`;
  for (let i = 0; i < 9; i++) s += `<ellipse cx="${(r() * KORT_B).toFixed(0)}" cy="${(r() * KORT_H).toFixed(0)}" rx="${(60 + r() * 70).toFixed(0)}" ry="${(30 + r() * 30).toFixed(0)}" fill="url(#bakke)"/>`;

  // Tilfrosne søer (kun der, hvor der er plads)
  const soeer = [[205, 132, 42, 13], [212, 342, 44, 14], [258, 458, 42, 13], [86, 352, 22, 9]].filter(([x, y, rx, ry]) =>
    sti.prove.every(p => ((p[0] - x) / (rx + 12)) ** 2 + ((p[1] - y) / (ry + 12)) ** 2 > 1));
  soeer.forEach(([x, y, rx, ry]) => {
    s += `<ellipse cx="${x}" cy="${y + 2}" rx="${rx + 2}" ry="${ry + 2}" fill="#cfe2ea"/>
      <ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="url(#is)"/>
      <path d="M${x - rx * 0.5} ${y - ry * 0.2} l${rx * 0.25} ${-ry * 0.25} M${x + rx * 0.1} ${y + ry * 0.3} l${rx * 0.3} ${-ry * 0.3}" stroke="#fff" stroke-width="1.5" stroke-linecap="round" opacity=".8"/>`;
  });
  const iSoe = (x, y, m) => soeer.some(([sx, sy, rx, ry]) => ((x - sx) / (rx + m)) ** 2 + ((y - sy) / (ry + m)) ** 2 < 1);

  // Snestien
  s += `<path d="${sti.d}" fill="none" stroke="#c3d4ca" stroke-width="15" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="${sti.d}" fill="none" stroke="#fdfefe" stroke-width="11" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="${sti.d}" fill="none" stroke="#d3e0d8" stroke-width="1.6" stroke-dasharray="2 6" stroke-linecap="round"/>`;

  // Skov: grantræer med sne, sorteret oppefra og ned, så de overlapper pænt
  const traeer = [];
  for (let i = 0; i < 700 && traeer.length < 150; i++) {
    const x = r() * KORT_B, y = 8 + r() * (KORT_H - 8), h = 9 + r() * 12;
    if (tilSti(x, y) < 14 + h * 0.4 || iSoe(x, y, 6)) continue;
    if (Math.hypot(x - 22, y - 26) < 26 || Math.hypot(x - 380, y - 505) < 26) continue;
    if (traeer.some(t => Math.hypot(t.x - x, t.y - y) < 7)) continue;
    traeer.push({ x, y, h, mork: r() < 0.5 });
  }
  traeer.sort((a, b) => a.y - b.y).forEach(t => { s += gran(t.x, t.y, t.h, t.mork); });

  // Klubhus ved start
  s += `<g transform="translate(22 30)">
    <ellipse cx="0" cy="9" rx="17" ry="4" fill="rgba(0,0,0,.12)"/>
    <rect x="-12" y="-4" width="24" height="13" fill="#8a5a3c"/><rect x="-3" y="1" width="6" height="8" fill="#5b3a25"/>
    <rect x="-10" y="-1" width="5" height="4" fill="#ffe08a"/><rect x="5" y="-1" width="5" height="4" fill="#ffe08a"/>
    <polygon points="-15,-4 0,-15 15,-4" fill="#b3202a"/><polygon points="-15,-4 0,-15 15,-4" fill="none" stroke="#fff" stroke-width="2.2" stroke-linejoin="round"/>
    <rect x="6" y="-15" width="4" height="7" fill="#6d4c2f"/>
    <circle cx="9" cy="-19" r="2.2" fill="#e8eef0"/><circle cx="12" cy="-23" r="2.8" fill="#eef3f5"/></g>`;
  // Juletræ med stjerne ved mål
  s += `<g transform="translate(382 512)">
    <ellipse cx="0" cy="12" rx="15" ry="4" fill="rgba(0,0,0,.12)"/>
    <rect x="-2" y="6" width="4" height="7" fill="#6d4c2f"/>
    <polygon points="0,-30 13,-4 -13,-4" fill="#2a5f3e"/><polygon points="0,-20 16,8 -16,8" fill="#2f6b45"/>
    <circle cx="-6" cy="-2" r="1.8" fill="#b3202a"/><circle cx="5" cy="2" r="1.8" fill="#e8c46a"/><circle cx="2" cy="-12" r="1.6" fill="#b3202a"/><circle cx="-3" cy="-18" r="1.4" fill="#e8c46a"/>
    <polygon points="0,-38 2.4,-32 8.6,-32 3.6,-28.3 5.5,-22 0,-25.8 -5.5,-22 -3.6,-28.3 -8.6,-32 -2.4,-32" fill="#f4c542" stroke="#c9952a" stroke-width=".6"/></g>`;

  // Små kurve ved hvert hul
  DAGE.forEach(d => { const [x, y] = HUL_PLACERING[d]; s += kurvIkon(x + 15, y - 11); });

  // Sne, der falder
  for (let i = 0; i < 90; i++) s += `<circle cx="${(r() * KORT_B).toFixed(1)}" cy="${(r() * KORT_H).toFixed(1)}" r="${(0.6 + r() * 1.2).toFixed(1)}" fill="#fff" opacity="${(0.5 + r() * 0.5).toFixed(2)}"/>`;

  kort.insertAdjacentHTML("beforeend", `<svg viewBox="0 0 ${KORT_B} ${KORT_H}" aria-hidden="true" class="banekort-bg">${s}</svg>`);

  // Datoerne er knapper
  DAGE.forEach(dag => {
    const [x, y] = HUL_PLACERING[dag], res = D.hul[dag];
    const knap = el("button", "kurv-knap");
    knap.type = "button";
    knap.textContent = dag;
    knap.style.left = (x / KORT_B * 100) + "%";
    knap.style.top = (y / KORT_H * 100) + "%";
    knap.setAttribute("aria-label", "Hul " + dag + (res ? ", spillet på " + res.kast + " kast" : ", par " + HULLER[dag].par));
    if (res) knap.classList.add("spillet");
    if (erIdag(dag)) knap.classList.add("i-dag");
    if (maaSpilles(dag)) knap.addEventListener("click", () => aabnHul(dag));
    else { knap.disabled = true; knap.classList.add("laast"); }
    kort.appendChild(knap);
  });
}
// Et grantræ med sne på
function gran(x, y, h, mork) {
  const b = h * 0.42, f1 = mork ? "#24563a" : "#2f6b45", f2 = mork ? "#2f6b45" : "#3b8054";
  return `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)})">
    <ellipse cx="${(b * 0.3).toFixed(1)}" cy="1" rx="${b.toFixed(1)}" ry="${(b * 0.3).toFixed(1)}" fill="rgba(40,70,60,.13)"/>
    <rect x="-.9" y="${(-h * 0.15).toFixed(1)}" width="1.8" height="${(h * 0.17).toFixed(1)}" fill="#6d4c2f"/>
    <polygon points="0,${(-h).toFixed(1)} ${b.toFixed(1)},${(-h * 0.12).toFixed(1)} ${(-b).toFixed(1)},${(-h * 0.12).toFixed(1)}" fill="${f1}"/>
    <polygon points="0,${(-h).toFixed(1)} ${(b * 0.15).toFixed(1)},${(-h * 0.12).toFixed(1)} ${(-b).toFixed(1)},${(-h * 0.12).toFixed(1)}" fill="${f2}"/>
    <polygon points="0,${(-h).toFixed(1)} ${(b * 0.38).toFixed(1)},${(-h * 0.68).toFixed(1)} ${(-b * 0.38).toFixed(1)},${(-h * 0.68).toFixed(1)}" fill="#fff"/>
    <path d="M${(-b * 0.8).toFixed(1)} ${(-h * 0.2).toFixed(1)} q${(b * 0.4).toFixed(1)} -2 ${(b * 0.8).toFixed(1)} 0" stroke="#fff" stroke-width="1.2" fill="none" opacity=".8"/></g>`;
}
// En lille disc golf-kurv
function kurvIkon(x, y) {
  return `<g transform="translate(${x} ${y})">
    <ellipse cx="0" cy="9.5" rx="4" ry="1.2" fill="rgba(0,0,0,.15)"/>
    <rect x="-.6" y="-6" width="1.2" height="15.5" fill="#6d7378"/>
    <rect x="-4.5" y="-7" width="9" height="1.8" rx=".6" fill="#e2b31b"/>
    <g stroke="#9aa0a5" stroke-width=".6">${[-3, -1.5, 0, 1.5, 3].map(i => `<line x1="${i}" y1="-5.2" x2="${i * 0.6}" y2="0"/>`).join("")}</g>
    <path d="M-4.2 0 h8.4 l-1 2.6 h-6.4z" fill="#e2b31b"/></g>`;
}

/* =====================================================
   HULLETS SIDE: hovedopgave + caddie-opgave
   ===================================================== */
const kortDialog = document.getElementById("kort");
let aktivtSpil = null;   // stoppes, hvis kortet lukkes

// Toppen af kortet: et lille kalenderblad med datoen, titlen og en kort linje under
function visKort(underlinje, titelTekst, dag) {
  if (aktivtSpil) { aktivtSpil.stop(); aktivtSpil = null; }
  const dato = document.getElementById("kort-dato");
  dato.hidden = !dag;
  dato.innerHTML = dag ? '<span class="dato-tal">' + dag + '</span><span class="dato-md">DEC</span>' : "";
  document.getElementById("kort-dag").textContent = underlinje;
  document.getElementById("kort-titel").textContent = titelTekst;
  const h = document.getElementById("kort-handling");
  h.innerHTML = "";
  if (!kortDialog.open) kortDialog.showModal();
  return h;
}

/* ---------- POINTSYMBOL: en lille disc ---------- */
const P_IKON = '<svg class="p-ikon" viewBox="0 0 20 14" aria-hidden="true"><ellipse cx="10" cy="8" rx="9.2" ry="5" fill="#b8440a"/><ellipse cx="10" cy="6.6" rx="9.2" ry="5" fill="#e8590c"/><ellipse cx="10" cy="6.6" rx="5.6" ry="2.9" fill="none" stroke="#ff9e5e" stroke-width="1.2"/><ellipse cx="7" cy="5" rx="2.4" ry="1" fill="#ffc49a" opacity=".8"/></svg>';
// Et tal med pointsymbolet efter, f.eks. "+40 ●"
function pointEl(tekst, klasse) {
  const s = el("span", "point-tal " + (klasse || ""));
  s.textContent = tekst;
  s.insertAdjacentHTML("beforeend", P_IKON);
  return s;
}
// En lille bjælke, der viser hvor mange af de mulige point, der er hentet
function pointBar(vaerdi, maks) {
  const b = el("div", "point-bar");
  const f = el("div");
  f.style.width = Math.min(100, vaerdi / maks * 100) + "%";
  b.appendChild(f);
  return b;
}

/* =====================================================
   DAGENS SIDE: to opgaver – spil hullet og caddie-opgaven
   ===================================================== */
function aabnHul(dag) {
  if (!D.aabnet[dag]) gem("aabnet", dag, true);
  const hul = HULLER[dag];
  const h = visKort("Hul " + dag + " · Par " + hul.par + " · " + hul.laengde + " m", hul.navn, dag);
  const res = D.hul[dag], cRes = D.caddie[dag], c = CADDIE[dag];
  const antalOpgaver = c ? 2 : 1;
  const loeste = (res ? 1 : 0) + (cRes ? 1 : 0);
  const dagensPoint = (res ? res.point : 0) + (cRes ? cRes.point : 0);
  const maks = HUL_POINT.ace + (c ? CADDIE_MAKS : 0);

  // Dagens præmiepoint i alt
  const top = el("div", "dag-top" + (loeste === antalOpgaver ? " alt-loest" : ""));
  // Venstre: overskrift og status. Højre: det store tal med symbolet.
  const venstre = el("div", "dag-top-venstre");
  venstre.append(el("span", "dag-top-navn", "Dagens præmiepoint"),
    el("span", "dag-status", loeste === antalOpgaver ? "✓ Begge opgaver er løst" : loeste + " af " + antalOpgaver + " opgaver løst"));
  const tal = el("div", "dag-point");
  tal.appendChild(el("strong", null, String(dagensPoint)));
  tal.insertAdjacentHTML("beforeend", P_IKON);
  top.append(venstre, tal);
  h.appendChild(top);

  const opgaver = el("div", "opgaver");

  // Opgave 1: hullet
  const st = D.hulstate[dag];
  const o1 = opgaveKort(1, "Spil hullet", "Hovedopgave", res ? "loest" : st ? "igang" : "aaben");
  if (res) {
    const sn = scoreNavn(res.kast, hul.par);
    const r = el("div", "opgave-resultat");
    const rel = res.kast - hul.par;
    r.append(el("span", "score stor s-" + sn.noegle, String(res.kast)), el("span", "opgave-score-navn", sn.navn.replace("!", "")),
      el("span", "rel-score " + (rel < 0 ? "under" : rel > 0 ? "over" : "lige"), scoreTekst(rel)));
    o1.krop.append(r, pointLinje(res.point));
    if (D.rekord[dag]) o1.krop.appendChild(el("p", "lille-info", "Bedste i træning: " + D.rekord[dag] + " kast"));
    o1.krop.appendChild(knapEl("Træn hullet (ingen præmie)", "proeve-knap", () => spilHul(dag, "traening")));
  } else {
    if (st) o1.krop.appendChild(el("p", "opgave-tekst", "Du er i gang – " + st.kast + " kast brugt."));
    o1.krop.appendChild(knapEl(st ? "▶ Fortsæt hullet" : "▶ Spil hullet", "start", () => spilHul(dag, "rigtig")));
  }
  opgaver.appendChild(o1.kort);

  // Opgave 2: caddie-opgaven
  if (c) {
    const type = c.wordle ? "Disc golf-wordle" : c.regne ? "Regneopgave" : "Emoji-gåde";
    const o2 = opgaveKort(2, "Caddie-opgave", type, cRes ? "loest" : D.caddiestate[dag] ? "igang" : "aaben");
    if (cRes) {
      o2.krop.append(pointLinje(cRes.point), knapEl("Se opgaven og svaret", "proeve-knap", () => visCaddie(dag)));
    } else {
      o2.krop.appendChild(knapEl(D.caddiestate[dag] ? "▶ Fortsæt opgaven" : "▶ Løs opgaven", "start", () => visCaddie(dag)));
    }
    opgaver.appendChild(o2.kort);
  }
  h.appendChild(opgaver);
}
// Et opgavekort med nummer, titel og status
function opgaveKort(nr, titel, under, status) {
  const kort = el("section", "opgave " + status);
  const hoved = el("div", "opgave-hoved");
  const navn = el("div", "opgave-navn");
  navn.append(el("h3", null, titel), el("span", "opgave-under", under));
  const chip = { loest: "✓ Løst", igang: "I gang", aaben: "Ikke løst" }[status];
  hoved.append(el("span", "opgave-nr", status === "loest" ? "✓" : String(nr)), navn, el("span", "opgave-chip " + status, chip));
  const krop = el("div", "opgave-krop");
  kort.append(hoved, krop);
  return { kort, krop };
}
// "Præmie +40 ●"
function pointLinje(point) {
  const l = el("div", "point-linje");
  const t = el("p", "point-linje-tal");
  t.append(el("span", "praemie-navn", "Præmie"), pointEl("+" + point, "stor"));
  l.appendChild(t);
  return l;
}

/* =====================================================
   HULLET: set bagfra. Alle kast styres som putting:
   ét tryk for sigte, ét tryk for kraft.
   ===================================================== */
const PUTT_ZONE = 10;      // under 10 m skal der puttes
const KASTTYPER = {
  drive:    { navn: "Drive",    maks: 110, sigteTol: 0.15, kraftVindue: 0.09, vinkelFejl: 3.5, laengdeFejl: 0.10, fart: 1.15 },
  approach: { navn: "Approach", maks: 60,  sigteTol: 0.14, kraftVindue: 0.09, vinkelFejl: 3,   laengdeFejl: 0.08, fart: 1.0 },
  putt:     { navn: "Putt" }
};
const kastType = d => d > 60 ? "drive" : d > PUTT_ZONE ? "approach" : "putt";

// Træer og vand placeres ud fra hullets tal, så hullet altid ser ens ud
function lavLayout(dag) {
  const hul = HULLER[dag];
  const L = hul.laengde, bredde = Math.max(22, Math.abs(hul.kurvX || 0) + 12);
  const kurv = { x: hul.kurvX || 0, y: L };
  const r = frøRandom(dag * 7919 + 13);
  const vand = [];
  if (hul.vand === "foran") vand.push({ x1: -bredde, x2: bredde, y1: L - 24, y2: L - 14 });
  if (hul.vand === "side") {
    const side = kurv.x >= 0 ? 1 : -1;
    vand.push(side > 0 ? { x1: bredde * 0.45, x2: bredde, y1: L * 0.3, y2: L + 6 } : { x1: -bredde, x2: -bredde * 0.45, y1: L * 0.3, y2: L + 6 });
  }
  const iVand = (p, m = 0) => vand.some(v => p.x > v.x1 - m && p.x < v.x2 + m && p.y > v.y1 - m && p.y < v.y2 + m);
  const traeer = [];
  for (let n = 0; n < 400 && traeer.length < (hul.traeer || 0); n++) {
    const t = { x: (r() * 2 - 1) * bredde, y: 12 + r() * (L - 16), r: 1.6 + r() * 1.6 };
    if (afstand(t, kurv) < 7 || afstand(t, { x: 0, y: 0 }) < 9 || iVand(t, t.r)) continue;
    if (traeer.some(o => afstand(o, t) < o.r + t.r + 1.5)) continue;
    const lx = kurv.x * (t.y / L);
    if (Math.abs(t.x - lx) < 3 && r() < 0.65) continue;
    traeer.push(t);
  }
  return { L, bredde, kurv, vand, traeer, iVand };
}

function spilHul(dag, tilstand) {
  const hul = HULLER[dag];
  const h = visKort("Hul " + dag + " · Par " + hul.par + (tilstand === "traening" ? " · Træning" : ""), hul.navn, dag);
  const lay = lavLayout(dag);
  const rigtig = tilstand === "rigtig";
  // Hvor ligger disc'en, og hvor mange kast er brugt? (det rigtige forsøg kan genoptages)
  const st = rigtig && D.hulstate[dag] ? { ...D.hulstate[dag] } : { x: 0, y: 0, kast: 0 };
  const MAKS_KAST = hul.par + 5;
  let vind = 0, fase = "sigte", sigte = 0, kraft = 0, t0 = 0, raf = null, stoppet = false, P = {}, bane = [], slut = false;

  const status = el("p", "spilstatus");
  const scene = el("div", "pov-scene");
  scene.innerHTML = '<canvas class="pov" width="720" height="560"></canvas><canvas class="pov-mini" width="128" height="184"></canvas>';
  const besked = el("p", "hul-besked");
  const maalere = el("div", "maalere");
  maalere.innerHTML =
    '<div class="maaler sigte"><span class="maaler-navn">Sigte</span><div class="spor"><div class="zone"></div><div class="markoer"></div></div></div>' +
    '<div class="maaler kraft"><span class="maaler-navn">Kraft</span><div class="spor"><div class="zone"></div><div class="fyld"></div></div></div>';
  const knap = knapEl("Sigt!", "start kast", tryk);
  h.append(status, scene, besked, maalere, knap);
  aktivtSpil = { stop() { stoppet = true; cancelAnimationFrame(raf); } };

  const lerred = scene.querySelector(".pov"), ctx = lerred.getContext("2d");
  const mini = scene.querySelector(".pov-mini"), mctx = mini.getContext("2d");
  const W = lerred.width, H = lerred.height, HORISONT = 120, F = 880;
  const sZone = maalere.querySelector(".sigte .zone"), sMark = maalere.querySelector(".sigte .markoer");
  const kZone = maalere.querySelector(".kraft .zone"), kFyld = maalere.querySelector(".kraft .fyld");
  const tilKurv = () => afstand(st, lay.kurv);

  /* ----- Kamera: fra disc'en mod kurven ----- */
  const kameraHoejde = () => Math.max(1.6, Math.min(6, tilKurv() * 0.07));
  const retning = () => Math.atan2(lay.kurv.x - st.x, lay.kurv.y - st.y);
  function tilLokal(p) { const a = retning(), rx = p.x - st.x, ry = p.y - st.y; return { u: rx * Math.cos(a) - ry * Math.sin(a), v: rx * Math.sin(a) + ry * Math.cos(a) }; }
  function tilVerden(u, v) { const a = retning(); return { x: st.x + u * Math.cos(a) + v * Math.sin(a), y: st.y - u * Math.sin(a) + v * Math.cos(a) }; }
  function projicer(u, v, z) { const dz = Math.max(0.5, v); return { x: W / 2 + u * F / dz, y: HORISONT + (kameraHoejde() - (z || 0)) * F / dz, s: F / dz }; }

  /* ----- Parametre for dette kast ----- */
  function parametre() {
    const d = tilKurv(), type = kastType(d), T = KASTTYPER[type];
    if (type === "putt") {
      return { type, d, sigteTol: Math.max(0.09, 0.2 - 0.009 * d), kraftVindue: Math.max(0.05, 0.14 - 0.007 * d),
               idealKraft: Math.min(0.85, 0.3 + 0.055 * d), vindEffekt: vind * 0.03 * (d / 7), fart: 0.75 + d * 0.045 };
    }
    const m = findMaal(Math.min(d, T.maks));
    return { type, d, maalD: m.laengde, T, sigteTol: T.sigteTol, kraftVindue: T.kraftVindue,
             idealKraft: 0.25 + 0.6 * (m.laengde / T.maks), vindEffekt: vind * 0.025, fart: T.fart, omvej: m.vinkel };
  }
  // Målfeltet: helst lige mod kurven. Står et træ i vejen, eller lander man i vand/OB,
  // findes den nærmeste åbning med en sikker landing (evt. et kortere kast).
  function findMaal(laengde) {
    const ok = (a, l) => {
      for (let i = 1; i <= 30; i++) {
        const v = l * i / 30, w = tilVerden(Math.sin(a) * v, Math.cos(a) * v);
        if (rammerTrae(w, st, 0.8)) return false;
      }
      const land = tilVerden(Math.sin(a) * l, Math.cos(a) * l);
      return Math.abs(land.x) < lay.bredde - 2 && land.y < lay.L + 15 && !lay.iVand(land, 1.5);
    };
    for (const andel of [1, 0.85, 0.7, 0.55, 0.4, 0.25])
      for (let g = 0; g <= 90; g += 3)
        for (const s of g ? [1, -1] : [1]) { const a = s * g * Math.PI / 180; if (ok(a, laengde * andel)) return { vinkel: a, laengde: laengde * andel }; }
    return { vinkel: 0, laengde: laengde * 0.25 };
  }
  // Rammer et punkt et træ? Træer helt tæt på disc'en (under 2,5 m) tæller ikke,
  // så man altid kan kaste forbi et træ, man står lige ved.
  function rammerTrae(p, fra, margen) {
    if (afstand(p, fra) <= 2.5) return null;
    return lay.traeer.find(t => afstand(p, t) < t.r + (margen || 0)) || null;
  }
  // Retning og længde ud fra målerne
  function vinkelFra(sF) {
    const vf = P.type === "putt" ? Math.atan(0.45 / P.d) * 180 / Math.PI : P.T.vinkelFejl;
    return (P.omvej || 0) + (Math.abs(sF) <= 1 ? sF * vf : Math.sign(sF) * (vf + (Math.abs(sF) - 1) * (P.type === "putt" ? vf * 1.5 : 9))) * Math.PI / 180;
  }
  function laengdeFra(kF) {
    if (P.type === "putt") return P.d * (1 + Math.max(-0.5, Math.min(0.5, kF * 0.12)));
    const lf = P.T.laengdeFejl;
    return P.maalD * (1 + (Math.abs(kF) <= 1 ? kF * lf : Math.sign(kF) * (lf + (Math.abs(kF) - 1) * 0.22)));
  }

  /* ----- Tegning ----- */
  function linje(punkter, farve, bredde, stiplet) {
    ctx.strokeStyle = farve; ctx.lineWidth = bredde; ctx.setLineDash(stiplet || []);
    ctx.beginPath(); let ny = true;
    punkter.forEach(p => { const l = tilLokal(p); if (l.v < 0.6) { ny = true; return; } const s = projicer(l.u, l.v); ny ? ctx.moveTo(s.x, s.y) : ctx.lineTo(s.x, s.y); ny = false; });
    ctx.stroke(); ctx.setLineDash([]);
  }
  function tegn(flyvende) {
    const g = ctx.createLinearGradient(0, 0, 0, HORISONT); g.addColorStop(0, "#a9c8de"); g.addColorStop(1, "#e3edf3");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, HORISONT);
    ctx.fillStyle = "#5f8a72";
    for (let i = 0; i < 38; i++) { const x = i * 20 - 6, hh = 12 + (i * 37 % 13); ctx.beginPath(); ctx.moveTo(x, HORISONT); ctx.lineTo(x + 10, HORISONT - hh); ctx.lineTo(x + 20, HORISONT); ctx.fill(); }
    const g2 = ctx.createLinearGradient(0, HORISONT, 0, H); g2.addColorStop(0, "#e2eae6"); g2.addColorStop(1, "#ffffff");
    ctx.fillStyle = g2; ctx.fillRect(0, HORISONT, W, H - HORISONT);
    // Vand
    lay.vand.forEach(v => {
      const hjoerner = [];
      for (let i = 0; i <= 16; i++) hjoerner.push({ x: v.x1 + (v.x2 - v.x1) * i / 16, y: v.y1 });
      for (let i = 0; i <= 16; i++) hjoerner.push({ x: v.x2 - (v.x2 - v.x1) * i / 16, y: v.y2 });
      ctx.fillStyle = "#9fd0ec"; ctx.strokeStyle = "#7bb7da"; ctx.lineWidth = 2; ctx.beginPath();
      hjoerner.forEach((p, i) => { const l = tilLokal(p); const s = projicer(l.u, Math.max(0.8, l.v)); i ? ctx.lineTo(s.x, s.y) : ctx.moveTo(s.x, s.y); });
      ctx.closePath(); ctx.fill(); ctx.stroke();
    });
    // OB-linjer og cirkel 1
    [-lay.bredde, lay.bredde].forEach(xb => linje(Array.from({ length: 90 }, (_, i) => ({ x: xb, y: -10 + i * (lay.L + 30) / 89 })), "#d33", 3, [12, 9]));
    linje(Array.from({ length: 64 }, (_, i) => ({ x: lay.kurv.x + Math.cos(i / 10) * PUTT_ZONE, y: lay.kurv.y + Math.sin(i / 10) * PUTT_ZONE })), "rgba(43,33,24,.25)", 2, [8, 8]);

    const ting = lay.traeer.map(t => ({ type: "trae", r: t.r, l: tilLokal(t) })).concat([{ type: "kurv", l: tilLokal(lay.kurv) }]);
    if (flyvende) ting.push({ type: "disc", l: tilLokal(flyvende), z: flyvende.z });
    ting.filter(t => t.l.v > 0.6).sort((a, b) => b.l.v - a.l.v).forEach(t => {
      const p = projicer(t.l.u, t.l.v), s = p.s;
      if (t.type === "trae") {
        const hh = 7.5 * s, b = t.r * 1.25 * s;
        ctx.fillStyle = "rgba(0,0,0,.12)"; ctx.beginPath(); ctx.ellipse(p.x, p.y, b, b * 0.25, 0, 0, 7); ctx.fill();
        ctx.fillStyle = "#6d4c2f"; ctx.fillRect(p.x - b * 0.1, p.y - hh * 0.22, b * 0.2, hh * 0.22);
        ctx.fillStyle = "#2a5f3e"; ctx.beginPath(); ctx.moveTo(p.x, p.y - hh); ctx.lineTo(p.x + b, p.y - hh * 0.18); ctx.lineTo(p.x - b, p.y - hh * 0.18); ctx.fill();
        ctx.fillStyle = "#3a7d52"; ctx.beginPath(); ctx.moveTo(p.x, p.y - hh); ctx.lineTo(p.x + b * 0.15, p.y - hh * 0.18); ctx.lineTo(p.x - b, p.y - hh * 0.18); ctx.fill();
        ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.moveTo(p.x, p.y - hh); ctx.lineTo(p.x + b * 0.32, p.y - hh * 0.74); ctx.lineTo(p.x - b * 0.32, p.y - hh * 0.74); ctx.fill();
      } else if (t.type === "kurv") {
        const k = Math.max(s, 6);
        ctx.fillStyle = "rgba(0,0,0,.12)"; ctx.beginPath(); ctx.ellipse(p.x, p.y, 0.4 * k, 0.1 * k, 0, 0, 7); ctx.fill();
        ctx.fillStyle = "#6d7378"; ctx.fillRect(p.x - 0.03 * k, p.y - 1.4 * k, 0.06 * k, 1.4 * k);
        ctx.fillStyle = "#e2b31b"; ctx.fillRect(p.x - 0.33 * k, p.y - 1.42 * k, 0.66 * k, 0.09 * k); ctx.fillRect(p.x - 0.32 * k, p.y - 0.86 * k, 0.64 * k, 0.2 * k);
        ctx.strokeStyle = "#8e959b"; ctx.lineWidth = Math.max(1, 0.015 * k);
        for (let i = -3; i <= 3; i++) { ctx.beginPath(); ctx.moveTo(p.x + i * 0.08 * k, p.y - 1.33 * k); ctx.lineTo(p.x + i * 0.05 * k, p.y - 0.86 * k); ctx.stroke(); }
      } else {
        const pd = projicer(t.l.u, t.l.v, t.z), r = Math.max(5, 0.14 * pd.s);
        ctx.fillStyle = "rgba(0,0,0,.18)"; ctx.beginPath(); ctx.ellipse(p.x, p.y, r, r * 0.3, 0, 0, 7); ctx.fill();
        ctx.fillStyle = "#e8590c"; ctx.beginPath(); ctx.ellipse(pd.x, pd.y, r, r * 0.38, 0, 0, 7); ctx.fill();
      }
    });
    if (!flyvende && !slut && (fase === "sigte" || fase === "kraft")) tegnSigte();
    // Gul pil over kurven, når den er langt væk
    const kl = tilLokal(lay.kurv);
    if (kl.v > 0.6 && P.type !== "putt") {
      const kp = projicer(kl.u, kl.v), y = kp.y - 1.4 * Math.max(kp.s, 6) - 16;
      ctx.fillStyle = "#e2b31b"; ctx.strokeStyle = "#2b2118"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(kp.x, y + 12); ctx.lineTo(kp.x - 9, y); ctx.lineTo(kp.x + 9, y); ctx.closePath(); ctx.fill(); ctx.stroke();
    }
    if (!flyvende && !slut) { ctx.fillStyle = "#e8590c"; ctx.beginPath(); ctx.ellipse(W / 2, H - 34, 36, 12, 0, 0, 7); ctx.fill(); }
    ctx.fillStyle = "rgba(255,255,255,.9)"; ctx.beginPath(); ctx.roundRect(10, 10, 132, 34, 8); ctx.fill();
    ctx.fillStyle = "#2b2118"; ctx.font = "600 17px Rubik, system-ui"; ctx.textAlign = "left";
    ctx.fillText(vind === 0 ? "Vindstille" : "Vind " + (vind > 0 ? "→ " : "← ") + Math.abs(vind).toLocaleString("da") + " m/s", 20, 33);
    tegnMini(flyvende);
  }
  // Sigtelinje og grønt målfelt i billedet
  function tegnSigte() {
    const vinkel = vinkelFra((sigte + P.vindEffekt) / P.sigteTol);
    const maalD = P.maalD || P.d;
    const laengde = fase === "kraft" ? laengdeFra((kraft - P.idealKraft) / P.kraftVindue) : maalD;
    const vf = P.type === "putt" ? 0.45 : Math.tan(P.T.vinkelFejl * Math.PI / 180) * maalD;
    const dyb = P.type === "putt" ? 0.5 : maalD * P.T.laengdeFejl;
    const om = P.omvej || 0;
    ctx.fillStyle = "rgba(46,125,50,.28)"; ctx.strokeStyle = "rgba(46,125,50,.9)"; ctx.lineWidth = 2; ctx.beginPath();
    for (let a = 0; a <= 6.3; a += 0.15) {
      const lu = Math.cos(a) * vf, lv = maalD + Math.sin(a) * dyb;
      const p = projicer(lu * Math.cos(om) + lv * Math.sin(om), -lu * Math.sin(om) + lv * Math.cos(om));
      a ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y);
    }
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = "#e8590c"; ctx.lineWidth = 4; ctx.setLineDash([12, 9]); ctx.beginPath();
    for (let v = 1.5; v <= laengde; v += Math.max(0.3, laengde / 40)) { const p = projicer(Math.sin(vinkel) * v, Math.cos(vinkel) * v); v === 1.5 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y); }
    ctx.stroke(); ctx.setLineDash([]);
    const e = projicer(Math.sin(vinkel) * laengde, Math.cos(vinkel) * laengde);
    ctx.strokeStyle = "#b3202a"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(e.x, e.y, 9, 0, 7); ctx.moveTo(e.x - 14, e.y); ctx.lineTo(e.x + 14, e.y); ctx.moveTo(e.x, e.y - 14); ctx.lineTo(e.x, e.y + 14); ctx.stroke();
  }
  function tegnMini(fly) {
    const mw = mini.width, mh = mini.height, sx = mw / (2 * lay.bredde + 8), sy = (mh - 12) / (lay.L + 10);
    const M = p => ({ x: mw / 2 + p.x * sx, y: mh - 6 - p.y * sy });
    mctx.fillStyle = "#cfdccf"; mctx.fillRect(0, 0, mw, mh);
    mctx.fillStyle = "#f4f8f6"; mctx.fillRect(mw / 2 - lay.bredde * sx, 0, lay.bredde * 2 * sx, mh);
    lay.vand.forEach(v => { const a = M({ x: v.x1, y: v.y2 }), b = M({ x: v.x2, y: v.y1 }); mctx.fillStyle = "#9fd0ec"; mctx.fillRect(a.x, a.y, b.x - a.x, b.y - a.y); });
    lay.traeer.forEach(t => { const p = M(t); mctx.fillStyle = "#2f6b45"; mctx.beginPath(); mctx.arc(p.x, p.y, Math.max(2.2, t.r * sx), 0, 7); mctx.fill(); });
    const k = M(lay.kurv); mctx.fillStyle = "#e2b31b"; mctx.beginPath(); mctx.arc(k.x, k.y, 5, 0, 7); mctx.fill();
    if (bane.length) { mctx.strokeStyle = "#e8590c"; mctx.lineWidth = 2; mctx.beginPath(); bane.forEach(b => { const p = M(b); mctx.lineTo(p.x, p.y); }); mctx.stroke(); }
    const d = M(fly || st); mctx.fillStyle = "#e8590c"; mctx.strokeStyle = "#fff"; mctx.lineWidth = 1.5; mctx.beginPath(); mctx.arc(d.x, d.y, 4.5, 0, 7); mctx.fill(); mctx.stroke();
  }

  /* ----- Forløb ----- */
  function naesteKast() {
    if (stoppet) return;
    if (st.kast >= MAKS_KAST) return faerdig(false);
    vind = Math.round((Math.random() * 2 - 1) * 3 * (hul.vind || 0) * 10) / 10;
    P = parametre();
    fase = "sigte"; t0 = performance.now();
    status.textContent = KASTTYPER[P.type].navn + " · Kast " + (st.kast + 1) + " · " + (P.d < 10 ? P.d.toLocaleString("da", { maximumFractionDigits: 1 }) : Math.round(P.d)) + " m til kurven";
    sZone.style.left = (50 + (-P.vindEffekt - P.sigteTol) * 50) + "%";
    sZone.style.width = (P.sigteTol * 100) + "%";
    kZone.style.left = ((P.idealKraft - P.kraftVindue) * 100) + "%";
    kZone.style.width = (P.kraftVindue * 200) + "%";
    kFyld.style.width = "0%";
    knap.textContent = "Sigt!"; knap.disabled = false;
    if (P.omvej) besked.textContent = "Træ i vejen – målfeltet ligger ved åbningen.";
    loop();
  }
  function loop() {
    if (stoppet) return;
    const t = (performance.now() - t0) / 1000;
    if (fase === "sigte") { sigte = Math.sin(t * (2.3 + (P.type === "drive" ? 0.6 : 0))); sMark.style.left = (50 + sigte * 50) + "%"; }
    else if (fase === "kraft") { const x = (t * P.fart) % 2; kraft = x < 1 ? x : 2 - x; kFyld.style.width = (kraft * 100) + "%"; }
    else return;
    tegn();
    raf = requestAnimationFrame(loop);
  }
  function tryk() {
    if (fase === "sigte") { fase = "kraft"; t0 = performance.now(); knap.textContent = P.type === "putt" ? "Put!" : "Kast!"; }
    else if (fase === "kraft") { fase = "flyver"; cancelAnimationFrame(raf); knap.disabled = true; udfoer(); }
  }

  /* ----- Kastet ----- */
  function udfoer() {
    const sF = (sigte + P.vindEffekt) / P.sigteTol, kF = (kraft - P.idealKraft) / P.kraftVindue;
    const fra = { x: st.x, y: st.y };
    let pkt, slutI, resultat;
    if (P.type === "putt") {
      const ramt = Math.abs(sF) <= 1 && Math.abs(kF) <= 1, d = P.d;
      let land;
      if (ramt) land = { u: 0, v: d };
      else {
        const side = Math.max(-1, Math.min(1, sF / 2)) * (1 + Math.random() * 1.5);
        const frem = kF < -1 ? d * (0.5 + Math.random() * 0.25) : kF > 1 ? d + 1 + Math.random() * 2.5 : d + (Math.random() - 0.3);
        land = { u: side + Math.sign(sF) * 0.6, v: frem };
      }
      pkt = Array.from({ length: 41 }, (_, i) => { const t = i / 40, w = tilVerden(land.u * t, land.v * t); return { ...w, z: (ramt ? 1.1 : 0.9) + Math.sin(Math.PI * t) * (0.4 + d * 0.05) - (ramt ? 0.1 : 0.9) * t }; });
      slutI = 40;
      const p = pkt[40];
      resultat = ramt ? { type: "ind", tekst: "Kæderne synger! 🎉" } : afstand(p, lay.kurv) < 1.2 ? { type: "tapin" } : { type: "ligger", p, tekst: null };
    } else {
      // Lidt naturlig variation, så selv et perfekt kast ikke altid lander samme sted
      const vinkel = vinkelFra(sF) + (Math.random() * 2 - 1) * 0.8 * Math.PI / 180;
      const laengde = laengdeFra(kF) * (1 + (Math.random() * 2 - 1) * 0.02);
      const land = { u: Math.sin(vinkel) * laengde, v: Math.cos(vinkel) * laengde };
      const top = Math.min(14, 0.12 * laengde + 1);
      pkt = Array.from({ length: 61 }, (_, i) => { const t = i / 60, w = tilVerden(land.u * t, land.v * t); return { ...w, z: 1.2 + top * Math.sin(Math.PI * t) - 1.2 * t }; });
      slutI = 60;
      let trae = false;
      for (let i = 1; i <= 60; i++) {
        const t = pkt[i].z < 7 && rammerTrae(pkt[i], st);
        if (t) {
          // Disc'en falder ned foran træet, med lidt luft, så næste kast kan komme forbi
          slutI = i - 1;
          while (slutI > 0 && afstand(pkt[slutI], t) < t.r + 2) slutI--;
          trae = true;
          break;
        }
      }
      const p = pkt[slutI];
      // Kun en approach kan gå direkte i kurven (et drive lander i bedste fald lige ved den)
      if (!trae && P.type === "approach" && afstand(p, lay.kurv) <= 0.6) resultat = { type: "ind", tekst: st.kast === 0 ? "ACE!!! 🎉🥏" : "Lige i kurven! 🎉" };
      else if (!trae && afstand(p, lay.kurv) < 1) resultat = { type: "tapin", tekst: "Lige ved kurven! Tap-in (+1 kast)." };
      else if (lay.iVand(p)) resultat = { type: "straf", tekst: "Plask! +1 strafkast" };
      else if (Math.abs(p.x) > lay.bredde || p.y > lay.L + 20 || p.y < -5) resultat = { type: "straf", tekst: "OB! +1 strafkast" };
      else resultat = { type: "ligger", p, tekst: trae ? "Træ! 🌲" : (Math.abs(sF) <= 1 && Math.abs(kF) <= 1) ? "Flot kast!" : kF < -1 ? "For kort" : kF > 1 ? "For langt" : sF < 0 ? "Til venstre" : "Til højre" };
    }
    // Gem resultatet med det samme, så det ikke kan omgås ved at lukke kortet
    st.kast += 1;
    if (resultat.type === "straf") st.kast += 1;
    if (resultat.type === "tapin") st.kast += 1;
    if (resultat.type === "ligger") { st.x = resultat.p.x; st.y = resultat.p.y; }
    if (resultat.type === "ind" || resultat.type === "tapin") { st.x = lay.kurv.x; st.y = lay.kurv.y; }
    if (rigtig && resultat.type !== "ind" && resultat.type !== "tapin") gem("hulstate", dag, { x: st.x, y: st.y, kast: st.kast });

    // Animér fra det gamle sted (kameraet står stille under flugten)
    const ny = { x: st.x, y: st.y };
    st.x = fra.x; st.y = fra.y;
    bane = pkt.slice(0, slutI + 1);
    const start = performance.now(), varighed = 350 + 1300 * slutI / (pkt.length - 1);
    const anim = () => {
      if (stoppet) return;
      const t = Math.min(1, (performance.now() - start) / varighed);
      tegn(pkt[Math.round(t * slutI)]);
      if (t < 1) { raf = requestAnimationFrame(anim); return; }
      st.x = ny.x; st.y = ny.y;
      if (resultat.type === "ind") { besked.textContent = resultat.tekst; return setTimeout(() => faerdig(true), 1400); }
      if (resultat.type === "tapin") { besked.textContent = resultat.tekst || "Forbi, men den ligger ved kurven. Tap-in (+1 kast)."; return setTimeout(() => faerdig(true), 1600); }
      besked.textContent = resultat.tekst || ("Forbi! " + tilKurv().toLocaleString("da", { maximumFractionDigits: 1 }) + " m tilbage.");
      setTimeout(naesteKast, 1000);
    };
    anim();
  }

  /* ----- Hullet er færdigt ----- */
  function faerdig(iKurven) {
    if (stoppet) return;
    slut = true;
    aktivtSpil = null;
    const kast = iKurven ? st.kast : MAKS_KAST;
    const sn = scoreNavn(kast, hul.par);
    h.innerHTML = "";
    const res = el("div", "hul-resultat s-" + sn.noegle);
    res.append(el("p", "hul-resultat-navn", sn.navn), el("p", null, kast + " kast på et par " + hul.par + " · " + scoreTekst(kast - hul.par) + (iKurven ? "" : " (samlet op)")));
    h.appendChild(res);
    if (rigtig) {
      const g = HUL_POINT[sn.noegle] * (hul.dobbelt ? 2 : 1);
      const paaDagen = erIdag(dag);
      const point = g + (paaDagen ? DAGSBONUS : 0);
      gem("hul", dag, { kast, point, paaDagen });
      gem("hulstate", dag, null);
      h.append(pointLinje(point), el("p", "lille-info", "Samlet score: " + scoreTekst(samletRel())));
      opdaterTop();
      tegnBanekort();
    } else {
      const nyRek = D.rekord[dag] === undefined || kast < D.rekord[dag];
      if (nyRek) gem("rekord", dag, kast);
      h.appendChild(el("p", "lille-info", nyRek ? "🏆 Ny bedste i træning!" : "Bedste i træning: " + D.rekord[dag] + " kast"));
    }
    // Efter et øjeblik går den automatisk tilbage til hullets side
    h.appendChild(el("p", "lille-info", "Går tilbage til hullet …"));
    setTimeout(() => { if (res.isConnected && kortDialog.open) aabnHul(dag); }, 2600);
  }

  naesteKast();
}

/* =====================================================
   CADDIE-OPGAVER (småpoint)
   ===================================================== */
function visCaddie(dag) {
  const c = CADDIE[dag];
  const h = visKort("Caddie-opgave · Hul " + dag, c.wordle ? "Disc golf-wordle" : c.regne ? "Regneopgave" : "Emoji-gåde", dag);
  if (D.caddie[dag]) return visCaddieSvar(dag, c, h);   // allerede løst: vis opgaven med svaret
  if (c.wordle) wordle(dag, c.wordle, h);
  else if (c.regne) regne(dag, c.regne, h);
  else emoji(dag, c.emoji, h);
}
function caddieFaerdig(dag, point, h) {
  gem("caddie", dag, { point: Math.max(0, Math.round(point)) });
  opdaterTop();
  tegnBanekort();
  h.append(pointLinje(D.caddie[dag].point), knapEl("Tilbage til dagen", "start", () => aabnHul(dag)));
}
// En løst caddie-opgave: hvad var opgaven, hvad gættede han, og hvad var svaret
function visCaddieSvar(dag, c, h) {
  const gaet = (D.caddiestate[dag] && D.caddiestate[dag].gaet) || [];
  h.appendChild(el("p", "opgave-chip loest stor-chip", "✓ Løst"));
  if (c.wordle) {
    const ORD = c.wordle.ord.toLocaleUpperCase("da"), L = ORD.length;
    const gitter = el("div", "wordle");
    gitter.style.setProperty("--l", L);
    gaet.forEach(g => vurderOrd(g, ORD).forEach((f, i) => gitter.appendChild(el("span", "felt " + f, g[i]))));
    h.append(gitter, el("p", "svar-boks", "Ordet var: " + ORD));
  } else if (c.regne) {
    const r = c.regne;
    if (r.grafik && GRAFIK[r.grafik]) {
      const g = el("div", "grafik");
      g.innerHTML = GRAFIK[r.grafik].replace(/#pil\b|"pil"/g, m => m.replace("pil", "pil-" + dag));
      h.appendChild(g);
    }
    h.appendChild(el("p", "spoergsmaal regne", r.q));
    if (gaet.length) { const ul = el("ul", "tidligere-gaet"); gaet.forEach(x => ul.appendChild(el("li", null, x))); h.appendChild(ul); }
    h.appendChild(el("p", "svar-boks", "Svar: " + formater(r.svar) + " " + (r.enhed || "")));
    if (r.forklaring) h.appendChild(el("p", "forklaring", r.forklaring));
  } else {
    h.appendChild(el("p", "emoji", c.emoji.q));
    if (gaet.length) { const ul = el("ul", "tidligere-gaet"); gaet.forEach(x => ul.appendChild(el("li", null, x))); h.appendChild(ul); }
    h.appendChild(el("p", "svar-boks", "Svar: " + c.emoji.svar[0]));
  }
  h.append(pointLinje(D.caddie[dag].point), knapEl("Tilbage til dagen", "start", () => aabnHul(dag)));
}
// Farver i wordle: rigtig plads, findes et andet sted, eller ikke med
function vurderOrd(g, ORD) {
  const L = ORD.length, res = Array(L).fill("forkert"), rest = {};
  for (let i = 0; i < L; i++) { if (g[i] === ORD[i]) res[i] = "rigtig"; else rest[ORD[i]] = (rest[ORD[i]] || 0) + 1; }
  for (let i = 0; i < L; i++) { if (res[i] !== "rigtig" && rest[g[i]]) { res[i] = "findes"; rest[g[i]]--; } }
  return res;
}
function normaliser(t) { return t.toLocaleLowerCase("da").replace(/[^\p{L}\p{N}]+/gu, " ").trim(); }
function tilTal(t) { const m = t.replace(/\s/g, "").replace(",", ".").match(/-?\d+(\.\d+)?/); return m ? parseFloat(m[0]) : NaN; }
function formater(x) { return String(x).replace(".", ","); }

/* Wordle: 50 point, hvert ekstra gæt −8 */
function wordle(dag, w, h) {
  const ORD = w.ord.toLocaleUpperCase("da"), L = ORD.length, MAKS = 6;
  const st = D.caddiestate[dag] || {};
  const gaet = st.gaet || [];
  const loest = () => gaet[gaet.length - 1] === ORD;
  const point = () => CADDIE_MAKS - 8 * Math.max(0, gaet.length - (loest() ? 1 : 0));
  const gitter = el("div", "wordle");
  gitter.style.setProperty("--l", L);
  h.appendChild(gitter);
  const saet = pointTaeller(h, CADDIE_MAKS, "Hvert ekstra gæt −8");
  const info = el("p", "info");
  const formular = svarFelt(h, "Gæt", (v, felt) => {
    const g = v.toLocaleUpperCase("da");
    if (!new RegExp("^[A-ZÆØÅ]{" + L + "}$").test(g)) { info.textContent = L + " bogstaver"; return; }
    gaet.push(g);
    gem("caddiestate", dag, { gaet });
    felt.value = ""; info.textContent = "";
    tegn();
    if (!tjek()) felt.focus();
  });
  formular.querySelector("input").maxLength = L;
  h.appendChild(info);
  function vurder(g) {
    const res = Array(L).fill("forkert"), rest = {};
    for (let i = 0; i < L; i++) { if (g[i] === ORD[i]) res[i] = "rigtig"; else rest[ORD[i]] = (rest[ORD[i]] || 0) + 1; }
    for (let i = 0; i < L; i++) { if (res[i] !== "rigtig" && rest[g[i]]) { res[i] = "findes"; rest[g[i]]--; } }
    return res;
  }
  function tegn() {
    gitter.innerHTML = "";
    for (let r = 0; r < MAKS; r++) {
      const g = gaet[r] || "", f = g ? vurder(g) : [];
      for (let i = 0; i < L; i++) gitter.appendChild(el("span", "felt " + (f[i] || ""), g[i] || ""));
    }
    saet(gaet.length >= MAKS && !loest() ? 0 : point());
  }
  function tjek() {
    if (!loest() && gaet.length < MAKS) return false;
    formular.remove();
    info.textContent = loest() ? "Fundet på " + gaet.length + " forsøg!" : "Ordet var " + ORD;
    caddieFaerdig(dag, loest() ? point() : 0, h);
    return true;
  }
  tegn();
  if (gaet.length) tjek();
}

/* Regneopgave: 50 point, forkert svar −15 */
function regne(dag, r, h) {
  const st = D.caddiestate[dag] || {};
  const gaet = st.gaet || [];
  const point = () => CADDIE_MAKS - 15 * gaet.length;
  if (r.grafik && GRAFIK[r.grafik]) {
    const g = el("div", "grafik");
    g.innerHTML = GRAFIK[r.grafik].replace(/#pil\b|"pil"/g, m => m.replace("pil", "pil-" + dag));
    h.appendChild(g);
  }
  h.appendChild(el("p", "spoergsmaal regne", r.q));
  const saet = pointTaeller(h, point(), "Forkert svar −15");
  const tidligere = el("ul", "tidligere-gaet");
  h.appendChild(tidligere);
  const info = el("p", "info");
  const formular = svarFelt(h, "Svar", (v, felt) => {
    const tal = tilTal(v);
    if (isNaN(tal)) { info.textContent = "Skriv et tal."; return; }
    const tol = (r.tolerance === undefined ? 0.02 : r.tolerance) * Math.abs(r.svar);
    if (Math.abs(tal - r.svar) <= tol + 1e-9) return afslut("Rigtigt!", point());
    gaet.push(v); gemSt(); felt.value = ""; opdater();
    if (point() <= 0) afslut("Svaret var " + formater(r.svar) + " " + (r.enhed || ""), 0);
    else { info.textContent = "Forkert"; felt.focus(); }
  }, "decimal");
  if (r.enhed) formular.querySelector("input").placeholder = "Svar i " + r.enhed;
  h.appendChild(info);
  function gemSt() { gem("caddiestate", dag, { gaet }); }
  function opdater() {
    tidligere.innerHTML = "";
    gaet.forEach(g => tidligere.appendChild(el("li", null, g)));
    saet(point());
  }
  opdater();
  function afslut(besked, p) {
    formular.remove();
    info.textContent = besked;
    if (r.forklaring) h.appendChild(el("p", "forklaring", r.forklaring));
    caddieFaerdig(dag, p, h);
  }
}

/* Emoji-gåde: 50 point, forkert −15 */
function emoji(dag, e, h) {
  const gaet = (D.caddiestate[dag] && D.caddiestate[dag].gaet) || [];
  const point = () => CADDIE_MAKS - 15 * gaet.length;
  h.appendChild(el("p", "emoji", e.q));
  const saet = pointTaeller(h, point(), "Forkert gæt −15");
  const tidligere = el("ul", "tidligere-gaet");
  h.appendChild(tidligere);
  const info = el("p", "info");
  const formular = svarFelt(h, "Svar", (v, felt) => {
    if (e.svar.some(s => normaliser(s) === normaliser(v))) return afslut("Rigtigt! " + e.svar[0], point());
    gaet.push(v); gem("caddiestate", dag, { gaet }); felt.value = ""; opdater();
    if (point() <= 0) afslut("Svaret var: " + e.svar[0], 0);
    else { info.textContent = "Forkert"; felt.focus(); }
  });
  h.appendChild(info);
  function opdater() { tidligere.innerHTML = ""; gaet.forEach(g => tidligere.appendChild(el("li", null, g))); saet(point()); }
  opdater();
  function afslut(besked, p) { formular.remove(); info.textContent = besked; caddieFaerdig(dag, p, h); }
}

kortDialog.addEventListener("close", () => { if (aktivtSpil && !kortDialog.open) { aktivtSpil.stop(); aktivtSpil = null; } });
document.getElementById("luk").addEventListener("click", () => kortDialog.close());
kortDialog.addEventListener("click", e => { if (e.target === kortDialog) kortDialog.close(); });

/* =====================================================
   JULEBUTIKPEN
   ===================================================== */
const butik = document.getElementById("butik");
let bekraefter = null, ligeKoebt = null;
async function giBesked(navn, pris, infoEl) {
  const tekst = "🥏 Jeg har lige købt \"" + navn + "\" for " + pris + " præmiepoint i Julebutikken! Hvornår får jeg den? 😄";
  if (navigator.share) {
    try { await navigator.share({ text: tekst }); return; } catch (e) { if (e.name === "AbortError") return; }
  }
  try { await navigator.clipboard.writeText(tekst); infoEl.textContent = "Kopieret. Sæt den ind i en besked til " + AFSENDER + "."; }
  catch { infoEl.textContent = "Send til " + AFSENDER + ": " + tekst; }
}
function tegnButik() {
  document.getElementById("butik-saldo-stor").textContent = saldo();
  const tillykke = document.getElementById("tillykke");
  tillykke.innerHTML = "";
  tillykke.hidden = !ligeKoebt;
  if (ligeKoebt) {
    const k = KUPONER.find(x => x.id === ligeKoebt);
    const info = el("p", "lille");
    tillykke.append(el("p", "tillykke-titel", "Tillykke! 🎉"), el("p", null, k.navn), knapEl("Send besked til " + AFSENDER, "koeb", () => giBesked(k.navn, k.pris, info)), info);
  }
  const liste = document.getElementById("butik-liste");
  liste.innerHTML = "";
  KUPONER.filter(k => !D.koeb[k.id]).forEach(kupon => {
    const li = el("li", "kupon");
    li.append(el("span", "kupon-navn", kupon.navn), pointEl(String(kupon.pris), "kupon-pris"));
    const hand = el("div", "kupon-knapper");
    if (bekraefter === kupon.id) {
      hand.append(knapEl("Ja, køb for " + kupon.pris + " præmiepoint", "koeb", () => koeb(kupon)), knapEl("Fortryd", "fortryd", () => { bekraefter = null; tegnButik(); }));
    } else {
      const mangler = kupon.pris - saldo();
      const k = knapEl(mangler <= 0 ? "Køb" : "Mangler " + mangler, "koeb", () => { bekraefter = kupon.id; ligeKoebt = null; tegnButik(); });
      k.disabled = mangler > 0;
      hand.appendChild(k);
    }
    li.appendChild(hand);
    liste.appendChild(li);
  });
  if (!liste.children.length) liste.appendChild(el("li", "tom", "Du har købt alt!"));
  const mine = document.getElementById("mine-kuponer");
  mine.innerHTML = "";
  const koebte = Object.keys(D.koeb);
  document.getElementById("mine-overskrift").hidden = !koebte.length;
  koebte.forEach(id => {
    const k = KUPONER.find(x => x.id === id), navn = k ? k.navn : id, kb = D.koeb[id];
    const li = el("li", "kupon koebt" + (kb.modtaget ? " indloest" : ""));
    li.appendChild(el("span", "kupon-navn", navn));
    if (kb.modtaget) li.appendChild(el("span", "kupon-pris", "Modtaget ✓"));
    else {
      li.appendChild(el("span", "kupon-pris", "På vej"));
      const info = el("p", "lille"), kn = el("div", "kupon-knapper");
      kn.append(knapEl("Send besked igen", "fortryd", () => giBesked(navn, kb.pris, info)),
        knapEl("Jeg har fået den", "fortryd", () => { gem("koeb", id, { ...kb, modtaget: true }); opdaterTop(); tegnButik(); }));
      li.append(kn, info);
    }
    mine.appendChild(li);
  });
}
function koeb(kupon) {
  if (saldo() < kupon.pris || D.koeb[kupon.id]) return;
  gem("koeb", kupon.id, { pris: kupon.pris, tid: Date.now(), modtaget: false });
  bekraefter = null; ligeKoebt = kupon.id;
  opdaterTop(); tegnButik();
  butik.scrollTop = 0;
}
document.getElementById("aabn-butik").addEventListener("click", () => { bekraefter = null; ligeKoebt = null; tegnButik(); butik.showModal(); });
document.getElementById("luk-butik").addEventListener("click", () => butik.close());
butik.addEventListener("click", e => { if (e.target === butik) butik.close(); });

/* =====================================================
   SPILLEDER-OVERSIGT (?spilleder)
   ===================================================== */
async function visSpilleder() {
  document.body.classList.add("spilleder-tilstand");
  const s = document.getElementById("spilleder");
  s.hidden = false;
  s.innerHTML = "<h2>Spilleder</h2><p>Henter …</p>";
  try { const data = await hentData(); SAMLINGER.forEach(k => D[k] = tilObjekt(data[k])); }
  catch { s.innerHTML = "<h2>Spilleder</h2><p>Kunne ikke hente data fra Firebase.</p>"; return; }
  s.innerHTML = "";
  const antal = Object.keys(D.hul).length;
  s.append(el("h2", null, "Spilleder" + (TEST ? " (testpladsen)" : "")),
    el("p", null, (antal ? scoreTekst(samletRel()) + " efter " + antal + " huller · " : "") + samlet() + " præmiepoint vundet · " + brugt() + " brugt · " + saldo() + " tilbage · " + titel(samlet())));
  s.appendChild(el("h3", null, "Køb"));
  const kl = el("ul", "kuponer");
  const ids = Object.keys(D.koeb).sort((a, b) => D.koeb[b].tid - D.koeb[a].tid);
  if (!ids.length) kl.appendChild(el("li", "tom", "Ingen køb endnu."));
  ids.forEach(id => {
    const k = KUPONER.find(x => x.id === id), kb = D.koeb[id];
    const li = el("li", "kupon koebt" + (kb.modtaget ? " indloest" : ""));
    li.append(el("span", "kupon-navn", k ? k.navn : id), el("span", "kupon-pris", kb.modtaget ? "Modtaget ✓" : "Ikke givet endnu"),
      el("span", "lille", new Date(kb.tid).toLocaleString("da-DK", { dateStyle: "medium", timeStyle: "short" }) + " · " + kb.pris + " præmiepoint"));
    kl.appendChild(li);
  });
  s.appendChild(kl);
  s.appendChild(el("h3", null, "Huller"));
  const tabel = el("table", "oversigt");
  tabel.innerHTML = "<thead><tr><th>Hul</th><th>Score</th><th>Præmie hul</th><th>Præmie caddie</th></tr></thead>";
  const tb = el("tbody");
  DAGE.forEach(dag => {
    const r = D.hul[dag], c = D.caddie[dag], tr = el("tr");
    tr.append(el("td", null, dag + ". " + HULLER[dag].navn),
      el("td", null, r ? r.kast + " (" + scoreNavn(r.kast, HULLER[dag].par).navn.replace("!", "") + ")" : D.hulstate[dag] ? "i gang" : "–"),
      el("td", null, r ? String(r.point) : "–"), el("td", null, c ? String(c.point) : "–"));
    tb.appendChild(tr);
  });
  tabel.appendChild(tb);
  s.appendChild(tabel);
}

/* ---------- START ---------- */
// Overskriften: sidste ord får sin egen farve
{ const ord = OVERSKRIFT.trim().split(" "), sidste = ord.pop(); const t = document.getElementById("titel"); t.textContent = ord.join(" ") + " "; t.appendChild(el("span", "logo-open", sidste)); document.title = OVERSKRIFT; }
document.getElementById("undertitel").textContent = UNDEROVERSKRIFT;
if (TEST) document.getElementById("testbanner").hidden = false;
async function start() {
  if (SPILLEDER) return visSpilleder();
  opdaterTop();
  tegnBanekort();
  if (SYNK && TEST && PARAMS.has("nulstil")) { try { await fetch(BASE + ".json", { method: "DELETE" }); } catch {} }
  hentOnline();
}
start();
