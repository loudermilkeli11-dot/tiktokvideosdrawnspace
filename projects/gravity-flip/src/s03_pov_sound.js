// s03_pov: wind roaring past (we move with the air, so it is the city's sound falling away, not drag), distant screams
// below, a car alarm tumbling nearby. At 2.0 s (τ 5) the score drops out for a beat: gravity is back.
function SOUND(ctx, out, dur) {
  hit(ctx, out, { t: 0, g: 0.6 });
  wind(ctx, out, { t: 0, dur, g: 0.6 });
  crowd(ctx, out, { t: 0, dur, g: 0.35 });
  siren(ctx, out, { t: 0.2, dur: dur - 0.2, g: 0.18 });
  gasp(ctx, out, { t: 2.0, g: 0.45 });
  rumble(ctx, out, { t: 2.0, dur: dur - 2.0, g: 0.35 });
}
