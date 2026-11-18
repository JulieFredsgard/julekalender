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

// Op til 100 point om dagen: 50 for hullet og 50 for caddie-opgaven
const DAGSBONUS = 0;       // ekstra point for at spille dagens hul på selve dagen (0 = ingen)

// Point for dagens hul efter score (højst 50)
const HUL_POINT = { ace: 50, eagle: 45, birdie: 40, par: 30, bogey: 20, dobbeltbogey: 10, vaerre: 5 };
const CADDIE_MAKS = 50;    // caddie-opgaverne giver op til 50 point

// Niveauer: [mindste antal optjente point, navn]. Han rykker ikke ned, når han handler.
// Der er højst 2400 point i alt (24 dage x 100).
const TITLER = [[0, "Rookie"], [400, "Amatør"], [900, "Advanced"], [1400, "Pro"], [1900, "Verdensmester"]];

/* ---------- 2. JULEBUTIKPEN ----------
   id: kort navn uden mellemrum (må ikke ændres efter køb) · navn: står på præmien · pris: i point
   Du kan se alle køb på adressen med ?spilleder bagpå. */
const KUPONER = [
  { id: "aftensmad", navn: "Du bestemmer aftensmaden",              pris: 200 },
  { id: "slik",      navn: "[En pose af dit yndlingsslik]",         pris: 300 },
  { id: "massage",   navn: "En times massage",                      pris: 450 },
  { id: "vaerktoej", navn: "[Et stykke værktøj, f.eks. et bitsæt]",  pris: 600 },
  { id: "filament",  navn: "En rulle filament efter eget valg",     pris: 750 },
  { id: "disc",      navn: "[En ny disc, f.eks. en bestemt putter]", pris: 1000 }
];

/* ---------- 3. BANEN: ÉT HUL PR. DAG ----------
   navn:    hullets navn
   par:     3 eller 4
   laengde: afstand fra tee til kurv i meter (drive op til ca. 110 m)
   kurvX:   kurvens placering til siden i meter (0 = lige ud, negativ = venstre)
   traeer:  antal træer (de placeres automatisk, men altid ens for samme hul)
   vand:    "foran" (vand foran kurven), "side" (vand langs den ene side) eller udelad
   vind:    0 = vindstille, 1 = normal, 2 = blæsende
   Huller under 60 m er "ace-huller": første kast kan gå direkte i kurven. */
const HULLER = {
  1:  { navn: "Første kast",       par: 3, laengde: 60,  kurvX: 0,   traeer: 3,  vind: 0 },
  2:  { navn: "Grantunnelen",      par: 3, laengde: 75,  kurvX: 5,   traeer: 10, vind: 0.5 },
  3:  { navn: "Sneboldbakken",     par: 3, laengde: 85,  kurvX: -8,  traeer: 6,  vind: 1 },
  4:  { navn: "Nissestien",        par: 4, laengde: 120, kurvX: 10,  traeer: 10, vind: 0.5 },
  5:  { navn: "Isøen",             par: 3, laengde: 70,  kurvX: 0,   traeer: 3,  vind: 1, vand: "foran" },
  6:  { navn: "Ace-hullet",        par: 3, laengde: 45,  kurvX: 0,   traeer: 2,  vind: 0.5 },
  7:  { navn: "Rensdyrsvinget",    par: 4, laengde: 130, kurvX: -15, traeer: 12, vind: 1 },
  8:  { navn: "Juletræsalléen",    par: 3, laengde: 90,  kurvX: 0,   traeer: 14, vind: 0.5 },
  9:  { navn: "Kælkebakken",       par: 3, laengde: 80,  kurvX: 12,  traeer: 6,  vind: 1.5 },
  10: { navn: "Den lange",         par: 4, laengde: 150, kurvX: 0,   traeer: 8,  vind: 1 },
  11: { navn: "Det frosne vandhul",par: 3, laengde: 85,  kurvX: 6,   traeer: 6,  vind: 1, vand: "side" },
  12: { navn: "Pebernødden",       par: 3, laengde: 65,  kurvX: -10, traeer: 9,  vind: 1 },
  13: { navn: "Ace-hullet 2",      par: 3, laengde: 50,  kurvX: 4,   traeer: 4,  vind: 1 },
  14: { navn: "Skovens hjerte",    par: 4, laengde: 125, kurvX: -5,  traeer: 16, vind: 0.5 },
  15: { navn: "Vindmøllen",        par: 3, laengde: 90,  kurvX: 0,   traeer: 4,  vind: 2 },
  16: { navn: "Søhullet",          par: 4, laengde: 140, kurvX: 8,   traeer: 8,  vind: 1, vand: "foran" },
  17: { navn: "Granskoven",        par: 3, laengde: 80,  kurvX: -6,  traeer: 16, vind: 1 },
  18: { navn: "Nordlyset",         par: 4, laengde: 145, kurvX: 15,  traeer: 10, vind: 1.5 },
  19: { navn: "Isbjørnen",         par: 3, laengde: 95,  kurvX: -4,  traeer: 8,  vind: 1.5, vand: "side" },
  20: { navn: "Ace-hullet 3",      par: 3, laengde: 55,  kurvX: -5,  traeer: 5,  vind: 1.5 },
  21: { navn: "Snestormen",        par: 4, laengde: 135, kurvX: 0,   traeer: 12, vind: 2 },
  22: { navn: "Kanebanen",         par: 3, laengde: 85,  kurvX: 8,   traeer: 10, vind: 1.5, vand: "foran" },
  23: { navn: "Lillejuleaften",    par: 4, laengde: 155, kurvX: -10, traeer: 14, vind: 2, vand: "side" },
  24: { navn: "Nordpolen",         par: 3, laengde: 75,  kurvX: 0,   traeer: 10, vind: 1.5, vand: "foran" }
};

