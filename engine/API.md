# Engine API cheat sheet (engine/src, three.js r169)

Read this instead of the engine sources. Everything here was checked against the code (2026-11-12); `file:line` points
at the source when a claim is not obvious. Skim the tables; copy the Anatomy skeleton; take snippets from Recipes;
read Pitfalls before you render.

---------------------------------------------------------------------------------------------------------------------
## 0. Ground rules (apply to every module)

- **Imports:** `import { ... } from '@engine/<file>.js'` (esbuild alias to engine/src, `engine/build.mjs`). `three` and
  `three/examples/jsm/...` resolve too. `THREE` is also re-exported by `@engine/engine.js`.
- **Time:** `S.run((t) => ...)` gets PAGE time `t = shot time + 4` (`PRE = 4`). Shot time: `tt = Math.max(t - 4, 0)`.
  `tools/frames.js page.html dir 1.0` renders `frame(4 + 1.0)`. Story clocks are project code (e.g. gravity-flip
  `tauAt(shot, tt)`, `heightAt(tau, T)` in `src/story.js`).
- **Determinism:** the update callback runs once per motion-blur sub-sample (n times per frame, at `t ± shutter/2/30`)
  and in any frame order. Make every position a pure function of t; never accumulate state across calls
  (`util.js:1`). Precompute tables at load (s07 integrates the jet path once).
- **Frame:** canvas 1080×1920 (`W, H`), 30 fps (`FPS`). "Design px" in briefs and overlays = the 540×960 half frame.
  Camera aspect is fixed 9:16.
- **Units:** metres everywhere, except `space.js`, `shell.js`, `storm.js` (1 unit = 1 km, Earth centre at origin,
  `RE = 6371`) and `clouds.js` (metres, but world y = 0 sits at altitude `alt`). +Y is up in every ground set.
- **Who adds to the scene:** `createSky` and `createMoon` return a Mesh you must `scene.add()`. `createOcean` returns
  `{ add(scene) }` (call `ocean.add(scene)`). Everything else adds itself (`createBay`, `createCity`, crowd, hero,
  birds, clouds, space, shell, storm, planes, station, fire, spray, rocks, boats, debris, breakup).
- **Lights:** only `createBay` makes lights (a DirectionalLight called `moonLight` + a HemisphereLight). City, planes,
  station, figures are PBR materials: the shot must add a sun (DirectionalLight), a HemisphereLight and usually
  `S.hdri(...)` for reflections.
- **Order inside S.run:** call `applyCam(...)` FIRST. `sky.update`, `clouds.update`, `space.update`, `ocean.mesh.update`,
  `createRingArc().update`, `dirThroughScreen` all read the camera (fov, position).

### Update signatures (they differ: copy exactly)
| Handle | Per-frame call |
|---|---|
| sky (createSky) | `sky.update(S, t)` |
| ocean (createOcean) | `ocean.mesh.update(S, t)` (NOT `ocean.update`) |
| bay (createBay) | `bay.update(S, t, { waveAmp, level, moonDir, moonLightI, shadowCenter })` |
| city (createCity) | `C.update(t, { lift, tumble, waterLift })` |
| crowd (createCrowd) | `crowd.update(t, { agitation, lift, tumble })` |
| birds (createBirds) | `birds.update(t, pathFn, spread = 12, size = 1)` — `pathFn(t) -> Vector3` |
| hero (createHero) | no update; move `hero.root`, `hero.setPose(name)` |
| space (createSpace) | `SP.update(S, t)` |
| shell (createShell) | `SH.update(S, t, { h /*km*/, show })` |
| storm (createStorm) | `ST.update(S, h /*km*/)` |
| clouds (createClouds) | `CL.update(S, { alt /*m*/, sunDir })` then `sky.U.dip.value = CL.dip` |
| breakup | `B.update(t, { centre, radius, md, sunDir, crack, sep, stretch, tail, airCol, hot })` |
| meteors / impacts / fire / spray | `.update(t)` (impacts returns summed glow) |
| ring arc / streams | `.update(t, camera)` |
| planes / station | no update; set `root.position/quaternion`, `fleet.set(i, pos, quat, scale)`, `ST.setArrays(a)` |

---------------------------------------------------------------------------------------------------------------------
## 1. engine.js — studio, frame loop, assets

Exports: `THREE`, `W = 1080`, `H = 1920`, `FPS = 30`, `PRE = 4`, `SCALE` (`?scale=`), `MB` (`?mb=`), `texURL(name)`,
`createStudio(opts)`.

`createStudio(opts) -> S`
| opt | default | notes |
|---|---|---|
| `samples` | **8** | number or `(t) => number` (page t). Motion-blur sub-samples. Gravity-flip uses 2 (4 fast, 12 for a whip). `?mb=n` overrides. |
| `shutter` | 0.5 | fraction of the frame interval (180°) |
| `jitter` | true | sub-pixel AA jitter across sub-samples (Halton) |
| `shadows` | false | enables `renderer.shadowMap` (PCFSoft). Lights/meshes still need `castShadow`. |
| `near`, `far` | 0.1, 2e5 | PerspectiveCamera. Space shots: `near: 50, far: 3e6` (km). Bay day shots: `near: 0.5`. |
| `post` | {} | initial `Post` params (see post.js) |

`S` fields: `THREE, renderer, scene, camera, post, cv, W, H` (canvas px, scaled), `scale, samples, shutter, jitter, t, env`.
- `S.tex(name, { srgb = true, repeat = false, aniso = 8 })` -> THREE.Texture, loads async (added to `S.pending`).
  Data maps (normals, relief, masks) need `srgb: false`.
- `S.hdri(name, intensity = 1)` -> Promise; sets `scene.environment` (PMREM) and `scene.environmentIntensity`.
- `S.run(update)` sets `window.frame(t)`, waits for `S.pending`, warms up at `t = PRE`, sets `window.ASSETS_READY`
  (or `window.ASSETS_ERROR`), `document.title = 'READY'`.
- Renderer: `NoToneMapping`, pixel ratio 1, `preserveDrawingBuffer`. Tone mapping is done in post (ACES).
- Page query: `?scale=0.5` (canvas size), `?mb=1` (force samples), `?static` (no live preview), `?t=1.2` (preview at
  shot time 1.2), `?dur=` (preview loop length). Shots may read their own `?k=v` params (s04/s05 `qn()` helper).

## 2. post.js — `Post` (created by the studio; tweak `S.post.p.*` any time, e.g. per frame)
Chain: sub-sample accumulation -> 6-mip bloom -> exposure·tint -> flash -> saturation -> ACES -> contrast/gain/lift ->
vignette -> fade -> sRGB -> grain. Params (`S.post.p`, defaults):
`exposure 1.0, bloom 0.35, bloomThreshold 1.0, bloomKnee 0.6, bloomRadius 0.85, vignette 0.35, grain 0.035, ca 0.0025,
sat 1.05, contrast 1.04, lift [0,0,0], gain [1,1,1], tint [1,1,1], flash 0, flashColor [1,0.85,0.7], fade 0` (0..1 to black).
Gravity-flip daylight preset: `{ exposure: 1.0, bloom: 0.06, bloomThreshold: 3.0, bloomRadius: 0.5, vignette: 0.22,
grain: 0.012, ca: 0.0008, sat: 1.12, contrast: 1.05 }`. Orbit preset (s08): `{ bloom: 0.22, bloomThreshold: 1.1,
bloomRadius: 0.55, vignette: 0.4, grain: 0.025, ca: 0.0006, sat: 1.1, contrast: 1.05 }`. Do not use `flash` for white
flashes (check.py fails upward luma jumps).

