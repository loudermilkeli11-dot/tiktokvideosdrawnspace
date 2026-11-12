// tsunami-524: the ONE law. A rockfall into the bay drives water up the far slope to the real record, 524 m (Lituya Bay, Alaska,
// 9 July 1958, a measured RUN-UP: Miller, USGS PP 354-C, 1960). After that each step doubles it: H(k) = 524 m × 2^k, k = 0..3.
// The counter also shows the vertical speed water needs to reach H: v = sqrt(2 g H). Then the speed climbs to Earth's escape speed.
// DRAMATIZATION (the one stated liberty): the 524 m run-up is treated as a wave height and doubled, the water leaves Earth; the 1.5 s
// fuse, the 2.6 s climb to 524 m, the town and lighthouse inside the bay and the speed ramp are part of it. Real: 524 m, 1958, and
// REF below. Pure JS (no three.js): shots, overlay.js and score.json all read it. Board: PRODUCTION.md §3 (overrides script.md).
export const G0 = 9.81;
export const RUNUP = 524;                       // m, Lituya Bay 1958 (real)
export const REF = {
  oceanDepth: 3682,                             // m, average ocean depth (NOAA)
  escape: 11186,                                // m/s, Earth's escape speed (NASA Earth Fact Sheet)
  oceanKm3: 1.335e9,                            // km³, ocean volume (NOAA NGDC), shown as 1.3 billion
};
// bay.js town: waterfront rows (sField < 80) draw h = 6 + U(0,14) + U(0,10) m and sit 1 m into the ground -> mean roof 17 m above
// the street. The s04 fact line reads this (not the board's guessed 20 m).
export const ROOF_H = 6 + 14 / 2 + 10 / 2 - 1;  // 17 m
export const heightK = (k) => RUNUP * Math.pow(2, k);         // 524, 1048, 2096, 4192
export const riseSpeed = (H) => Math.sqrt(2 * G0 * H);        // m/s
export const kmh = (ms) => ms * 3.6;
export const ROOF_X = Math.round(RUNUP / ROOF_H);             // 31× taller than the roofs
export const OVER_DEPTH = heightK(3) - REF.oceanDepth;        // 510 m taller than the ocean is deep

// ---- film timing (30 fps, 915 frames). t0 = film start, dur = length (s); shot time tt = t - t0 = page time - 4.
export const FPS = 30;
export const SHOT = {
  s01_bay: { t0: 0.0, dur: 1.5 },
  s02_cliff: { t0: 1.5, dur: 3.0 },
  s03_wall: { t0: 4.5, dur: 3.0 },
  s04_town: { t0: 7.5, dur: 5.0 },
  s05_standup: { t0: 12.5, dur: 3.5 },
  s06_lift: { t0: 16.0, dur: 3.5 },
  s07_peel: { t0: 19.5, dur: 4.5 },
  s08_tail: { t0: 24.0, dur: 3.5 },
  s09_orbit: { t0: 27.5, dur: 2.0 },          // the board's s09, split in two pages at the hard cut (29.5 s)
  s09_loop: { t0: 29.5, dur: 1.0 },           // the second BEFORE frame 1: s01's world at film -1.0 .. 0 (calm, then the crack)
};
export const FILM_LEN = 30.5;
// key film times
export const T = {
  impact: 1.5,          // the slab hits the water (fuse = 1.5 s, starts at frame 1)
  runupTop: 4.1,        // the run-up crest passes 524 m on the far slope
  lighthouse: 6.5,      // the wall swallows the lighthouse
  roofs: 9.0,           // the wave tops the town roofs
  x2: [10.5, 11.1], x4: [12.5, 13.1], x8: [16.0, 16.6],   // height tweens
  escape: 23.0,         // the speed counter reaches escape speed and stops
  loopCut: 29.5,        // hard cut to the frame-1 bay
};
export const FUSE = T.impact - SHOT.s01_bay.t0;              // 1.5 s
export const LOOP_TT = -0.1;                                  // s09's bay second shows s01's world at shot time -0.1 (page 3.9): calm, pre-crack

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const ss = (a, b, x) => { const u = clamp((x - a) / (b - a)); return u * u * (3 - 2 * u); };

// ---- the law at film time t
export const fuseLeft = (t) => Math.max(0, T.impact - t);                     // s, ROCKFALL IN countdown
// run-up crest height on the far slope (s02): decelerating climb, 0 at impact, 524 m at T.runupTop, then holds
export function runupAt(t) { const u = clamp((t - T.impact) / (T.runupTop - T.impact)); return RUNUP * (1 - (1 - u) * (1 - u)); }
// wave height (m) from s03 on: 524, then ×2 / ×4 / ×8 tweens
export function waveH(t) {
  return t < T.x2[0] ? RUNUP : t < T.x4[0] ? lerpH(1, T.x2, t) : t < T.x8[0] ? lerpH(2, T.x4, t) : lerpH(3, T.x8, t);
}
const lerpH = (k, [a, b], t) => heightK(k - 1) + (heightK(k) - heightK(k - 1)) * ss(a, b, t);
export const stepK = (t) => (t < T.x2[0] ? 0 : t < T.x4[0] ? 1 : t < T.x8[0] ? 2 : 3);   // the step being shown (after its tween starts)
// water speed (s07): 1,032 km/h at the shot start -> escape speed at T.escape, log-eased (monotone), then holds
export function waterSpeed(t) {
  const v0 = riseSpeed(heightK(3)), v1 = REF.escape, u = ss(SHOT.s07_peel.t0, T.escape, t);
  return v0 * Math.pow(v1 / v0, u);
}
// fraction of the ocean still on Earth (s08): 1 -> 0 over the shot (the shell's peel reads the same function)
export const oceanLeft = (t) => 1 - ss(SHOT.s08_tail.t0 + 0.2, SHOT.s08_tail.t0 + SHOT.s08_tail.dur - 0.4, t);

// ---- names overlay.js reads (same law, film time t)
export const YEAR = 1958, OCEAN_DEPTH = REF.oceanDepth, V_ESC = REF.escape, OCEAN_KM3 = REF.oceanKm3, ROOF_M = ROOF_H, H = heightK;
T.speed = [SHOT.s07_peel.t0, T.escape];                                      // 19.5 -> 23.0 speed ramp
T.ocean = [SHOT.s08_tail.t0, SHOT.s08_tail.t0 + SHOT.s08_tail.dur];          // 24.0 -> 27.5 ocean leaves
export const fuseAt = fuseLeft;
export const heightAt = (t) => (t < SHOT.s03_wall.t0 ? runupAt(t) : waveH(t));   // run-up in s02, wave height after
export const riseAt = (t) => riseSpeed(waveH(t));                            // 365 / 516 / 730 / 1,032 km/h at the steps
export const waterSpeedAt = waterSpeed, oceanLeftAt = oceanLeft;
