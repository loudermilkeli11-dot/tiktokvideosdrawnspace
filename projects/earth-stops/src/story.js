// earth-stops: the ONE law. Earth's surface moves east at v(φ) = (2π·R_eq / sidereal day)·cos φ. Our city sits at 35°N:
// v = 465.1 × cos 35° = 381.0 m/s = 1,372 km/h. When the ground stops, everything NOT fixed to it (air, sea, people, cars,
// loose parts, leaves, glass, water) keeps moving east at v relative to the ground, carrying ½v² = 72,580 J per kg.
// Attached things (trees, towers, lamps) stay put and take the blast: their loose parts (leaves, facades, tops) go.
// In 5 s anything loose travels v × 5 = 1,905 m ≈ 1.9 km. Nothing moves up or west: one direction, east (screen-right).
//
// DRAMATIZATION (the one stated liberty): the ground stops instantly and restarts instantly after 5.000 s; the planet does
// not break, Earth's own momentum is ignored. The 5 seconds are SHOWN 12× SLOWER. The exact destruction pattern is
// illustrative (which floors fail, how far the bay heaps).
//
// Sources (Scout VERIFIES before posting; PRODUCTION.md §2):
//   equatorial radius 6,378.137 km, sidereal day 86,164.09 s ........ NASA Earth fact sheet (nssdc.gsfc.nasa.gov)
//   speed of sound 340.3 m/s (ISA, 15 °C, sea level) ................ NASA Glenn
//   strongest measured surface gust 408 km/h (3-s gust, Barrow Is. 1996) WMO archive (say "gust", never "wind")
//   mass of the atmosphere 5.148e18 kg ............................... Trenberth & Smith 2005
//   ocean volume 1.335e9 km³ × 1,025 kg/m³ ........................... NOAA ETOPO1
//   air column over 1 m² = 101,325 Pa / 9.81 = 10,329 kg ............. standard sea-level pressure
//   world primary energy ≈ 620 EJ/yr (2023) .......................... Energy Institute Statistical Review
// Every number on screen is computed here. Nothing is typed by hand into a shot, the overlay or the score.

// ---------------------------------------------------------------- the rule
export const R_EQ = 6378137;                                 // m
export const T_SID = 86164.0905;                             // s
export const V_EQ = (2 * Math.PI * R_EQ) / T_SID;            // 465.10 m/s
export const KMH_EQ = V_EQ * 3.6;                            // 1,674 km/h (the cover number)
export const LAT = 35;                                       // our city and bay, °N
export const V = V_EQ * Math.cos(LAT * Math.PI / 180);       // 380.99 m/s: the speed of everything loose, relative to the ground
export const KMH = V * 3.6;                                  // 1,371.6 -> "1,372 km/h"
export const J_KG = 0.5 * V * V;                             // 72,577 J/kg
export const EVENT = 5;                                      // s the ground stays stopped
export const TRAVEL = V * EVENT;                             // 1,905 m in 5 s
export const C_SOUND = 340.3, MACH = V / C_SOUND;            // 1.12
export const GUST_KMH = 408, GUST_X = KMH / GUST_KMH;        // 3.36 -> "3.4×"
// whole-planet energies: ½·M·V_EQ²·⅔ (⅔ = the mean of cos²φ over a sphere)
export const J_KG_GLOBE = 0.5 * V_EQ * V_EQ * (2 / 3);       // 72,106 J/kg
export const M_ATM = 5.148e18, M_OCEAN = 1.335e18 * 1025;    // kg
export const AIR_COL = 101325 / 9.81;                        // 10,329 kg over each m²
export const WORLD_J_YR = 620e18;                            // J per year of human primary energy

