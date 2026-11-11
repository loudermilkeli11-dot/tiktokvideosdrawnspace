// moon-2x story clock: ONE continuous, steady approach (no easing). The gap between the surfaces halves every 5 s.
// storyT: seconds since the premise starts (rung 0 = 0 s, rung 5 = 25 s). Film shots map their time onto storyT.
export const R_MOON = 1737.4, R_EARTH = 6371.0;
export const GAP0 = 384400 - R_MOON - R_EARTH;             // 376,291.6 km: today's surface-to-surface gap
export const HALF = 5;                                       // seconds per halving
export const gapKm = (storyT) => GAP0 * Math.pow(2, -storyT / HALF);
export const centreKm = (storyT) => gapKm(storyT) + R_MOON + R_EARTH;
export const angRadius = (storyT) => Math.asin(R_MOON / centreKm(storyT));   // radians, as seen from Earth's surface
