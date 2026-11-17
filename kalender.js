/* =====================================================
   LOGIK – her behøver du ikke rette noget.
   Indhold og indstillinger ligger i indhold.js.
   ===================================================== */

const PARAMS = new URLSearchParams(location.search);

// ?test: alle låger kan åbnes, og intet gemmes på hans rigtige plads. Send IKKE det link til ham.
// ?test=navn giver en separat testplads. ?test&nulstil rydder testpladsen.
const TEST = PARAMS.has("test");
// ?spilleder: din oversigt over hans point, køb og rekorder
const SPILLEDER = PARAMS.has("spilleder");

const NOEGLER = {
  aabnet:  "julekalender-" + AAR,
  score:   "julekalender-point-" + AAR,
  forsoeg: "julekalender-forsoeg-" + AAR,
  koeb:    "julekalender-koeb-" + AAR,
  rekord:  "julekalender-rekord2-" + AAR,
  bonus:   "julekalender-bonus-" + AAR
};
if (PARAMS.has("nulstil")) {
  try { Object.values(NOEGLER).forEach(k => localStorage.removeItem(k)); } catch {}
}

const RAEKKEFOELGE = Array.from({ length: 24 }, (_, i) => i + 1);

/* ---------- GEMME LOKALT ---------- */
function hentLokalt(noegle, standard) {
  if (TEST) return standard;
  try { return JSON.parse(localStorage.getItem(noegle)) || standard; }
  catch { return standard; }
}
function gemLokalt(noegle, vaerdi) {
  if (TEST) return;
  try { localStorage.setItem(noegle, JSON.stringify(vaerdi)); } catch {}
}

let AABNEDE = hentLokalt(NOEGLER.aabnet, []);
let SCORE   = hentLokalt(NOEGLER.score, {});    // { 5: { point: 80, paaDagen: true } }
let FORSOEG = hentLokalt(NOEGLER.forsoeg, {});  // opgaver i gang
let KOEB    = hentLokalt(NOEGLER.koeb, {});     // { disc: { pris, tid, modtaget } }
let REKORD  = hentLokalt(NOEGLER.rekord, {});   // { discgolf: 1, snefnug: 34, ... }
let BONUS   = hentLokalt(NOEGLER.bonus, {});    // { "1734...": { point: 5, spil: "snefnug", tid } }

/* ---------- SYNKRONISERING (Firebase) ---------- */
const SYNK = Boolean(DATABASE_URL && KODE);
const TESTNAVN = (PARAMS.get("test") || "").replace(/[^a-z0-9-]/gi, "");
const BASE = DATABASE_URL.replace(/\/$/, "") + "/kalender/" + KODE + (TEST ? "-test" + (TESTNAVN ? "-" + TESTNAVN : "") : "");

async function skriv(sti, data) {
  if (!SYNK) return;
  try {
    await fetch(BASE + "/" + sti + ".json", {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data)
    });
  } catch (e) { console.warn("Kunne ikke gemme online:", e); }
}
function tilObjekt(x) {
  const o = {};
  if (!x) return o;
  Object.keys(x).forEach(k => { if (x[k] || x[k] === 0) o[k] = x[k]; });
  return o;
}
function flet(lokal, online, sti) {
  const op = {};
  Object.keys(lokal).forEach(k => { if (!(k in online)) op[k] = lokal[k]; });
  if (Object.keys(op).length) skriv(sti, op);
  return { ...lokal, ...online };
}
function fletRekorder(lokal, online) {
  const res = { ...online }, op = {};
  Object.keys(lokal).forEach(k => {
    if (erBedre(k, lokal[k], online[k])) { res[k] = lokal[k]; op[k] = lokal[k]; }
  });
  if (Object.keys(op).length) skriv("rekord", op);
  return res;
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
    SCORE   = flet(SCORE,   tilObjekt(data.score),   "score");
    FORSOEG = flet(FORSOEG, tilObjekt(data.forsoeg), "forsoeg");
    KOEB    = flet(KOEB,    tilObjekt(data.koeb),    "koeb");
    BONUS   = flet(BONUS,   tilObjekt(data.bonus),   "bonus");
    REKORD  = fletRekorder(REKORD, tilObjekt(data.rekord2));

    const onlineAabnet = Object.keys(tilObjekt(data.aabnet)).map(Number);
    const opAabnet = {};
    AABNEDE.forEach(d => { if (!onlineAabnet.includes(d)) opAabnet[d] = true; });
    if (Object.keys(opAabnet).length) skriv("aabnet", opAabnet);
    onlineAabnet.forEach(d => { if (!AABNEDE.includes(d)) AABNEDE.push(d); });

    Object.keys(NOEGLER).forEach(k => gemLokalt(NOEGLER[k], { aabnet: AABNEDE, score: SCORE, forsoeg: FORSOEG, koeb: KOEB, rekord: REKORD, bonus: BONUS }[k]));
    opdaterStilling();
    byg();
    tegnSpillehal();
  } catch (e) { console.warn("Kunne ikke hente online, bruger det lokale:", e); }
}

function gemAabnet(dag) {
  if (!AABNEDE.includes(dag)) AABNEDE.push(dag);
  gemLokalt(NOEGLER.aabnet, AABNEDE);
  skriv("aabnet", { [dag]: true });
}
function gemForsoeg(dag, data) {
  FORSOEG[dag] = data;
  gemLokalt(NOEGLER.forsoeg, FORSOEG);
  skriv("forsoeg", { [dag]: data });
}

/* ---------- POINT ---------- */
function giv(dag, grundpoint) {
  const paaDagen = erIdag(dag);
  const g = Math.max(0, Math.round(grundpoint)) * (INDHOLD[dag].dobbelt ? 2 : 1);
  const point = g + (g > 0 && paaDagen ? DAGSBONUS : 0);
  SCORE[dag] = { point, paaDagen };
  gemLokalt(NOEGLER.score, SCORE);
  skriv("score", { [dag]: SCORE[dag] });
  opdaterStilling();
  tegnSpillehal();
}
function givBonus(spil, point) {
  const id = String(Date.now());
  BONUS[id] = { point, spil, tid: Date.now() };
  gemLokalt(NOEGLER.bonus, BONUS);
  skriv("bonus", { [id]: BONUS[id] });
  opdaterStilling();
}

function samlet() {
  return Object.values(SCORE).reduce((s, x) => s + (x.point || 0), 0)
       + Object.values(BONUS).reduce((s, x) => s + (x.point || 0), 0);
}
function brugt() { return Object.values(KOEB).reduce((s, x) => s + (x.pris || 0), 0); }
function saldo() { return samlet() - brugt(); }