// ---------------------------------------------------------------- the clock (ONE clock for every shot)
// Film time t (s) -> event time e (s since the ground stopped), clamped to [0, 5]. 12× slow motion.
export const K_SLOW = 12;                                    // "SHOWN 12× SLOWER"
export const T_STOP = 1.0;                                   // film s: the jolt (boom, counter snaps 381 -> 0 m/s)
export const T_RESTORE = T_STOP + EVENT * K_SLOW;            // 61.0 film s: e = 5.000, SPIN RESTORED
export const T_LABEL = 1.6;                                  // film s: the counter label flips GROUND SPEED -> STOPPED FOR
export const evAt = (t) => Math.min(EVENT, Math.max(0, (t - T_STOP) / K_SLOW));
export const vFilm = V / K_SLOW;                             // 31.75 m/s: how fast loose things cross the frame, in film seconds
// motion blur: at 180° shutter one film frame spans 1/60 s of film = 1/(60·K) s of event (createSpray U.streak in event s)
export const SHUTTER_E = 1 / (60 * K_SLOW);

// ---------------------------------------------------------------- the shots (film clock; = shots.txt, 30 fps)
export const FPS = 30;
const LIST = [
  ['s01_plaza', 240],   // 0.0  - 8.0   hero balcony over the plaza: the stop, the sweep
  ['s02_street', 210],  // 8.0  - 15.0  street level, north side of the plaza: the shock front, shopfronts burst
  ['s03_towers', 210],  // 15.0 - 22.0  hero balcony, long lens: tower tops shear off
  ['s04_river', 210],   // 22.0 - 29.0  hero balcony, wide: the plaza swept bare, the upwind debris river
  ['s05_bay', 225],     // 29.0 - 36.5  HIT 1. hillside terrace over the bay: the bay slides east
  ['s06_town', 210],    // 36.5 - 43.5  same terrace, longer lens: the wall climbs over the east town
  ['s07_coast', 255],   // 43.5 - 52.0  HIT 2. 400 km up: an east-facing coast takes the surge
  ['s08_earth', 345],   // 52.0 - 63.5  HIT 3. the whole planet; 61.0 = 5.000 s, SPIN RESTORED
  ['s09_loop', 45],     // 63.5 - 65.0  HIT 4. the plaza exactly as frame 1
];
export const SHOT = {}; { let f = 0; for (const [n, fr] of LIST) { SHOT[n] = { t0: f / FPS, dur: fr / FPS, frames: fr }; f += fr; } }
export const FILM_LEN = LIST.reduce((a, [, f]) => a + f, 0) / FPS;    // 65.0 s
export const HITS = [SHOT.s05_bay.t0, SHOT.s07_coast.t0, SHOT.s08_earth.t0, SHOT.s09_loop.t0];   // 29.0, 43.5, 52.0, 63.5
export const filmT = (name, tt) => SHOT[name].t0 + tt;       // shot time -> film time
export const ev = (name, tt) => evAt(filmT(name, tt));       // shot time -> event time e (what every shot animates by)

// ---------------------------------------------------------------- loose things (closed form in e; deterministic)
// Displacement east (m, +X in every ground set) of anything loose, e s after the stop: x = x0 + V·e. The Mach-1.1 airflow
// carries it, so it does not slow down (drag only matters relative to the air, which moves with it).
export const drift = (e) => V * e;
// Small skids and hops for things that start on the ground (≤ 1.6 m: NOTHING goes up). seed in [0,1).
export const hop = (e, seed) => { if (e <= 0) return 0; const f = 2.2 + 2.5 * seed, a = 0.25 + 1.35 * seed;
  return a * Math.abs(Math.sin(Math.PI * f * e + seed * 3)) * Math.min(1, e / 0.04); };