## 3. camera.js — lenses, paths, shake
| export | signature | notes |
|---|---|---|
| `lensFov(mm)` | -> vertical FOV deg | 36 mm tall sensor: 14→104.3°, 20→84.0°, 24→73.7°, 35→54.4°, 50→39.6°, 70→28.8°, 135→15.2° |
| `applyCam(cam, st, sh = [0,0,0])` | `st = { pos: Vector3, look: Vector3 POINT, mm, roll (deg) }`, `sh = [yaw, pitch, roll]` deg | `cam.up = (0,1,0)`, `lookAt(look)`, then rotate by shake, sets fov + projection |
| `new Path(keys)` / `.at(t)` | keys `[{ t, pos:[x,y,z], look:[x,y,z], mm = 35, roll = 0, ease = 'inOutCubic' }]` | Catmull-Rom; a key's `ease` applies to the segment ENDING at it; returns `{ pos, look, mm, roll }` for applyCam. `t` in whatever clock you pass (`_test/t_bay.js` uses page t 4..7) |
| `shake(t, amp = 0.3, freq = 1.2, seed = 1)` | -> `[yaw, pitch, roll]` deg | smooth fbm noise; amp in degrees (0.02 calm tripod … 0.25 handheld chaos) |
| `kick(t, t0, dur = 1.2)` | -> 0..1 | impact envelope: 0 before t0, fast rise, `exp(-3.5 (t-t0)/dur)` decay. Use to scale shake amp |
| `whip(t, t0, dur, deg)` | -> yaw deg | 0 -> deg over dur centred at t0 (`inOutQuint`). Not applied for you: rotate the look dir (s06) and raise samples during it |

## 4. util.js / glsl.js
- `clamp(x, a=0, b=1)`, `lerp(a, b, u)`, `sstep(a, b, x)` (smoothstep), `smoother(a, b, x)` (quintic), `fract`,
  `hash(n)`, `hash2(a, b)`, `rng(seed)` (mulberry32, returns `() => [0,1)`), `vnoise(x, seed)` [-1,1], `fbm(x, seed, oct = 3)`,
  `halton(i, b)`, `ease.{linear, inOutSine, inOutCubic, inOutQuint, outCubic, inCubic, outExpo, inExpo, outBack, smooth}`,
  `keyed([[t, v, easeName?], ...], t)` (v may be an array; eases INTO each key; default inOutCubic).
- `glsl.js`: `NOISE` string: `h13, h12, vn3, fbm3 (5 oct), vn2, fbm2 (5 oct)` for custom shaders.

---------------------------------------------------------------------------------------------------------------------
## 5. sky.js — `createSky(S, o) -> Mesh` (add to scene; `.U`, `.update(S, t)`)
Background dome (renderOrder -10000, no depth). Day/night is chosen by `U.sunDir.y`: day blend = smoothstep(-0.02, 0.25).
Options (-> uniforms): `stars 1, milky 0.6, nightZen 0x01030a, nightHor 0x0a1426, duskCol 0xff7a3a, lpCol 0xff9a50,
lp 0.35 (town light-pollution dome), exposure 1, beltCol 0xc98a96, beltI 0.35 (Belt of Venus)`.
Daylight: `createSky(S, { lp: 0, stars: 0, beltI: 0 })`, then `sky.U.dayZen.value.set(0x2f6fd0); sky.U.dayHor.value.set(0xa9cff0)`.
Uniforms you set: `sunDir` (to sun), `moonDir`, `moonAng` (rad, glow size), `moonLight` (blue moon-day wash), `lpDir`,
`tintAll` (Color), `dayZen`, `dayHor`.
Default-off modes:
- High altitude: `dip` (horizon depression rad, set from `CL.dip`), `altI` 0..1 (steeper day gradient + limb haze band),
  `sunDisc` (sun disc + aureole). s07: `altI = 1, sunDisc = 1, dayZen 0x0d2f86, dayHor 0x8fb4e6`.
- See-through Earth: `thru` 0..1 + `coreCol`, `coreI 40`, `coreAng`, `skyGlow` (below-horizon far-side sky + glowing core).

## 6. ocean.js — Gerstner sea + planar reflection
`createOcean(S, o) -> { mesh, refl, U, under, add(scene) }`. Per frame: `ocean.mesh.update(S, t)` (sets `U.time = t`,
follows the camera in XZ snapped to 4 m, positions the mirror at `level + lift`).
| opt | default | notes |
|---|---|---|
| `groundGLSL` | flat at -200 m | GLSL `float groundH(vec2 p)`: depth for tint/surf. Bay: `GROUND_GLSL` from bay.js |
| `amp` | 0.6 | wave amplitude scale |
| `level` | 0 | sea level (m) |
| `reflScale` | 0.5 | mirror RT size vs canvas (the mirror re-renders the scene: lower = cheaper) |
| `deep / shallow / sandCol / amb` | 0x02121a / 0x0b4a52 / 0x6d6150 / 0x0a1830 | night colours; day: deep 0x0a4e66, shallow 0x2aa5ab, amb 0x5f93b8 |
| `reflI, distort, foam, surf, rough, glitter` | 1, 0.035, 1, 1, 0.16, 0.35 | |
| `rings, segs, radius` | 150, 288, 20000 | radial grid (dense centre) |
| `slab` | false | compiles the gravity-flip lifted-sea code (below) |

`U` (live): `time, amp, level, moonDir, moonCol, moonI (1.0), sunDir, sunCol, sunI (0.0!), deep, shallow, sand, amb,
reflI, distort, foamAmt, surf, rough, glitter, exposure`. **Daylight: set `sunI = 1, moonI = 0` and `moonDir = sunDir`.**
JS mirrors (for floating objects; same t as `mesh.update`): `waveHeight(x, z, t, amp = 1, level = 0)`,
`waveSlope(x, z, t, amp = 1) -> [gx, gz]`, `WAVES` (`[dirDeg, wavelength m, Q, relAmp]` ×6).
Default-off modes:
- `U.thru` 0..1 + `underCol`: see-through Earth (core light from below).
- `U.lava` 0..1 + `lavaI 4.0`: molten basalt (crust plates, glowing cracks). lava-sea look slows waves by passing a
  slower t to `mesh.update`.
- `slab: true` (needs `sField()` in groundGLSL, i.e. bay `GROUND_GLSL`): `U.lift` m (whole sea lifted; `ocean.under`
  shows its underside when lift > 0.05), `U.churn` 0..1 (bay smashed to white water), surge bore over the land:
  `U.surgeT` (s since impact, -1 = off), `surgeH 9, surgeR 140, surgeV 75`. Slab also adds `skyZen, skyHor, absorb,
  scatThin, scatThick, landCol, bedCol, hazeCol, hazeD 9000, causI 1.4, boats[24]` (`Vector4(x, z, yaw, L)` hull
  silhouettes seen through the water). `ocean.refl.visible = false` when the top surface is not in view (s04).