function titel(point) {
  let t = TITLER[0][1];
  for (const [min, navn] of TITLER) if (point >= min) t = navn;
  return t;
}

// Titel, progress bar og niveauer i toppen
function opdaterStilling() {
  const p = samlet();
  const i = TITLER.reduce((idx, [min], n) => (p >= min ? n : idx), 0);
  const naeste = TITLER[i + 1];
  document.getElementById("titel-navn").textContent = titel(p);
  document.getElementById("stilling").textContent = naeste
    ? p + " / " + naeste[0] + " point til " + naeste[1]
    : p + " point · højeste titel!";
  const andel = naeste ? (p - TITLER[i][0]) / (naeste[0] - TITLER[i][0]) : 1;
  document.getElementById("niveau-fyld").style.width = Math.min(100, andel * 100) + "%";
  const niveauer = document.getElementById("niveauer");
  niveauer.innerHTML = "";
  TITLER.forEach(([min, navn], n) => {
    const li = el("li", n <= i ? "naaet" : "", navn);
    li.title = min + " point";
    niveauer.appendChild(li);
  });
  document.getElementById("butik-saldo").textContent = saldo();
}

/* ---------- DATOER ---------- */
function maaAabnes(dag) {
  if (TEST) return true;
  return new Date() >= new Date(AAR, 11, dag);
}
function erIdag(dag) {
  const nu = new Date();
  return nu.getMonth() === 11 && nu.getDate() === dag;
}

/* ---------- KALENDEREN ---------- */
function byg() {
  const liste = document.getElementById("kalender");
  liste.innerHTML = "";
  RAEKKEFOELGE.forEach(dag => {
    const li = document.createElement("li");
    const knap = document.createElement("button");
    knap.type = "button";
    knap.className = "laage";
    knap.innerHTML = '<span class="tal">' + dag + "</span>";
    knap.setAttribute("aria-label", "Låge " + dag);
    if (AABNEDE.includes(dag) && maaAabnes(dag)) knap.classList.add("aabnet");
    if (erIdag(dag)) knap.classList.add("i-dag");
    if (maaAabnes(dag)) knap.addEventListener("click", () => aabn(dag, knap));
    else knap.disabled = true;
    li.appendChild(knap);
    liste.appendChild(li);
  });
}

/* ---------- SMÅ HJÆLPERE ---------- */
function el(tag, klasse, tekst) {
  const e = document.createElement(tag);
  if (klasse) e.className = klasse;
  if (tekst !== undefined) e.textContent = tekst;
  return e;
}
function knapEl(tekst, klasse, handling) {
  const k = el("button", klasse, tekst);
  k.type = "button";
  k.addEventListener("click", handling);
  return k;
}
function svarFelt(handling, knaptekst, ved, inputmode) {
  const formular = el("form", "tekstsvar");
  const felt = el("input");
  felt.type = "text";
  felt.autocomplete = "off";
  felt.setAttribute("aria-label", "Dit svar");
  if (inputmode) felt.inputMode = inputmode;
  const k = el("button", "svar-knap", knaptekst);
  k.type = "submit";
  formular.append(felt, k);
  formular.addEventListener("submit", e => {
    e.preventDefault();
    const v = felt.value.trim();
    if (v) ved(v, felt);
  });
  handling.appendChild(formular);
  return formular;
}
// Stor pointtæller med reglen i lille skrift nedenunder
function pointTaeller(handling, start, regel) {
  const boks = el("div", "live-point");
  const tal = el("strong");
  boks.append(tal, el("span", null, " point"), el("small", null, regel));
  handling.appendChild(boks);
  const saet = p => { tal.textContent = Math.max(0, Math.round(p)); };
  saet(start);
  return saet;
}

/* ---------- KORTET ---------- */
const kort = document.getElementById("kort");
let aktivtBillede = null;
let aktivtSpil = null;

function visKort(overlinje, titelTekst) {
  document.getElementById("kort-dag").textContent = overlinje;
  document.getElementById("kort-titel").textContent = titelTekst;
  document.getElementById("kort-indhold").innerHTML = "";
  document.getElementById("kort-handling").innerHTML = "";
  aktivtBillede = null;
}

