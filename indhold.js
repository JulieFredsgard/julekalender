/* =====================================================
   INDHOLD OG INDSTILLINGER – det er kun denne fil, du skal rette i
   (Logikken ligger i kalender.js, tegningerne i grafik.js og udseendet i styles.css)
   ===================================================== */

/* ---------- 1. INDSTILLINGER ---------- */
const OVERSKRIFT = "Mortens Jule-Open";      // Overskriften øverst på siden
const UNDEROVERSKRIFT = "Merry Discmas";   // Linjen i håndskrift under overskriften
const NAVN = "Min elskede";        // Hans navn eller kælenavn
const AFSENDER = "mig";            // Dit navn. Står i beskeden, han sender dig, når han køber noget
const AAR = new Date().getFullYear();

// Firebase: så point, køb og rekorder følger ham på tværs af enheder
const DATABASE_URL = "https://julekalender-9bb81-default-rtdb.europe-west1.firebasedatabase.app";
const KODE = "morten-er-sej-123";

// 100 point om dagen med en birdie: 50 for hullet og 50 for caddieopgaven. Eagle og ace giver lidt ekstra.
const DAGSBONUS = 0;       // ekstra point for at spille dagens hul på selve dagen (0 = ingen)

// Point for dagens hul efter score
const HUL_POINT = { ace: 60, eagle: 55, birdie: 50, par: 40, bogey: 30, dobbeltbogey: 20, vaerre: 10 };
const CADDIE_MAKS = 50;    // caddieopgaverne giver op til 50 point

// Niveauer: [mindste antal optjente point, navn]. Han rykker ikke ned, når han handler.
// Birdie på alle huller og alle caddieopgaver i første forsøg giver 2400 point.
const TITLER = [[0, "Rookie"], [400, "Amatør"], [900, "Advanced"], [1400, "Pro"], [1900, "Paul McBeth"]];

/* ---------- 2. JULEBUTIKKEN ----------
   id: kort navn uden mellemrum (må ikke ændres efter køb) · navn: står på præmien · pris: i point
   Du kan se alle køb på adressen med ?spilleder bagpå. */
const KUPONER = [
  { id: "snack",    navn: "Mystery til ganen",        pris: 150 },
  { id: "taske",    navn: "Mystery til tasken",       pris: 200 },
  { id: "spiller",  navn: "Mystery til spilleren",    pris: 300 },
  { id: "putter",   navn: "Mystery putter",           pris: 300 },
  { id: "midrange", navn: "Mystery midrange",         pris: 350 },
  { id: "driver",   navn: "Mystery driver",           pris: 400 }
];

/* ---------- 3. BANEN: ÉT HUL PR. DAG ----------
   navn:    hullets navn
   par:     3, 4 eller 5
   laengde: afstand fra tee til kurv i meter (drive op til ca. 110 m)
   kurvX:   kurvens placering til siden i meter (0 = lige ud, negativ = venstre)
   traeer:  antal træer (de placeres automatisk, men altid ens for samme hul)
   vand:    "foran" (vand foran kurven), "side" (vand langs den ene side) eller udelad
   tempo:   hvor hurtigt sigte- og kraftmåleren kører: 0 = roligt, 1 = normalt, 2 = hurtigt
   dobbelt: true giver dobbelt præmie for hullet og et lille hjerte på kortet
   hilsen:  en personlig besked, der vises, når begge dagens opgaver er løst (\n giver ny linje)
   Huller under 60 m er "ace-huller": første kast kan gå direkte i kurven. */
