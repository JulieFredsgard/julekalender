/* =====================================================
   LOGIK – her behøver du ikke rette noget.
   Indhold og indstillinger ligger i indhold.js.
   ===================================================== */

const PARAMS = new URLSearchParams(location.search);
// ?test: alle huller kan spilles, og intet gemmes på hans rigtige plads. Send IKKE det link til ham.
// ?test=navn giver en separat testplads. ?test&nulstil rydder testpladsen.
const TEST = PARAMS.has("test");
// ?test=navn&dag=5 lader som om det er den 5. december: dag 1-5 er åbne, resten er låst. Virker kun i testtilstand.
const DAGPARAM = parseInt(PARAMS.get("dag"), 10);
const TESTDAG = TEST && DAGPARAM >= 1 && DAGPARAM <= 24 ? DAGPARAM : 0;
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
    await fetch(BASE + "/" + sti + ".json", { method: "PATCH", keepalive: true, headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
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
  if (rel <= -3) return { navn: "Albatross!", noegle: "ace" };
  if (rel === -2) return { navn: "Eagle!", noegle: "eagle" };
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
  // Niveauet bygger på alle de præmiepoint, han har vundet (også dem, han har brugt)
  document.getElementById("stilling").textContent = naeste ? p + " / " + naeste[0] + " point" : p + " point";
  // Linjen har lige langt mellem hvert niveau
  const andel = naeste ? (p - TITLER[i][0]) / (naeste[0] - TITLER[i][0]) : 0;
  document.getElementById("niveau-fyld").style.width = Math.min(100, (i + andel) / (TITLER.length - 1) * 100) + "%";
  const niv = document.getElementById("niveauer");
  niv.innerHTML = "";
  TITLER.forEach(([min, navn], n) => {
    const li = el("li", n < i ? "naaet" : n === i ? "naaet nu" : "", navn);
    li.style.left = n / (TITLER.length - 1) * 100 + "%";
    li.title = min + " præmiepoint";
    niv.appendChild(li);
  });
  // Disc golf-scoren (lav er godt) og præmiepointene vises hver for sig
  const antal = Object.keys(D.hul).length;
  document.getElementById("samlet-score").textContent = antal ? scoreTekst(samletRel()) : "–";
  document.getElementById("score-under").textContent = antal ? "efter " + antal + " " + (antal === 1 ? "hul" : "huller") : "starter 1. december";
  document.getElementById("saldo-stor").textContent = saldo();
}

/* ---------- DATOER ---------- */
function maaSpilles(dag) { if (TESTDAG) return dag <= TESTDAG; return TEST || new Date() >= new Date(AAR, 11, dag); }
function erIdag(dag) { if (TESTDAG) return dag === TESTDAG; const n = new Date(); return n.getMonth() === 11 && n.getDate() === dag; }

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
   SCOREKORTET (som på UDisc): alle 24 huller på én linje.
   På mobil kan linjen trækkes til siden.
   ===================================================== */
function tegnScorekort() {
  const boks = document.getElementById("scorekort");
  if (!boks) return;
  boks.innerHTML = "";
  const tabel = el("table", "scorekort-tabel");
  const raekke = (navn, celler, klasse) => {
    const tr = el("tr", klasse);
    const th = el("th", null, navn);
    th.scope = "row";
    tr.appendChild(th);
    celler.forEach(c => tr.appendChild(c));
    return tr;
  };
  const spillede = DAGE.filter(d => D.hul[d]);
  const sumKast = spillede.reduce((s, d) => s + D.hul[d].kast, 0);
  const sumPar = DAGE.reduce((s, d) => s + HULLER[d].par, 0);
  tabel.append(
    raekke("Hul", DAGE.map(d => el("td", erIdag(d) ? "i-dag" : "", String(d))).concat([el("td", "sum", "Total")]), "hul-raekke"),
    raekke("Par", DAGE.map(d => el("td", null, String(HULLER[d].par))).concat([el("td", "sum", String(sumPar))]), "par-raekke"),
    raekke("Score", DAGE.map(d => {
      const td = el("td"), r = D.hul[d];
      if (r) td.appendChild(el("span", "score s-" + scoreNavn(r.kast, HULLER[d].par).noegle, String(r.kast)));
      return td;
    }).concat([el("td", "sum", spillede.length ? String(sumKast) : "–")]), "score-raekke")
  );
  boks.appendChild(tabel);
  // Rul hen til dagens hul (eller det sidst spillede), hvis linjen er for lang til skærmen
  const fokus = DAGE.find(erIdag) || spillede[spillede.length - 1];
  if (fokus) {
    const td = tabel.rows[0].cells[fokus];
    boks.scrollLeft = td.offsetLeft - boks.clientWidth / 2 + td.offsetWidth / 2;
  }
}

/* =====================================================
   BANEN: et kort over de 24 huller, der fylder resten af skærmen.
   Brede skærme får banen på langs (3 rækker), mobiler på højkant.
   Hul 1 ligger øverst til venstre og hul 24 nederst til højre.
   Tallene er andele af kortets bredde og højde (0-1).
   ===================================================== */
const BANE_BRED = {
  hus: [0.030, 0.150], traeMaal: [0.968, 0.930],
  huller: [
    [0.085, 0.215], [0.200, 0.275], [0.315, 0.200], [0.435, 0.270], [0.555, 0.195], [0.675, 0.265], [0.795, 0.205], [0.915, 0.285],
    [0.930, 0.530], [0.810, 0.590], [0.690, 0.515], [0.570, 0.590], [0.450, 0.520], [0.330, 0.595], [0.210, 0.520], [0.085, 0.590],
    [0.070, 0.850], [0.190, 0.925], [0.310, 0.850], [0.430, 0.925], [0.550, 0.850], [0.670, 0.925], [0.785, 0.850], [0.900, 0.920]
  ],
  soeer: [[0.330, 0.370, 0.045], [0.565, 0.370, 0.055], [0.190, 0.700, 0.040], [0.670, 0.700, 0.055]]
};
const BANE_HOEJ = {
  hus: [0.080, 0.095], traeMaal: [0.945, 0.965],
  huller: [
    [0.235, 0.170], [0.400, 0.205], [0.560, 0.155], [0.720, 0.205], [0.885, 0.170],
    [0.890, 0.320], [0.710, 0.345], [0.530, 0.300], [0.350, 0.345], [0.140, 0.320],
    [0.110, 0.480], [0.300, 0.505], [0.490, 0.460], [0.680, 0.505], [0.880, 0.480],
    [0.890, 0.640], [0.710, 0.665], [0.530, 0.620], [0.350, 0.665], [0.130, 0.640],
    [0.120, 0.800], [0.330, 0.850], [0.560, 0.830], [0.790, 0.930]
  ],
  soeer: [[0.240, 0.255, 0.085], [0.615, 0.405, 0.080], [0.400, 0.575, 0.085], [0.620, 0.730, 0.085], [0.300, 0.945, 0.110]]
};

// Blød kurve gennem punkterne. Giver ét stykke pr. hul og punkter langs stien.
function bloedSti(pkt) {
  const stykker = [], prove = [];
  for (let i = 0; i < pkt.length - 1; i++) {
    const p0 = pkt[i - 1] || pkt[i], p1 = pkt[i], p2 = pkt[i + 1], p3 = pkt[i + 2] || p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    const n = v => v.map(x => x.toFixed(1)).join(" ");
    stykker.push("M" + n(p1) + " C" + n(c1) + " " + n(c2) + " " + n(p2));
    for (let t = 0; t <= 1; t += 0.1) {
      const u = 1 - t;
      prove.push([u * u * u * p1[0] + 3 * u * u * t * c1[0] + 3 * u * t * t * c2[0] + t * t * t * p2[0],
                  u * u * u * p1[1] + 3 * u * u * t * c1[1] + 3 * u * t * t * c2[1] + t * t * t * p2[1]]);
    }
  }
  return { stykker, prove };
}
// En ujævn, lukket form (til højdekurver og søer)
function ujaevnForm(x, y, rx, ry, fase) {
  const pkt = [];
  for (let i = 0; i < 40; i++) {
    const a = i / 40 * Math.PI * 2;
    const u = 1 + 0.10 * Math.sin(2 * a + fase) + 0.06 * Math.sin(3 * a + fase * 1.7) + 0.03 * Math.sin(5 * a + fase * 2.3);
    pkt.push((x + Math.cos(a) * rx * u).toFixed(1) + "," + (y + Math.sin(a) * ry * u).toFixed(1));
  }
  return pkt.join(" ");
}

function tegnBanekort() {
  tegnScorekort();
  const kort = document.getElementById("banekort");
  const B = kort.clientWidth, H = kort.clientHeight;
  if (!B || !H) return;
  kort.innerHTML = "";
  const bane = B / H > 1.15 ? BANE_BRED : BANE_HOEJ;
  const skala = bane === BANE_BRED ? Math.max(0.78, Math.min(1.25, B / 880, H / 410)) : Math.max(0.78, Math.min(1.3, B / 430));
  const LUFT = 20, HI = H - 2 * LUFT;                     // lidt luft over og under hullerne
  const P = ([x, y]) => [x * B, LUFT + y * HI];
  const huller = bane.huller.map(P), hus = P(bane.hus), maal = P(bane.traeMaal);
  const sti = bloedSti([hus].concat(huller, [maal]));
  const tilSti = (x, y) => { let m = Infinity; for (const p of sti.prove) { const d = Math.hypot(p[0] - x, p[1] - y); if (d < m) m = d; } return m; };
  const r = frøRandom(1224);
  let s = `<rect width="${B}" height="${H}" fill="#eef1ea"/>`;

  // Højdekurver, som på et rigtigt kort
  for (let i = 0; i < (bane === BANE_BRED ? 9 : 4); i++) {
    const x = r() * B, y = r() * H, rx = (90 + r() * 130) * skala, ry = rx * (0.5 + r() * 0.3), fase = r() * 6;
    for (let k = 1; k <= 5; k++) s += `<polygon points="${ujaevnForm(x, y, rx * k / 5, ry * k / 5, fase + k * 0.12)}" fill="none" stroke="#d3dcd3" stroke-width="1"/>`;
  }

  // Tilfrosne søer
  const soeer = bane.soeer.map(([x, y, b]) => ({ x: x * B, y: LUFT + y * HI, rx: b * B, ry: Math.min(b * B * 0.42, HI * 0.045) }))
    .filter(q => !huller.some(([mx, my]) => Math.abs(mx - q.x) < q.rx * 1.1 + 22 * skala && my > q.y - q.ry && my - 70 * skala < q.y + q.ry))
    .filter(q => sti.prove.every(p => ((p[0] - q.x) / (q.rx * 1.15 + 14)) ** 2 + ((p[1] - q.y) / (q.ry * 1.15 + 14)) ** 2 > 1));
  soeer.forEach((q, i) => {
    s += `<polygon points="${ujaevnForm(q.x, q.y, q.rx, q.ry, i * 1.9)}" fill="#d3e3e6" stroke="#b4cdd2" stroke-width="1.200"/>
      <polygon points="${ujaevnForm(q.x, q.y, q.rx * 0.82, q.ry * 0.74, i * 1.9)}" fill="none" stroke="#e9f2f3" stroke-width="1.200"/>`;
  });
  const iSoe = (x, y) => soeer.some(q => ((x - q.x) / (q.rx * 1.2 + 6)) ** 2 + ((y - q.y) / (q.ry * 1.2 + 8)) ** 2 < 1);

  // Ruten: prikket linje. Den del, der er åben, er mørk.
  sti.stykker.forEach((d, i) => {
    if (lysTaendt(i)) return;   // her hænger lyskæden i stedet
    const aaben = i < 24 ? maaSpilles(i + 1) : maaSpilles(24);
    s += `<path d="${d}" fill="none" stroke="${aaben ? "#16352a" : "#a9b6ae"}" stroke-width="${(2.6 * skala).toFixed(1)}" stroke-linecap="round" stroke-dasharray="0.1 ${(8 * skala).toFixed(1)}"/>`;
  });

  // Skov i klynger, uden om ruten, søerne og kurvene
  const mb = 25 * skala, mh = 76 * skala;   // en kurvs halve bredde og højde
  const z = bane === BANE_BRED ? 1 : 2.1;   // mindre klynger på den smalle bane
  const taethed = (x, y) => Math.sin(x * z * 0.011 + 1.3) + Math.sin(y * z * 0.017 + 0.5) + Math.sin((x + y) * z * 0.008 + 2.1) + Math.sin((x - y) * z * 0.013);
  const traeer = [], antal = Math.round(B * H / (bane === BANE_BRED ? 2100 : 1500));
  for (let i = 0; i < antal * 9 && traeer.length < antal; i++) {
    const x = r() * B, y = r() * (H + 20), h = (17 + r() * 15) * skala, b = h * 0.34;
    if (taethed(x, y) < -0.35) continue;
    if (tilSti(x, y - h * 0.15) < 15 * skala + b || iSoe(x, y)) continue;
    if (huller.some(([mx, my]) => Math.abs(x - mx) < mb + b && y > my - mh && y - h < my + 8 * skala)) continue;
    if (Math.abs(x - hus[0]) < 34 * skala && Math.abs(y - hus[1]) < 44 * skala) continue;
    if (Math.abs(x - maal[0]) < 30 * skala && Math.abs(y - maal[1]) < 66 * skala) continue;
    if (traeer.some(t => Math.abs(t.x - x) < 9 * skala && Math.abs(t.y - y) < 7 * skala)) continue;
    traeer.push({ x, y, h, b, lys: r() });
  }
  traeer.sort((a, b) => a.y - b.y).forEach(t => { s += gran(t); });

  s += lyskaede(sti.stykker, skala) + klubhus(hus[0], hus[1], skala) + maalTrae(maal[0], maal[1], skala, lysTaendt(24));
  kort.insertAdjacentHTML("beforeend", `<svg viewBox="0 0 ${B} ${H}" aria-hidden="true" class="banekort-bg">${s}</svg>`);

  // Hvert hul er en disc golf-kurv med nummerplade (knap)
  DAGE.forEach(dag => {
    const [x, y] = huller[dag - 1], res = D.hul[dag];
    const knap = el("button", "kurv-knap");
    knap.type = "button";
    knap.innerHTML = kurvSvg(dag);
    knap.style.left = x + "px";
    knap.style.top = y + "px";
    knap.style.width = 48 * skala + "px";
    knap.title = HULLER[dag].navn;
    knap.setAttribute("aria-label", "Hul " + dag + ", " + HULLER[dag].navn + (res ? ", spillet på " + res.kast + " kast" : ", par " + HULLER[dag].par));
    if (res) knap.classList.add("spillet");
    if (erIdag(dag)) knap.classList.add("i-dag");
    if (maaSpilles(dag)) knap.addEventListener("click", () => aabnHul(dag));
    else { knap.disabled = true; knap.classList.add("laast"); }
    kort.appendChild(knap);
  });
}
// Kortet tegnes om, når vinduet ændrer størrelse
{
  let vent = null, sidst = "";
  new ResizeObserver(() => {
    const k = document.getElementById("banekort"), nu = k.clientWidth + "x" + k.clientHeight;
    if (nu === sidst) return;
    sidst = nu;
    clearTimeout(vent);
    vent = setTimeout(tegnBanekort, 120);
  }).observe(document.getElementById("banekort"));
}
// En rigtig disc golf-kurv. På banekortet er den tegnet fint, og i spillet er den lidt enklere.
// Kæder og net er kun streger, så man kan se igennem dem.
const KURV_DELE = {
  stang: "M28 25V82",
  kaederInd: "M20 34Q22 47 27 51M24 34Q25 46 27.5 51M32 34Q31 46 28.5 51M36 34Q34 47 29 51",
  kaeder: "M13 33Q15 49 26.5 54M16.5 34Q18.5 49 27 54M39.5 34Q37.5 49 29 54M43 33Q41 49 29.5 54",
  net: [-4, -3, -2, -1, 0, 1, 2, 3, 4].map(i => `M${28 + i * 4.2} 55L${28 + i * 3.5} 66`).join("") + "M11 59Q28 64 45 59",
  kant: "M10 54.5A18 4 0 0 0 46 54.5M10 54.5A18 4 0 0 1 46 54.5M13 65.5A15 3.4 0 0 0 43 65.5M10 54.5L13 65.5M46 54.5L43 65.5",
  baand: "M11 27A17 3.6 0 0 1 45 27V33A17 3.6 0 0 1 11 33Z",
  sne: "M11 27A17 3.6 0 0 1 45 27Q42 30.5 38 28.5Q34 31.5 29 29.2Q24 31.5 19 28.8Q14 30.5 11 27Z"
};
// Enklere udgave til spillet, hvor kurven er stor
const KURV_SPIL = {
  kaeder: "M13 33Q15 49 27 54M20.5 35Q22 48 27.5 54M35.5 35Q34 48 28.5 54M43 33Q41 49 29 54",
  net: [-17, -12, -7, -2.3, 2.3, 7, 12, 17].map(x => `M${28 + x} ${(54.5 + 4 * Math.sqrt(1 - (x / 18) ** 2)).toFixed(1)}L${(28 + x * 0.83).toFixed(1)} ${(65.5 + 3.4 * Math.sqrt(1 - (x * 0.83 / 15) ** 2)).toFixed(1)}`).join(""),
  kant: "M10 54.5A18 4 0 0 0 46 54.5A18 4 0 0 0 10 54.5M13 65.5A15 3.4 0 0 0 43 65.5M10 54.5L13 65.5M46 54.5L43 65.5",
  baandR: "M28 30.6A17 3.6 0 0 0 45 27V33A17 3.6 0 0 1 28 36.6Z",
  sne: "M11 27A17 3.6 0 0 1 45 27A17 3.6 0 0 1 11 27Z"
};
function kurvSvg(nr) {
  const K = KURV_DELE;
  return `<svg viewBox="0 0 56 86" aria-hidden="true">
    <ellipse class="k-skygge" cx="30" cy="82" rx="13" ry="3"/>
    <path class="k-stang" d="${K.stang}"/>
    <ellipse class="k-sne" cx="28" cy="82" rx="7" ry="2.4"/>
    <path class="k-kaeder-ind" d="${K.kaederInd}"/>
    <path class="k-kaeder" d="${K.kaeder}"/>
    <ellipse class="k-disc" cx="26" cy="54.5" rx="9.5" ry="3.6" transform="rotate(-9 26 54.5)"/>
    <path class="k-net" d="${K.net}"/>
    <path class="k-kant" d="${K.kant}"/>
    <path class="k-baand" d="${K.baand}"/>
    <path class="k-sne" d="${K.sne}"/>
    <text class="k-tal" x="28" y="19" text-anchor="middle">${nr}</text>${HULLER[nr].dobbelt ? `<path class="k-hjerte" d="M46.5 17l-5.200-5.300a3.200 3.200 0 0 1 5.200-3.700a3.200 3.200 0 0 1 5.200 3.700z"/>` : ""}</svg>`;
}
// Kurven i spillet. x, y er foden af stangen, og m er antal pixels pr. meter.
function tegnKurv(ctx, x, y, m) {
  const K = KURV_DELE, S = KURV_SPIL, f = 1.5 * m / 56;
  const streg = (d, farve, bredde) => { ctx.strokeStyle = farve; ctx.lineWidth = bredde; ctx.stroke(new Path2D(d)); };
  ctx.save();
  ctx.translate(x, y); ctx.scale(f, f); ctx.translate(-28, -82);
  const flade = (d, farve) => { ctx.fillStyle = farve; ctx.fill(new Path2D(d)); };
  ctx.fillStyle = "#d9e0d9"; ctx.beginPath(); ctx.ellipse(30, 82, 13, 3, 0, 0, 7); ctx.fill();
  streg(K.stang, "#58655e", 2.6);
  streg(S.kaeder, "#8b9790", 0.9);
  streg(S.net, "#6f7b75", 0.9);
  streg(S.kant, "#58655e", 1.4);
  flade(K.baand, "#c9a24b"); flade(S.baandR, "#b08a38");
  flade(S.sne, "#fff");
  ctx.restore();
}
// Det samme grantræ på spillets lærred
function granPaa(c, x, y, h, b, lys) {
  const halv = (side, farve) => { c.fillStyle = farve; c.beginPath(); c.moveTo(x, y - h); c.lineTo(x + side * b, y); c.lineTo(x, y); c.closePath(); c.fill(); };
  halv(1, lys < 0.5 ? "#1d4734" : "#24543e");
  halv(-1, lys < 0.5 ? "#2b6049" : "#356e55");
}
// Et grantræ i to flader
function gran(t) {
  const f = v => v.toFixed(1), { x, y, h, b } = t;
  const moerk = t.lys < 0.5 ? "#1d4734" : "#24543e", lys = t.lys < 0.5 ? "#2b6049" : "#356e55";
  return `<path d="M${f(x)} ${f(y - h)}L${f(x + b)} ${f(y)}H${f(x)}Z" fill="${moerk}"/><path d="M${f(x)} ${f(y - h)}L${f(x - b)} ${f(y)}H${f(x)}Z" fill="${lys}"/>`;
}
// Lyskæden: stykket frem til et hul tændes, når både hullet og caddieopgaven er løst. Det sidste stykke og træet tændes, når alle 24 dage er løst.
const dagLoest = d => !!D.hul[d] && (!CADDIE[d] || !!D.caddie[d]);
function lysTaendt(i) { return i < 24 ? dagLoest(i + 1) : DAGE.every(dagLoest); }
function lyskaede(stykker, k) {
  let s = "", nr = 0;
  stykker.forEach((d, i) => {
    if (!lysTaendt(i)) return;
    const sti = document.createElementNS("http://www.w3.org/2000/svg", "path");
    sti.setAttribute("d", d);
    const L = sti.getTotalLength(), n = Math.max(2, Math.round(L / (15 * k)));
    s += `<path d="${d}" fill="none" stroke="#16352a" stroke-width="${(1.3 * k).toFixed(1)}"/>`;
    for (let j = 1; j < n; j++) {
      const p = sti.getPointAtLength(L * j / n), x = p.x.toFixed(1), y = (p.y + 2.4 * k).toFixed(1);
      s += `<circle class="lys-skaer l${nr++ % 3}" cx="${x}" cy="${y}" r="${(6.5 * k).toFixed(1)}"/><circle class="lys-paere" cx="${x}" cy="${y}" r="${(2.5 * k).toFixed(1)}"/>`;
    }
  });
  return s;
}
function klubhus(x, y, k) {
  return `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${k.toFixed(2)})">
    <path d="M-20 14V-4L0 -22L20 -4V14Z" fill="#f7f4ec"/><path d="M-20 14V-4L0 -22V14Z" fill="#e4ddcc"/>
    <path d="M-25 -1L0 -24L25 -1L21 3L0 -16L-21 3Z" fill="#16352a"/>
    <rect x="-4.500" y="1" width="9" height="13" fill="#1b2a24"/><rect x="-15" y="2" width="6" height="6" fill="#c9a24b"/><rect x="9" y="2" width="6" height="6" fill="#c9a24b"/></g>`;
}
function maalTrae(x, y, k, taendt) {
  const lys = taendt ? [[-7, -30], [3, -31], [8, -24], [-3, -20], [-11, -18], [5, -14], [13, -9], [-8, -9], [0, -5], [-14, -4], [10, -3]] : [];
  return `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${k.toFixed(2)})">
    <path d="M0 -52L19 0H0Z" fill="#1d4734"/><path d="M0 -52L-19 0H0Z" fill="#2b6049"/><rect x="-2.500" y="0" width="5" height="6" fill="#1b2a24"/>
    <path d="M-5.500 -34L8 -27M-9.500 -22L12 -12M-14 -9L10 -1" stroke="#c9a24b" stroke-width="1.600" fill="none"/>
    <path d="M0 -64l2.900 6.500 7.100.700-5.300 4.700 1.600 7L0 -48.800l-6.300 3.700 1.600-7-5.300-4.700 7.100-.700z" fill="#c9a24b"/>
    ${taendt ? `<circle class="lys-skaer l0" cx="0" cy="-55" r="17"/>` : ""}${lys.map(([a, b], n) => `<circle class="lys-skaer l${n % 3}" cx="${a}" cy="${b}" r="5"/><circle class="lys-paere" cx="${a}" cy="${b}" r="2"/>`).join("")}</g>`;
}

/* =====================================================
   HULLETS SIDE: hovedopgave + caddieopgave
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
const P_IKON = '<svg class="p-ikon" viewBox="0 0 20 14" aria-hidden="true"><ellipse cx="10" cy="8.2" rx="9.2" ry="4.8" fill="#866617"/><ellipse cx="10" cy="6.4" rx="9.2" ry="4.8" fill="#c9a24b"/><ellipse cx="10" cy="6.4" rx="5.4" ry="2.6" fill="none" stroke="#f0dfae" stroke-width="1.1"/></svg>';
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
   DAGENS SIDE: to opgaver – spil hullet og caddieopgaven
   ===================================================== */
function aabnHul(dag) {
  if (!D.aabnet[dag]) gem("aabnet", dag, true);
  const hul = HULLER[dag];
  const h = visKort("Hul " + dag + " · Par " + hul.par + " · " + hul.laengde + " m" + (hul.dobbelt ? " · Dobbelt præmie" : ""), hul.navn, dag);
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
  // Dobbelt præmie: et guldmærke ved titlen, så det ses både før og efter hullet er spillet
  if (hul.dobbelt) o1.kort.querySelector(".opgave-navn h3").appendChild(el("span", "dobbelt-maerke", "2× præmie"));
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
    o1.krop.appendChild(knapEl((st ? "Fortsæt hullet" : "Spil hullet") + (hul.dobbelt ? " · dobbelt præmie" : ""), "start", () => spilHul(dag, "rigtig")));
  }
  opgaver.appendChild(o1.kort);

  // Opgave 2: caddieopgaven
  if (c) {
    const type = caddieType(c);
    const o2 = opgaveKort(2, "Caddieopgave", type, cRes ? "loest" : D.caddiestate[dag] ? "igang" : "aaben");
    if (cRes) {
      o2.krop.append(pointLinje(cRes.point), knapEl("Se opgaven og svaret", "proeve-knap", () => visCaddie(dag)));
    } else {
      o2.krop.appendChild(knapEl(D.caddiestate[dag] ? "Fortsæt opgaven" : "Løs opgaven", "start", () => visCaddie(dag)));
    }
    opgaver.appendChild(o2.kort);
  }
  h.appendChild(opgaver);
  // En personlig hilsen, når dagens opgaver er løst
  if (hul.hilsen && loeste === antalOpgaver) h.appendChild(el("p", "hilsen", hul.hilsen));
  // Regn på særlige dage: falder, så længe dagens side er åben
  if (hul.regn) regn(hul.regn);
}
// Regn hen over skærmen, når begge dagens opgaver er løst: "hjerter" eller "jul" (stjerner, snefnug og små juletræer).
// Den bliver ved, indtil man forlader dagens side eller lukker den.
let regnNr = 0;
function regn(type) {
  const mitNr = ++regnNr, side = document.getElementById("kort-handling").firstChild;
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const lerred = document.getElementById("regn"), r = Math.min(2, devicePixelRatio || 1), B = innerWidth, H = innerHeight;
  lerred.width = B * r; lerred.height = H * r;
  const c = lerred.getContext("2d"); c.setTransform(r, 0, 0, r, 0, 0); c.globalAlpha = 1;
  const former = type === "hjerter" ? ["hjerte"] : ["stjerne", "fnug", "trae", "stjerne", "fnug"];
  const farver = type === "hjerter" ? ["#c9a24b", "#e8c46a", "#f4f1e8", "#866617"] : ["#c9a24b", "#e8c46a", "#ffffff", "#2b6049"];
  const stk = Array.from({ length: 45 }, (_, i) => ({
    x: Math.random() * B, y: -20 - Math.random() * H * 0.9, v: 1.6 + Math.random() * 2.2, sv: Math.random() * 6.3, st: 0.6 + Math.random(),
    s: 9 + Math.random() * 10, rot: (Math.random() - 0.5) * 0.6, form: former[i % former.length], farve: farver[i % farver.length]
  }));
  function tegnForm(p) {
    c.save(); c.translate(p.x + Math.sin(p.sv) * 14, p.y); c.rotate(p.rot); c.fillStyle = p.farve; c.strokeStyle = p.farve; const s = p.s;
    if (p.form === "hjerte") { c.beginPath(); c.moveTo(0, s * 0.35); c.bezierCurveTo(-s, -s * 0.3, -s * 0.45, -s, 0, -s * 0.45); c.bezierCurveTo(s * 0.45, -s, s, -s * 0.3, 0, s * 0.35); c.fill(); }
    else if (p.form === "stjerne") { c.beginPath(); for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, rr = k % 2 ? s * 0.42 : s; c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } c.closePath(); c.fill(); }
    else if (p.form === "fnug") { c.lineWidth = 1.6; c.beginPath(); for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3; c.moveTo(0, 0); c.lineTo(Math.cos(a) * s * 0.8, Math.sin(a) * s * 0.8); } c.stroke(); }
    else { c.beginPath(); c.moveTo(0, -s); c.lineTo(s * 0.6, s * 0.6); c.lineTo(-s * 0.6, s * 0.6); c.closePath(); c.fill(); }
    c.restore();
  }
  (function tegn() {
    c.clearRect(0, 0, B, H);
    // Stop, når kortet lukkes, eller der vises noget andet end dagens side
    if (mitNr !== regnNr || !kortDialog.open || !side || !side.isConnected) return;
    stk.forEach(p => { p.y += p.v; p.sv += 0.03 * p.st; if (p.y > H + 20) { p.y = -20; p.x = Math.random() * B; } tegnForm(p); });
    requestAnimationFrame(tegn);
  })();
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
    // Vandet holder altid mindst 5 m fra kurven, så kurven aldrig står i vandet
    vand.push(side > 0 ? { x1: Math.max(bredde * 0.45, kurv.x + 5), x2: bredde, y1: L * 0.3, y2: L + 6 } : { x1: -bredde, x2: Math.min(-bredde * 0.45, kurv.x - 5), y1: L * 0.3, y2: L + 6 });
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
  const tempo = 1 + 0.15 * (hul.tempo || 0);   // hvor hurtigt målerne kører på dette hul
  let fase = "sigte", sigte = 0, sigteStart = 0, skub = 0, kraft = 0, t0 = 0, raf = null, stoppet = false, P = {}, bane = [], slut = false;

  const status = el("p", "spilstatus");
  const scene = el("div", "pov-scene");
  scene.innerHTML = '<canvas class="pov" width="720" height="560"></canvas><canvas class="pov-mini" width="128" height="184"></canvas>';
  const besked = el("p", "hul-besked");
  const maalere = el("div", "maalere");
  maalere.innerHTML =
    '<div class="maaler sigte"><span class="maaler-navn">Sigte</span><div class="spor"><div class="markoer"></div></div></div>' +
    '<div class="maaler kraft"><span class="maaler-navn">Kraft</span><div class="spor"><div class="fyld"></div></div></div>';
  const knap = knapEl("Sigt!", "start kast", tryk);
  h.append(status, scene, besked, maalere, knap);
  aktivtSpil = { stop() { stoppet = true; cancelAnimationFrame(raf); } };

  const lerred = scene.querySelector(".pov"), ctx = lerred.getContext("2d");
  const mini = scene.querySelector(".pov-mini"), mctx = mini.getContext("2d");
  const W = lerred.width, H = lerred.height, HORISONT = 120, F = 880;
  // Sigtemåleren følger linjen: midten er lige mod målet, og enderne er linjens yderste udsving
  const sMark = maalere.querySelector(".sigte .markoer"), kFyld = maalere.querySelector(".kraft .fyld");
  const tilKurv = () => afstand(st, lay.kurv);

  // Skovbryn i horisonten og højdekurver i sneen (faste for hvert hul)
  const fr = frøRandom(dag * 101 + 7), skovbryn = [], hoejder = [];
  for (let i = 0; i < 150; i++) {
    const x = fr() * W, h = 16 + fr() * 26, lys = fr();
    if (Math.sin(x * 0.013 + dag) + Math.sin(x * 0.031 + dag * 2) > -0.75) skovbryn.push({ x, h, b: h * 0.34, lys });
  }
  skovbryn.sort((a, b) => b.h - a.h);
  const bakker = [];
  for (let i = 0; i < 40 && bakker.length < 5; i++) {
    const cx = (fr() * 2 - 1) * lay.bredde, cy = fr() * lay.L, rx = 7 + fr() * 8, fase = fr() * 6;
    if (bakker.some(b => Math.hypot(b.cx - cx, (b.cy - cy) / 0.75) < (b.rx + rx) * 1.2)) continue;
    bakker.push({ cx, cy, rx });
    for (let k = 1; k <= 3; k++) hoejder.push(Array.from({ length: 91 }, (_, j) => {
      const a = j / 90 * Math.PI * 2, u = k / 3 * (1 + 0.1 * Math.sin(2 * a + fase) + 0.06 * Math.sin(3 * a + fase * 1.7));
      return { x: cx + Math.cos(a) * rx * u, y: cy + Math.sin(a) * rx * 0.7 * u };
    }));
  }

  /* ----- Kamera: fra disc'en mod kurven ----- */
  const kameraHoejde = () => Math.max(1.6, Math.min(6, tilKurv() * 0.07));
  const retning = () => Math.atan2(lay.kurv.x - st.x, lay.kurv.y - st.y);
  function tilLokal(p) { const a = retning(), rx = p.x - st.x, ry = p.y - st.y; return { u: rx * Math.cos(a) - ry * Math.sin(a), v: rx * Math.sin(a) + ry * Math.cos(a) }; }
  function tilVerden(u, v) { const a = retning(); return { x: st.x + u * Math.cos(a) + v * Math.sin(a), y: st.y - u * Math.sin(a) + v * Math.cos(a) }; }
  // Ved korte putts står kameraet et stykke bag disc'en, så hele kurven kan ses
  const bag = () => Math.max(0, 6.5 - tilKurv());
  function projicer(u, v, z) { const dz = Math.max(0.5, v + bag()); return { x: W / 2 + u * F / dz, y: HORISONT + (kameraHoejde() - (z || 0)) * F / dz, s: F / dz }; }

  /* ----- Parametre for dette kast ----- */
  function parametre() {
    const d = tilKurv(), type = kastType(d), T = KASTTYPER[type];
    if (type === "putt") {
      return { type, d, sigteTol: Math.max(0.09, 0.2 - 0.009 * d), kraftVindue: Math.max(0.05, 0.14 - 0.007 * d),
               idealKraft: Math.min(0.85, 0.3 + 0.055 * d), skub, fart: 0.75 + d * 0.045 };
    }
    const m = findMaal(Math.min(d, T.maks), T.sigteTol);
    return { type, d, maalD: m.laengde, T, sigteTol: T.sigteTol, kraftVindue: T.kraftVindue,
             idealKraft: 0.25 + 0.6 * (m.laengde / T.maks), skub, fart: T.fart, omvej: m.side,
             feltC: m.side / (SIGTE_BRED * m.laengde) };   // feltets midte på sigtet (0 = midt i svinget)
  }
  // Målfeltet: helst lige mod kurven. Står et træ i vejen, eller lander man i vand/OB, flyttes feltet
  // ud til siden, hvor der er fri bane (evt. et kortere kast). Sigtet svinger altid lige langt ud til begge sider.
  function findMaal(laengde, tol) {
    const fri = (u, l) => {
      for (let i = 1; i <= 30; i++) if (rammerTrae(tilVerden(u * i / 30, l * i / 30), st, 0.8)) return false;
      const land = tilVerden(u, l);
      return Math.abs(land.x) < lay.bredde - 2 && land.y < lay.L + 15 && !lay.iVand(land, 1.5);
    };
    for (const andel of [1, 0.85, 0.7, 0.55, 0.4, 0.25]) {
      const l = laengde * andel, maksSide = SIGTE_BRED * l * (1 - tol) * 0.95;
      for (let k = 0; k <= 30; k++) for (const s of k ? [1, -1] : [1]) {
        const u = s * maksSide * k / 30;
        if (fri(u, l)) return { side: u, laengde: l };
      }
    }
    return { side: 0, laengde: laengde * 0.25 };
  }
  // Rammer et punkt et træ? Et træ, man ligger lige ved (fx efter at have ramt det), tæller ikke,
  // så man altid kommer væk fra det i næste kast.
  function rammerTrae(p, fra, margen) {
    if (afstand(p, fra) <= 2.5) return null;
    return lay.traeer.find(t => afstand(t, fra) > t.r + 5 && afstand(p, t) < t.r + (margen || 0)) || null;
  }
  // Retning og længde ud fra målerne
  // Sigtet kører lige fra venstre til højre hen over billedet (ingen buer), lige langt ud til begge sider,
  // uanset om det er en kort putt eller et drive. SIGTE_BRED er, hvor langt ud til siden det når (andel af dybden).
  const SIGTE_BRED = 0.38;
  // Punktet på sigtelinjen, når kastet når l meter frem. Linjen går fra kameraets fødder.
  function punkt(l) { return { u: sigte * SIGTE_BRED * (l + bag()), v: l }; }
  // Landingsfeltets halve bredde i meter: svarer præcis til det vindue på sigtet, der giver et ramt kast
  function feltBredde() { const L = P.maalD || P.d; return (bag() + L) * SIGTE_BRED * P.sigteTol; }
  // Landingsfeltets dybde i meter (samme tal bruges til feltet på jorden)
  // Ved putts fanger kæderne også en hård putt: den går i, hvis den ville lande op til 1,5 m bag kurven.
  // Helt tæt på (under 6 m) er der endnu mere plads, så en fast putt tæt på næsten altid går i.
  const puttBag = d => Math.max(1.5, 3 - 0.25 * d);
  // Feltets forreste og bageste kant i meter fra disc'en
  function feltKanter() { const L = P.maalD || P.d, dyb = feltDybde(); return P.type === "putt" ? [L - dyb, L + puttBag(L)] : [L - dyb, L + dyb]; }
  function feltDybde() { const L = P.maalD || P.d; return P.type === "putt" ? Math.min(0.5, L * 0.3) : L * P.T.laengdeFejl; }
  // Kastets længde ud fra kraftmåleren. Ens for alle kast: fra disc'en ved nul kraft, gennem landingsfeltet,
  // når kraften er i det rigtige vindue, og videre forbi med samme fart. Så føles en putt som et drive.
  function laengdeFra(k) {
    const L = P.maalD || P.d, dyb = feltDybde();
    const a = P.idealKraft - P.kraftVindue, b = P.idealKraft + P.kraftVindue, haeld = (L - dyb) / a;
    if (k < a) return Math.max(0.3, k * haeld);
    if (k <= b) return L - dyb + (k - a) / (b - a) * 2 * dyb;
    return L + dyb + (k - b) * haeld;
  }


  /* ----- Tegning ----- */
  function linje(punkter, farve, bredde, stiplet) {
    ctx.strokeStyle = farve; ctx.lineWidth = bredde; ctx.setLineDash(stiplet || []);
    ctx.beginPath(); let ny = true;
    punkter.forEach(p => { const l = tilLokal(p); if (l.v + bag() < 0.6) { ny = true; return; } const s = projicer(l.u, l.v); ny ? ctx.moveTo(s.x, s.y) : ctx.lineTo(s.x, s.y); ny = false; });
    ctx.stroke(); ctx.setLineDash([]);
  }
  function tegn(flyvende) {
    ctx.fillStyle = "#d9e5e6"; ctx.fillRect(0, 0, W, HORISONT);
    ctx.fillStyle = "#eef1ea"; ctx.fillRect(0, HORISONT, W, H - HORISONT);
    skovbryn.forEach(t => granPaa(ctx, t.x, HORISONT + 1, t.h, t.b, t.lys));
    // Højdekurver i sneen, som på banekortet
    hoejder.forEach(ring => linje(ring, "#d3dcd3", 1.5));
    // Vand
    lay.vand.forEach(v => {
      const hjoerner = [];
      for (let i = 0; i <= 16; i++) hjoerner.push({ x: v.x1 + (v.x2 - v.x1) * i / 16, y: v.y1 });
      for (let i = 0; i <= 16; i++) hjoerner.push({ x: v.x2 - (v.x2 - v.x1) * i / 16, y: v.y2 });
      ctx.fillStyle = "#cbdfe3"; ctx.strokeStyle = "#a5c3c9"; ctx.lineWidth = 2; ctx.beginPath();
      hjoerner.forEach((p, i) => { const l = tilLokal(p); const s = projicer(l.u, Math.max(0.8 - bag(), l.v)); i ? ctx.lineTo(s.x, s.y) : ctx.moveTo(s.x, s.y); });
      ctx.closePath(); ctx.fill(); ctx.stroke();
    });
    // OB-linjer og cirkel 1
    [-lay.bredde, lay.bredde].forEach(xb => linje(Array.from({ length: 90 }, (_, i) => ({ x: xb, y: -10 + i * (lay.L + 30) / 89 })), "#a8821f", 3, [12, 9]));
    linje(Array.from({ length: 64 }, (_, i) => ({ x: lay.kurv.x + Math.cos(i / 10) * PUTT_ZONE, y: lay.kurv.y + Math.sin(i / 10) * PUTT_ZONE })), "#a9b6ae", 2, [8, 8]);

    const ting = lay.traeer.map(t => ({ type: "trae", r: t.r, l: tilLokal(t) })).concat([{ type: "kurv", l: tilLokal(lay.kurv) }]);
    if (flyvende) ting.push({ type: "disc", l: tilLokal(flyvende), z: flyvende.z });
    ting.filter(t => t.l.v + (t.type === "trae" ? 0 : bag()) > 0.6).sort((a, b) => b.l.v - a.l.v).forEach(t => {
      const p = projicer(t.l.u, t.l.v), s = p.s;
      if (t.type === "trae") {
        const b = t.r * 1.15 * s;
        ctx.fillStyle = "#dde4dc"; ctx.beginPath(); ctx.ellipse(p.x, p.y, b * 1.1, b * 0.16, 0, 0, 7); ctx.fill();
        granPaa(ctx, p.x, p.y, b / 0.36, b, (t.r * 7) % 1);
      } else if (t.type === "kurv") {
        tegnKurv(ctx, p.x, p.y, Math.max(s, 9));
      } else {
        const pd = projicer(t.l.u, t.l.v, t.z), r = Math.max(5, 0.14 * pd.s);
        ctx.fillStyle = "#c9d2ca"; ctx.beginPath(); ctx.ellipse(p.x, p.y, r, r * 0.3, 0, 0, 7); ctx.fill();
        ctx.fillStyle = "#c9a24b"; ctx.strokeStyle = "#866617"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(pd.x, pd.y, r, r * 0.38, 0, 0, 7); ctx.fill(); ctx.stroke();
      }
    });
    if (!flyvende && !slut && (fase === "sigte" || fase === "kraft")) tegnSigte();
    // Gul pil over kurven, når den er langt væk
    const kl = tilLokal(lay.kurv);
    if (kl.v > 0.6 && P.type !== "putt") {
      const kp = projicer(kl.u, kl.v), y = kp.y - 1.5 * Math.max(kp.s, 9) - 16;
      ctx.fillStyle = "#c9a24b"; ctx.strokeStyle = "#1b2a24"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(kp.x, y + 12); ctx.lineTo(kp.x - 9, y); ctx.lineTo(kp.x + 9, y); ctx.closePath(); ctx.fill(); ctx.stroke();
    }
    tegnMini(flyvende);
  }
  // Sigtelinje og grønt målfelt i billedet
  function tegnSigte() {
    const maalD = P.maalD || P.d;
    const laengde = fase === "kraft" ? laengdeFra(kraft) : maalD;
    const vf = feltBredde();
    const dyb = feltDybde();
    ctx.fillStyle = "rgba(201,162,75,.55)"; ctx.strokeStyle = "#16352a"; ctx.lineWidth = 2; ctx.beginPath();
    for (let a = 0; a <= 6.3; a += 0.15) {
      const [for_, bag_] = feltKanter(), lu = Math.cos(a) * vf, lv = (for_ + bag_) / 2 + Math.sin(a) * (bag_ - for_) / 2;
      const p = projicer(lu + (P.omvej || 0), lv);
      a ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y);
    }
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = "#16352a"; ctx.lineWidth = 4; ctx.setLineDash([12, 9]); ctx.beginPath();
    // Fra krydset og lige ned til kanten af billedet (linjen fra kameraets fødder er lodret i billedet).
    // Stregerne regnes fra krydset, så de ser ens ud ved alle kast og ikke "kravler", når linjen flytter sig.
    { const q = punkt(laengde), p = projicer(q.u, q.v); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x, H); }
    ctx.stroke(); ctx.setLineDash([]);
    // Afstandsmærker på jorden langs sigtelinjen, så man kan se, hvor langt kastet når. Kun mens kraften vælges.
    if (fase === "kraft") {
    const trin = P.type === "putt" ? 1 : P.type === "approach" ? 5 : 10, tekstHver = P.type === "approach" ? 10 : trin;
    ctx.strokeStyle = "rgba(22,53,42,.6)"; ctx.fillStyle = "rgba(22,53,42,.8)"; ctx.lineWidth = 2.5; ctx.textBaseline = "middle";
    let sidstY = Infinity;   // springer et mærke over, hvis det ville stå oven i det forrige
    for (let m = trin; m <= maalD * 1.4; m += trin) {
      const q = punkt(m), cu = q.u, cv = q.v;
      if (cv + bag() < 1) continue;
      const hb = P.type === "putt" ? 0.22 : trin * 0.1;
      const a = projicer(cu - hb, cv), b = projicer(cu + hb, cv);
      if (sidstY - b.y < 14) continue;
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      if (m % tekstHver === 0 && sidstY - b.y > 30) { ctx.font = "600 " + Math.round(Math.max(17, Math.min(28, b.s * (P.type === "putt" ? 0.22 : 1.1)))) + "px Barlow, sans-serif"; ctx.fillText(m + " m", b.x + 8, b.y); sidstY = b.y; }
    }
    }
    const eq = punkt(laengde), e = projicer(eq.u, eq.v);
    ctx.strokeStyle = "#16352a"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(e.x, e.y, 9, 0, 7); ctx.moveTo(e.x - 14, e.y); ctx.lineTo(e.x + 14, e.y); ctx.moveTo(e.x, e.y - 14); ctx.lineTo(e.x, e.y + 14); ctx.stroke();
  }
  function tegnMini(fly) {
    const mw = mini.width, mh = mini.height, sx = mw / (2 * lay.bredde + 8), sy = (mh - 12) / (lay.L + 10);
    const M = p => ({ x: mw / 2 + p.x * sx, y: mh - 6 - p.y * sy });
    mctx.fillStyle = "#d9e0d9"; mctx.fillRect(0, 0, mw, mh);
    mctx.fillStyle = "#eef1ea"; mctx.fillRect(mw / 2 - lay.bredde * sx, 0, lay.bredde * 2 * sx, mh);
    lay.vand.forEach(v => { const a = M({ x: v.x1, y: v.y2 }), b = M({ x: v.x2, y: v.y1 }); mctx.fillStyle = "#cbdfe3"; mctx.fillRect(a.x, a.y, b.x - a.x, b.y - a.y); });
    lay.traeer.forEach(t => { const p = M(t); const b = Math.max(2.6, t.r * sx); granPaa(mctx, p.x, p.y + b, b * 2.6, b, (t.r * 7) % 1); });
    const k = M(lay.kurv); mctx.fillStyle = "#16352a"; mctx.beginPath(); mctx.arc(k.x, k.y, 5, 0, 7); mctx.fill();
    if (bane.length) { mctx.strokeStyle = "#866617"; mctx.lineWidth = 2; mctx.beginPath(); bane.forEach(b => { const p = M(b); mctx.lineTo(p.x, p.y); }); mctx.stroke(); }
    const d = M(fly || st); mctx.fillStyle = "#c9a24b"; mctx.strokeStyle = "#866617"; mctx.lineWidth = 1.5; mctx.beginPath(); mctx.arc(d.x, d.y, 4.5, 0, 7); mctx.fill(); mctx.stroke();
  }

  /* ----- Forløb ----- */
  function naesteKast() {
    if (stoppet) return;
    if (st.kast >= MAKS_KAST) return faerdig(false);
    // Den grønne sigtezone og markøren starter et nyt sted ved hvert kast
    sigteStart = Math.random() * Math.PI * 2;
    P = parametre();
    fase = "sigte"; t0 = performance.now();
    status.textContent = KASTTYPER[P.type].navn + " · Kast " + (st.kast + 1) + " · " + (P.d < 10 ? P.d.toLocaleString("da", { maximumFractionDigits: 1 }) : Math.round(P.d)) + " m til kurven";
    kFyld.style.width = "0%";
    maalere.dataset.fase = "sigte";
    knap.textContent = "Sigt!"; knap.disabled = false;
    if (P.omvej) besked.textContent = "Træ i vejen – målfeltet ligger ved åbningen.";
    loop();
  }
  function loop() {
    if (stoppet) return;
    const t = (performance.now() - t0) / 1000;
    // Sigte: jævn fart frem og tilbage (ikke som et pendul). Kraft: samme fart. Begge er ens ved alle kast.
    if (fase === "sigte") {
      sigte = Math.asin(Math.sin(sigteStart + t * tempo * 2.0)) * 2 / Math.PI;
      sMark.style.left = (50 + sigte * 50) + "%";
    }
    else if (fase === "kraft") { const x = (t * tempo * 0.92) % 2; kraft = x < 1 ? x : 2 - x; kFyld.style.width = (kraft * 100) + "%"; }
    else return;
    tegn();
    raf = requestAnimationFrame(loop);
  }
  function tryk() {
    if (fase === "sigte") { fase = "kraft"; t0 = performance.now(); maalere.dataset.fase = "kraft"; knap.textContent = P.type === "putt" ? "Putt!" : "Kast!"; }
    else if (fase === "kraft") { fase = "flyver"; cancelAnimationFrame(raf); knap.disabled = true; udfoer(); }
  }

  /* ----- Kastet ----- */
  // Disc'en ligger aldrig tættere på kurven end en meter, så man altid selv skal putte den i
  function mindstEnMeter(p) {
    const d = afstand(p, lay.kurv);
    if (d >= 1) return p;
    const a = d > 0.05 ? Math.atan2(p.y - lay.kurv.y, p.x - lay.kurv.x) : Math.random() * Math.PI * 2;
    return { x: lay.kurv.x + Math.cos(a), y: lay.kurv.y + Math.sin(a) };
  }
  function udfoer() {
    const sF = (sigte - (P.feltC || 0)) / P.sigteTol, kF = (kraft - P.idealKraft) / P.kraftVindue;
    const fra = { x: st.x, y: st.y };
    let pkt, slutI, resultat;
    if (P.type === "putt") {
      const [for_, bag_] = feltKanter(), lp = laengdeFra(kraft);
      const ramt = Math.abs(sF) <= 1 && lp >= for_ && lp <= bag_, d = P.d;
      let land;
      if (ramt) land = { u: 0, v: d };
      else {
        // Forbi: disc'en lander der, hvor krydset stod, med en lille smule variation
        const q = punkt(laengdeFra(kraft) + (Math.random() - 0.5) * 0.3);
        land = { u: q.u + (Math.random() - 0.5) * 0.2, v: q.v };
      }
      pkt = Array.from({ length: 41 }, (_, i) => { const t = i / 40, w = tilVerden(land.u * t, land.v * t); return { ...w, z: (ramt ? 1.1 : 0.9) + Math.sin(Math.PI * t) * (0.4 + d * 0.05) - (ramt ? 0.1 : 0.9) * t }; });
      slutI = 40;
      const p = pkt[40];
      resultat = ramt ? { type: "ind", tekst: "Kæderne synger! 🎉" } : { type: "ligger", p: mindstEnMeter(p), tekst: null };
    } else {
      // Lidt naturlig variation, så selv et perfekt kast ikke altid lander samme sted
      // Disc'en lander der, hvor krydset står, med en lille smule naturlig variation
      const laengde = laengdeFra(kraft) * (1 + (Math.random() * 2 - 1) * 0.02), maal = punkt(laengde);
      const land = { u: maal.u + (Math.random() * 2 - 1) * 0.014 * laengde, v: maal.v };
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
      if (!trae && P.type === "approach" && afstand(p, lay.kurv) <= 0.6) {
        resultat = { type: "ind", tekst: st.kast === 0 ? "ACE!!! 🎉🥏" : "Lige i kurven! 🎉" };
        // Flyvningen ender inde i kurven (ca. 0,65 m oppe) i stedet for på jorden foran den
        pkt = pkt.map((q, i) => { const t = i / 60, w = t * t; return { x: q.x + (lay.kurv.x - p.x) * w, y: q.y + (lay.kurv.y - p.y) * w, z: q.z + 0.65 * t }; });
      }
      else if (lay.iVand(p)) resultat = { type: "straf", tekst: "Plask! +1 strafkast" };
      else if (Math.abs(p.x) > lay.bredde || p.y > lay.L + 20 || p.y < -5) resultat = { type: "straf", tekst: "OB! +1 strafkast" };
      else resultat = { type: "ligger", p: mindstEnMeter(p), tekst: trae ? "Træ! 🌲" : (Math.abs(sF) <= 1 && Math.abs(kF) <= 1) ? "Flot kast!" : kF < -1 ? "For kort" : kF > 1 ? "For langt" : sF < 0 ? "Til venstre" : "Til højre" };
    }
    // Gem resultatet med det samme, så det ikke kan omgås ved at lukke kortet
    st.kast += 1;
    if (resultat.type === "straf") st.kast += 1;
    if (resultat.type === "ligger") { st.x = resultat.p.x; st.y = resultat.p.y; }
    if (resultat.type === "ind") { st.x = lay.kurv.x; st.y = lay.kurv.y; }
    if (rigtig && resultat.type !== "ind") gem("hulstate", dag, { x: st.x, y: st.y, kast: st.kast });

    // Animér fra det gamle sted (kameraet står stille under flugten)
    const ny = { x: st.x, y: st.y };
    st.x = fra.x; st.y = fra.y;
    bane = pkt.slice(0, slutI + 1);
    const start = performance.now(), varighed = 350 + 1300 * slutI / (pkt.length - 1);
    const anim = () => {
      if (stoppet) return;
      const t = Math.min(1, (performance.now() - start) / varighed);
      const i = Math.round(t * slutI), l = tilLokal(pkt[i]);
      // Ved korte putts flyver disc'en også ind i billedet fra kameraet
      tegn({ ...tilVerden(l.u, l.v - bag() * (1 - i / (slutI || 1))), z: pkt[i].z });
      if (t < 1) { raf = requestAnimationFrame(anim); return; }
      st.x = ny.x; st.y = ny.y;
      if (resultat.type === "ind") { besked.textContent = resultat.tekst; return setTimeout(() => faerdig(true), 1400); }
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
    res.append(el("p", "hul-resultat-navn", sn.navn), el("p", null, kast + " kast på et par " + hul.par + " · " + scoreTekst(kast - hul.par) + (iKurven ? "" : " (samlet op)") + (hul.dobbelt && rigtig ? " · dobbelt præmie" : "")));
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
   CADDIEOPGAVER (småpoint)
   ===================================================== */
const caddieType = c => c.wordle ? (c.wordle.navn || "Disc golf wordle") : c.regne ? "Regneopgave" : "Emojigåde";
function visCaddie(dag) {
  const c = CADDIE[dag];
  const h = visKort("Caddieopgave · Hul " + dag, caddieType(c), dag);
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
// En løst caddieopgave: hvad var opgaven, hvad gættede han, og hvad var svaret
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
    if (c.emoji.tema) h.appendChild(el("p", "lille-info", c.emoji.tema));
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
  h.appendChild(el("p", "lille-info", "Gæt ordet på " + L + " bogstaver. Mørk: rigtig plads. Guld: med i ordet, men et andet sted."));
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

/* Emojigåde: 50 point, forkert −15 */
function emoji(dag, e, h) {
  const gaet = (D.caddiestate[dag] && D.caddiestate[dag].gaet) || [];
  const point = () => CADDIE_MAKS - 15 * gaet.length;
  if (e.tema) h.appendChild(el("p", "lille-info", e.tema));
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
   JULEBUTIKKEN
   ===================================================== */
const butik = document.getElementById("butik");
let bekraefter = null, ligeKoebt = null;
// Åbner en færdig mail om købet i hans mailprogram. Han skal selv trykke send.
function aabnMail(navn, pris) {
  const tekst = ["Hej " + AFSENDER, "", "Jeg har lige købt \"" + navn + "\" for " + pris + " præmiepoint i Julebutikken. Hvornår får jeg den?", "", "Hilsen " + NAVN].join(String.fromCharCode(13, 10));
  location.href = "mailto:" + MAIL.join("@") + "?subject=" + encodeURIComponent(MAIL_EMNE) + "&body=" + encodeURIComponent(tekst);
}
// Sender købet til dig via Web3Forms, så han ikke selv skal skrive. Svarer true, hvis mailen gik igennem.
async function sendKoebMail(kupon) {
  if (!WEB3FORMS_NOEGLE) return false;
  const tid = new Date().toLocaleString("da-DK", { dateStyle: "long", timeStyle: "short" });
  const linjer = [NAVN + " har købt \"" + kupon.navn + "\" for " + kupon.pris + " præmiepoint i Julebutikken.", "", "Tidspunkt: " + tid, "Saldo efter købet: " + saldo() + " præmiepoint"];
  try {
    const svar = await fetch("https://api.web3forms.com/submit", {
      method: "POST", keepalive: true,
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ access_key: WEB3FORMS_NOEGLE, subject: (TEST ? "[TEST] " : "") + MAIL_EMNE, from_name: OVERSKRIFT, message: linjer.join(String.fromCharCode(10)) })
    });
    const data = await svar.json().catch(() => ({}));
    return svar.ok && data.success === true;
  } catch (e) { console.warn("Kunne ikke sende mail om købet:", e); return false; }
}
// Boksen med tillykke og konfetti efter et køb
const koebtBoks = document.getElementById("koebt-boks");
function visKoebtBoks(kupon) {
  document.getElementById("koebt-titel").textContent = kupon.navn;
  const tekst = document.getElementById("koebt-tekst"), ekstra = document.getElementById("koebt-ekstra");
  tekst.textContent = AFSENDER + " har fået besked og sørger for, at den snart lander hos dig.";
  ekstra.innerHTML = "";
  koebtBoks.showModal();
  konfetti(document.getElementById("konfetti"));
  return besked => {
    if (besked) return;
    tekst.textContent = "Beskeden til " + AFSENDER + " kunne ikke sendes automatisk. Skriv selv, så er du sikker på at få den.";
    ekstra.appendChild(knapEl("Skriv til " + AFSENDER, "koebt-knap-lys", () => aabnMail(kupon.navn, kupon.pris)));
  };
}
document.getElementById("koebt-ok").addEventListener("click", () => koebtBoks.close());
// Konfetti i guld, grønt og hvidt, der falder i et par sekunder
function konfetti(lerred) {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const r = Math.min(2, devicePixelRatio || 1), B = innerWidth, H = innerHeight;
  lerred.width = B * r; lerred.height = H * r;
  const c = lerred.getContext("2d"); c.scale(r, r);
  const farver = ["#c9a24b", "#e8c46a", "#f4f1e8", "#2b6049", "#866617"];
  const stk = Array.from({ length: 160 }, () => ({
    x: B / 2 + (Math.random() - 0.5) * B * 0.3, y: H * 0.35, vx: (Math.random() - 0.5) * 16, vy: -6 - Math.random() * 12,
    v: Math.random() * 6, dv: (Math.random() - 0.5) * 0.4, b: 6 + Math.random() * 6, h: 3 + Math.random() * 4, f: farver[Math.floor(Math.random() * farver.length)]
  }));
  const start = performance.now();
  (function tegn(nu) {
    const t = (nu - start) / 1000;
    c.clearRect(0, 0, B, H);
    if (t > 4 || !koebtBoks.open) return;
    c.globalAlpha = Math.min(1, 4 - t);
    stk.forEach(p => {
      p.vy += 0.35; p.vx *= 0.985; p.x += p.vx; p.y += p.vy; p.v += p.dv;
      c.save(); c.translate(p.x, p.y); c.rotate(p.v); c.scale(1, Math.cos(p.v * 2)); c.fillStyle = p.f; c.fillRect(-p.b / 2, -p.h / 2, p.b, p.h); c.restore();
    });
    requestAnimationFrame(tegn);
  })(start);
}
function tegnButik() {
  document.getElementById("butik-saldo-stor").textContent = saldo();
  document.getElementById("tillykke").hidden = true;
  const liste = document.getElementById("butik-liste");
  liste.innerHTML = "";
  KUPONER.filter(k => !D.koeb[k.id]).forEach(kupon => {
    const li = el("li", "kupon" + (kupon.pris > saldo() ? " mangler" : ""));
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
      const kn = el("div", "kupon-knapper");
      // Knappen til at skrive selv vises kun, hvis den automatiske mail ikke gik igennem
      if (kb.mail === false) kn.appendChild(knapEl("Skriv til " + AFSENDER, "fortryd", () => aabnMail(navn, kb.pris)));
      kn.append(knapEl("Jeg har fået den", "fortryd", () => { gem("koeb", id, { ...kb, modtaget: true }); opdaterTop(); tegnButik(); }));
      li.append(kn);
    }
    mine.appendChild(li);
  });
}
function koeb(kupon) {
  if (saldo() < kupon.pris || D.koeb[kupon.id]) return;
  const kb = { pris: kupon.pris, tid: Date.now(), modtaget: false };
  gem("koeb", kupon.id, kb);
  bekraefter = null; ligeKoebt = null;
  opdaterTop(); tegnButik();
  const svar = visKoebtBoks(kupon);
  sendKoebMail(kupon).then(ok => { gem("koeb", kupon.id, { ...kb, mail: ok }); svar(ok); tegnButik(); });
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
if (TESTDAG) document.getElementById("testbanner").textContent = "Testtilstand: siden tror, det er den " + TESTDAG + ". december. Intet gemmes på hans rigtige plads.";
async function start() {
  if (SPILLEDER) return visSpilleder();
  opdaterTop();
  tegnBanekort();
  if (SYNK && TEST && PARAMS.has("nulstil")) { try { await fetch(BASE + ".json", { method: "DELETE" }); } catch {} }
  hentOnline();
}
start();
