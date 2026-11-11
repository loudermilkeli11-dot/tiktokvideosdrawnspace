// s02_flip: the flip lands on a hit; then a rising rush of wind, the crowd's shout swelling and receding upward,
// benches scraping off the paving, the fountain's splash cutting out, car alarms rising and fading.
function SOUND(ctx, out, dur) {
  hit(ctx, out, { t: 0, g: 1.0 });
  rumble(ctx, out, { t: 0, dur: 1.4, g: 0.7 });
  whoosh(ctx, out, { t: 0.05, dur: 2.6, g: 0.8 });
  wind(ctx, out, { t: 0.2, dur: dur - 0.2, g: 0.45 });
  gasp(ctx, out, { t: 0.15, g: 0.6 });
  crowd(ctx, out, { t: 0.4, dur: dur - 0.4, g: 0.55 });
  siren(ctx, out, { t: 0.9, dur: dur - 0.9, g: 0.12 });
  shutters(ctx, out, { t: 0.1, g: 0.35 });
}