const HULLER = {
  1:  { navn: "Første kast",         par: 3, laengde: 60,  kurvX: 0,   traeer: 3,  tempo: 0 },
  2:  { navn: "Skrå vinkel",         par: 3, laengde: 75,  kurvX: 5,   traeer: 10, tempo: 0.5 },
  3:  { navn: "Hjemmebanen",         par: 4, laengde: 155, kurvX: -8,  traeer: 10, tempo: 0.5 },
  4:  { navn: "Putteren",            par: 4, laengde: 165, kurvX: 10,  traeer: 13, tempo: 0.5 },
  5:  { navn: "Julemarkedet",        par: 3, laengde: 75,  kurvX: 0,   traeer: 4,  tempo: 1, vand: "foran" },
  6:  { navn: "Kasteparablen",       par: 3, laengde: 45,  kurvX: 0,   traeer: 2,  tempo: 0.5 },
  7:  { navn: "Klokkebakken",        par: 5, laengde: 255, kurvX: -15, traeer: 22, tempo: 0.5 },
  8:  { navn: "De fire tal",         par: 4, laengde: 170, kurvX: 0,   traeer: 20, tempo: 0.5 },
  9:  { navn: "Disckanten",          par: 3, laengde: 90,  kurvX: 12,  traeer: 8,  tempo: 1.5 },
  10: { navn: "Bjergtoppen",         par: 5, laengde: 280, kurvX: 0,   traeer: 20, tempo: 1 },
  11: { navn: "Loftet",              par: 4, laengde: 160, kurvX: 6,   traeer: 10, tempo: 1, vand: "side" },
  12: { navn: "Filamentet",          par: 3, laengde: 70,  kurvX: -10, traeer: 10, tempo: 1 },
  13: { navn: "Før solopgang",       par: 3, laengde: 50,  kurvX: 4,   traeer: 4,  tempo: 1 },
  14: { navn: "Drømmekastet",        par: 4, laengde: 175, kurvX: -5,  traeer: 22, tempo: 1 },
  15: { navn: "Aktiekurven",         par: 4, laengde: 165, kurvX: 0,   traeer: 10, tempo: 2 },
  16: { navn: "Julefrokosten",       par: 5, laengde: 265, kurvX: 8,   traeer: 18, tempo: 1, vand: "foran" },
  17: { navn: "Kælenavnet",          par: 4, laengde: 150, kurvX: -6,  traeer: 24, tempo: 1 },
  18: { navn: "Ni år",               par: 5, laengde: 270, kurvX: 15,  traeer: 22, tempo: 1.5, dobbelt: true,
        hilsen: "Tillykke med os. Ni år, og jeg ville vælge dig igen.\nKærlig hilsen tullemissen" },
  19: { navn: "Future caddie",       par: 4, laengde: 180, kurvX: -4,  traeer: 13, tempo: 1.5, vand: "side" },
  20: { navn: "Kædereaktionen",      par: 3, laengde: 55,  kurvX: -5,  traeer: 5,  tempo: 1.5 },
  21: { navn: "Juleværkstedet",      par: 5, laengde: 285, kurvX: 0,   traeer: 26, tempo: 2 },
  22: { navn: "Under træet",         par: 4, laengde: 170, kurvX: 8,   traeer: 15, tempo: 1.5, vand: "foran" },
  23: { navn: "Kernehuset",          par: 5, laengde: 290, kurvX: -10, traeer: 26, tempo: 2, vand: "side" },
  24: { navn: "Risengrøden",         par: 4, laengde: 165, kurvX: 0,   traeer: 16, tempo: 2, vand: "foran",
        hilsen: "Glædelig jul! Fra april har du hjemmebane." }
};

/* ---------- 4. CADDIEOPGAVER: ÉN PR. DAG ----------
   Ekstra point ved siden af hullet (op til 50).
   Rækkefølgen er emoji, wordle, regne til dag 12 og derefter wordle, emoji, regne, så LUCIA kan ligge den 13.
   Wordle uden navn hedder "Disc golf wordle".
   wordle: { ord: "HYZER" }                    50 point, hvert ekstra gæt −8. Tilføj navn: "Julewordle" for en anden titel
   regne:  { q, svar, enhed, tolerance, forklaring, grafik }   50 point, forkert svar −15
           tolerance: hvor meget svaret må afvige (0.01 = 1 %). grafik: en tegning fra grafik.js
   emoji:  { tema: "Disc golf", q: "🐦", svar: ["birdie"] }     50 point, forkert gæt −15 */