/* ---------- 4. CADDIE-OPGAVER: ÉN PR. DAG ----------
   Ekstra point ved siden af hullet (op til 50).
   wordle: { ord: "KURVE" }                     50 point, hvert ekstra gæt −8
   regne:  { q, svar, enhed, tolerance, forklaring, grafik }   50 point, forkert svar −15
           tolerance: hvor meget svaret må afvige (0.01 = 1 %). grafik: en tegning fra grafik.js
   emoji:  { q: "🐦", svar: ["birdie"] }       50 point, forkert gæt −15 */
const CADDIE = {
  1:  { wordle: { ord: "KURVE" } },
  2:  { wordle: { ord: "HYZER" } },
  3:  { regne: { q: "Du kaster med 25 m/s i 10° vinkel. Uden løft og luftmodstand: hvor langt flyver disc'en? (g = 9,82 m/s², hele meter)",
                 svar: 22, enhed: "m", tolerance: 0.03, grafik: "disc",
                 forklaring: "625 · sin(20°) / 9,82 = 21,8 ≈ 22 m" } },
  4:  { wordle: { ord: "DRIVE" } },
  5:  { regne: { q: "18 huller: 12 er par 3 og 6 er par 4. Du laver 4 birdies, 2 bogeys og resten par. Hvor mange kast bruger du i alt?",
                 svar: 58, enhed: "kast", tolerance: 0, grafik: "scorekort",
                 forklaring: "Par = 12 · 3 + 6 · 4 = 60. 60 − 4 + 2 = 58 kast" } },
  6:  { emoji: { q: "🐦", svar: ["birdie", "birdy"] } },
  7:  { wordle: { ord: "BOGEY" } },
  8:  { regne: { q: "En disc er 21 cm i diameter og roterer 15 gange i sekundet. Hvor hurtigt bevæger kanten sig? (hele m/s)",
                 svar: 10, enhed: "m/s", tolerance: 0.05, grafik: "spin",
                 forklaring: "π · 0,21 m · 15 = 9,9 ≈ 10 m/s" } },
  9:  { wordle: { ord: "KÆDER" } },
  10: { regne: { q: "Disc'en er 4 sekunder i luften, og sidevinden skubber den i gennemsnit 2,5 m/s til siden. Hvor mange meter bliver den skubbet?",
                 svar: 10, enhed: "m", tolerance: 0, grafik: "vind",
                 forklaring: "2,5 m/s · 4 s = 10 m" } },
  11: { wordle: { ord: "PUTTE" } },
  12: { emoji: { q: "1️⃣🥏🎯", svar: ["ace", "hole in one", "hole-in-one"] } },
  13: { wordle: { ord: "GLIDE" } },
  14: { regne: { q: "En putter på 175 g rammer kæderne med 8 m/s og stopper på 0,05 sekunder. Hvor stor gennemsnitlig kraft bremser den? (hele newton)",
                 svar: 28, enhed: "N", tolerance: 0.02, grafik: "kaeder",
                 forklaring: "0,175 kg · 8 m/s / 0,05 s = 28 N" } },
  15: { wordle: { ord: "MANDO" } },
  16: { regne: { q: "Du har 12 discs på i gennemsnit 172 g i tasken, og tasken vejer selv 1,8 kg. Hvor mange gram bærer du i alt?",
                 svar: 3864, enhed: "g", tolerance: 0,
                 forklaring: "12 · 172 g + 1800 g = 3864 g" } },
  17: { wordle: { ord: "KASTE" } },
  18: { emoji: { q: "⛓️🎶", svar: ["kædemusik", "chains", "chain music", "kæder"] } },
  19: { wordle: { ord: "TRÆER" } },
  20: { regne: { q: "Dit drive flyver 96 m på 4 sekunder. Hvad er gennemsnitsfarten i km/t? (hele tal)",
                 svar: 86, enhed: "km/t", tolerance: 0.01,
                 forklaring: "96 / 4 = 24 m/s · 3,6 = 86,4 ≈ 86 km/t" } },
  21: { wordle: { ord: "BANEN" } },
  22: { regne: { q: "For sjov kaster du en disc lodret op med 15 m/s. Hvor højt kommer den? (g = 9,82 m/s², hele meter)",
                 svar: 11, enhed: "m", tolerance: 0.05,
                 forklaring: "225 / 19,64 = 11,46 ≈ 11 m" } },
  23: { wordle: { ord: "EAGLE" } },
  24: { wordle: { ord: "GAVER" } }
};
