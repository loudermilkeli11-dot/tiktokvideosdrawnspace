// earth-stops v2 (s03_towers): the towers break PHYSICALLY instead of the v1 "deck of cards" floor slide (Commander 11-12).
// The same law: anything loose keeps going east at V the instant it lets go (createChips: x = p.x + V·(e - t0), real gravity).
// Nothing slides as a layer; what goes is what the Mach-1.1 air can tear off a standing frame:
//   glass   : window panes shatter off every lit face in waves that sweep down each tower (thousands of glinting shards);
//   cladding: stone/metal panels and mullions;
//   signs   : big coloured shop and rooftop signs ripped off whole (heavy cards, tumbling);
//   roof    : water tanks and a crane torn off the roofs (groupB_towers roofTank / roofCrane), plus AC units and vents.
// Every release time sits inside s03's window (e 1.17 -> 1.75) so the frame is never still. Closed form in e.
import { THREE } from '@engine/engine.js';
import { rng } from '@engine/util.js';
import { createChips } from './kit.js';
import { roofTank, roofCrane } from './groupB_towers.js';

// in-frame towers (v1 plazaShear's hand-set list) and the s03 shot time at which each starts to break
const PICK = { 52: 0.5, 61: 0.2, 60: 0.4, 59: 1.2, 50: 1.8, 58: 2.4, 48: 3.0, 49: 3.6, 36: 1.5 };

