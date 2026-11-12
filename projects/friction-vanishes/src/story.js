// friction-vanishes: the ONE law. Coulomb friction between solid surfaces (and between grains) drops to mu = 0 for T seconds,
// then comes back (mu = 0.7 tyre on dry asphalt). Air drag stays. Ladder: T = 5 s -> 60 s -> 600 s, each step from the normal world.
//   on a slope theta:  a = g sin(theta) - (k/m) v^2           -> v = vt tanh(t/tc), x = vt tc ln cosh(t/tc)
//   on the flat:       a = -(k/m) v^2                         -> v = v0 / (1 + v0 (k/m) t), x = (m/k) ln(1 + v0 (k/m) t)
//   grip back:         decel = mu g cos(theta) - g sin(theta) (downhill skid); flat: mu g
// Every number on screen is computed here (overlay.js, captions, shots). See script.md for the board.
// DRAMATIZATION (the one stated liberty): only solid-solid and grain friction switch off, instantly; air/water drag stay;
// buildings, bolts, knots and clothes hold; the hill town, the 400 m street to the quay and the hillside flow speed are staged.
export const D2R = Math.PI / 180;
export const G0 = 9.81;                         // m/s^2, NASA Earth fact sheet
export const MU = 0.7;                          // tyre on dry asphalt (Wikipedia, Braking distance)
export const RHO = 1.225;                       // kg/m^3, ISA sea level
export const CAR = { m: 1500, Cd: 0.30, A: 2.2 };   // stated assumption: a typical family car (not on screen)
export const K = 0.5 * RHO * CAR.Cd * CAR.A;   // 0.404 kg/m  (drag force = K v^2)
export const KM = K / CAR.m;                    // 2.70e-4 1/m
export const THETA = 10;                        // deg, the hill street (staged)
export const SIN = Math.sin(THETA * D2R), COS = Math.cos(THETA * D2R), TAN = Math.tan(THETA * D2R);
export const A0 = G0 * SIN;                     // 1.703 m/s^2  start acceleration on the hill
export const VT = Math.sqrt(A0 / KM);           // 79.5 m/s  terminal slide speed on 10 deg
export const TC = VT / A0;                      // 46.7 s   time constant
export const REPOSE_SAND = 34;                  // deg, dry sand angle of repose (tan 34 = 0.67 = grain mu)
export const STEPS = [5, 60, 600];              // friction-off length per step (s)
export const V0 = 50 / 3.6;                     // the braking hero car: 50 km/h = 13.89 m/s
export const STREET_LEN = 400;                  // m, top of the hill street to the quay edge (staged)

