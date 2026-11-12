// s09_loop: only the bay's room tone, very low (the loop hit's click is in score.json; true silence follows it).
function SOUND(ctx, out, dur) {
  surf(ctx, out, { t0: 0.35, t1: dur, gain: -34, period: 4.5 });
}