export function breakTowers(S, W, E_S03) {
  const C = W.C, R = rng(2611), list = [], props = [];
  const at = (tt) => E_S03 + tt / 12;                                  // shot time -> e (12× slow)
  // v4 (Commander 11-12 fix #2): HEAVY debris, not confetti: fewer, bigger concrete slabs, whole window panels and steel
  // beams in grey/dark concrete tones, each big chunk trailing a thin crisp grey dust streak (small grey grit released along
  // its own path a beat later: same closed-form law, so the trail sits exactly behind it). A few glass glints stay.
  const GLASS = [0x9fc0d2, 0x8fb0c4, 0xb4d0dc, 0xe6eef2], CONC = [0x7e848c, 0x939aa2, 0x646a72, 0xa4a8ae, 0x70747a],   // cool greys: the warm sun lifts them to concrete
    STEEL = [0x4a3a34, 0x2e2e32, 0x3c3f46], PANEL = [0x3e5868, 0x4a6678, 0x34505e],
    SIGN = [0xd94a3d, 0xf0b23a, 0x3a78d0, 0x2f9e68, 0xe8d24a, 0xff8a3d, 0xfafafa];
  const DUSTC = [0x7a7e84, 0x8c9096, 0x6c7076];
  const trail = (q, n = 7) => { for (let k = 1; k <= n; k++) list.push({ p: [q.p[0] + (R() - 0.5) * 0.6, q.p[1] + (R() - 0.5) * 0.6, q.p[2]], t0: q.t0 + k * 0.045 / 12,
    size: q.size * (0.22 - 0.018 * k) * (0.8 + 0.4 * R()), shape: 0, kind: 2, seed: R(), col: DUSTC[Math.floor(R() * 3)] }); };
  const heavy = (q) => { list.push(q); trail(q); };
  Object.entries(PICK).forEach(([i, t1]) => { const b = C.buildings[+i]; if (!b) return;
    const e1 = at(t1), front = b.z + b.d / 2 + 0.4;
    // glass glints: a sparse wave down the front from the roof (was ~0.9/m², now 0.12)
    const nG = Math.round(b.w * b.h * 0.12), far = Math.min(2.2, 1 + Math.max(0, -b.z - 150) / 250);   // far towers: bigger pieces so they read
    for (let c = 0; c < nG; c++) { const face = R(), y = 3 + R() * (b.h - 3), down = (b.h - y) / b.h;
      let x, z; if (face < 0.7) { x = b.x - b.w / 2 + R() * b.w; z = front; } else if (face < 0.85) { x = b.x - b.w / 2 - 0.4; z = b.z - b.d / 2 + R() * b.d; } else { x = b.x + b.w / 2 + 0.4; z = b.z - b.d / 2 + R() * b.d; }
      list.push({ p: [x, y, z], t0: e1 + (down * 4.0 + R() * 2.5) / 12, size: far * (1.2 + R() * 1.6), shape: R() < 0.75 ? 1 : 0, kind: 1, col: GLASS[Math.floor(R() * 4)] }); }
    // concrete slabs, whole window panels and steel beams torn off the upper half (heavy: fall + tumble, each with a dust trail)
    for (let c = 0; c < b.w * 2.2; c++) { const y = b.h * (0.25 + 0.75 * Math.pow(R(), 0.6)), r = R(), base = { p: [b.x - b.w / 2 + R() * b.w, y, front], t0: e1 + (0.3 + R() * 5.0) / 12, kind: 2 };
      if (r < 0.5) heavy({ ...base, size: far * (3.2 + R() * 3.0), shape: 3, col: CONC[Math.floor(R() * 5)] });
      else if (r < 0.78) heavy({ ...base, size: far * (3.0 + R() * 2.0), shape: 1, col: PANEL[Math.floor(R() * 3)] });
      else heavy({ ...base, size: far * (3.5 + R() * 3.0), shape: 2, col: STEEL[Math.floor(R() * 3)] }); }
    // wall blow-outs: 4 bursts per tower, each a cluster of a few BIG slabs, window panels and beams torn off together
    for (let k = 0; k < 4; k++) { const by = b.h * (0.3 + 0.65 * R()), bx = b.x - b.w / 2 + R() * b.w, tb = e1 + (0.4 + k * 1.1 + R() * 0.6) / 12;
      for (let c = 0; c < 8; c++) { const r = R(), base = { p: [bx + (R() - 0.5) * 7, by + (R() - 0.5) * 6, front + R() * 0.6], t0: tb + R() * 0.15 / 12, kind: 2 };
        if (r < 0.15) list.push({ ...base, size: far * (3 + R() * 2), shape: 1, kind: 1, col: GLASS[Math.floor(R() * 4)] });
        else if (r < 0.6) heavy({ ...base, size: far * (4.5 + R() * 4), shape: 3, col: CONC[Math.floor(R() * 5)] });
        else if (r < 0.8) heavy({ ...base, size: far * (4 + R() * 2.5), shape: 1, col: PANEL[Math.floor(R() * 3)] });
        else heavy({ ...base, size: far * (5 + R() * 3), shape: 2, col: STEEL[Math.floor(R() * 3)] }); } }
    // signs: 2-3 big coloured boards per tower (shopfront band and the roof edge), ripped off whole
    for (let c = 0; c < 5; c++) { const roof = c >= 3;
      list.push({ p: [b.x + (R() - 0.5) * b.w * 0.7, roof ? b.h + 1.5 : 4 + R() * 6, front + 0.3], t0: e1 + (0.2 + c * 0.7 + R() * 0.3) / 12, size: roof ? 6 + R() * 3 : 3.5 + R() * 2, shape: 1, kind: 2, col: SIGN[Math.floor(R() * 7)] }); }
    // roof clutter: AC units / vents (tetra boxes), then a tank on the bigger roofs
    for (let c = 0; c < 10; c++) list.push({ p: [b.x + (R() - 0.5) * b.w * 0.8, b.h + 0.8, b.z + (R() - 0.5) * b.d * 0.8], t0: e1 + (0.1 + R() * 1.5) / 12, size: 1.6 + R() * 1.4, shape: 0, kind: 2, col: [0x8a8680, 0xb0aca4, 0x6a6660][Math.floor(R() * 3)] });
    if (b.w > 18) props.push(roofTank(S, { x: b.x - b.w * 0.2, y: b.h, z: b.z, e0: e1 + (0.6 + R() * 0.8) / 12, col: [0x8a5a3a, 0x6a7a8a, 0xa84a3a][Math.floor(R() * 3)] }));
  });
  { const b = C.buildings[59]; if (b) props.push(roofCrane(S, { x: b.x, y: b.h, z: b.z, mast: 24, jib: 30, e0: at(2.6), tTop: 0.12 })); }
  const chips = createChips(S, list);
  return { chips, props, count: list.length, update(e) { chips.update(e); props.forEach((p) => p.update(e)); } };
}
