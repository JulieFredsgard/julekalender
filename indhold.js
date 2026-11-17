/* =====================================================
   INDHOLD OG INDSTILLINGER – det er kun denne fil, du skal rette i
   (Logikken ligger i kalender.js, tegningerne i grafik.js og udseendet i styles.css)
   ===================================================== */

/* ---------- 1. INDSTILLINGER ---------- */
const NAVN = "Min elskede";        // Hans navn eller kælenavn, vises i undertitlen
const AFSENDER = "mig";            // Dit navn. Står på præmierne og i beskeden, han sender dig
const AAR = new Date().getFullYear();

// Firebase: så point, køb og rekorder følger ham på tværs af enheder
const DATABASE_URL = "https://julekalender-9bb81-default-rtdb.europe-west1.firebasedatabase.app";
const KODE = "morten-er-sej-123";

const DAGSBONUS = 10;      // ekstra point for at åbne lågen på selve dagen
const REKORDBONUS = 5;     // point for at slå sin rekord i Spillehallen

// Titler: [mindste antal optjente point, navn]. Han rykker ikke ned, når han handler.
const TITLER = [[0, "Nissehjælper"], [400, "Julenisse"], [900, "Nissefar"], [1400, "Julemand"]];

/* ---------- 2. JULEBUTIKKEN ----------
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

/* ---------- 3. LÅGERNE ----------
   Hver låge har en titel, en kort tekst og ÉN opgave:

   spil: { type: "discgolf", kast: [3, 4, 5, 6, 7], vind: 1 }   put 5 gange (afstande i meter, vind 0-2)
   spil: { type: "printtaarn" }                                  print 30 lag
   spil: { type: "snefnug" }                                     fang snefnug i 25 sekunder
   spil: { type: "vendespil", symboler: ["🎄","⭐","🎁","❄️","🦌","🔔"] }   find 6 par
   spil: { type: "wordle", ord: "NISSE" }                        gæt ordet

   regne: { q: "...", svar: 157, enhed: "N", tolerance: 0.01, hint: "...", forklaring: "...", grafik: "kane" }
       tolerance: hvor meget svaret må afvige (0.01 = 1 %). grafik: en tegning fra grafik.js.

   tekstsvar: { q: "🏠🎄😱👦", svar: ["alene hjemme", "home alone"] }   billed- og emoji-gåder

   billede: "Billeder/foto.jpg", zoom: 6, fokus: "50% 50%"   billedgåde: zoomer ud for hvert forkert gæt
   dobbelt: true                                              dobbelte point

   Spillene (ikke wordle) bliver låst op i Spillehallen, når han har spillet dem første gang.
   Tekster i [KANTEDE PARENTESER] er pladsholdere.
   ===================================================== */