const CADDIE = {
  1:  { emoji: { tema: "En disc i din taske", q: "🐝🐝🐝", svar: ["Buzz", "Buzzz", "Buz"] } },
  2:  { wordle: { ord: "HYZER" } },
  3:  { regne: { q: "Vestmarken discgolfbane får 9 huller: 6 er par 3, og 3 er par 4. Du laver 3 birdies, 1 bogey, 1 dobbeltbogey og resten par. Hvor mange kast bruger du i alt?",
                 svar: 30, enhed: "kast", tolerance: 0, grafik: "scorekort",
                 forklaring: "Par = 6 · 3 + 3 · 4 = 30. 30 − 3 + 1 + 2 = 30 kast" } },
  4:  { emoji: { tema: "En disc i din taske", q: "🌑🌓🌕", svar: ["Luna"] } },
  5:  { wordle: { ord: "GLØGG", navn: "Julewordle" } },
  6:  { regne: { q: "Du kaster med 25 m/s i 10° vinkel. Uden løft og luftmodstand: hvor langt flyver disc'en? (g = 9,82 m/s², hele meter)",
                 svar: 22, enhed: "m", tolerance: 0.03, grafik: "disc",
                 forklaring: "625 · sin(20°) / 9,82 = 21,8 ≈ 22 m" } },
  7:  { emoji: { tema: "Julesang", q: "💀🔔💣🎶", svar: ["Jingle Bombs", "Jingle Bomb"] } },
  8:  { wordle: { ord: "GLIDE" } },
  9:  { regne: { q: "En højttaler giver 88 dB på 1 meters afstand. Hvor mange dB giver den på 4 meters afstand i frit felt? (hele dB)",
                 svar: 76, enhed: "dB", tolerance: 0.005, grafik: "lyd",
                 forklaring: "88 − 20 · log(4) = 88 − 12 = 76 dB. Hver fordobling af afstanden koster 6 dB" } },
  10: { emoji: { tema: "En disc i din taske", q: "⚡🏛️", svar: ["Zeus"] } },
  11: { wordle: { ord: "NISSE", navn: "Julewordle" } },
  12: { regne: { q: "En spole med 1 kg PLA har filament på 1,75 mm i diameter. PLA vejer 1,24 g pr. cm³. Hvor langt er filamentet? (hele meter)",
                 svar: 335, enhed: "m", tolerance: 0.01, grafik: "filament",
                 forklaring: "1000 / 1,24 = 806,5 cm³. Tværsnit: π · 0,0875² = 0,02405 cm². 806,5 / 0,02405 = 33.528 cm ≈ 335 m" } },
  13: { wordle: { ord: "LUCIA", navn: "Julewordle" } },
  14: { emoji: { tema: "Disc golf", q: "1️⃣🥏🎯", svar: ["ace", "hole in one", "hole-in-one"] } },
  15: { regne: { q: "Du køber 40 aktier til 125 kr. stykket. Først stiger de 12 %, og så falder de 10 %. Hvad er de værd i alt?",
                 svar: 5040, enhed: "kr.", tolerance: 0, grafik: "aktier",
                 forklaring: "40 · 125 = 5000 kr. 5000 · 1,12 · 0,90 = 5040 kr." } },
  16: { wordle: { ord: "SNAPS", navn: "Julewordle" } },
  17: { emoji: { tema: "Noget du elsker", q: "🤪🐈", svar: ["tullemissen", "tullemisse", "tullemis"] } },
  18: { regne: { q: "Vi blev kærester den 18. december 2017. Hvor mange dage har vi været sammen i dag?",
                 svar: 3287, enhed: "dage", tolerance: 0, grafik: "aarsdag",
                 forklaring: "9 · 365 = 3285 dage. 2020 og 2024 var skudår, så 3285 + 2 = 3287 dage" } },
  19: { wordle: { ord: "LAURA", navn: "Familiewordle" } },
  20: { emoji: { tema: "En disc i din taske", q: "🔗🔗🔗", svar: ["Link"] } },
  21: { regne: { q: "Et Makita-batteri på 18 V og 5 Ah driver en maskine, der bruger 360 W. Hvor mange minutter holder det, hvis intet går tabt?",
                 svar: 15, enhed: "min", tolerance: 0, grafik: "batteri",
                 forklaring: "18 V · 5 Ah = 90 Wh. 90 / 360 = 0,25 time = 15 minutter" } },
  22: { wordle: { ord: "GAVER", navn: "Julewordle" } },
  23: { emoji: { tema: "En disc i din taske", q: "☢️⚛️", svar: ["Reactor"] } },
  24: { regne: { q: "Hos din familie spiser man risengrød FØR julemaden. Maven rummer 1,5 liter, og du tager 3 portioner på 3 dl. Hvor mange procent plads er der tilbage til julemaden?",
                 svar: 40, enhed: "%", tolerance: 0, grafik: "groed",
                 forklaring: "3 · 3 dl = 9 dl. 15 − 9 = 6 dl tilbage. 6 / 15 = 40 %" } }
};
