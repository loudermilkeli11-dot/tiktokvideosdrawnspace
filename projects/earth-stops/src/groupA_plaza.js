// groupA_plaza: Builder A's hero-plaza set for s01_plaza and s09_loop (the SAME world, so s09's last frame + 1/30 s = s01
// frame 0). Built on the shared kit (cityWorld, balcony, createChips, createDust); everything closed form in film time.
//   umbrellas : low-poly café umbrellas on the café tables + market-stall umbrellas; they rest until the stop, then tip east
//               and tumble away with the flow (drift / hop / roll from story.js).
//   upwind    : the debris river from the blocks WEST of the plaza (paper, leaves, shingles, roof panels, signs, glass):
//               hidden before the stop (it starts out of frame, x < -75), then streams through at V.
//   facades   : glass panes torn off the north shopfront row, progressively over e 0.01 .. 0.5.
//   fountain  : a crisp white plume of droplets that keeps going east from the jet and the basin.
//   dust      : three tan sheets (ground river near, mid plaza, tall wall against the north facades), growing at different
//               rates so the crowd's fling still reads at 2.5 s.
// East = +X = screen-right. Nothing goes up or west (chips only fall; dust only grows from the ground).
import { THREE } from '@engine/engine.js';
import { rng } from '@engine/util.js';
import { cityWorld, balcony, createChips, gradeDust, styliseMat, FRAME1_CAM, D2R, ZERO_M, qn } from './kit.js';
import { createDustA } from './groupA_dust.js';
import { plazaLife } from './plazaLife.js';
import { evAt, drift, hop, roll } from './story.js';

const sst = (a, b, x) => { const u = Math.min(1, Math.max(0, (x - a) / (b - a))); return u * u * (3 - 2 * u); };

// ---------------------------------------------------------------- the plaza look (s01 / s09 only; see FINAL/groupA.txt kit request)
// The kit's horizon is a pale grey-cream; the hits have a blue sky warming to gold at the horizon. Applied identically in
// s01 and s09 so the loop matches.
export function plazaLook(W) {
  W.sky.U.dayZen.value.set(qn('zen', 0x2f7ee6)); W.sky.U.dayHor.value.set(qn('hor', 0xead8a2)); if (W.sky.U.altI) W.sky.U.altI.value = 1.0;   // v4: = kit SKY (golden horizon)
}

