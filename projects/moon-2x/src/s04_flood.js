// s04_flood (film 13-18, storyT 10-15): 50 mm, high on the hillside over the rooftops, down across the town and promenade
// to the bay. The sea climbs +2 -> +6 m at a constant rate; beat: the first wave rolls in and spills over the seawall (~tt 2.3).
// Hero small on a rooftop edge (left), seen from behind; the Moon sits over the bay mouth.
import { THREE } from '@engine/engine.js';
import { createStudio } from '@engine/engine.js';
import { applyCam, shake } from '@engine/camera.js';
import { createCrowd, createHero, createBirds } from '@engine/crowd.js';
import { rng, clamp, ease } from '@engine/util.js';
import { bayWorld, D2R, SHOT } from './kit.js';
import { groundH } from '@engine/bay.js';
const S = createStudio({ samples: 4, shadows: false, post: { exposure: 1.15, bloom: 0.18, bloomThreshold: 1.5, bloomRadius: 0.65, vignette: 0.45, grain: 0.03, sat: 1.06, contrast: 1.05 } });
const { scene, camera } = S;
const W = bayWorld(S, { pierLights: 0, ocean: { amp: 1.0, level: 2 } });
// ---- rolling surge: a level bump (front along +z toward the inner shore) patched into the ocean shader ----
const SU = { sZ: { value: -1e4 }, sA: { value: 0 } };
{ const m = W.ocean.mesh.material; Object.assign(m.uniforms, SU);
  m.vertexShader = m.vertexShader
    .replace('uniform float time, amp, level;', 'uniform float time, amp, level, sZ, sA;')
    .replace('float gh = groundH(xz); float depth = level - gh;',
      `float gh = groundH(xz); float dz = xz.y - sZ; float grow = smoothstep(-260., -30., xz.y);
       float crest = exp(-dz*dz/(18.*18.)); float inl = 1. - smoothstep(45., 110., xz.y);
       float bump = sA * grow * inl * (crest + 0.5*(1. - smoothstep(-60., 0., dz)));
       float depth = level + bump - gh;`)
    .replace('p.y += level;', 'p.y += level + bump;');
  m.fragmentShader = m.fragmentShader
    .replace('uniform float time, amp, level,', 'uniform float sZ, sA; uniform float time, amp, level,')
    .replace('vec3 foamLit = vec3(0.9,0.95,1.0) * (amb*1.6 +', 'vec3 foamLit = vec3(0.9,0.95,1.0) * (amb*3.2 +')
    .replace('col = mix(col, foamLit, foam*0.85);', `col = mix(col, foamLit, foam*0.85);
      { float dzf = vFlat.y - sZ; float growf = smoothstep(-260., -40., vFlat.y) * (1. - smoothstep(50., 110., vFlat.y));
        float band = exp(-(dzf-2.)*(dzf-2.)/(7.*7.)) + 0.55*exp(-(dzf+14.)*(dzf+14.)/(14.*14.)) * (0.6 + 0.4*sin(vFlat.x*0.07 + time));
        float n2 = fbm2(vWP.xz*vec2(0.22, 0.5) + vec2(time*0.15, -time*0.6));
        float sf = growf * band * smoothstep(0.42, 0.78, n2 + 0.22*band) * fade * step(0.01, sA);
        col = mix(col, vec3(0.42,0.5,0.6)*(0.75 + 0.5*n2) + R*0.25, clamp(sf, 0., 1.)*0.92); }`);
}
const R = rng(41);
// ---- camera rig: hillside above the rooftops, looking down over the town to the bay mouth ----
const CAM0 = new THREE.Vector3(50, 40, 230), LOOK = new THREE.Vector3(0, -51, -1700);
const heading = new THREE.Vector3(LOOK.x - CAM0.x, 0, LOOK.z - CAM0.z).normalize(), right = new THREE.Vector3(-heading.z, 0, heading.x);
// clear the sight line: town buildings inside the view wedge are capped below the line from the camera to the seawall,
// so we look DOWN over the rooftops to the promenade (the bay's random town would otherwise wall it off)
{ const DSEA = CAM0.z - 78, slope = (CAM0.y - groundH(CAM0.x, 78)) / DSEA, sightY = (al) => CAM0.y - slope * al - 1.0;
  const inWedge = (x, z, pad) => { const rx = x - CAM0.x, rz = z - CAM0.z, al = rx * heading.x + rz * heading.z, la = rx * right.x + rz * right.z;
    return al > 3 && al < DSEA + 25 && Math.abs(la) < al * 0.27 + pad ? al : -1; };
  const bm = W.bay.buildings, aS = bm.geometry.attributes.aSize, m4 = new THREE.Matrix4(), p = new THREE.Vector3(), q = new THREE.Quaternion(), sc = new THREE.Vector3();
  for (let i = 0; i < bm.count; i++) { bm.getMatrixAt(i, m4); m4.decompose(p, q, sc); const al = inWedge(p.x, p.z, 14); if (al < 0) continue;
    const maxTop = al < 52 ? -1e3 : sightY(al + 8); if (p.y + sc.y <= maxTop) continue; const h = Math.max(maxTop - p.y, 0.05); sc.y = h; m4.compose(p, q, sc); bm.setMatrixAt(i, m4); aS.setY(i, h); }
  bm.instanceMatrix.needsUpdate = true; aS.needsUpdate = true;
  const rt = W.bay.group.children[2];
  for (let i = 0; i < rt.count; i++) { rt.getMatrixAt(i, m4); m4.decompose(p, q, sc); const al = inWedge(p.x, p.z, 14); if (al < 0 || p.y + sc.y <= sightY(al + 8) - 0.5) continue; sc.setScalar(0); m4.compose(p, q, sc); rt.setMatrixAt(i, m4); }
  rt.instanceMatrix.needsUpdate = true;
  const gl = W.bay.glow, nb = W.bay.boats.length * 2;
  for (let i = 0; i < gl.count - 0; i++) { gl.getMatrixAt(i, m4); p.setFromMatrixPosition(m4); const al = inWedge(p.x, p.z, 14); if (al < 0 || p.y <= sightY(al + 8) + 3) continue; m4.makeTranslation(p.x, -1e4, p.z); gl.setMatrixAt(i, m4); }
  gl.instanceMatrix.needsUpdate = true; }
