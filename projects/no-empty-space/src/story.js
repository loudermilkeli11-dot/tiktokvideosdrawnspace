// no-empty-space: the ONE law. Atoms are almost all empty space. Squeeze the empty space out of an object and it packs to
// NUCLEAR DENSITY rho_n = 2.3e17 kg/m^3 while keeping its mass m. Its new diameter is d = (6m / (pi * rho_n))^(1/3).
// A squeezed speck still weighs m and nothing can hold it up (its whole weight presses on a few square microns), so it falls
// through rock as if through air: depth = 1/2 g t^2 (drag ignored). Film time = story time (no slow motion).
//
// The one stated liberty (POST.json caption only, NEVER on screen): each squeeze is instant (shown over 0.25-1.2 s so it
// reads) and its enormous energy is ignored; the Earth's collapse is shown over 3 s.
//
// Sources (checked by the Director 2026-11-13; any change to a constant re-flows every on-screen value):
//   nuclear density ~2.3e17 kg/m^3 ........................ en.wikipedia.org/wiki/Nuclear_density (saturation density
//                                                            0.16 nucleons/fm^3 x 1.67e-27 kg = 2.7e17; 2.3e17 is the
//                                                            commonly quoted mean, so every size here is slightly generous)
//   Earth mass 5.9722e24 kg, mean diameter 12,742 km, GM 3.986004e14 m^3/s^2 ... NASA Earth Fact Sheet (nssdc.gsfc.nasa.gov)
//   Moon: semi-major axis 384,400 km, sidereal period 27.32 d ................. NASA Moon Fact Sheet
//   world population ~8.2e9 (2025) ......................................... UN World Population Prospects 2024
//   mean adult body mass 62 kg ............................................. Walpole et al., BMC Public Health 12:439 (2012)
//   fall to Earth's centre ~19 min (38 min end to end, real density profile) .. Klotz, Am. J. Phys. 83, 231 (2015)
//   g = 9.81 m/s^2; water 1,000 kg/m^3; granite-ish rock 2,700 kg/m^3; tennis ball 6.7 cm (ITF); human hair ~70 um
// Every number on screen is computed HERE. Nothing is typed by hand into a shot, the overlay or the score.

// ---------------------------------------------------------------- the rule
export const RHO_N = 2.3e17;                                   // kg/m^3, nuclear density
export const G = 9.81;                                         // m/s^2
export const dSqueezed = (m) => Math.cbrt((6 * m) / (Math.PI * RHO_N));   // m: diameter of mass m packed to RHO_N
export const fallDepth = (t) => (t <= 0 ? 0 : 0.5 * G * t * t); // m below the squeeze point, t s after the squeeze
export const EMPTY_FRAC = 1 - 1000 / RHO_N;                    // water / your body: 1 - 4.35e-15
// "99.9999999999996%": the percentage written out to the first non-9 digit (computed, never typed)
export const EMPTY_PCT = (() => { const rest = (1000 / RHO_N) * 100;   // 4.35e-13 %
  const k = -Math.floor(Math.log10(rest)); const s = (100 - rest).toFixed(k); return s.replace(/0+$/, ''); })();

// ---------------------------------------------------------------- the ladder (our own models; sizes before = the model)
// m kg, d0 = size before (m), what = counter subject. mountain: a cone 1,500 m tall, base radius 3 km, rock 2,700 kg/m^3.
export const MOUNTAIN = { h: 1500, r: 3000, rho: 2700 };
const M_MOUNTAIN = (Math.PI * MOUNTAIN.r * MOUNTAIN.r * MOUNTAIN.h / 3) * MOUNTAIN.rho;   // 3.82e13 kg
export const M_EARTH = 5.9722e24, D_EARTH = 12742e3, GM_EARTH = 3.986004e14;
export const RUNG = {
  phone:    { what: 'PHONE',     dim: 'SIZE',  m: 0.20,       d0: 0.15 },
  cup:      { what: 'COFFEE CUP', dim: 'SIZE', m: 0.30,       d0: 0.09 },
  car:      { what: 'CAR',       dim: 'SIZE',  m: 1500,       d0: 4.0 },
  ferry:    { what: 'FERRY',     dim: 'SIZE',  m: 3.0e6,      d0: 70 },
  tower:    { what: 'TOWER',     dim: 'SIZE',  m: 3.65e8,     d0: 381 },
  mountain: { what: 'MOUNTAIN',  dim: 'SIZE',  m: M_MOUNTAIN, d0: MOUNTAIN.h },
  earth:    { what: 'EARTH',     dim: 'WIDTH', m: M_EARTH,    d0: D_EARTH },
};
for (const r of Object.values(RUNG)) r.d1 = dSqueezed(r.m);
// phone 1.18e-6 m, cup 1.36e-6, car 2.32e-5, ferry 2.92e-4, tower 1.45e-3, mountain 6.82e-2, earth 367.4 m
export const R_MINI = RUNG.earth.d1 / 2;                       // 183.7 m
export const G_MINI = GM_EARTH / (R_MINI * R_MINI) / G;        // 1.2e9 g at the mini-Earth's surface
export const CARS_PER_TOWER = RUNG.tower.m / RUNG.car.m;       // 243,333
// the cover: everyone, packed
export const POP = 8.2e9, BODY_KG = 62;
export const PEOPLE_CM3 = (POP * BODY_KG) / RHO_N * 1e6;       // 2.2 cm^3
export const PEOPLE_CUBE_CM = Math.cbrt(PEOPLE_CM3);           // 1.30 cm a side (a sugar cube is ~1.3-1.6 cm: it fits)
export const T_CENTRE_MIN = 19;                                // min to Earth's centre (Klotz 2015: 38 min end to end)
export const MOON_DAYS = 27.3;                                 // sidereal month, unchanged (same mass -> same pull, shell theorem)