// ---- slide down the 10 deg street from rest (tau = s since friction vanished)
export const slopeV = (tau) => (tau <= 0 ? 0 : VT * Math.tanh(tau / TC));
export const slopeX = (tau) => (tau <= 0 ? 0 : VT * TC * Math.log(Math.cosh(tau / TC)));
export const slopeTimeTo = (x) => TC * Math.acosh(Math.exp(x / (VT * TC)));       // s to slide x metres from rest
// ---- coasting on the flat with drag only (the braking car that never slows)
export const coastV = (v0, tau) => (tau <= 0 ? v0 : v0 / (1 + v0 * KM * tau));
export const coastX = (v0, tau) => (tau <= 0 ? v0 * tau : Math.log(1 + v0 * KM * tau) / KM);   // tau < 0: normal driving at v0
// ---- grip returns (mu = 0.7)
export const SKID_HILL = MU * G0 * COS - G0 * SIN;    // 5.06 m/s^2 downhill skid decel
export const SKID_FLAT = MU * G0;                     // 6.87 m/s^2
export const stopDist = (v, dec = SKID_FLAT) => (v * v) / (2 * dec);
export const stopTime = (v, dec = SKID_FLAT) => v / dec;
export const NORMAL_STOP = stopDist(V0);              // 14.05 m from 50 km/h on dry asphalt
// a car sliding downhill from rest, friction off for T, then skidding to a stop (position along the fall line, m)
export function slideSkidX(tau, T) {
  if (tau <= T) return slopeX(tau);
  const v = slopeV(T), s = Math.min(tau - T, stopTime(v, SKID_HILL));
  return slopeX(T) + v * s - 0.5 * SKID_HILL * s * s;
}
export function slideSkidV(tau, T) { if (tau <= T) return slopeV(tau); return Math.max(0, slopeV(T) - SKID_HILL * (tau - T)); }
// the braking car on the flat: grip gone at tau 0, back at T (then it really brakes: mu g)
export function brakeCarX(tau, T = 5) {
  if (tau <= 0) return V0 * tau;                         // before: driving at 50 km/h (s09 runs tau -1 -> 0)
  if (tau <= T) return coastX(V0, tau);
  const v = coastV(V0, T), s = Math.min(tau - T, stopTime(v)); return coastX(V0, T) + v * s - 0.5 * SKID_FLAT * s * s;
}
export function brakeCarV(tau, T = 5) { if (tau <= 0) return V0; if (tau <= T) return coastV(V0, tau); return Math.max(0, coastV(V0, T) - SKID_FLAT * (tau - T)); }
// ---- the quay: the street's foot. Things reach it after STREET_LEN m of slide and fly off ballistically (drag ignored over ~1 s)
export const T_QUAY = slopeTimeTo(STREET_LEN);   // 22.0 s
export const V_QUAY = slopeV(T_QUAY);            // 35.0 m/s = 126 km/h
export const QUAY_H = 2.0;                       // m, quay deck above the water
export const QUAY_ROAD = 24;                     // m of flat quay road between the street's foot and the quay edge (kit: ZF -> ZQ)
export const T_EDGE = T_QUAY + coastTime(V_QUAY, QUAY_ROAD);   // 22.7 s: off the quay edge (coasting the flat road, drag only)
export function coastTime(v0, x) { return (Math.exp(x * KM) - 1) / (v0 * KM); }   // s to coast x metres on the flat from v0
// ballistic launch off the quay edge along the fall line: returns [forward m, height m above deck] dt seconds after the edge
export function launch(v, dt, slopeDeg = THETA) {
  const vx = v * Math.cos(slopeDeg * D2R), vy = -v * Math.sin(slopeDeg * D2R);
  return [vx * dt, vy * dt - 0.5 * G0 * dt * dt];
}
export const fallTime = (v, h = QUAY_H, slopeDeg = THETA) => { const vy = v * Math.sin(slopeDeg * D2R); return (-vy + Math.sqrt(vy * vy + 2 * G0 * h)) / G0; };
// ---- step 3: grains lose friction too: the steepest slope that holds goes from the angle of repose to 0
// hillside flow (DRAMATIZATION: speed staged; real debris flows run 10-30 m/s): metres moved along the fall line
export const FLOW_V = 9;                          // m/s top speed of the staged hillside flow
export const flowX = (tau) => (tau <= 0 ? 0 : FLOW_V * (tau - 2.5 * (1 - Math.exp(-tau / 2.5))));
export const flowV = (tau) => (tau <= 0 ? 0 : FLOW_V * (1 - Math.exp(-tau / 2.5)));

// ---- film start of each shot (s) and the story clock (T = friction-off length of the step, tau0 at the shot's first frame)
export const SHOT = {
  s01_crossing: { t0: 0.0, dur: 4.0, T: 5, tau0: 0 },
  s02_grip: { t0: 4.0, dur: 4.5, T: 5, tau0: 4 },        // grip returns at tau 5 = film 5.0 (in-shot)
  s03_minute: { t0: 8.5, dur: 4.5, T: 60, tau0: 0 },
  s04_quay: { t0: 13.0, dur: 4.5, T: 60, tau0: 20 },     // the slide reaches the quay at T_QUAY (22.0) = film 15.0
  s05_town: { t0: 17.5, dur: 4.5, T: 60, tau0: 55.5 },   // grip returns at tau 60 = film 22.0 (the hit)
  s06_hills: { t0: 22.0, dur: 4.5, T: 600, tau0: 0 },
  s07_after: { t0: 26.5, dur: 4.0, T: 600, tau0: 600 },  // grip is back: the aftermath
  s08_orbit: { t0: 30.5, dur: 6.5, T: 600, tau0: 620 },
  s09_loop: { t0: 37.0, dur: 1.0, T: 5, tau0: -1.0 },    // runs straight into frame 1 (tau 0)
};
export const FILM_LEN = 38.0, FPS = 30;
export const tauAt = (shot, tt) => SHOT[shot].tau0 + tt;              // real time in every shot (no time-lapse)
export const filmAt = (shot, tau) => SHOT[shot].t0 + (tau - SHOT[shot].tau0);
export const gripBack = (shot, tau) => tau >= SHOT[shot].T || tau < 0;   // is friction on at this story time?
// key film times (score, captions, sound)
export const T_GRIP1 = filmAt('s02_grip', 5);            // 5.0
export const T_QUAYHIT = filmAt('s04_quay', T_QUAY);     // 15.0
export const T_GRIP2 = filmAt('s05_town', 60);           // 22.0
export const T_LOOP = SHOT.s09_loop.t0;                  // 37.0
