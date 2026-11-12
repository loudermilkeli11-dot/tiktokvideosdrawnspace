// giant-lens: the ONE law. A perfect lens of diameter D hangs at its own focal length (f = D, f/1) on the line to the Sun.
// It collects P = S·π(D/2)² and focuses it into the Sun's image, w = f·θ☉. Concentration C = (D/w)² = (1/θ☉)² is the SAME at
// every size, so the spot always reaches the same temperature; size buys power and beam width (×√10 per step = ×10 power).
// DRAMATIZATION (the one stated liberty): a perfect glass lens of any size hangs motionless, aimed at the ground, grows on
// cue and (frame 1 only) comes into focus; its light cone is drawn faintly visible. S stays 1,000 W/m² even above the air
// (conservative: 1,361 W/m² up there). Every on-screen number is computed here.
//
// Sources (Scout VERIFIES before posting; see PRODUCTION.md §2):
//   S = 1,000 W/m² at the ground, clear noon (AM1.5 standard, NREL)          θ☉ = 0.533° (NASA Sun fact sheet)
//   σ = 5.670e-8 W/m²K⁴                                                       world primary energy ≈ 620 EJ/yr (2023, Energy Institute)
//   soda-lime glass c ≈ 0.84 kJ/kg·K, flows ≈ 1,400 °C; 6 mm pane = 15 kg/m²  water 20 °C → steam: 0.33 + 2.26 = 2.59 MJ/kg
//   real solar furnace: ~1 MW, ~10,000 suns, up to ~3,500 °C (the cover fact)
export const S_SUN = 1000;                                   // W/m²
export const SUN_DEG = 0.533, THETA = SUN_DEG * Math.PI / 180; // 0.009303 rad
export const SIGMA = 5.670e-8;
export const CMAX = 1 / (THETA * THETA);                     // 11,556 suns
export const Q_SPOT = CMAX * S_SUN;                          // 1.156e7 W/m² = 11.6 MW on every m²
export const tempC = (C) => Math.pow((C * S_SUN) / SIGMA, 0.25) - 273.15;   // black surface in equilibrium, °C
export const T_SPOT = tempC(CMAX);                           // 3,505 °C -> shown 3,500
export const T_SHOW = Math.round(T_SPOT / 100) * 100;        // 3,500
export const powerOf = (D) => S_SUN * Math.PI * (D / 2) * (D / 2);   // W
export const spotOf = (D) => THETA * D;                      // m, focused spot diameter (f = D)
export const WORLD_POWER = 620e18 / (365.25 * 86400);        // 19.65 TW
// effect timings at the spot flux
export const GLASS_KG_M2 = 15, GLASS_C = 840, GLASS_DT = 1400;                     // 6 mm window pane, heated ~20 -> ~1,420 °C
export const GLASS_MELT_S = (GLASS_KG_M2 * GLASS_C * GLASS_DT) / Q_SPOT;           // 1.53 s ("under 2 seconds")
export const BOIL_J_KG = 0.33e6 + 2.26e6;                                          // 2.59 MJ/kg
export const boilKgS = (P) => P / BOIL_J_KG;                                       // kg of sea boiled per second

// ---- the ladder: 9 steps, D ×√10 each (P ×10)
export const D1 = 20;
export const stepD = (k) => D1 * Math.pow(10, (k - 1) / 2);  // k = 1..9: 20 m, 63 m, 200 m, 632 m, 2 km, 6.3 km, 20 km, 63 km, 200 km
export const STEPS = [1, 2, 3, 4, 5, 6, 7, 8, 9].map((k) => ({ k, D: stepD(k), P: powerOf(stepD(k)), w: spotOf(stepD(k)) }));

// ---- film clock. 1,140 frames at 30 fps. Shot boundaries = shots.txt (s08 runs to 37.0: the board's s09 orbit half-second
// is the tail of s08, so s09 is the plaza only). grows: [[shot time of the grow start, step after the grow]]; each grow takes
// GROW_S and multiplies D by √10 (P ×10). A shot's starting step is `step0`.
export const GROW_S = 0.8;
export const SHOT = {
  s01_plaza:  { t0: 0.0,  dur: 4.5, step0: 1, grows: [] },
  s02_street: { t0: 4.5,  dur: 4.5, step0: 1, grows: [[0.15, 2]] },     // grows just after the whip lands
  s03_tower:  { t0: 9.0,  dur: 4.5, step0: 2, grows: [[0.2, 3]] },
  s04_bay:    { t0: 13.5, dur: 4.5, step0: 3, grows: [[0.0, 4]] },
  s05_town:   { t0: 18.0, dur: 4.5, step0: 4, grows: [[0.0, 5]] },
  s06_clouds: { t0: 22.5, dur: 4.5, step0: 5, grows: [[0.0, 6]] },
  s07_strato: { t0: 27.0, dur: 4.5, step0: 6, grows: [[0.0, 7], [2.2, 8]] },
  s08_orbit:  { t0: 31.5, dur: 5.5, step0: 8, grows: [[0.0, 9]] },
  s09_loop:   { t0: 37.0, dur: 1.0, step0: 1, grows: [], loop: true },
};
export const FILM_LEN = 38.0, T_LOOP = 37.0;
export const HITS = [13.5, 22.5, 31.5, 37.0];                // the 4 hard cuts (sound hits)
const sm = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
// lens diameter (m) at shot time tt: smooth ×√10 per grow (log-eased, so the counter rolls evenly through the decade)
export function lensD(shot, tt) {
  const s = SHOT[shot]; let e = (s.step0 - 1) / 2;           // log10(D / D1)
  for (const [g] of s.grows) e += 0.5 * sm((tt - g) / GROW_S);
  return D1 * Math.pow(10, e);
}
export const powerAt = (shot, tt) => powerOf(lensD(shot, tt));
export const stepAt = (shot, tt) => { const s = SHOT[shot]; let k = s.step0; for (const [g, k1] of s.grows) if (tt >= g + GROW_S / 2) k = k1; return k; };

// ---- frame 1 focus ramp (s01; s09 holds its first frame): C on a log scale, 10 suns at frame 1 (375 °C) -> CMAX at film 1.0 s.
// The spot is a disc of diameter D/√C while focusing (C = (D/w)²), then the Sun's image w = θ·D.
export const C_FRAME1 = 10, FOCUS_S = 1.0;
export function focusC(tt) {
  if (tt <= 0) return C_FRAME1;
  const u = Math.min(1, tt / FOCUS_S), e = 1 - Math.pow(1 - u, 3);         // outCubic: snaps into focus, settles at 1.0 s
  return Math.pow(10, Math.log10(C_FRAME1) + (Math.log10(CMAX) - Math.log10(C_FRAME1)) * e);
}
export const spotW = (D, C = CMAX) => D / Math.sqrt(C);
// concentration and spot width for any shot at shot time tt
export function concAt(shot, tt) { if (shot === 's01_plaza') return focusC(tt); if (shot === 's09_loop') return C_FRAME1; return CMAX; }

// ---- geometry: the lens centre sits at focal length f = D from the spot along the line to the Sun (unit vector sun).
// Its height above the spot is D·sun.y (sun elevation 65° in kit.js: 0.91 D, and 0.41 D toward +Z).
export const lensCentre = (spot, sun, D) => spot.clone().addScaledVector(sun, D);