// hero's building: its roof edge at the left of frame, ~32 m in front of the camera, 5 m below it
const ROOF = CAM0.y - 4.6;
const heroP = CAM0.clone().addScaledVector(heading, 31).addScaledVector(right, -3.0); heroP.y = ROOF;
{ const g0 = groundH(heroP.x, heroP.z) - 2; const w = 11, d = 13, h = ROOF - g0;
  const geo = new THREE.BoxGeometry(1, 1, 1); geo.translate(0, 0.5, 0);
  geo.setAttribute('aSize', new THREE.InstancedBufferAttribute(new Float32Array([w, h, d]), 3)); geo.setAttribute('aSeed', new THREE.InstancedBufferAttribute(new Float32Array([377.3]), 1));
  const bm = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ color: 0x3b3936, roughness: 0.9 }), 1); const yaw = Math.atan2(-heading.x, -heading.z);
  const c = heroP.clone().addScaledVector(right, -w / 2 + 0.7).addScaledVector(heading, -d / 2 + 0.6);
  bm.setMatrixAt(0, new THREE.Matrix4().compose(new THREE.Vector3(c.x, g0, c.z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yaw, 0)), new THREE.Vector3(w, h, d)));
  bm.frustumCulled = false; scene.add(bm);
  // parapet lip + roof clutter (water tank, AC boxes) for silhouette
  const dark = new THREE.MeshStandardMaterial({ color: 0x2a2a2e, roughness: 0.85 });
  const lip = new THREE.Mesh(new THREE.BoxGeometry(w, 0.35, 0.3), dark); lip.position.copy(heroP).addScaledVector(right, -w / 2 + 0.7).addScaledVector(heading, 0.55); lip.position.y = ROOF + 0.17; lip.rotation.y = yaw; scene.add(lip);
  const tank = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 2.2, 14), dark); tank.position.copy(heroP).addScaledVector(right, -6.5).addScaledVector(heading, -4); tank.position.y = ROOF + 2.6; scene.add(tank);
  for (const [a, b] of [[-0.8, -0.6], [-1.5, -0.6]]) { const legs = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.5, 0.12), dark); legs.position.copy(heroP).addScaledVector(right, -6.5 + a).addScaledVector(heading, -4 + b); legs.position.y = ROOF + 0.75; scene.add(legs); }
  const ac = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.9, 1.0), dark); ac.position.copy(heroP).addScaledVector(right, -3.2).addScaledVector(heading, -2.5); ac.position.y = ROOF + 0.45; ac.rotation.y = yaw + 0.2; scene.add(ac);
}
const hero = createHero(S, { pose: 'phoneUp', rimI: 1.6 });
hero.root.position.copy(heroP); const HYAW = Math.atan2(-heading.x, -heading.z) + 0.12; hero.root.rotation.y = HYAW;
// neighbours on the same roof + a crowd on the streets above the flood line (tiny at this distance, phones glowing)
const people = [];
for (const [ox, od, pose] of [[-5.4, 3.5, 'filming'], [-7.0, 6.0, 'point']]) { const p = heroP.clone().addScaledVector(right, ox).addScaledVector(heading, od - 0); people.push({ x: p.x, z: p.z, y: ROOF, yaw: HYAW - 0.1, pose }); }
for (let i = 0; i < 46; i++) { const x = -40 + R() * 150, z = 95 + R() * 45; people.push({ x, z, y: groundH(x, z), yaw: Math.atan2(x - 20, z + 1500) * 0 + (R() - 0.5) * 0.8 + Math.PI * (R() < 0.35 ? 1 : 0) }); }
const crowd = createCrowd(S, people, { rimI: 1.2, phoneI: 8 });
const birds = createBirds(S, 26, { flap: 7 });
const STORY0 = SHOT.s04_flood - 3;
S.run((t) => {
  const tt = clamp(t - 4, 0, 5.2), u = tt / 5;
  const storyT = STORY0 + tt;
  // camera: slow eased truck right + slight descend (parallax on the hero's roof), smoothed handheld shake
  const e = ease.inOutSine(u);
  const pos = CAM0.clone().addScaledVector(right, -0.6 + 1.2 * e); pos.y -= 0.6 * e;
  const look = LOOK.clone().addScaledVector(right, 8 * e);
  applyCam(camera, { pos, look, mm: 50 }, shake(t, 0.1, 0.7, 4));
  // the sea climbs at a constant rate; the first big wave rolls in and over the seawall (front reaches z~+30 at tt~2.4)
  const level = 2 + 0.8 * tt;
  const sZ = -200 + 95 * (tt - 0.0);              // front position (m), constant speed
  SU.sZ.value = sZ; SU.sA.value = 1.9;
  const amp = 1.05 + 0.35 * u;
  W.update(S, t, { storyT, moonScreen: [300, 404], level, amp, flicker: 0.0, wet: clamp(tt / 2.5) * 0.6, shadowCenter: heroP });
  const md = W.md;
  for (const m of [crowd.material, hero.material]) m.U.rimDir.value.copy(md);
  crowd.update(t, { agitation: 0.55 + 0.35 * u });
  hero.root.rotation.set(0, HYAW + Math.sin(t * 0.8) * 0.03, Math.sin(t * 1.1) * 0.01);
  birds.update(t, (x) => new THREE.Vector3(-140 + x * 14, 46 + Math.sin(x * 0.6) * 2, -260 - x * 3), 9, 1.4);
});