## 7. bay.js — "The Bay" horseshoe set (night by default)
Geometry: lagoon circle centre (0, -800), r 800; mouth opens to the sea toward -Z. Camera home (0, 1.7, 8) looking -Z.
`sField(x, z)` signed shore distance (+ = land, - = water). Bands by s: beach 0..30 (slope 0.06), promenade/lamps at
s ≈ 31.5 (+2.6 m step at s 30–33), town buildings s 38..300 (bias near shore), hills inland, 45 m headlands at
z -1300..-1600. Water down to -28 m. Terrain mesh spans x ±2600, z +300..-3400.
Exports: `sField`, `groundH(x, z)`, `GROUND_GLSL` (same functions in GLSL: `sField(vec2)`, `groundH(vec2)`),
`sGrad(x, z)`, `onContour(x, z, s0) -> { x, z, ok, yaw }`, `wedge(n, [ex, ez], headingRad, d0, d1, deg, keep?, seed)`
-> `[[x, z]]` (scatter inside a vertical frame's ±deg wedge; heading 0 = -Z), `createBay(S, o)`.

`createBay(S, o)` options: `seed 7, lampI 1, winI 1, pierX -60, pierLen 170, pierYaw 0 (rad, + turns toward -X),
buildings 900, pierLights 0 (count of real PointLights), pierLightI 30, boats 16, lighthouse {x:245, z:-1690},
beamI 0.5, moonLightI 0.35, shadows false (moonLight.castShadow, 2048 map, ±40 m box), hemiI 0.25`.
Returns `{ group, U, lamps, boats, pier: { group, toWorld(lx, ly, lz), deckY: 3.375, len, base, yaw, lamps, lights },
terrain, buildings (InstancedMesh), glow, moonLight, hemi, beam, ground: groundH, update }`.
- `U`: `time, power` (1 = lights on), `flicker`, `blackX` (lights with x < blackX go dark: rolling blackout), `lampI`,
  `winI`, `wet` (wet sand/streets).
- `update(S, t, { waveAmp = 0.6, level = 0, moonDir, shadowCenter = (0,0,-5), moonLightI })`: bobs boats on the
  ocean's waves, rotates the lighthouse beam, aims `moonLight` from `moonDir` at `shadowCenter`.
- Pier space: `pier.toWorld(lx, ly, lz)`; deck at `ly = deckY`, out along `lz = -d` (0..len).
- Daylight (s04/s05): `createBay(S, { pierLights: 0, winI: 0, moonLightI: 3.0, hemiI: 1.3, beamI: 0, boats: 0 })`;
  `moonLight.color 0xfff1df`, `hemi.color 0xaccbec`, `hemi.groundColor 0x8c7c5c`; `U.power = U.lampI = U.winI = 0`;
  pass `moonDir: SUN, moonLightI: 3.0` to update. `boats: 0` because bay boats carry always-on glow sprites; use
  `splash.createBoats` for daytime boats.

## 8. city.js — sunny downtown (`createCity`)
Grid: `PERIOD = 120` m, `STREET = 24` (kerb to kerb incl. 5 m `SIDEWALK`s; roadway 14 m, 2 lanes each way),
`SL(k) = (k + 0.5) * PERIOD` = street centre-lines (…, -60, 60, 180 …). Blocks centred on `k * PERIOD`; the block at the
origin is the plaza (paving where |x|,|z| < 48; fountain basin r 6.2 at the origin, dark paving ring at r 17).
Ground y = 0 (an 8 km plane). Avenues along X and Z.
`createCity(S, { seed = 11, blocks = 3, cars = 140, props = 220 })` -> `{ group, cars, props, trees, lanes, buildings,
bodyM, cabM, whM, propMs, disc, dropM, drops, ground: () => 0, update }`.
- Buildings: 1–2 × 1–2 lots per block, 22–72 m, much taller near the centre (to ~300 m); glass curtain wall or stone
  with punched windows; InstancedMesh with cast/receive shadow. No lights: add sun + hemi + `S.hdri` (glass needs env).
- `lanes`: `{ axis: 'x'|'z', c (offset coord), dir ±1 }` at `SL(k) ± 1.75, ± 5.25` (right-hand traffic).
- `cars[i]`: `{ x, y, z, yaw, lane, v (6–13 m/s), col, L, H, W, rx, ry, rz, seed, liftK? }`. City does NOT drive them:
  the shot sets `x/z` (citykit: `x = x0 + v·dir·tau`). 15% buses (L 9), 15% L 5.2, rest L 4.4.
- `props[i]`: `{ x, y, z, yaw, rx, ry, rz, kind (0 bench, 1 bin, 2 planter, 3 cafe table), seed, liftK? }`; within
  ~38 m of the plaza centre or along sidewalks.
- `trees`: data only `{ x, z, s, seed }`: both sidewalks of every street at ±10.4 m from `SL(k)` every 11–15 m (75%),
  junctions skipped, plus 18 in a ring r = 34 around the plaza. Canopy ≈ radius 2.6·s, centre y 5.6·s, spanning
  ≈ 3–8.5 m ×s (s 0.8–1.3); trunk 4.4 m. Tree meshes are not in the api: they are the two InstancedMeshes in `C.group.children` with
  `count === C.trees.length`.
- Street lamps: 7.5 m poles every 30 m at ±11.4 m from `SL(k)` (static, no lights).
- `update(t, { lift = 0, tumble = 0, waterLift = lift })`: every car/prop at `y + lift·(liftK ?? 1)`, rotated by
  `(rx, yaw + ry, rz)·tumble`; fountain: a jet while lift ≈ 0, else the pool disc + 2600 drops lifted by `waterLift`.
- Also exported: `G = 9.81`, `liftH(tau, T = 5)`, `liftV(tau, T = 5)` — constant-g lift law (up at g for T, coast to 2×,
  fall). gravity-flip's real law is `projects/gravity-flip/src/story.js heightAt` (inverse-square, tabulated).

## 9. figure.js — people (signed distance bodies, polygonized at load)
Figures face -Z, feet on y = 0, metres. Slots: 0 skin, 1 hair, 2 top, 3 bottom, 4 shoes, 5 bag.
- `POSES`: `stand, phoneUp, filming, point, handsHead, shade, arms, rail, pocket`. A pose = `{ R, L: { t: [x,y,z] hand
  target (body coords, -z forward), pole }, legR/legL: [hipPitch, abduction, kneeBend], lean (forward < 0), hip,
  head: [yaw, pitchUp], twist, phone: 'R'|'L'|'both' }`.
- Body opts: `pose, height 1.75, build 1, fem 0..1, hair 'short'|'long'|'bun'|'pony'|'hood'|'cap'|'curly', coat
  (length), puffer, skirt, bag 'backpack'|'tote', wide`.
- `figureGeometry(o, res = 0.016)` (cell m: 0.011 hero, 0.018 crowd) -> BufferGeometry (`userData.phone`, `headC`).
- `figureMaterial({ instanced, rimCol 0xcfdcff, rimI 0.6, hair, top, bot, skin 0x6b4a3a, bag })` -> MeshStandardMaterial
  with `.U.{ rimCol, rimI, rimDir (Vector3, default (0,0.2,-1)), uHair, uTop, uBot, uSkin, uShoe, uBag }`.
- `PALETTE = { hair: [...], top: [...], bot: [...] }`: mutable; crowd picks colours when it is built, so splice it
  BEFORE `createCrowd` (gravity-flip daywear: citykit.js lines 12–14).
- Lower level: `bodyPrims, makeSDF, surfaceNets, slotAt, castVariants(rng, poses, n = 14, res = 0.018)`.

## 10. crowd.js — crowd, hero, birds
- `createCrowd(S, people, o)`; `people = [{ x, z, y?, yaw (0 faces -Z), pose? }]`. Opts: `seed 3, poses` (list of
  POSES names; default 12 mixed), `variants = poses.length` (each polygonized at load), `res 0.018, rimI 0.8, rimCol,
  phoneCol 0xbfd8ff, phoneI 6`. A person's `pose` must be in `poses`, else a random variant.
  Returns `{ meshes, phones, material, update }`; `update(t, { agitation = 0.2, lift = 0 | (p) => m, tumble = 0 })`
  (sway + bob scale with agitation; tumble spins each person about the waist, 0.95 m). People records live in
  `m.userData.list` for each mesh (s07 moves `p.x/y/z` per frame). Phones: emissive planes (`phoneI` ×).
- `scatter(n, { x0, x1, z0, z1, keep? }, groundFn, face [x, z], seed)` -> people facing a point.
- `createHero(S, o)`: `hair 'hood', coat 0.32, bag 'backpack', height 1.74, build 1, fem 0.2, top 0x3a2a24, bot 0x1a1b20,
  hairCol, bagCol, rimI 1.0, phoneI 6, res 0.011, pose 'phoneUp'` -> `{ root, mesh, material, phone, setPose }`.
  `rimCol` is NOT forwarded (lava-sea passes it in vain): set `hero.material.U.rimCol.value.set(...)`. Hide the phone:
  `hero.phone.visible = false`.
  `setPose(name | poseObj)` rebuilds (cached per pose): precompute every pose at load (`RUN.forEach(p => hero.setPose(p))`).
- `createBirds(S, n = 40, { seed 11, color 0x050608 (night silhouette; day 0x4a505c), flap 9 })` ->
  `{ mesh, U, update(t, pathFn, spread = 12, size = 1) }`; flock heading follows `pathFn(t + 0.1) - pathFn(t)`.

## 11. moon.js
`createMoon(S, o) -> Mesh` (unit sphere: place + scale it; add to scene). LROC colour (8k, or `res: '2k'`), LOLA normal + relief.
Opts: `res, sunI 3.2, earthshine 0.012, normalScale 2.2, reliefScale 2.0, shadows 1 (horizon-march terminator shadows),
lambertMix 0.25, albedo 1, tint 0xfff6ea, hazeLift 0.004, crackW 0.012, crackGlow 0.35, cells, airlight true, side, seg 192`.
`airlight: true` = additive blend (night side shows the sky; occluders still depth-test).
`.U`: `sunDir` (to sun), `earthDir` (to Earth, earthshine), `sunI, haze` (0..), `hazeColor, horizonY, hazeH, crack`
(0..1 fracture spread from the tidal axis +X), `cell` (≥ 0 renders one chunk), `airCol`.
`.faceNearSide(dir, libration = [0, 0])`: near side (+X of the texture) faces `dir` (pass camera direction), north up.
`sunForPhase(toCam, phaseDeg, up, tiltDeg)` -> sun direction for a phase. `defaultCells(n = 12, seed = 3)`.
Placement (moon-2x kit): `moon.position = cam + md·DIST; moon.scale = DIST·sin(angR)` (DIST 15000; real angR 0.26°).

## 12. breakup.js — the Moon in 12 chunks + rubble
`createBreakup(S, { moon: {createMoon opts}, seed 5, rubble 900 })` -> `{ group, chunks, rocks, U (shared moon
uniforms), rockU, base }`. **ALWAYS `trimBreakup(B)` right after** (debris.js: each chunk otherwise draws the whole
double-sided sphere and discards outside its cell, ~24 layers of overdraw). Over an ocean also
`hideFromReflection(ocean.refl, [B.group])`.
`B.update(t, { centre, radius, md (camera->moon unit dir), sunDir, crack = 1, sep (moon radii), stretch, tail, airCol
(Color, sky light in front), hot = 0.15 })`.

## 13. debris.js — meteors, impacts, ring arc, streams (closed form in t)
The time base is whatever you pass to `update`; list times must use the same clock (moon-2x passes shot time `tt`).
- `createMeteors(S, list, { gain 1, minPx 1.4, tailCol 0xff4a10, headCol 0xffd2a0 })` -> `{ mesh, U, list, update(t),
  headAt(i, t) }`. `list: [{ c (head position at mid-life), v (units/s), t0, life, period?, end? (1 = ends on impact),
  tail (s of path), w (width, world units), I, heat }]`. Widths never drop below minPx pixels.
- `meteorShower({ eye, look (unit), dir (unit travel), t0 0, t1 5, rate 6 /s, d0 6000, d1 30000, fanX 25, fanY 18,
  biasY, speed 6000, l0 0.5, l1 1.3, w 18, I 1, minElev 1, seed })` -> list (parallel streaks).
- `createImpacts(S, [{ p, t, r, dur 2.2, I 1, squash 0.85 }], { domeI 2.2, glowI 0.35 })` -> `{ items, update(t) ->
  summed glow (drive lights with it), env(t) }`.
- `createRingArc(S, { face (horizontal dir the arc rises from), lat 12°, r0 1.3, r1 2.0 (Earth radii), dist 40000,
  I 1, color 0xd9d2c4, spin 0.004, shadow 0, rocks 5000, seed 9, rockI 3.0, rockGlow 1.2 })` -> `{ band, rocks, U,
  rockU, dirAt, E, N, Q, update(t, cam) }` (loops over all rocks in JS each call).
- `createStreams(S, [{ o, d, n, speed, spread, len, size: [s0, s1], glowW, glowI, trailMin, trailW 0.7, trailI 0.8,
  tail 0.25 }], { seed 21, sunI 1.2, hot 0.8, fade 0, trailGain 1 })` -> `{ rocks, rockU (hotDir…), trails, ribbons,
  update(t, cam) }`.
- `rockGeometry(detail = 1, seed = 1)`, `trimBreakup(B, margin = 0.08)`, `hideFromReflection(refl, objs)`.

## 14. space.js — Earth from orbit (km, Earth at origin)
`RE = 6371`. `createSpace(S, o)` -> `{ earth, atm, ring, stars, sun (glare sprite), EU, RU, sunDir, update(S, t) }`.
| opt | default | notes |
|---|---|---|
| `sunDir` | [1, 0.25, 0.3] | array; `SP.sunDir` is the live Vector3 shared by every shader (mutate it per frame: s11) |
| `ring` | **ON** unless `ring: false` | moon-2x debris ring. `ring: true` also shadows Earth (ringShadowI 0.35) |
| `ringIn, ringOut, ringI` | 1.15, 2.6 (RE), 1.0 | ring orientation: `SP.ring.rotation` |
| `stars` | 0.35 | all-sky starfield + Milky Way |
| `sunI, cityI` | 2.6, 1.6 | day brightness, night lights |
| `earthYaw` | 0 | `earth.rotation.y` (turn the planet: s11) |
| `seg` | [192, 96] | sphere segments; [512, 256] for close/low-orbit views |
| `coast, coastW` | false, 2048 | build a coast distance field at load (needed for `EU.surf`) |
| `sunGlare` | 1 | sun sprite at `camera + sunDir·5e5` (needs `far` > 5e5) |
`EU` uniforms: `cityI, sunI, cloudShift (t·0.0008 automatically), cloudsI 1, atmI 1` (rim + halo) and default-off modes:
`seabed` 0..1 (oceans gone: sediment, shelves), `surf` 0..1 + `surfT` (story s since water landed; needs `coast`),
`scar` 0..1 (scorched land, grey churned sea, embers, most lights out), `glowI` + `glowCol` (orange storm light on the
night side), `detail` 0..1 (procedural fine detail for close views).
Lat/lon -> unit vector matching the texture (from s08–s11, Earth unrotated):
`dirLL = (lon, lat) => { const ph = (lon + 180) * D2R, th = lat * D2R; return new THREE.Vector3(-Math.cos(ph) * Math.cos(th), Math.sin(th), Math.sin(ph) * Math.cos(th)); }`.
`coastSDF(W = 2048)` -> Promise<DataTexture> (km, + on land), used internally.

## 15. shell.js — oceans / clouds / air lifting off as shells (km)
`createShell(S, SP, { cloudH 4, airH 70, waterI 1, cloudI 1, airI 1, glint 1, clear 0 })` -> `{ mesh, U, update(S, t,
{ h, show }) }`. `h` = shell height in km (gravity-flip: `heightAt(tau, T) / 1000`). Hidden while h ≤ 0.0005 unless
`show: true`. `U`: `h, cloudH, airH, time` (update sets `time = t`; override after: s09 `SH.U.time.value = tau*0.05`),
`waterI, cloudI, airI, glint, clear, clearDir, clearR 0.02` (cloud-free patch, e.g. around a station), `fresh` 0..1 (1 =
sheet still looks like the sea). Drawn at renderOrder 1 without depth test: things that must appear in front of it need
a higher renderOrder (planes/station: 10).

## 16. storm.js — planet-wide meteor storm from orbit (km)
`createStorm(S, list, { minPx 1.3, gain 1, zFull 60, tailCol 0xff3a0c, headCol 0xffb46a })` -> `{ mesh, U, list,
update(S, h) }`. `list: [{ n (unit radial dir), a0 (km start offset), zi (km ignition alt), Lmax (km trail), w (km
width), I, heat }]`. Head altitude = `h + a0`; glows from `zi` down to the ground; orange only. s10 uses 20,000 streaks.

## 17. clouds.js — cloud deck from above (metres)
`createClouds(S, o)` (call after createSky; adds itself, renderOrder -9990). Generates a 2048² heightfield on the GPU at load.
Opts: `base 1400, thick 1900` (m; s07 uses 2400/1450), `cover 0.75, towers 1, period 26000, res 2048, seed 3,
sunI 1.45, sunCol 0xfff3e2, skyI 0.55, skyCol 0x5d8fe0, seaCol 0x0a2a4a, hazeCol 0xc9dcf5, hazeL 170e3, regional 0.35,
steps 20, ox, oz` (texture offset). World y = 0 is altitude `alt`; Earth centre at (0, -(R_EARTH + alt), 0). Only for
cameras ABOVE the deck. `update(S, { alt, sunDir })` sets `CL.dip`; copy it to `sky.U.dip.value`.
Cost (comment): ~3–4 s of a full-size frame at 2 samples when it fills the frame. `R_EARTH = 6371e3` exported.

## 18. planes.js — generic airliner (no airline marks)
Plane space: metres, **nose -Z**, up +Y, right wing +X, origin mid-fuselage. ~2.1k tris (2.7k with gear).
- `createPlane(S, o)` -> `{ root (in scene), mesh, material, U, len, span }`. Place `root.position/quaternion`.
- `createPlanes(S, n, o)` -> `{ mesh (InstancedMesh), material, U, len, span, set(i, pos, quat, scale = 1) }`; unused
  instances stay collapsed.
- Opts: `len 40, span 36, scale 1` (0.001 in km scenes), `gear false, body 0xf3f5f8, blue 0x163f8f, accent 0x3d8fe0,
  wing 0xb9c0c8, lights 1, lightI 6, shadows false, add true, geometry, material`. Also `planeGeometry(o)`, `planeMaterial(o)`.
- Nose along velocity: `q.setFromUnitVectors(new THREE.Vector3(0, 0, -1), v.normalize())`.

## 19. iss.js — generic station (no flags/logos)
`createStation(S, { scale 1 (0.001 for km), seed 4, add true })` -> `{ root, inner, M (materials), wings,
setArrays(angle) }`. ~110 m: truss along X (112 m), modules along Z, +Y = away from Earth; renderOrder 10.
Orient: `root.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, UP, z))`.

## 20. splash.js — gravity-flip bay kit (needs `createOcean({ slab: true })`)
- `patchSlab(material, ocean.U, GROUND_GLSL, { seabed, noLamps, specK 1, rough })`: sun through the lifted sea, sky
  blocked under it. `seabed: true` (terrain material only) adds ripples, weed, puddles. Works on MeshStandardMaterial
  and instanced ones; returns the material.
- `createRocks(S, [{ x, y, z, s, sx 1, sy 0.6, sz 1, rx, ry, rz }], { color 0x8a8478 })` -> InstancedMesh.
- `createBoats(S, n, { seed 3 })` -> `{ meshes, materials, setBoat(i, pos, quat, L), hide(i), commit() }` (call
  `commit()` after setting).
- `createSpray(S, parts, { opacity 1, hazeD 9000, renderOrder 30 })` -> `{ mesh, U, update(t) }`. `parts: [{ p:[x,y,z],
  v:[vx,vy,vz], t0, size, drag 0.3, life 6 (≤ 60), kind 0 droplets | 1 sheets/clumps | 2 fine veil, shade 1 }]`;
  ballistic with drag, g = 9.81. `U.sunDir, sunCol, sunI, amb, streak (1/26 s), hazeCol, hazeD, exposure`.
  s05 passes page t to `update`, so `t0 = impact shot time + 4`.

## 21. fire.js — flames (no smoke)
`createFire(S, [{ p: Vector3 (base), s: height m, seed? }], { I 6 })` -> `{ mesh, U: { time, I, amt (0..1 grow) },
update(t) }`. Additive camera-facing billboards. Positions live in `mesh.geometry.attributes.aP` (lava-sea moves them).

## 22. audio_core.js — shot sound (plain script, prepended by build_page.py)
A `<shot>_sound.js` defines `function SOUND(ctx, out, dur)`; t = 0 is the shot's first frame; `dur` = shot length + 0.6.
`renderSound(dur)` (tools/audio.js) renders 48 kHz stereo offline through a compressor (thr -10 dB, ratio 3).
Helpers: `clamp, lerp, sstep, hash, db(x)`, `SR = 48000`, `noiseBuf(ctx, 'white'|'pink'|'brown', sec, seed)`,
`src(ctx, buf, t0, t1, rate = 1)`, `filt(ctx, type, f, q = 0.7)`, `panner(ctx, p)`, `chain(...nodes)` (returns last),
`env(ctx, [[t, dB], ...])` (gain node; -120 = off), `verb(ctx, out, decay = 2.6, wet = 0.25)` (singleton: the first call
wins; later calls return the same node).
| block | options (defaults) |
|---|---|
| `hit(ctx, out, o)` | `t 0, gain -6, sub true, pan 0` — mid-range snap + thwack + ring (+ sub). Every hard cut. |
| `whoosh` | `t 0, dur 0.6, gain -14, f0 300, f1 3000, pan0 -0.6, pan1 0.6` |
| `gasp` | `t 0, gain -12, dur 1.4, voices 6` |
| `flutter` | `t 0, dur 2, gain -26, pan0 -0.7, pan1 0.7` |
| `surf` | `t0 0, t1 10, gain -14, period 5.5, swell 0 (number or fn), pan 0` |
| `wind` | `t0 0, t1 10, gain -24, f 700` |
| `rumble` | `t0 0, t1 10, gain -16, level () => 1, sub 34` |
| `crowd` | `t0 0, t1 10, gain -20, voices 10, excite () => 0.3, pan 0, seed 1` |
| `siren` | `t0 0, t1 10, gain -30, pan -0.4` |
| `shutters` | `t0 0, t1 3, n 6, gain -26` |
Gains are dB. Only these names are read: `{ t, dur, g }` on a t0/t1 block is silently ignored (see Pitfalls).

## 23. Textures in engine/tex (pass the literal file name)
`earth_day_4096.jpg, earth_night_4096.jpg, earth_bump_roughness_clouds_4096.jpg, hdri_day_1k.hdr, hdri_dusk_1k.hdr,
hdri_night_1k.hdr, moon_color_2k.jpg, moon_color_8k.jpg, moon_normal_4k.jpg, moon_relief_4k.jpg, rock_diff_1k.jpg,
rock_nor_gl_1k.jpg, rock_rough_1k.jpg, sand_diff_1k.jpg, sand_nor_gl_1k.jpg, sand_rough_1k.jpg, water_normal_1k.jpg`.

---------------------------------------------------------------------------------------------------------------------
## 24. Anatomy of a shot
`projects/<slug>/src/sNN_name.js` (built with `python3 tools/build_page.py projects/<slug>/src/sNN_name.js`; this exact
file was built and rendered on 2026-11-12, as were test pages assembled from Recipes R2–R8). Distilled from gravity-flip `s01_plaza.js` + `citykit.js`:
```js
// s99_example: sunny plaza, slow push-in (after gravity-flip s01_plaza + citykit.js). Page t = shot time + 4.
import { createStudio, THREE } from '@engine/engine.js';
import { createSky } from '@engine/sky.js';
import { createCity } from '@engine/city.js';
import { createCrowd } from '@engine/crowd.js';
import { applyCam, shake } from '@engine/camera.js';
import { rng } from '@engine/util.js';
const S = createStudio({ samples: 2, shadows: true,
  post: { exposure: 1.0, bloom: 0.06, bloomThreshold: 3.0, bloomRadius: 0.5, vignette: 0.22, grain: 0.012, ca: 0.0008, sat: 1.12, contrast: 1.05 } });
const { scene, camera } = S;
S.hdri('hdri_day_1k.hdr', 0.7);                         // env light for glass/cars; LITERAL file name (build_page inlines by name)
const SUN = new THREE.Vector3(0.55, 0.72, 0.42).normalize();
const sky = createSky(S, { lp: 0, stars: 0, beltI: 0 }); scene.add(sky);
sky.U.dayZen.value.set(0x2f6fd0); sky.U.dayHor.value.set(0xa9cff0);
const sun = new THREE.DirectionalLight(0xfff1df, 3.2); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -80, right: 80, top: 80, bottom: -80, near: 10, far: 1200 }); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03;
scene.add(sun, sun.target, new THREE.HemisphereLight(0xb8d4f0, 0x8a8070, 1.0));
const C = createCity(S, { blocks: 3, seed: 11, cars: 170 });
const CAM0 = new THREE.Vector3(-5, 1.75, 27), R = rng(31), people = [];
for (let i = 0; i < 400 && people.length < 150; i++) { const a = R() * 6.283, r = 8 + R() * 38, x = Math.cos(a) * r, z = Math.sin(a) * r;
  if (Math.abs(x) < 47 && Math.abs(z) < 47 && Math.hypot(x - CAM0.x, z - CAM0.z) > 9) people.push({ x, z, y: 0, yaw: R() * 6.283 }); }
const crowd = createCrowd(S, people, { poses: ['stand', 'pocket', 'phoneUp', 'arms', 'shade', 'point'], rimI: 0.25, seed: 9 });
C.props.forEach((p) => { if (Math.hypot(p.x - CAM0.x, p.z - CAM0.z) < 10) p.y = -60; });   // props near the lens fill the frame
C.cars.forEach((c, i) => { const r = rng(100 + i); c.rx = (r() - 0.5) * 1.6; c.rz = (r() - 0.5) * 1.6; c.ry = (r() - 0.5) * 1.2; });
S.run((t) => {
  const tt = Math.max(t - 4, 0);                        // shot time (s)
  const L = 0;                                          // lift (m): from the project's law (e.g. story.js heightAt), never by hand
  const pos = CAM0.clone().add(new THREE.Vector3(0.2 * tt, 0, -0.8 * tt));
  applyCam(camera, { pos, look: new THREE.Vector3(5, 9, -90), mm: 24, roll: 0 }, shake(t, 0.02, 0.7, 2));   // first
  C.update(t, { lift: L, tumble: 0, waterLift: L });
  crowd.update(t, { agitation: 0.2, lift: L, tumble: 0 });
  sun.position.copy(SUN).multiplyScalar(500); sun.target.position.set(0, 0, 0);
  sky.U.sunDir.value.copy(SUN); sky.update(S, t);
});
```
In a real project, reuse the project's kit instead (gravity-flip: `cityWorld(S, { shadows, keepOut: [[x, z, r]] })` and
`W.update(t, { tau, T, focus })`, which also runs traffic, lift, tumble, birds and the sun's shadow box).

`projects/<slug>/src/sNN_name_sound.js` (built and rendered to WAV on 2026-11-12):
```js
// s99_example sound (dur = shot length + 0.6 s). Plain script, NOT a module: audio_core.js is prepended, so no imports.
// Option names are audio_core's: t / t0 / t1 in seconds (0 = the shot's first frame), gain in dB.
function SOUND(ctx, out, dur) {
  const rv = verb(ctx, out, 2.6, 0.25);                                              // the one reverb send
  hit(ctx, out, { t: 0, gain: -8 }); hit(ctx, rv, { t: 0, gain: -15, sub: false });  // the cut: mid-range hit (rule A3)
  crowd(ctx, out, { t0: 0, t1: dur, gain: -24, voices: 10, excite: (t) => 0.3 + 0.5 * sstep(1.5, 2.5, t) });
  wind(ctx, out, { t0: 0, t1: dur, gain: -30, f: 900 });
  rumble(ctx, out, { t0: 2.0, t1: dur, gain: -18, sub: 32, level: (t) => sstep(2.0, 2.4, t) });
  whoosh(ctx, out, { t: 2.0, dur: 0.8, gain: -16, f0: 200, f1: 1800, pan0: -0.5, pan1: 0.5 });
  gasp(ctx, rv, { t: 2.1, gain: -16 });
  // a custom layer from the helpers: src -> filt -> env (dB keys) -> panner -> out
  const s = src(ctx, noiseBuf(ctx, 'pink', 4, 31), 0, dur);
  chain(s, filt(ctx, 'bandpass', 2400, 0.9), env(ctx, [[0, -120], [0.2, -40], [dur, -46]]), panner(ctx, 0.3), out);
}
```
Sync sound events to the picture by computing them from the same law and writing the constant down with its source
(s05: `T_IMP = landsAt(5) - SHOT.s05_crash.tau0 = 1.09`). Headroom for a big slam: route through
`const bus = ctx.createGain(); bus.gain.value = db(-6); bus.connect(out); out = bus;` (s05).

---------------------------------------------------------------------------------------------------------------------
## 25. Recipes (from real shots; `D2R = Math.PI / 180`)

**R1. City crowd and cars that lift and tumble** (gravity-flip `citykit.js`). Once at load:
```js
C.cars.forEach((c, i) => { const r = rng(100 + i); c.rx = (r() - 0.5) * 1.6; c.rz = (r() - 0.5) * 1.6; c.ry = (r() - 0.5) * 1.2; c.x0 = c.x; c.z0 = c.z; });
C.props.forEach((p, i) => { const r = rng(500 + i); p.rx = (r() - 0.5) * 3; p.rz = (r() - 0.5) * 3; p.ry = (r() - 0.5) * 2; });
const birds = createBirds(S, 26, { flap: 10, seed: 5 });
```
Per frame (L from the law; cars keep their road speed as they rise):
```js
const L = heightAt(tau, T), spin = tau > 0 ? Math.min(1, tau / 4) * (1 + 0.12 * Math.min(tau, 20)) : 0;
C.cars.forEach((c) => { if (c.lane.axis === 'x') c.x = c.x0 + c.v * c.lane.dir * tau; else c.z = c.z0 + c.v * c.lane.dir * tau; });
C.update(t, { lift: L, tumble: spin, waterLift: L });
crowd.update(t, { agitation: tau > -1.2 ? 0.55 : 0.18, lift: L, tumble: spin * 1.3 });
birds.update(t, (x) => new THREE.Vector3(-40 + x * 8, 24 + Math.sin(x) * 3 + L, -30 + Math.sin(x * 0.7) * 10), 9, 1.0);
sun.position.copy(SUN).multiplyScalar(500).add(focus); sun.target.position.copy(focus);   // shadow box (±80 m) follows the action
```

**R2. The bay in daylight with the ocean** (s04/s05). Load:
```js
S.hdri('hdri_day_1k.hdr', 0.55);
const sky = createSky(S, { lp: 0, stars: 0, beltI: 0 }); scene.add(sky); sky.U.dayZen.value.set(0x2f6fd0); sky.U.dayHor.value.set(0xa6cdee);
scene.fog = new THREE.Fog(0xa6cdee, 2500, 40000);
const ocean = createOcean(S, { amp: 0.45, level: 0, groundGLSL: GROUND_GLSL, deep: 0x0a4e66, shallow: 0x2aa5ab, amb: 0x5f93b8, reflScale: 0.25 });
ocean.add(scene); ocean.U.sunCol.value.set(0xfff4e2);
const bay = createBay(S, { pierYaw: 3 * D2R, pierLen: 152, pierLights: 0, winI: 0, moonLightI: 3.0, hemiI: 1.3, beamI: 0, boats: 0 });
bay.moonLight.color.set(0xfff1df); bay.hemi.color.set(0xaccbec); bay.hemi.groundColor.set(0x8c7c5c);
bay.U.power.value = 0; bay.U.lampI.value = 0; bay.U.winI.value = 0;
const CAM = new THREE.Vector3(-20, 0, -24); CAM.y = Math.max(groundH(CAM.x, CAM.z), 0) + 7.5;   // heights from groundH
```
Per frame (after applyCam):
```js
sky.U.sunDir.value.copy(SUN); sky.update(S, t);
ocean.U.sunDir.value.copy(SUN); ocean.U.sunI.value = 1.0; ocean.U.moonI.value = 0; ocean.U.moonDir.value.copy(SUN); ocean.mesh.update(S, t);
bay.update(S, t, { waveAmp: 0.45, level: 0, moonDir: SUN, moonLightI: 3.0, shadowCenter: CAM.clone() });
```
Night bay with the Moon: `projects/moon-2x/src/kit.js bayWorld()` (hdri_dusk 0.08, sky lp 0.2/stars 0.8, moon at
DIST 15000, `bay.update(..., { moonDir: md, moonLightI })`, `ocean.U.moonI = 1.5 + 2·moonLightI`).
Boats on a daytime sea: `const BT = createBoats(S, n); ... BT.setBoat(i, pos, quat, L); BT.commit();` with
`y = waveHeight(x, z, t, 0.45, 0) + 0.1`.

**R3. Cloud deck from above, 12–15 km** (s07):
```js
const sky = createSky(S, { lp: 0, stars: 0, beltI: 0 }); scene.add(sky);
sky.U.dayZen.value.set(0x0d2f86); sky.U.dayHor.value.set(0x8fb4e6); sky.U.altI.value = 1; sky.U.sunDisc.value = 1;
const CL = createClouds(S, { base: 2400, thick: 1450, cover: 0.8, hazeL: 175e3, sunI: 1.5, skyI: 0.6, seed: 3 });
CL.U.hazeCol.value.copy(sky.U.dayHor.value).multiplyScalar(1.5 * 1.35);
const sun = new THREE.DirectionalLight(0xfff3e2, 3.2); scene.add(sun, sun.target);
scene.add(new THREE.HemisphereLight(0x6f9be0, 0xf4f6ff, 1.1));       // blue sky above, the bright deck below
// per frame: the camera stays near the origin; altitude only moves the deck
sky.U.sunDir.value.copy(SUN); sky.update(S, t);
CL.update(S, { alt, sunDir: SUN }); sky.U.dip.value = CL.dip;
sun.position.copy(SUN).multiplyScalar(500).add(camPos); sun.target.position.copy(camPos);
```
Studio for it: `createStudio({ samples: 2, far: 4e5, post: {...} })`; s07 raises samples only near the fast jet pass.

**R4. Earth from orbit, clouds and night lights** (s08/s11; `aimFor` puts Earth's centre at a design pixel; imports
`lensFov` from camera.js, `ease, clamp, lerp` from util.js, `dirLL` from §14):
```js
const S = createStudio({ samples: 2, near: 50, far: 3e6, post: { exposure: 1.0, bloom: 0.22, bloomThreshold: 1.1, bloomRadius: 0.55, vignette: 0.4, grain: 0.025, ca: 0.0006, sat: 1.1, contrast: 1.05 } });
const SP = createSpace(S, { sunDir: dirLL(96, 6).toArray(), ring: false, stars: 0.3, sunI: 1.5, cityI: 1.0, sunGlare: 0 });
SP.EU.cloudsI.value = 0.55; SP.EU.detail.value = 0.8;
function aimFor(pos, sx, sy, mm) {
  const toE = pos.clone().negate().normalize(); const vf = lensFov(mm) * D2R;
  const ay = ((sy - 480) / 960) * vf, ax = ((sx - 270) / 540) * vf * (540 / 960);
  const right = new THREE.Vector3().crossVectors(toE, new THREE.Vector3(0, 1, 0)).normalize(), up = new THREE.Vector3().crossVectors(right, toE);
  const fwd = toE.clone().applyAxisAngle(right, ay).applyAxisAngle(up, ax); return pos.clone().add(fwd.multiplyScalar(1e5));
}
S.run((t) => { const tt = Math.max(t - 4, 0), u = ease.inOutSine(clamp(tt / 4)), mm = 30;
  const pos = dirLL(116, -6).multiplyScalar(lerp(9000, 8300, u));          // km from Earth's centre
  applyCam(S.camera, { pos, look: aimFor(pos, 270, 960, mm), mm, roll: lerp(8, 6, u) }, shake(t, 0.03, 1.3, 4));
  SP.update(S, t); });
```
Night side + sunlit crescent: put the Sun behind the planet (s10: `SUN = C·(-cos 50°) + NORTH·sin 50° + EAST·0.25`);
city lights show only where `mu < 0` (`EU.cityI`). Turn the planet: `SP.earth.rotation.y`.

**R5. Airliners** (s07 hero jet in metres; s09 fleet in km):
```js
const jet = createPlane(S, { len: 62, span: 58, gear: true });             // metres; root is in the scene
jet.root.position.copy(p);
jet.root.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, -1), v.clone().normalize())
  .multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, -1), rollRad));   // roll about the nose
const fleet = createPlanes(S, 36, { scale: 0.001 }); fleet.mesh.renderOrder = 10;   // km scene, in front of the shell
fleet.set(i, pos, quat);                                                    // every used instance, every frame
```

**R6. Meteor storm over the night side** (s10): build the list once, deterministic:
```js
const R = rng(1010), list = [];
while (list.length < 20000) {
  const z = 1 - R() * 1.15, r = Math.sqrt(Math.max(0, 1 - z * z)), a = R() * Math.PI * 2;      // cap around view dir C
  const n = C.clone().multiplyScalar(z).addScaledVector(T1, r * Math.cos(a)).addScaledVector(T2, r * Math.sin(a)).normalize();
  if (n.dot(SUN) > 0.25 && R() < 0.8) continue;                                                // fewer on the day side
  const u = R(), big = R(), bolide = R() < 0.03;
  list.push({ n, a0: -3 + 25 * R(), zi: 40 + 330 * Math.pow(u, 1.5), Lmax: bolide ? 300 + 250 * R() : 90 + 220 * R(),
    w: bolide ? 9 + 10 * R() : 2.5 + 5 * big * big, I: bolide ? 2.2 + R() : 0.6 + 1.4 * big * big, heat: R() });
}
const ST = createStorm(S, list, { gain: 1.3, minPx: 1.5, zFull: 60 });
const SH = createShell(S, SP, { cloudH: 4, airH: 70, waterI: 0.55, cloudI: 0.7, airI: 1 });
// per frame: h = heightAt(tau, 600) / 1000 (km);  k = 0..1 as it lands
SH.update(S, t, { h }); ST.update(S, h); SP.EU.glowI.value = 0.01 + 0.13 * k * k;
```
(`T1 = C × (0.3, 0.9, 0.2)` normalized, `T2 = C × T1`.) Ground-level streaks: `meteorShower` + `createMeteors`
(moon-2x s09) and `createImpacts` for orange domes on the horizon.

**R7. Flames** (lava-sea look.js): base points on the pier, grow in with `amt`:
```js
const FR = rng(77), fpts = [];
for (let d = 8; d <= 150; d += 2.2) for (const side of [-1, 0, 1]) if (FR() < 0.8) fpts.push({ p: bay.pier.toWorld(side * 1.9, bay.pier.deckY - 0.2, -d), s: 2.5 + FR() * 4.5, seed: FR() });
const fire = createFire(S, fpts, { I: 2.6 });
// per frame
fire.U.amt.value = grow; fire.update(t);
```
Pair with a warm DirectionalLight from below/behind and `crowd.material.U.rimCol` orange for silhouettes.

**R8. Camera moves** (s02 kick, s06 whip, s03 look-by-direction, Path):
```js
// eased keyframe path (keys in page t here)
const path = new Path([{ t: 4.0, pos: [1.2, 1.55, 9.5], look: [0, 6, -400], mm: 32 }, { t: 7.0, pos: [0.7, 1.45, 7.6], look: [0, 9, -400], mm: 35, ease: 'inOutSine' }]);
applyCam(camera, path.at(t), shake(t, 0.12, 0.5));
// impact jolt: kick() scales the shake (s05) or adds pitch (s02)
applyCam(camera, { pos: CAM, look, mm: 24, roll: 0 }, shake(t, 0.03 + 1.1 * kick(tt, T_IMP, 1.6), 7, 5));
// whip-pan into the shot (s06): rotate the look DIRECTION by whip(); samples 12 during the whip
//   createStudio({ samples: (t) => (t - 4 < 0.4 ? 12 : 2), shadows: true, post: {...} })
const yaw = (-70 + whip(tt, 0.175, 0.35, 70)) * D2R, dir = new THREE.Vector3(5, 9, -90).sub(pos).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
applyCam(camera, { pos, look: pos.clone().add(dir), mm: 24, roll: 0 }, shake(t, 0.02, 0.7, 2));
// aim by yaw/pitch (s03): look = pos + dir
const dir = new THREE.Vector3(Math.sin(yaw), Math.tan(pitch), -Math.cos(yaw)).normalize();
applyCam(camera, { pos, look: pos.clone().add(dir), mm: 21, roll: 4 * Math.sin(tt * 0.9) }, shake(t, 0.18, 0.9, 4));
```
Orbit camera with a local "up" that is not +Y (s09): after `applyCam`, `camera.up.copy(UP); camera.lookAt(look);` then
re-apply the shake rotations (`rotateY/X/Z`). World direction through a design pixel (moon-2x kit, call after applyCam):
`new THREE.Vector3((x / 540) * 2 - 1, -((y / 960) * 2 - 1), 0.5).unproject(camera).sub(camera.position).normalize()`.

**R9. A big Moon / the breakup** (moon-2x s08):
```js
const B = createBreakup(S, { moon: { sunI: 1.3, normalScale: 2.0 }, rubble: 1400 });
trimBreakup(B); hideFromReflection(ocean.refl, [B.group]);
// per frame: md = camera->moon unit dir, ang = angular radius (rad)
B.update(t, { centre: S.camera.position.clone().addScaledVector(md, 15000), radius: 15000 * Math.sin(ang), md, sunDir: sun,
  crack: 1, sep, stretch, tail, airCol: new THREE.Color(0.045, 0.07, 0.14), hot: 0.18 });
```

**R10. Spray / white water** (s05): `createSpray(S, parts)` with parts born at the impact (`t0` in the same clock you
pass to `update`); hide it from the mirror:
`const ob = ocean.refl.onBeforeRender; ocean.refl.onBeforeRender = (r, sc, cam) => { spray.mesh.visible = false; ob(r, sc, cam); spray.mesh.visible = true; };`
Streak length: `spray.U.streak.value = 1 / 15` (jets) vs default 1/26.

---------------------------------------------------------------------------------------------------------------------
## 26. Pitfalls (each one broke something or is a trap in the code)
1. **`applyCam` `look` is a POINT, not a direction.** To aim by direction: `look: pos.clone().add(dir)` (s03, s06, s07).
2. **Call `applyCam` before** sky/clouds/space/ocean updates and before `dirThroughScreen` (they read fov/position).
3. **Terrain winding:** custom ground meshes must be CCW seen from above (faces up), or the ground is culled and never
   renders (commit b4fe60a "fix bay terrain winding"; bay.js:57 builds `idx.push(a, b, c, b, d, c)` with u along +x, v along -z).
4. **Cameras inside trees / props in the lens:** city trees stand on every sidewalk at ±10.4 m from `SL(k)` and in a
   ring r = 34 m round the plaza, canopies ≈ 3–8.5 m up. A camera at that height near them sits in a canopy. Props and
   people within ~10 m of a lens fill the frame: citykit clears them with `keepOut: [[x, z, r]]` (people skipped, props
   sent to y = -60). There is no tree keepOut: move the camera.
5. **Sound option names:** blocks read only `t0/t1/gain` (or `t/dur/gain` for hit/whoosh/gasp/flutter). gravity-flip
   s01/s02/s03/s06 `_sound.js` pass `{ t, dur, g }` to crowd/wind/surf/rumble/siren/shutters: those values are silently
   ignored and defaults play (t0 = 0, t1 = 10 s, default dB). `g` is never read anywhere.
6. **`verb()` is a singleton** per sound page: the first call's `decay/wet/out` win.
7. **Textures/HDRIs by literal name only.** build_page.py inlines a file from engine/tex only if its exact name appears
   as a quoted string in the bundle (build_page.py:18). Computed names (`'moon_color_' + r + '.jpg'`) are not inlined.
8. **Ocean in daylight:** `U.sunI` defaults to 0 and `moonI` to 1; set `sunI = 1, moonI = 0, moonDir = SUN`.
   Use `ocean.add(scene)` (adds the mirror too) and `ocean.mesh.update(S, t)` each frame.
9. **Bay at day:** boats, lighthouse lamp and warning lights are always-on glow sprites (not tied to `U.power`): use
   `boats: 0`, `beamI: 0`, frame the lighthouse out (it sits at (245, -1690)) or accept it.
10. **space.js draws the debris ring by default.** Pass `ring: false` unless the ring is the story.
11. **Breakup:** always `trimBreakup(B)` (≈6× cheaper per CLAUDE.md); over water also `hideFromReflection`.
12. **Shell occludes later-drawn things only by renderOrder:** planes/station need `renderOrder` > 1 (they use 10).
13. **Studio defaults are expensive:** `samples` defaults to 8; set 2 (calm) / 4 (fast) / 12 (whip window) explicitly.
    Clouds cost ~3–4 s per full-size frame; the ocean mirror re-renders the scene (lower `reflScale`, or
    `ocean.refl.visible = false` when not seen, as s04/s05 do). Budget ≤ ~12 s per full-size frame on cloud CPU.
14. **Determinism:** no `Math.random()`, no `Date`, no state carried between `update` calls; use `rng(seed)`, `hash`.
    Motion-blur sub-samples call update at fractional t in any order.
15. **Per-sub-sample JS cost:** heavy per-frame loops (ring-arc rocks, 2600 fountain drops, crowd instances) run
    `samples` times per frame.
16. **Hero poses rebuild geometry** (surface nets at 1.1 cm): call `setPose` for every pose at load so frames hit the cache.
17. **PALETTE is read when the crowd is built:** mutate it before `createCrowd`.
18. **Space scale:** km units; `near: 50, far: 3e6` (sun sprite at 5e5). For a metres-sized object close up in a km scene,
    lower `camera.near` (s09: 0.004) and use `scale: 0.001` on planes/station.
19. **Units of shell/storm `h` are km;** the gravity-flip law returns metres (`heightAt(...) / 1000`).
20. **`createClouds` works only above the deck,** and needs `sky.U.dip.value = CL.dip` each frame, or the horizon gap shows.
21. **Text safe area** (PLAYBOOK, measured 2026-11-12): all type inside x 60–480, y 100–765 design px, and left of x 440 for
    y 430–870 (right rail). gravity-flip v1 broke it (tag and counter clipped). Keep the counter block (mid-left, y ≈ 370–500)
    and caption band (y ≈ 560–640) calm; nothing important below y 700. s07 tests every flying object against the
    counter block before placing it (`hitsCounter`).
22. **DRAMATIZATION:** speculative shots carry the on-screen `DRAMATIZATION` tag (overlay), and posts still need TikTok's
    AI-generated label (PLAYBOOK).
23. **No white flashes:** check.py fails upward luma jumps; leave `post.p.flash` at 0. A hard cut lands only on a sound hit.
24. **People:** featureless, mid-distance (≤ ~150 design px tall), never impacts on a person; no fluffy smoke/fog
    (gravity-flip BUILDERS.md).

## 27. Workflow
```
python3 tools/build_page.py projects/<slug>/src/<shot>.js                       # -> projects/<slug>/dist/<shot>.html (+ _sound.html)
node tools/frames.js projects/<slug>/dist/<shot>.html <outdir> 0 1 2 --scale 0.5 --mb 1 [--q 'k=v']   # times = shot seconds
node tools/frames.js ... 1.0 --scale 1 --mb 2                                   # full-size key frame + timing
node tools/audio.js projects/<slug>/dist/<shot>_sound.html <out.wav> <dur>       # dur = shot length + 0.6
```
Look at the PNGs before handing over. `IJ_GPU=1` renders on a real GPU; never mix GPU and CPU frames in one shot.

## 28. Automatic QC after the render (don't redo it by hand)
After BUILD COMPLETE the War Room runs `render_all.js`, which renders the captions first and checks them against TikTok's safe area (`check.py --safe`), renders every shot, then runs `tools/check.py` on `final.mp4`. That check fails the video on: frame count/size, loudness (−14 LUFS, peaks ≤ −1 dBTP), upward white flashes, missing cut hits above 200 Hz, and caption contrast below 3:1 (after yuv420p). A failure goes to an automatic fix round with the exact report. So builders and the Director do NOT hand-test loudness, flashes or contrast, and never read check.py, render_all.js or other tool sources to learn them. Your job is the picture and the story: build each shot right and check its key frames by eye. If you need a contrast spot-check while choosing caption colours, the only command is `python tools/check.py --contrast <overlay.mov> --bg <clean.mp4> --every 0.2`.