// ---------------------------------------------------------------- the clock (ONE clock: film time, s)
export const FPS = 30;
const LIST = [
  ['s01_phone', 180],     //  0.0 -  6.0  terrace (FRAME1_CAM): the selfie phone implodes at 1.6
  ['s02_cup', 165],       //  6.0 - 11.5  café table: the espresso cup implodes at 7.8 (gag 1)
  ['s03_car', 195],       // 11.5 - 18.0  quay street: the hero's car implodes at 13.5 (gag 2)
  ['s04_hole', 165],      // 18.0 - 23.5  the hole in the cobbles; the car-speck sinks 99 -> 490 m
  ['s05_ferry', 195],     // 23.5 - 30.0  the mole: the docked ferry implodes at 25.5, the harbour geyser
  ['s06_tower', 210],     // 30.0 - 37.0  terrace, 85 mm: THE SET PIECE, the tower implodes at 33.0
  ['s07_drop', 180],      // 37.0 - 43.0  the headland caves in under the falling grain
  ['s08_mountain', 210],  // 43.0 - 50.0  reverse from the mole: the mountain implodes at 44.5, the gale (gag 3)
  ['s09_earth', 180],     // 50.0 - 56.0  crane up -> orbit (hit at 51.5): the Earth squeezes 52.0 -> 55.0
  ['s10_speck', 150],     // 56.0 - 61.0  the 367 m glowing ball beside the ghost of the 381 m tower
  ['s11_moon', 150],      // 61.0 - 66.0  the Moon doesn't notice
  ['s12_loop', 120],      // 66.0 - 70.0  end card (66.0-69.0), hard cut at 69.0 to the frame-1 terrace
];
export const SHOT = {}; { let f = 0; for (const [n, fr] of LIST) { SHOT[n] = { t0: f / FPS, dur: fr / FPS, frames: fr, f0: f }; f += fr; } }
export const SHOTS = LIST.map(([n]) => n);
export const FILM_LEN = LIST.reduce((a, [, f]) => a + f, 0) / FPS;    // 70.0 s
export const filmT = (name, tt) => SHOT[name].t0 + tt;                 // shot time -> film time

// The squeezes: film time of the start (T), how long the implosion is SHOWN (dur), the shot that shows it.
// Implosion progress k(film) 0..1 accelerates (u^2.4): slow tearing first, then everything rushes into the point.
export const SQZ = {
  phone:    { T: 1.6,  dur: 0.35, shot: 's01_phone' },
  cup:      { T: 7.8,  dur: 0.25, shot: 's02_cup' },
  car:      { T: 13.5, dur: 0.5,  shot: 's03_car' },
  ferry:    { T: 25.5, dur: 0.6,  shot: 's05_ferry' },
  tower:    { T: 33.0, dur: 0.8,  shot: 's06_tower' },
  mountain: { T: 44.5, dur: 1.2,  shot: 's08_mountain' },
  earth:    { T: 52.0, dur: 3.0,  shot: 's09_earth' },
};
export const K_POW = 2.4;
export const implodeK = (name, film) => { const q = SQZ[name], u = Math.min(1, Math.max(0, (film - q.T) / q.dur)); return Math.pow(u, K_POW); };
export const doneAt = (name) => SQZ[name].T + SQZ[name].dur;           // film s: the bead is complete, it starts to fall
// the size the counter shows while it implodes: log-interpolated d0 -> d1 along the same k (so it rolls 15 cm .. 1.2 µm)
export const sizeAt = (name, film) => { const r = RUNG[name], k = implodeK(name, film); return r.d0 * Math.pow(r.d1 / r.d0, k); };
// how far the squeezed core has fallen, film s. The squeeze is physically instant at SQZ.T, so the core falls from T: the
// shards spiral into a point that is ALREADY dropping (squeeze.js centre = c0 - depthAt). Car: 99 m at s04's start, 490 m at
// its end; tower grain: 78 m -> 490 m over s07.
export const depthAt = (name, film) => fallDepth(film - SQZ[name].T);