// Tumble angle (rad) about the travel axis: spins up over ~0.15 s, then rolls at 2-5 rad/s (event) = slow, readable in film.
export const roll = (e, seed) => (e <= 0 ? 0 : (2 + 3 * seed) * (e - 0.08 * (1 - Math.exp(-e / 0.08))));
// Trees: leaves stripped from e 0.0 to LEAF_E (canopy 1 -> BARE), trunks lean east up to LEAN_DEG (wind load at Mach 1.1).
export const LEAF_E = 0.09, BARE = 0.22, LEAN_DEG = 14;
export const leafLeft = (e) => (e <= 0 ? 1 : Math.max(BARE, 1 - (1 - BARE) * Math.pow(Math.min(1, e / LEAF_E), 0.7)));
export const lean = (e) => LEAN_DEG * (1 - Math.exp(-Math.max(0, e) / 0.05));
// The tower tops (s03): the top floors keep moving while the frame below stops. Shear starts at e 0.02 at the top and
// works down; a floor that lets go then drifts with the air.
export const TOP_FLOORS = 10, FLOOR_T = 1.6e6;               // kg per floor (40 × 40 m office floor, ≈ 1 t/m²)
export const floorRelease = (k) => 0.02 + 0.035 * k;         // e at which floor k (0 = the roof) lets go

// ---------------------------------------------------------------- the energy ladder (one rung per shot; fact lines)
export const RUNGS = {
  s01_plaza: { what: 'ONE CAR', kg: 1500 },
  s02_street: { what: 'AIR IN THIS STREET', kg: 30 * 500 * 50 * 1.2 },          // 30 m wide, 500 m long, 50 m deep
  s03_towers: { what: `TOP ${TOP_FLOORS} FLOORS`, kg: TOP_FLOORS * FLOOR_T },
  s04_river: { what: 'AIR OVER THIS PLAZA', kg: 120 * 120 * AIR_COL },          // one 120 m city block, full column
  s05_bay: { what: "THE BAY'S WATER", kg: 2000 * 1000 * 15 * 1025 },            // 2 km × 1 km × 15 m
  s06_town: { what: 'AIR OVER THE TOWN', kg: 5000 * 5000 * AIR_COL },
  s07_coast: { what: 'ALL THE AIR', kg: M_ATM, globe: true },            // short: the fact line must end left of x 440
  s08_earth: { what: 'ALL OCEANS', kg: M_OCEAN, globe: true },
};
for (const r of Object.values(RUNGS)) { r.J = r.kg * (r.globe ? J_KG_GLOBE : J_KG); r.years = r.J / WORLD_J_YR; }
// 109 MJ, 65 GJ, 1.2 TJ, 11 TJ, 2.2 PJ, 19 PJ, 3.7e23 J (599 yr), 9.9e25 J (159,000 yr)
export function energyText(J) {
  const U = [[1e18, 'EJ'], [1e15, 'PJ'], [1e12, 'TJ'], [1e9, 'GJ'], [1e6, 'MJ']];
  const [d, u] = U.find(([d]) => J >= d) ?? [1, 'J'], v = J / d;
  return `${v < 10 ? v.toFixed(1) : Math.round(v).toLocaleString('en-US')} ${u}`;
}
export const yearsText = (y) => { const p = Math.pow(10, Math.floor(Math.log10(y)) - 1); return Math.round(Math.round(y / p) * p).toLocaleString('en-US'); };   // 600, 160,000
export const factLine = (name) => { const r = RUNGS[name]; return r.globe ? `${r.what} · ${yearsText(r.years)} YEARS OF HUMAN ENERGY` : `${r.what} · ${energyText(r.J)}`; };

// shown numbers (integers / 1 decimal, as the board prints them)
export const SHOW = {
  v: Math.round(V),                                          // 381 m/s
  kmh: Math.round(KMH).toLocaleString('en-US'),              // 1,372
  kmhEq: Math.round(KMH_EQ).toLocaleString('en-US'),         // 1,674
  mach: MACH.toFixed(1),                                     // 1.1
  gust: GUST_X.toFixed(1),                                   // 3.4
  travelKm: (TRAVEL / 1000).toFixed(1),                      // 1.9
  slow: K_SLOW,                                              // 12
};