const INDHOLD = {
  1:  { titel: "Velkommen",
        tekst: "Hver dag venter en opgave. Saml point, stig i graderne, og brug pointene i Julebutikken. Første opgave: gæt juleordet.",
        spil: { type: "wordle", ord: "NISSE" } },

  2:  { titel: "Putting i sneen",
        tekst: "Tryk for at sigte, tryk igen for kraft. Ram den grønne zone.",
        spil: { type: "discgolf", kast: [3, 4, 5, 6, 7], vind: 0.5 } },

  3:  { titel: "Kanens trækkraft",
        tekst: "Rensdyrene vil vide, hvor hårdt de skal trække.",
        regne: { q: "Kanen vejer 400 kg, og μ = 0,04. Hvor stor kraft skal der til for at holde konstant fart på fladt terræn? (g = 9,82 m/s², svar i hele newton)",
                 svar: 157, enhed: "N", tolerance: 0.01, grafik: "kane",
                 hint: "Ved konstant fart er trækkraften lig gnidningen: F = μ · m · g",
                 forklaring: "0,04 · 400 · 9,82 = 157 N" } },

  4:  { titel: "Snestorm",
        tekst: "Fang snefnuggene. Guldstjernerne tæller tredobbelt.",
        spil: { type: "snefnug" } },

  5:  { titel: "Billedgåde",
        tekst: "Hvor er det? Billedet zoomer ud for hvert forkert gæt.",
        billede: "Billeder/Finland_foto.jpg", zoom: 6, fokus: "50% 50%",
        tekstsvar: { svar: ["finland"] } },

  6:  { titel: "Julestjerner",
        tekst: "Nisserne vil printe julestjerner.",
        regne: { q: "En stjerne vejer 38 g, og hvert print spilder 5 g. Hvor mange hele stjerner kan du printe af 1 kg PLA?",
                 svar: 23, enhed: "stjerner", tolerance: 0, grafik: "filament",
                 hint: "Hvert print bruger 38 + 5 gram.",
                 forklaring: "1000 / 43 = 23,3 → 23 stjerner" } },

  7:  { titel: "Print-tårnet",
        tekst: "Tryk, når laget står præcist over det forrige. Det, der stikker ud, falder af.",
        spil: { type: "printtaarn" } },

  8:  { titel: "Vendespil",
        tekst: "Find alle 6 par.",
        spil: { type: "vendespil", symboler: ["🎄", "⭐", "🎁", "❄️", "🦌", "🔔"] } },

  9:  { titel: "Cirkel 2",
        tekst: "Længere putts og mere vind.",
        spil: { type: "discgolf", kast: [5, 6, 7, 8, 9], vind: 1 } },

  10: { titel: "Gearkassen",
        tekst: "Samlebåndet kører for hurtigt.",
        regne: { q: "Hvor mange omdrejninger i minuttet laver den sidste aksel?",
                 svar: 120, enhed: "o/min", tolerance: 0, grafik: "gear",
                 hint: "Gang med (tænder ind / tænder ud) for hvert trin.",
                 forklaring: "1440 · 18/54 · 12/48 = 120 o/min" } },

  11: { titel: "Emoji-gåde",
        tekst: "Hvilken julefilm?",
        tekstsvar: { q: "🏠🎄😱👦", svar: ["alene hjemme", "home alone"] } },

  12: { titel: "Julewordle",
        tekst: "Gæt juleordet.",
        spil: { type: "wordle", ord: "GAVER" } },

  13: { titel: "Snestorm 2",
        tekst: "Kan du slå din rekord?",
        spil: { type: "snefnug" } },

  14: { titel: "Printtid",
        tekst: "Når nisserne at printe pynten?",
        regne: { q: "Juletræet er 72 mm højt, laghøjden er 0,2 mm, og hvert lag tager 18 sekunder. Hvor mange minutter tager printet?",
                 svar: 108, enhed: "min", tolerance: 0, grafik: "printtid",
                 hint: "Find først antallet af lag.",
                 forklaring: "72 / 0,2 = 360 lag · 360 · 18 s = 6480 s = 108 min" } },

  15: { titel: "Billedgåde",
        tekst: "[Hvor er vi her?]",
        billede: "", zoom: 6, fokus: "50% 50%",
        tekstsvar: { svar: ["[rigtigt svar]"] } },

  16: { titel: "Print-tårnet 2",
        tekst: "30 lag, ingen support.",
        spil: { type: "printtaarn" } },

  17: { titel: "Hjulmøtrikkerne",
        tekst: "Kanen skal have vinterhjul på.",
        regne: { q: "Møtrikkerne skal spændes med 110 Nm, og nøglen er 0,35 m. Hvor stor kraft skal der til? (svar i hele newton)",
                 svar: 314, enhed: "N", tolerance: 0.005, grafik: "moment",
                 hint: "Moment = kraft · arm",
                 forklaring: "110 / 0,35 = 314 N" } },

  18: { titel: "Vendespil: værkstedet",
        tekst: "Find alle 6 par.",
        spil: { type: "vendespil", symboler: ["🥏", "⚙️", "🔧", "🔩", "🖨️", "🎄"] } },

  19: { titel: "Julewordle",
        tekst: "Hænger tit på døren.",
        spil: { type: "wordle", ord: "KRANS" } },

  20: { titel: "Storm på banen",
        tekst: "Det blæser for alvor.",
        spil: { type: "discgolf", kast: [6, 7, 8, 9, 10], vind: 2 } },

  21: { titel: "Emoji-gåde",
        tekst: "Hvilken julesang?",
        tekstsvar: { q: "🔔🔔🔔🛷❄️", svar: ["jingle bells", "bjældeklang"] } },

  22: { titel: "Discens flugt",
        tekst: "Fysik uden løft og luftmodstand.",
        regne: { q: "Disc'en kastes med 25 m/s i 10° vinkel. Hvor langt flyver den? (g = 9,82 m/s², svar i hele meter)",
                 svar: 22, enhed: "m", tolerance: 0.03, grafik: "disc",
                 hint: "R = v² · sin(2θ) / g",
                 forklaring: "625 · sin(20°) / 9,82 = 21,8 ≈ 22 m" } },

  23: { titel: "Mesterskabet",
        tekst: "Dobbelte point!",
        dobbelt: true,
        spil: { type: "discgolf", kast: [6, 7, 8, 9, 10], vind: 1.5 } },

  24: { titel: "Glædelig jul",
        tekst: "[Din julehilsen.] Sidste opgave giver dobbelte point.",
        dobbelt: true,
        regne: { q: "Julemanden glider 6 m ned gennem skorstenen uden gnidning. Hvor hurtigt rammer han pejsen? (g = 9,82 m/s², svar i hele m/s)",
                 svar: 11, enhed: "m/s", tolerance: 0.03, grafik: "skorsten",
                 hint: "m · g · h = ½ · m · v²",
                 forklaring: "√(2 · 9,82 · 6) = 10,9 ≈ 11 m/s" } }
};