// ---------------------------------------------------------------- the cut hits (score.json + the shots' sound read these)
export const CUTS = SHOTS.slice(1).map((n) => SHOT[n].t0);             // every shot boundary
export const HARD_CUTS = [SHOT.s06_tower.t0, SHOT.s08_mountain.t0, 51.5, 69.0];   // 30.0, 43.0, 51.5 (to orbit), 69.0 (loop)
export const T_ORBIT = 51.5;                                           // film s: s09 cuts from the rising crane to orbit on a hit
export const T_ENDCARD = SHOT.s12_loop.t0, T_LOOP = 69.0;              // 66.0 end card; 69.0 hard cut to the terrace
// s12's terrace (film 69.0-70.0) is s01's world LIVE at film -1.0 .. -0.033 (people sway, water moves; nothing has happened
// yet), so s12's last frame + 1/30 s == s01 frame 0 (the seamless loop). s12 shot time tt (0..4) -> s01 film:
export const loopFilm = (tt) => tt - SHOT.s12_loop.dur;               // tt 3.0 -> -1.0 ; tt 3.967 -> -0.033

// ---------------------------------------------------------------- text helpers (SI units; values lowercase, Space Grotesk has µ)
const sig = (v, n = 2) => { if (v >= 100) return Math.round(v).toLocaleString('en-US'); return (+v.toPrecision(n)).toString(); };
export function fmtSize(m) {
  if (m >= 10000) return `${Math.round(m / 1000).toLocaleString('en-US')} km`;
  if (m >= 1) return `${sig(m, 3)} m`;
  if (m >= 0.01) return `${sig(m * 100)} cm`;
  if (m >= 0.001) return `${sig(m * 1000)} mm`;
  if (m >= 1e-4) return `${sig(m * 1000)} mm`;                         // 0.29 mm (a fine sand grain)
  return `${sig(m * 1e6)} µm`;
}
export function fmtMass(kg) {                                          // fact lines are upper-cased by the overlay
  if (kg >= 1e12) { const t = kg / 1000, e = Math.floor(Math.log10(t)); if (t >= 1e15) return `${(t / 10 ** e).toFixed(1)}×10${sup(e)} T`;
    return `${Math.round(t / 1e9).toLocaleString('en-US')} BILLION T`; }
  if (kg >= 1000) { const t = kg / 1000; return `${t < 10 ? t.toFixed(1) : Math.round(t).toLocaleString('en-US')} T`; }
  return `${kg} KG`;
}
const SUP = { 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };
function sup(n) { return String(n).split('').map((c) => SUP[c]).join(''); }
// NOTE: only ¹ ² ³ are in the counter font's Latin range; Earth's 6.0×10²¹ uses ² and ¹ (checked: e = 21).

// shown numbers (the board prints exactly these)
export const SHOW = {
  emptyPct: EMPTY_PCT,                                                 // 99.9999999999996
  phone: [fmtSize(RUNG.phone.d0), fmtSize(RUNG.phone.d1)],             // 15 cm, 1.2 µm
  cup: [fmtSize(RUNG.cup.d0), fmtSize(RUNG.cup.d1)],                   // 9 cm, 1.4 µm
  car: [fmtSize(RUNG.car.d0), fmtSize(RUNG.car.d1)],                   // 4 m, 23 µm
  ferry: [fmtSize(RUNG.ferry.d0), fmtSize(RUNG.ferry.d1)],             // 70 m, 0.29 mm
  tower: [fmtSize(RUNG.tower.d0), fmtSize(RUNG.tower.d1)],             // 381 m, 1.4 mm
  mountain: [fmtSize(RUNG.mountain.d0), fmtSize(RUNG.mountain.d1)],    // 1,500 m, 6.8 cm
  earth: [fmtSize(RUNG.earth.d0), fmtSize(RUNG.earth.d1)],             // 12,742 km, 367 m
  earthM: Math.round(RUNG.earth.d1),                                   // 367
  mass: Object.fromEntries(Object.entries(RUNG).map(([k, r]) => [k, fmtMass(r.m)])),   // 0.2 KG, 0.3 KG, 1.5 T, 3,000 T, 365,000 T, 38 BILLION T, 6.0×10²¹ T
  gMini: `${(G_MINI / 1e9).toFixed(1)} BILLION G`,                     // 1.2 BILLION G
  cars: `${(Math.round(CARS_PER_TOWER / 1000) * 1000).toLocaleString('en-US')} CARS`,  // 243,000 CARS
  sugar: `${PEOPLE_CM3.toFixed(1)} cm³`,                               // 2.2 cm³ (end card fact)
  people: `${Math.round(POP / 1e9)} billion`,                          // 8 billion
};