function aabn(dag, knap) {
  const post = INDHOLD[dag];
  visKort(dag + ". december" + (post.dobbelt ? " · dobbelte point" : ""), post.titel);
  const boks = document.getElementById("kort-indhold");
  if (post.billede) {
    const ramme = el("div", "billedramme");
    const img = el("img");
    img.src = post.billede;
    img.alt = "";
    if (post.zoom && !SCORE[dag]) {
      img.style.transformOrigin = post.fokus || "50% 50%";
      aktivtBillede = img;
      saetZoom(post, ((FORSOEG[dag] && FORSOEG[dag].gaet) || []).length);
    }
    ramme.appendChild(img);
    boks.appendChild(ramme);
  }
  if (post.tekst) boks.appendChild(el("p", "kort-tekst", post.tekst));
  if (post.regne && post.regne.grafik && GRAFIK[post.regne.grafik]) {
    const g = el("div", "grafik");
    g.innerHTML = GRAFIK[post.regne.grafik].replace(/#pil\b|"pil"/g, m => m.replace("pil", "pil-" + dag));
    boks.appendChild(g);
  }

  const handling = document.getElementById("kort-handling");
  if (SCORE[dag]) {
    visResultat(dag, handling);
    if (post.spil && post.spil.type !== "wordle") handling.appendChild(knapEl("↻ Spil igen i Spillehallen", "start", () => aabnSpillehal(post.spil.type)));
  }
  else if (post.spil) visSpil(dag, post.spil, handling);
  else if (post.regne) visRegne(dag, post.regne, handling);
  else if (post.tekstsvar) visTekstsvar(dag, post.tekstsvar, handling);

  kort.showModal();
  gemAabnet(dag);
  knap.classList.add("aabnet");
}

function saetZoom(post, antalGaet) {
  if (!aktivtBillede) return;
  const z = 1 + (post.zoom - 1) * Math.max(0, 1 - antalGaet / 5);
  aktivtBillede.style.transform = "scale(" + z + ")";
}
function zoomUd() {
  if (aktivtBillede) aktivtBillede.style.transform = "scale(1)";
  aktivtBillede = null;
}

/* ---------- REGNEOPGAVE: 100 point, forkert svar −25, hint −15 ---------- */
const REGNE_FORKERT = 25, REGNE_HINT = 15;
function tilTal(t) {
  const ren = t.replace(/\s/g, "").replace(",", ".").match(/-?\d+(\.\d+)?/);
  return ren ? parseFloat(ren[0]) : NaN;
}
function formater(x) { return String(x).replace(".", ","); }

function visRegne(dag, r, handling) {
  const st = FORSOEG[dag] || {};
  const gaet = st.gaet || [];
  let hintKoebt = !!st.hint;
  const point = () => 100 - REGNE_FORKERT * gaet.length - (hintKoebt ? REGNE_HINT : 0);

  handling.appendChild(el("p", "spoergsmaal regne", r.q));
  const saetPoint = pointTaeller(handling, point(), "Forkert svar −" + REGNE_FORKERT + " · Hint −" + REGNE_HINT);
  const tidligere = el("ul", "tidligere-gaet");
  handling.appendChild(tidligere);
  const info = el("p", "info");
  const formular = svarFelt(handling, "Svar", (v, felt) => {
    const tal = tilTal(v);
    if (isNaN(tal)) { info.textContent = "Skriv et tal."; return; }
    const tol = (r.tolerance === undefined ? 0.02 : r.tolerance) * Math.abs(r.svar);
    if (Math.abs(tal - r.svar) <= tol + 1e-9) {
      giv(dag, point());
      afslut("Rigtigt!");
    } else {
      gaet.push(v);
      gem();
      felt.value = "";
      opdater();
      if (point() <= 0) { giv(dag, 0); afslut("Svaret var " + formater(r.svar) + " " + (r.enhed || "")); }
      else { info.textContent = "Forkert"; felt.focus(); }
    }
  }, "decimal");
  if (r.enhed) formular.querySelector("input").placeholder = "Svar i " + r.enhed;
  const hint = el("p", "hint");
  const hintKnap = r.hint ? knapEl("Køb hint (−" + REGNE_HINT + ")", "hint-knap", () => {
    hintKnap.remove(); hintKoebt = true; gem(); opdater();
  }) : null;
  handling.append(info, hint);
  if (hintKnap && !hintKoebt) handling.appendChild(hintKnap);

  function gem() { gemForsoeg(dag, { gaet, hint: hintKoebt }); }
  function opdater() {
    tidligere.innerHTML = "";
    gaet.forEach(g => tidligere.appendChild(el("li", null, g)));
    hint.textContent = hintKoebt ? r.hint : "";
    saetPoint(point());
  }
  opdater();
  function afslut(besked) {
    formular.remove();
    if (hintKnap) hintKnap.remove();
    info.textContent = besked;
    if (r.forklaring) handling.appendChild(el("p", "forklaring", r.forklaring));
    visResultat(dag, handling, true);
  }
}

/* ---------- BILLED- OG EMOJI-GÅDER: 100 point, forkert gæt −20 ---------- */
const TEKST_FORKERT = 20;
function normaliser(t) { return t.toLocaleLowerCase("da").replace(/[^\p{L}\p{N}]+/gu, " ").trim(); }

function visTekstsvar(dag, ts, handling) {
  const post = INDHOLD[dag];
  const gaet = (FORSOEG[dag] && FORSOEG[dag].gaet) || [];
  const point = () => 100 - TEKST_FORKERT * gaet.length;
  if (ts.q) handling.appendChild(el("p", /\p{Extended_Pictographic}/u.test(ts.q) && ts.q.length < 30 ? "emoji" : "spoergsmaal", ts.q));
  const saetPoint = pointTaeller(handling, point(), "Forkert gæt −" + TEKST_FORKERT);
  const tidligere = el("ul", "tidligere-gaet");
  handling.appendChild(tidligere);
  const info = el("p", "info");
  const formular = svarFelt(handling, "Svar", (v, felt) => {
    if (ts.svar.some(s => normaliser(s) === normaliser(v))) {
      giv(dag, point());
      afslut("Rigtigt! " + ts.svar[0]);
    } else {
      gaet.push(v);
      gemForsoeg(dag, { gaet });
      felt.value = "";
      saetZoom(post, gaet.length);
      opdater();
      if (point() <= 0) { giv(dag, 0); afslut("Svaret var: " + ts.svar[0]); }
      else { info.textContent = "Forkert"; felt.focus(); }
    }
  });
  handling.appendChild(info);
  function opdater() {
    tidligere.innerHTML = "";
    gaet.forEach(g => tidligere.appendChild(el("li", null, g)));
    saetPoint(point());
  }
  opdater();
  function afslut(besked) {
    formular.remove();
    info.textContent = besked;
    visResultat(dag, handling, true);
  }
}

/* =====================================================
   SPIL
   Hvert spil kører i én af tre tilstande:
   "rigtig"  – lågens første forsøg: giver point
   "proeve"  – en kort prøve før det rigtige forsøg (putting og print-tårn)
   "arkade"  – Spillehallen: ingen point, men +REKORDBONUS for ny rekord
   ===================================================== */
const SPIL_INFO = {
  discgolf:   { navn: "Putting",      ikon: "🥏", enhed: ["forbier", "forbiere"],          lavest: true, regel: "Forbier −10",
                standard: { kast: [4, 5, 6, 7, 8], vind: 1 } },
  snefnug:    { navn: "Snestorm",     ikon: "❄️", enhed: ["fnug", "fnug"],                  regel: "2 point pr. fnug · ⭐ = 3 fnug",
                standard: {} },
  printtaarn: { navn: "Print-tårnet", ikon: "🖨️", enhed: ["lag", "lag"],                    regel: "3 point pr. lag · +10 for alle 30",
                standard: {} },
  vendespil:  { navn: "Vendespil",    ikon: "🃏", enhed: ["forkert par", "forkerte par"],  lavest: true, regel: "Forkert par −10",
                standard: { symboler: ["🎄", "⭐", "🎁", "❄️", "🦌", "🔔"] } }
};
// "1 forbier", "3 forbiere"
function antal(type, n) { return n + " " + SPIL_INFO[type].enhed[n === 1 ? 0 : 1]; }
const SPIL = {};

function erBedre(type, ny, gammel) {
  if (gammel === undefined) return true;
  return (SPIL_INFO[type] || {}).lavest ? ny < gammel : ny > gammel;
}
function nyRekord(type, vaerdi) {
  if (vaerdi === undefined || !erBedre(type, vaerdi, REKORD[type])) return false;
  REKORD[type] = vaerdi;
  gemLokalt(NOEGLER.rekord, REKORD);
  skriv("rekord2", { [type]: vaerdi });
  tegnSpillehal();
  return true;
}
function rekordTekst(type) {
  return REKORD[type] === undefined ? "Ingen rekord endnu" : "Rekord: " + antal(type, REKORD[type]);
}

// Lågens spil: intro med start (og evt. prøve)
function visSpil(dag, spil, handling) {
  if (spil.type === "wordle") return wordle(dag, spil, handling);
  handling.innerHTML = "";

  if (FORSOEG[dag] && FORSOEG[dag].startet) {
    giv(dag, 0);
    handling.appendChild(el("p", "info", "Spillet blev afbrudt, så det blev til 0 point."));
    return visResultat(dag, handling, true);
  }
  const st = FORSOEG[dag] || {};
  handling.appendChild(el("p", "regel-linje", SPIL_INFO[spil.type].regel));
  handling.appendChild(knapEl("▶ Start", "start", () => {
    gemForsoeg(dag, { ...st, startet: true });
    koerSpil(spil.type, spil, handling, "rigtig", dag);
  }));
  if ((spil.type === "discgolf" || spil.type === "printtaarn") && !st.proeve) {
    handling.appendChild(knapEl(spil.type === "discgolf" ? "Tag et prøvekast" : "Prøv 3 lag først", "proeve-knap", () => {
      gemForsoeg(dag, { ...st, proeve: true });
      koerSpil(spil.type, spil, handling, "proeve", dag);
    }));
  }
  handling.appendChild(el("p", "lille-info", "Kun første forsøg giver point."));
}

function koerSpil(type, cfg, handling, tilstand, dag) {
  handling.innerHTML = "";
  if (tilstand === "proeve") handling.appendChild(el("p", "proeve-maerke", "Prøve – tæller ikke"));
  const ctx = {
    cfg, handling, tilstand, dag,
    // Pointtæller kun, når der spilles om point
    taeller: start => tilstand === "rigtig" ? pointTaeller(handling, start, SPIL_INFO[type].regel) : () => {},
    slut: (point, rekordVaerdi, besked) => slutSpil(type, ctx, point, rekordVaerdi, besked),
    afbrydVed: stop => {
      aktivtSpil = { afbryd() { stop(); aktivtSpil = null; if (tilstand === "rigtig") giv(dag, 0); } };
    }
  };
  SPIL[type](ctx);
}

function slutSpil(type, ctx, point, rekordVaerdi, besked) {
  aktivtSpil = null;
  const h = ctx.handling;
  if (ctx.tilstand === "proeve") {
    h.appendChild(el("p", "info", besked));
    h.appendChild(knapEl("Klar til det rigtige forsøg", "start", () => visSpil(ctx.dag, ctx.cfg, h)));
    return;
  }
  const ny = nyRekord(type, rekordVaerdi);
  h.appendChild(el("p", "info", besked));
  if (ctx.tilstand === "rigtig") {
    giv(ctx.dag, point);
    visResultat(ctx.dag, h, true);
    if (ny) h.appendChild(el("p", "rekord", rekordTekst(type)));
    h.appendChild(knapEl("↻ Spil igen i Spillehallen", "start", () => aabnSpillehal(type)));
  } else {
    if (ny) { givBonus(type, REKORDBONUS); h.appendChild(el("p", "ny-rekord", "🏆 Ny rekord! +" + REKORDBONUS + " point")); }
    else h.appendChild(el("p", "rekord", rekordTekst(type)));
    h.appendChild(knapEl("↻ Spil igen", "start", () => koerSpil(type, ctx.cfg, h, "arkade")));
  }
}

/* Putting: put 5 gange. Starter med 100, hver forbier −10 (mindst 10). */
SPIL.discgolf = function (ctx) {
  const { cfg, handling, tilstand } = ctx;
  const kast = cfg.kast || [4, 5, 6, 7, 8];
  const MAAL = tilstand === "proeve" ? 1 : kast.length;
  const vindstyrke = cfg.vind === undefined ? 1 : cfg.vind;
  let iKurven = 0, forbi = 0, antalKast = 0, fase = "sigte", t0 = 0, sigte = 0, kraft = 0, vind = 0, raf = null, stoppet = false;
  const point = () => Math.max(10, 100 - 10 * forbi);

  const saetPoint = ctx.taeller(100);
  const status = el("p", "spilstatus");
  const bane = el("div", "discbane");
  bane.innerHTML =
    '<div class="kurv"><div class="kurv-top"></div><div class="kaeder"></div><div class="kurv-bund"></div><div class="kurv-stang"></div></div>' +
    '<div class="disc"></div><div class="vind"></div><div class="besked"></div>';
  const maalere = el("div", "maalere");
  maalere.innerHTML =
    '<div class="maaler sigte"><span class="maaler-navn">Sigte</span><div class="spor"><div class="zone"></div><div class="markoer"></div></div></div>' +
    '<div class="maaler kraft"><span class="maaler-navn">Kraft</span><div class="spor"><div class="zone"></div><div class="fyld"></div></div></div>';
  const kastKnap = knapEl("Sigt!", "start kast", tryk);
  handling.append(status, bane, maalere, kastKnap);

  const kurv = bane.querySelector(".kurv"), disc = bane.querySelector(".disc");
  const vindEl = bane.querySelector(".vind"), besked = bane.querySelector(".besked");
  const sigteMarkoer = maalere.querySelector(".sigte .markoer"), sigteZone = maalere.querySelector(".sigte .zone");
  const kraftFyld = maalere.querySelector(".kraft .fyld"), kraftZone = maalere.querySelector(".kraft .zone");

  const afst = () => kast[Math.min(iKurven, kast.length - 1)];
  const idealKraft = () => Math.min(0.85, 0.32 + 0.05 * afst());
  const kraftVindue = () => Math.max(0.05, 0.13 - 0.006 * afst());
  const sigteTol = () => Math.max(0.09, 0.19 - 0.008 * afst());
  const vindEffekt = () => vind * 0.03 * (afst() / 7);

  function opdaterStatus() {
    status.textContent = tilstand === "proeve" ? afst() + " m" : "I kurven: " + iKurven + "/" + MAAL + " · " + afst() + " m";
    saetPoint(point());
  }
  function nytKast() {
    fase = "sigte";
    t0 = performance.now();
    vind = Math.round((Math.random() * 2 - 1) * 3 * vindstyrke * 10) / 10;
    opdaterStatus();
    vindEl.textContent = vind === 0 ? "Vindstille" : "Vind " + (vind > 0 ? "→ " : "← ") + Math.abs(vind).toLocaleString("da") + " m/s";
    besked.textContent = "";
    kastKnap.textContent = "Sigt!";
    kastKnap.disabled = false;
    const s = 1.15 - afst() * 0.045;
    kurv.style.transform = "translateX(-50%) scale(" + s + ")";
    kurv.style.top = (16 + (14 - Math.min(14, afst())) * 7) + "px";
    disc.getAnimations().forEach(a => a.cancel());
    const tol = sigteTol();
    sigteZone.style.left = (50 + (-vindEffekt() - tol) * 50) + "%";
    sigteZone.style.width = (tol * 100) + "%";
    const ik = idealKraft(), kv = kraftVindue();
    kraftZone.style.left = ((ik - kv) * 100) + "%";
    kraftZone.style.width = (kv * 200) + "%";
    kraftFyld.style.width = "0%";
    loop();
  }
  function loop() {
    if (stoppet) return;
    const t = (performance.now() - t0) / 1000;
    if (fase === "sigte") {
      sigte = Math.sin(t * (2.2 + afst() * 0.12));
      sigteMarkoer.style.left = (50 + sigte * 50) + "%";
    } else if (fase === "kraft") {
      const x = (t * (0.75 + afst() * 0.045)) % 2;
      kraft = x < 1 ? x : 2 - x;
      kraftFyld.style.width = (kraft * 100) + "%";
    }
    raf = requestAnimationFrame(loop);
  }
  function tryk() {
    if (fase === "sigte") { fase = "kraft"; t0 = performance.now(); kastKnap.textContent = "Kast!"; }
    else if (fase === "kraft") { fase = "flyver"; kastKnap.disabled = true; cancelAnimationFrame(raf); flyv(); }
  }
  function flyv() {
    const effSigte = sigte + vindEffekt();
    const d = kraft - idealKraft();
    const kv = kraftVindue(), tol = sigteTol();
    const kraftOk = Math.abs(d) <= kv, sigteOk = Math.abs(effSigte) <= tol;
    const ramt = kraftOk && sigteOk;
    antalKast++;

    const B = bane.getBoundingClientRect(), K = kurv.getBoundingClientRect();
    const kurvX = K.left + K.width / 2 - B.left, kurvY = K.top + K.height * 0.45 - B.top;
    const startX = B.width / 2, startY = B.height - 34;
    const slutX = ramt ? kurvX : kurvX + effSigte * B.width * 0.55;
    let slutY = kurvY;
    if (d < -kv) slutY = Math.min(startY - 30, kurvY + (-d) * 380);
    if (d > kv)  slutY = kurvY - 18 - d * 60;
    const skala = parseFloat(kurv.style.transform.match(/scale\(([\d.]+)\)/)[1]) * 0.75;
    const top = Math.min(slutY, startY) - 50 - afst() * 4;
    const tf = (x, y, s, r) => "translate(" + (x - startX) + "px," + (y - startY) + "px) scale(" + s + ") rotate(" + r + "deg)";
    const anim = disc.animate([
      { transform: tf(startX, startY, 1, 0) },
      { transform: tf((startX + slutX) / 2, top, (1 + skala) / 2, 360), offset: 0.5 },
      { transform: tf(slutX, slutY, skala, 720) }
    ], { duration: 850, easing: "ease-out", fill: "forwards" });

    anim.onfinish = () => {
      if (stoppet) return;
      if (ramt) {
        iKurven++;
        besked.textContent = ["Kæderne synger! 🎉", "Lige i kurven!", "Chains! ⛓️", "Perfekt putt!"][Math.floor(Math.random() * 4)];
        kurv.classList.remove("ryst"); void kurv.offsetWidth; kurv.classList.add("ryst");
      } else {
        forbi++;
        if (kraftOk && Math.abs(effSigte) <= tol * 1.6) besked.textContent = "Ramte kæderne, men røg ud!";
        else if (d < -kv) besked.textContent = "For kort!";
        else if (d > kv) besked.textContent = "For langt!";
        else besked.textContent = effSigte < 0 ? "Forbi til venstre!" : "Forbi til højre!";
      }
      opdaterStatus();
      setTimeout(() => {
        if (stoppet) return;
        const faerdig = tilstand === "proeve" ? antalKast >= 1 : (iKurven >= MAAL || forbi >= 30);
        if (!faerdig) return nytKast();
        stop();
        maalere.remove(); kastKnap.remove();
        if (tilstand === "proeve") return ctx.slut(0, undefined, ramt ? "I kurven!" : "Forbi.");
        ctx.slut(point(), iKurven >= MAAL ? forbi : undefined, "5 i kurven · " + antal("discgolf", forbi));
      }, 1100);
    };
  }
  function stop() { stoppet = true; cancelAnimationFrame(raf); }
  ctx.afbrydVed(stop);
  nytKast();
};

/* Print-tårnet: dysen fører laget frem og tilbage. Tryk, når det står over laget nedenunder. */
SPIL.printtaarn = function (ctx) {
  const { handling, tilstand } = ctx;
  const MAAL = tilstand === "proeve" ? 3 : 30;
  const H = 9;
  const saetPoint = ctx.taeller(0);
  const status = el("p", "spilstatus");
  const printer = el("div", "printer");
  printer.innerHTML = '<div class="stak"><div class="skinne"></div><div class="dyse"><div class="dyse-krop"></div><div class="dyse-spids"></div></div></div>';
  const knap = knapEl("Læg laget", "start", tryk);
  handling.append(status, printer, knap);
  printer.addEventListener("pointerdown", tryk);

  const stak = printer.querySelector(".stak"), dyse = printer.querySelector(".dyse"), skinne = printer.querySelector(".skinne");
  const W = printer.clientWidth;
  const startBredde = Math.min(110, W * 0.38);
  const lag = [{ x: (W - startBredde) / 2, w: startBredde }];
  let retning = 1, dyseX = 0, raf = null, sidst = 0, stoppet = false, aktivt = null, w = startBredde;

  tegnLag(lag[0], 0, "plade");
  nytLag();

  function tegnLag(l, i, klasse) {
    const d = el("div", "lag " + (klasse || ""));
    d.style.left = l.x + "px";
    d.style.width = l.w + "px";
    d.style.bottom = (i * H) + "px";
    d.style.height = H + "px";
    d.style.setProperty("--farve", "hsl(" + (8 + i * 4) + " 75% " + (i % 2 ? 52 : 47) + "%)");
    stak.appendChild(d);
    return d;
  }
  function nytLag() {
    const i = lag.length;
    status.textContent = "Lag " + (i - 1) + "/" + MAAL;
    saetPoint(3 * (i - 1));
    w = lag[i - 1].w;
    dyseX = retning > 0 ? w / 2 : W - w / 2;
    aktivt = tegnLag({ x: dyseX - w / 2, w }, i, "aktiv");
    dyse.style.bottom = ((i + 1) * H) + "px";
    skinne.style.bottom = ((i + 1) * H + 30) + "px";
    const hoejde = (i + 1) * H + 60, plads = printer.clientHeight - 40;
    stak.style.transform = "translateY(" + Math.max(0, hoejde - plads) + "px)";
    sidst = performance.now();
    loop();
  }
  function loop() {
    if (stoppet) return;
    const nu = performance.now();
    const dt = Math.min(0.05, (nu - sidst) / 1000);
    sidst = nu;
    const fart = 150 + (lag.length - 1) * 9;
    dyseX += retning * fart * dt;
    if (dyseX <= w / 2) { dyseX = w / 2; retning = 1; }
    if (dyseX >= W - w / 2) { dyseX = W - w / 2; retning = -1; }
    dyse.style.left = dyseX + "px";
    aktivt.style.left = (dyseX - w / 2) + "px";
    raf = requestAnimationFrame(loop);
  }
  function tryk(e) {
    if (e) e.preventDefault();
    if (stoppet || !aktivt) return;
    cancelAnimationFrame(raf);
    const under = lag[lag.length - 1];
    let x = dyseX - w / 2;
    if (Math.abs(x - under.x) < 3) x = under.x;                // tæt nok: perfekt lag
    const venstre = Math.max(x, under.x), hoejre = Math.min(x + w, under.x + under.w);
    const overlap = hoejre - venstre;
    const i = lag.length;
    aktivt.remove(); aktivt = null;
    if (overlap <= 0) {
      const f = tegnLag({ x, w }, i, "falder");
      f.addEventListener("animationend", () => f.remove());
      return slut("Spaghetti! 🍝");
    }
    if (overlap < w) {
      const afX = x < under.x ? x : hoejre;
      const f = tegnLag({ x: afX, w: w - overlap }, i, "falder");
      f.addEventListener("animationend", () => f.remove());
    }
    lag.push({ x: venstre, w: overlap });
    tegnLag(lag[i], i, overlap === w ? "perfekt" : "");
    if (lag.length - 1 >= MAAL) return slut(tilstand === "proeve" ? "Prøven er slut." : "Printet er færdigt! 🎉", true);
    nytLag();
  }
  function slut(besked, faerdig) {
    stop();
    knap.remove();
    const n = lag.length - 1;
    status.textContent = "Lag " + n + "/" + MAAL;
    const p = 3 * n + (faerdig && tilstand !== "proeve" ? 10 : 0);
    saetPoint(p);
    ctx.slut(p, tilstand === "proeve" ? undefined : n, besked + " " + n + " lag.");
  }
  function stop() { stoppet = true; cancelAnimationFrame(raf); printer.removeEventListener("pointerdown", tryk); }
  ctx.afbrydVed(stop);
};

/* Snestorm: 2 point pr. fnug, guldstjerner tæller som 3 fnug. 25 sekunder. */
SPIL.snefnug = function (ctx) {
  const { handling } = ctx;
  const TID = 25;
  let fangst = 0, tilbage = TID;
  const saetPoint = ctx.taeller(0);
  const status = el("p", "spilstatus");
  const bane = el("div", "snebane");
  handling.append(status, bane);
  const opdater = () => { status.textContent = tilbage + " s · " + fangst + " fnug"; saetPoint(fangst * 2); };
  opdater();

  const nyt = setInterval(() => {
    const guld = Math.random() < 0.12;
    const f = el("button", "fnug" + (guld ? " guld" : ""), guld ? "⭐" : "❄");
    f.type = "button";
    f.setAttribute("aria-label", guld ? "Guldstjerne" : "Snefnug");
    f.style.left = (4 + Math.random() * 86) + "%";
    f.style.animationDuration = (guld ? 1.3 + Math.random() * 0.5 : 1.9 + Math.random() * 1.3) + "s";
    f.style.fontSize = (guld ? 1.4 : 1.2 + Math.random() * 0.8) + "rem";
    f.addEventListener("pointerdown", () => { fangst += guld ? 3 : 1; opdater(); f.remove(); });
    f.addEventListener("animationend", () => f.remove());
    bane.appendChild(f);
  }, 480);
  const ur = setInterval(() => {
    tilbage--;
    opdater();
    if (tilbage <= 0) {
      stop();
      bane.remove();
      ctx.slut(fangst * 2, fangst, fangst + " fnug fanget");
    }
  }, 1000);
  function stop() { clearInterval(nyt); clearInterval(ur); }
  ctx.afbrydVed(stop);
};

/* Vendespil: 100 point, hvert forkert par −10 (mindst 10). */
SPIL.vendespil = function (ctx) {
  const { cfg, handling } = ctx;
  const symboler = (cfg.symboler && cfg.symboler.length >= 6 ? cfg.symboler : SPIL_INFO.vendespil.standard.symboler).slice(0, 6);
  const brikker = [...symboler, ...symboler].map(s => ({ s, r: Math.random() })).sort((a, b) => a.r - b.r).map(x => x.s);
  let foerste = null, laast = false, fundne = 0, forkerte = 0;
  const point = () => Math.max(10, 100 - 10 * forkerte);
  const saetPoint = ctx.taeller(100);
  const status = el("p", "spilstatus");
  const bord = el("div", "vendebord");
  handling.append(status, bord);
  const opdater = () => { status.textContent = "Par: " + fundne + "/6 · Forkerte: " + forkerte; saetPoint(point()); };
  opdater();

  brikker.forEach(s => {
    const b = el("button", "brik");
    b.type = "button";
    b.setAttribute("aria-label", "Skjult brik");
    b.addEventListener("click", () => {
      if (laast || b === foerste || b.classList.contains("vendt")) return;
      b.classList.add("vendt"); b.dataset.s = s; b.textContent = s;
      if (!foerste) { foerste = b; return; }
      if (foerste.dataset.s === s) {
        fundne++;
        foerste.classList.add("fundet"); b.classList.add("fundet");
        foerste = null;
        opdater();
        if (fundne === 6) ctx.slut(point(), forkerte, "Alle par fundet · " + antal("vendespil", forkerte));
      } else {
        forkerte++;
        opdater();
        laast = true;
        const a = foerste; foerste = null;
        a.classList.add("fejl"); b.classList.add("fejl");
        setTimeout(() => { [a, b].forEach(x => { x.classList.remove("vendt", "fejl"); x.textContent = ""; }); laast = false; }, 750);
      }
    });
    bord.appendChild(b);
  });
  ctx.afbrydVed(() => {});
};

/* Wordle: 100 point, hvert ekstra gæt −15. Kan genoptages. */
function wordle(dag, spil, handling) {
  const ORD = spil.ord.toLocaleUpperCase("da");
  const L = ORD.length, MAKS = 6;
  const gaet = (FORSOEG[dag] && FORSOEG[dag].gaet) || [];
  const loest = () => gaet[gaet.length - 1] === ORD;
  const point = () => 100 - 15 * Math.max(0, gaet.length - (loest() ? 1 : 0));

  const gitter = el("div", "wordle");
  gitter.style.setProperty("--l", L);
  handling.appendChild(gitter);
  const saetPoint = pointTaeller(handling, 100, "Hvert ekstra gæt −15");
  const info = el("p", "info");
  const formular = svarFelt(handling, "Gæt", (v, felt) => {
    const g = v.toLocaleUpperCase("da");
    if (!new RegExp("^[A-ZÆØÅ]{" + L + "}$").test(g)) { info.textContent = L + " bogstaver"; return; }
    gaet.push(g);
    gemForsoeg(dag, { gaet });
    felt.value = "";
    info.textContent = "";
    tegn();
    if (!tjekSlut()) felt.focus();
  });
  formular.querySelector("input").maxLength = L;
  handling.appendChild(info);

  function vurder(g) {
    const res = Array(L).fill("forkert"), rest = {};
    for (let i = 0; i < L; i++) { if (g[i] === ORD[i]) res[i] = "rigtig"; else rest[ORD[i]] = (rest[ORD[i]] || 0) + 1; }
    for (let i = 0; i < L; i++) { if (res[i] !== "rigtig" && rest[g[i]]) { res[i] = "findes"; rest[g[i]]--; } }
    return res;
  }
  function tegn() {
    gitter.innerHTML = "";
    for (let r = 0; r < MAKS; r++) {
      const g = gaet[r] || "", farver = g ? vurder(g) : [];
      for (let i = 0; i < L; i++) gitter.appendChild(el("span", "felt " + (farver[i] || ""), g[i] || ""));
    }
    saetPoint(gaet.length >= MAKS && !loest() ? 0 : point());
  }
  function tjekSlut() {
    if (loest() || gaet.length >= MAKS) {
      formular.remove();
      giv(dag, loest() ? point() : 0);
      info.textContent = loest() ? "Fundet på " + gaet.length + " forsøg!" : "Ordet var " + ORD;
      visResultat(dag, handling, true);
      return true;
    }
    return false;
  }
  tegn();
  if (gaet.length) tjekSlut();
}

/* ---------- RESULTAT ---------- */
function visResultat(dag, handling, beholdOpgave) {
  zoomUd();
  if (!beholdOpgave) handling.innerHTML = "";
  const r = SCORE[dag];
  const res = el("div", "resultat");
  res.append(
    el("p", "resultat-point", "+" + r.point + " point"),
    el("p", "lille-info", (r.paaDagen && r.point > 0 ? "Inkl. " + DAGSBONUS + " i dagsbonus · " : "") + "I alt " + samlet())
  );
  handling.appendChild(res);
}

kort.addEventListener("close", () => { if (aktivtSpil && !kort.open) aktivtSpil.afbryd(); });
document.getElementById("luk").addEventListener("click", () => kort.close());
kort.addEventListener("click", e => { if (e.target === kort) kort.close(); });

/* ---------- SPILLEHALLEN ---------- */
// Et spil er låst op, når han har spillet det første gang i kalenderen
function foersteDag(type) { return RAEKKEFOELGE.find(d => INDHOLD[d].spil && INDHOLD[d].spil.type === type); }
function laastOp(type) { return RAEKKEFOELGE.some(d => INDHOLD[d].spil && INDHOLD[d].spil.type === type && SCORE[d]); }

function tegnSpillehal() {
  const liste = document.getElementById("spillehal-liste");
  if (!liste) return;
  liste.innerHTML = "";
  Object.keys(SPIL_INFO).forEach(type => {
    const info = SPIL_INFO[type];
    const aaben = laastOp(type);
    const li = el("li");
    const k = el("button", "spil-kort" + (aaben ? "" : " laast"));
    k.type = "button";
    k.append(el("span", "spil-ikon", aaben ? info.ikon : "🔒"), el("span", "spil-navn", info.navn),
      el("span", "spil-rekord", aaben ? (REKORD[type] === undefined ? "–" : antal(type, REKORD[type])) : foersteDag(type) + ". dec"));
    if (aaben) k.addEventListener("click", () => aabnSpillehal(type));
    else k.disabled = true;
    li.appendChild(k);
    liste.appendChild(li);
  });
}

function aabnSpillehal(type) {
  if (aktivtSpil) aktivtSpil.afbryd();
  const info = SPIL_INFO[type];
  visKort("Spillehallen", info.ikon + " " + info.navn);
  const h = document.getElementById("kort-handling");
  h.appendChild(el("p", "rekord", rekordTekst(type)));
  h.appendChild(el("p", "lille-info", "Slå din rekord: +" + REKORDBONUS + " point"));
  h.appendChild(knapEl("▶ Spil", "start", () => koerSpil(type, info.standard, h, "arkade")));
  if (!kort.open) kort.showModal();
}

/* ---------- JULEBUTIKKEN ---------- */
const butik = document.getElementById("butik");
let bekraefter = null, ligeKoebt = null;

function beskedTekst(navn, pris) {
  return "🎁 Jeg har lige købt \"" + navn + "\" for " + pris + " point i julekalenderen! Hvornår får jeg den? 😄";
}
async function giBesked(navn, pris, infoEl) {
  const tekst = beskedTekst(navn, pris);
  if (navigator.share) {
    try { await navigator.share({ text: tekst }); return; }
    catch (e) { if (e.name === "AbortError") return; }
  }
  try {
    await navigator.clipboard.writeText(tekst);
    infoEl.textContent = "Kopieret. Sæt den ind i en besked til " + AFSENDER + ".";
  } catch {
    infoEl.textContent = "Send til " + AFSENDER + ": " + tekst;
  }
}

function tegnButik() {
  document.getElementById("butik-saldo-stor").textContent = saldo();
  const tillykke = document.getElementById("tillykke");
  tillykke.innerHTML = "";
  tillykke.hidden = !ligeKoebt;
  if (ligeKoebt) {
    const k = KUPONER.find(x => x.id === ligeKoebt);
    const info = el("p", "lille");
    tillykke.append(
      el("p", "tillykke-titel", "Tillykke! 🎉"),
      el("p", null, k.navn),
      knapEl("Send besked til " + AFSENDER, "koeb", () => giBesked(k.navn, k.pris, info)),
      info
    );
  }
  const liste = document.getElementById("butik-liste");
  liste.innerHTML = "";
  KUPONER.filter(k => !KOEB[k.id]).forEach(kupon => {
    const li = el("li", "kupon");
    li.append(el("span", "kupon-navn", kupon.navn), el("span", "kupon-pris", kupon.pris + " point"));
    const handlinger = el("div", "kupon-knapper");
    if (bekraefter === kupon.id) {
      handlinger.append(
        knapEl("Ja, køb for " + kupon.pris + " point", "koeb", () => koeb(kupon)),
        knapEl("Fortryd", "fortryd", () => { bekraefter = null; tegnButik(); })
      );
    } else {
      const mangler = kupon.pris - saldo();
      const k = knapEl(mangler <= 0 ? "Køb" : "Mangler " + mangler, "koeb", () => { bekraefter = kupon.id; ligeKoebt = null; tegnButik(); });
      k.disabled = mangler > 0;
      handlinger.appendChild(k);
    }
    li.appendChild(handlinger);
    liste.appendChild(li);
  });
  if (!liste.children.length) liste.appendChild(el("li", "tom", "Du har købt alt!"));

  const mine = document.getElementById("mine-kuponer");
  mine.innerHTML = "";
  const koebte = Object.keys(KOEB);
  document.getElementById("mine-overskrift").hidden = !koebte.length;
  koebte.forEach(id => {
    const k = KUPONER.find(x => x.id === id);
    const navn = k ? k.navn : id;
    const li = el("li", "kupon koebt" + (KOEB[id].modtaget ? " indloest" : ""));
    li.appendChild(el("span", "kupon-navn", navn));
    if (KOEB[id].modtaget) {
      li.appendChild(el("span", "kupon-pris", "Modtaget ✓"));
    } else {
      li.appendChild(el("span", "kupon-pris", "På vej"));
      const info = el("p", "lille");
      const knapper = el("div", "kupon-knapper");
      knapper.append(
        knapEl("Send besked igen", "fortryd", () => giBesked(navn, KOEB[id].pris, info)),
        knapEl("Jeg har fået den", "fortryd", () => { KOEB[id] = { ...KOEB[id], modtaget: true }; gemKoeb(id); })
      );
      li.append(knapper, info);
    }
    mine.appendChild(li);
  });
}
function koeb(kupon) {
  if (saldo() < kupon.pris || KOEB[kupon.id]) return;
  KOEB[kupon.id] = { pris: kupon.pris, tid: Date.now(), modtaget: false };
  bekraefter = null;
  ligeKoebt = kupon.id;
  gemKoeb(kupon.id);
  butik.scrollTop = 0;
}
function gemKoeb(id) {
  gemLokalt(NOEGLER.koeb, KOEB);
  skriv("koeb", { [id]: KOEB[id] });
  opdaterStilling();
  tegnButik();
}
document.getElementById("aabn-butik").addEventListener("click", () => {
  bekraefter = null; ligeKoebt = null;
  tegnButik();
  butik.showModal();
});
document.getElementById("luk-butik").addEventListener("click", () => butik.close());
butik.addEventListener("click", e => { if (e.target === butik) butik.close(); });

/* ---------- SPILLEDER-OVERSIGT (?spilleder) ---------- */
async function visSpilleder() {
  document.body.classList.add("spilleder-tilstand");
  const s = document.getElementById("spilleder");
  s.hidden = false;
  s.innerHTML = "<h2>Spilleder</h2><p>Henter …</p>";
  let data = {};
  try { data = await hentData(); }
  catch { s.innerHTML = "<h2>Spilleder</h2><p>Kunne ikke hente data fra Firebase.</p>"; return; }
  SCORE = tilObjekt(data.score);
  KOEB = tilObjekt(data.koeb);
  REKORD = tilObjekt(data.rekord2);
  BONUS = tilObjekt(data.bonus);
  const aabnet = Object.keys(tilObjekt(data.aabnet)).map(Number);
  const bonusSum = Object.values(BONUS).reduce((a, x) => a + x.point, 0);

  s.innerHTML = "";
  s.append(
    el("h2", null, "Spilleder" + (TEST ? " (testpladsen)" : "")),
    el("p", null, samlet() + " point (heraf " + bonusSum + " rekordbonus) · " + brugt() + " brugt · " + saldo() + " tilbage · " + titel(samlet()))
  );
  s.appendChild(el("h3", null, "Køb"));
  const koebListe = el("ul", "kuponer");
  const ids = Object.keys(KOEB).sort((a, b) => KOEB[b].tid - KOEB[a].tid);
  if (!ids.length) koebListe.appendChild(el("li", "tom", "Ingen køb endnu."));
  ids.forEach(id => {
    const k = KUPONER.find(x => x.id === id);
    const li = el("li", "kupon koebt" + (KOEB[id].modtaget ? " indloest" : ""));
    li.append(
      el("span", "kupon-navn", k ? k.navn : id),
      el("span", "kupon-pris", KOEB[id].modtaget ? "Modtaget ✓" : "Ikke givet endnu"),
      el("span", "lille", new Date(KOEB[id].tid).toLocaleString("da-DK", { dateStyle: "medium", timeStyle: "short" }) + " · " + KOEB[id].pris + " point")
    );
    koebListe.appendChild(li);
  });
  s.appendChild(koebListe);

  s.appendChild(el("h3", null, "Rekorder"));
  s.appendChild(el("p", null, Object.keys(SPIL_INFO).map(t => SPIL_INFO[t].navn + ": " + (REKORD[t] === undefined ? "–" : antal(t, REKORD[t]))).join(" · ")));

  s.appendChild(el("h3", null, "Låger"));
  const tabel = el("table", "oversigt");
  tabel.innerHTML = "<thead><tr><th>Dag</th><th>Opgave</th><th>Point</th></tr></thead>";
  const tb = el("tbody");
  RAEKKEFOELGE.forEach(dag => {
    const tr = el("tr");
    const r = SCORE[dag];
    tr.append(el("td", null, String(dag)), el("td", null, INDHOLD[dag].titel),
      el("td", null, r ? r.point + (r.paaDagen ? " (på dagen)" : "") : aabnet.includes(dag) ? "åbnet" : "–"));
    tb.appendChild(tr);
  });
  tabel.appendChild(tb);
  s.appendChild(tabel);
}

/* ---------- START ---------- */
document.getElementById("undertitel").textContent = "Til " + NAVN;
if (TEST) document.getElementById("testbanner").hidden = false;

async function start() {
  if (SPILLEDER) return visSpilleder();
  opdaterStilling();
  byg();
  tegnSpillehal();
  if (SYNK && TEST && PARAMS.has("nulstil")) {
    try { await fetch(BASE + ".json", { method: "DELETE" }); } catch {}
  }
  hentOnline();
}
start();
