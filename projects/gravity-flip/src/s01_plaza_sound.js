// s01_plaza: a lively plaza at lunchtime: crowd murmur, fountain splash, traffic hiss, pigeons. Tension builds under the ticks (score).
function SOUND(ctx, out, dur) {
  hit(ctx, out, { t: 0, g: 0.5 });
  crowd(ctx, out, { t: 0, dur, g: 0.35 });
  surf(ctx, out, { t: 0, dur, g: 0.12 });
  wind(ctx, out, { t: 0, dur, g: 0.08 });
  flutter(ctx, out, { t: 0.6, g: 0.25 });
}