export function plazaSet(S, o = {}) {
  const W = cityWorld(S, {});
  plazaLook(W);
  const rail = balcony(S, FRAME1_CAM);
  const C = W.C;

  // ---------------------------------------------------------------- umbrellas (café + market stalls)
  const spots = [];
  C.props.forEach((p) => { if (p.kind === 3 && p.y0 > -10 && Math.abs(p.x) < 46 && Math.abs(p.z) < 46) spots.push({ x: p.x0, z: p.z, r: 1.5 }); });
  { const R = rng(4242);   // market row along the west and north edges of the paving, clear of the hero's view line
    for (let i = 0; i < 16; i++) { const x = -40 + i * 5.2 + (R() - 0.5), z = -36 + (R() - 0.5) * 2; if (Math.abs(x) > 6) spots.push({ x, z, r: 1.7 }); }
    for (let i = 0; i < 7; i++) spots.push({ x: -40 + (R() - 0.5), z: -26 + i * 6.5, r: 1.7 }); }
  const UC = [0xd94a3d, 0xf0b23a, 0x2f9e68, 0x3a78d0, 0xff8a3d, 0xf2eee6, 0xe0709f, 0xe8d24a];
  const canG = new THREE.ConeGeometry(1, 0.42, 8, 1, true).toNonIndexed(); canG.translate(0, 2.35, 0); canG.computeVertexNormals();
  const poleG = new THREE.CylinderGeometry(0.035, 0.035, 2.4, 5); poleG.translate(0, 1.2, 0);
  const canM = new THREE.InstancedMesh(canG, styliseMat(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8, side: THREE.DoubleSide })), spots.length);
  const poleM = new THREE.InstancedMesh(poleG, styliseMat(new THREE.MeshStandardMaterial({ color: 0x5a5048, roughness: 0.6 })), spots.length);
  canM.castShadow = poleM.castShadow = true; canM.receiveShadow = true;
  { const R = rng(77); spots.forEach((s, i) => { s.sd = R(); s.col = UC[Math.floor(R() * UC.length)]; canM.setColorAt(i, new THREE.Color(s.col)); }); }
  canM.frustumCulled = poleM.frustumCulled = false; S.scene.add(canM, poleM);
  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _v = new THREE.Vector3(), _s = new THREE.Vector3(), ZAX = new THREE.Vector3(0, 0, 1), YAX = new THREE.Vector3(0, 1, 0);
  function poseUmbrellas(e) {
    const dx = drift(e);
    spots.forEach((s, i) => {
      if (e > 0 && s.x + dx > 700) { canM.setMatrixAt(i, ZERO_M); poleM.setMatrixAt(i, ZERO_M); return; }
      const a = e > 0 ? Math.min(1.3, e / 0.03) + roll(e, s.sd) * 0.7 : 0;            // tips east, then tumbles
      _q.setFromAxisAngle(ZAX, -a).multiply(_q2.setFromAxisAngle(YAX, s.sd * 6.28));
      const piv = e > 0 ? 1.2 : 0;                                                     // tumbles about its middle once airborne
      _v.set(0, piv, 0).sub(new THREE.Vector3(0, piv, 0).applyQuaternion(_q));
      _m.compose(_v.add(new THREE.Vector3(s.x + dx, e > 0 ? hop(e, s.sd) * 0.8 : 0, s.z)), _q, _s.set(s.r, 1, s.r));
      canM.setMatrixAt(i, _m); _m.compose(_v, _q, _s.set(1, 1, 1)); poleM.setMatrixAt(i, _m);
    });
    canM.instanceMatrix.needsUpdate = poleM.instanceMatrix.needsUpdate = true;
  }

  // ---------------------------------------------------------------- the upwind river (starts out of frame to the west)
  // edgeX(z): |x| of frame 1's left edge at depth z (32 mm: half-width 0.317 m per m of depth) + a 4 m margin, so the river
  // is hidden before the stop and enters frame-left within a few frames of it.
  const edgeX = (z) => 6 + 0.33 * Math.max(0, FRAME1_CAM.pos.z - z);
  const up = [];
  { const R = rng(9100), N = o.upwind ?? 4800;                                       // v2: denser (was 3200)
    const PAPER = [0xf2eee6, 0xe8e0c8, 0xfafafa, 0xd9cfb6], LEAF = [0x5f8a2e, 0x7a9a36, 0x8a6a2a, 0x4e7a2a], SHING = [0xa8492e, 0x8a3a28, 0x6a6a70, 0x4a5a6a, 0xb0a090],
      SIGN = [0xd94a3d, 0xf0b23a, 0x3a78d0, 0x2f9e68, 0xe8d24a, 0xff8a3d, 0xfafafa];
    for (let i = 0; i < N; i++) {
      const z = -110 + R() * 150, x = -edgeX(z) - Math.pow(R(), 0.9) * 260, k = R();
      let c;
      if (k < 0.34) c = { kind: 0, shape: 1, size: 0.3 + R() * 0.35, y: 0.3 + Math.pow(R(), 1.6) * 14, col: PAPER[Math.floor(R() * 4)] };
      else if (k < 0.58) c = { kind: 0, shape: 1, size: 0.22 + R() * 0.2, y: 0.5 + Math.pow(R(), 1.3) * 10, col: LEAF[Math.floor(R() * 4)] };
      else if (k < 0.8) c = { kind: 2, shape: R() < 0.5 ? 1 : 0, size: 0.7 + R() * 1.1, y: 0.2 + Math.pow(R(), 1.8) * 16, col: SHING[Math.floor(R() * 5)] };
      else if (k < 0.9) c = { kind: 2, shape: 1, size: 1.2 + R() * 1.6, y: 0.4 + Math.pow(R(), 2) * 9, col: SIGN[Math.floor(R() * 7)] };
      else c = { kind: 1, shape: 1, size: 0.6 + R() * 0.8, y: 1 + Math.pow(R(), 1.4) * 20, col: 0xa8c4d4 };
      up.push({ p: [x, c.y, z], t0: 0, size: c.size, col: c.col, kind: c.kind, shape: c.shape });
    }
    // the near ground band: shingles, panels, signs and paper skidding over the paving close to us (fills the lower frame)
    for (let i = 0; i < 1100; i++) { const k2 = R(), z = -10 + R() * 52; up.push({ p: [-edgeX(z) - Math.pow(R(), 1.3) * 250, 0.15 + Math.pow(R(), 2) * 2.2, z], t0: 0,
      size: k2 < 0.6 ? 0.4 + R() * 0.5 : 0.7 + R() * 0.8, col: k2 < 0.6 ? SHING[Math.floor(R() * 5)] : k2 < 0.85 ? SIGN[Math.floor(R() * 7)] : PAPER[Math.floor(R() * 4)], kind: k2 < 0.85 ? 2 : 0, shape: R() < 0.8 ? 1 : 0 }); }
    // a few near, low pieces (paper and leaves) for parallax under the counter block
    for (let i = 0; i < 160; i++) up.push({ p: [-30 - R() * 120, 0.2 + R() * 2.2, 36 + R() * 14], t0: 0, size: 0.22 + R() * 0.2, col: R() < 0.5 ? PAPER[Math.floor(R() * 4)] : LEAF[Math.floor(R() * 4)], kind: 0, shape: 1 });
  }
  const upwind = createChips(S, up);

  // ---------------------------------------------------------------- glass off the north shopfront row (z ≈ -72) + loose litter
  const gl = [];
  { const R = rng(515);
    C.buildings.forEach((b) => { if (b.z > -60 || b.z < -200 || Math.abs(b.x) > 150) return; const fz = b.z + b.d / 2;
      const n = Math.round(b.w * 3.2);
      for (let i = 0; i < n; i++) { const y = 0.8 + Math.pow(R(), 1.5) * Math.min(b.h, 40);
        gl.push({ p: [b.x + (R() - 0.5) * b.w, y, fz + 0.4 + R() * 0.8], t0: 0.008 + 0.25 * Math.pow(R(), 1.3) + y * 0.004, size: 0.5 + R() * 0.7, col: R() < 0.8 ? 0x9fc0d2 : 0xe6e2d8, kind: 1, shape: 1 }); } });
    // litter on the paving (born at the stop where it lies)
    for (let i = 0; i < 700; i++) { const x = -46 + R() * 92, z = -46 + R() * 92; gl.push({ p: [x, 0.15 + R() * 0.5, z], t0: 0.002 * R(), size: 0.2 + R() * 0.25, col: R() < 0.7 ? 0xf2eee6 : 0xd94a3d, kind: 0, shape: 1 }); }
    // the fountain's water: a crisp white plume that keeps going east
    for (let i = 0; i < 1400; i++) { const a = R() * 6.28, jet = R() < 0.45, rr = jet ? R() * 1.2 : Math.sqrt(R()) * 6;
      gl.push({ p: [Math.cos(a) * rr, jet ? 0.6 + R() * 7.5 : 0.4 + R() * 0.9, Math.sin(a) * rr], t0: 0, size: 0.14 + R() * 0.22, col: R() < 0.7 ? 0xf4fbff : 0xbfe3f0, kind: 1, shape: 0 }); }
  }
  const glass = createChips(S, gl);

  // ---------------------------------------------------------------- dust: near ground river, mid plaza, tall wall at the facades
  const dFloor = createDustA(S, [{ x0: -340, x1: 340, op: 0.62, floor: { z0: -72, z1: 58, y: 0.25 } }]);
  const dMid = createDustA(S, [{ x0: -320, x1: 320, z: -30, h: 16, op: 0.55 }]);
  const dFar = createDustA(S, [{ x0: -380, x1: 380, z: -67, h: 26, op: 0.6 }]);
  // v2 edit (Commander 11-12): the near crowd, laughing/goofing people, the lamp-post clinger, hot-dog cart, dog, flying hats
  const life = plazaLife(S, W);

  return { W, C, rail, upwind, glass, canM, life,
    update(film, st = {}) {
      const e = evAt(film);
      W.update(film, { focus: st.focus ?? new THREE.Vector3(0, 0, 10) });
      life.update(film);
      poseUmbrellas(e);
      upwind.update(e); glass.update(e);
      dFloor.update(e, sst(0.01, 0.42, e));                 // the ground river over the paving (a near vertical sheet read as a step)
      dMid.update(e, sst(0.04, 0.4, e));
      dFar.update(e, 1 - Math.exp(-e / 0.12));
      gradeDust(S, 0.4 * sst(0.02, 0.45, e));
    } };
}
