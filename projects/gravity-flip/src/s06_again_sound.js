// s06_again: a tape-rewind whoosh into the calm plaza again; murmur returns, ticks re-arm in the score.
function SOUND(ctx, out, dur) {
  hit(ctx, out, { t: 0, g: 0.7 });
  whoosh(ctx, out, { t: 0, dur: 0.5, g: 0.9 });
  crowd(ctx, out, { t: 0.3, dur: dur - 0.3, g: 0.3 });
  surf(ctx, out, { t: 0.3, dur: dur - 0.3, g: 0.1 });
}
