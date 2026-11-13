// no-empty-space: prints every on-screen number computed by projects/no-empty-space/src/story.js (run: node engine/src/nes_story_check.mjs)
import * as S from '../../projects/no-empty-space/src/story.js';
console.log(JSON.stringify(S.SHOW, null, 1));
console.log('FILM_LEN', S.FILM_LEN, 'sugar cube side cm', S.PEOPLE_CUBE_CM.toFixed(2), 'G_MINI', S.G_MINI.toExponential(3), 'R_MINI', S.R_MINI.toFixed(1));
for (const k of Object.keys(S.RUNG)) console.log(k, 'd1 =', S.RUNG[k].d1.toExponential(3), 'm', 'm =', S.RUNG[k].m.toExponential(3));
console.log('car depth 4.5 s / 10 s:', S.depthAt('car', S.SHOT.s04_hole.t0).toFixed(1), S.depthAt('car', S.SHOT.s04_hole.t0 + S.SHOT.s04_hole.dur).toFixed(1));
console.log('tower depth s07 start / end:', S.depthAt('tower', S.SHOT.s07_drop.t0).toFixed(1), S.depthAt('tower', S.SHOT.s07_drop.t0 + S.SHOT.s07_drop.dur).toFixed(1));
console.log('sizes mid-implosion (phone):', [1.6, 1.7, 1.8, 1.9, 1.95].map((t) => S.fmtSize(S.sizeAt('phone', t))).join(' | '));
for (const n of S.SHOTS) console.log(n, S.SHOT[n].t0.toFixed(2), (S.SHOT[n].t0 + S.SHOT[n].dur).toFixed(2), S.SHOT[n].frames);
