// The hero: a living radiograph of the crew member. Vanilla three.js, no build step.
// The body is neutral film; only the seven zone anchors carry status colour (selective bloom).
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

const COL = { film: 0xCFE3E6, normal: 0x86C7B4, attention: 0xF2A23A, critical: 0xF0503C, bg: 0x0C0D0B };
const HEIGHT = 1.8;
const HOME = { x: 0, y: 0.93, z: 0, dist: 4.75 };

const VERT = /* glsl */`
#include <common>
#include <skinning_pars_vertex>
varying vec3 vN; varying vec3 vView; varying vec3 vWorld;
void main() {
  #include <skinbase_vertex>
  #include <beginnormal_vertex>
  #include <skinnormal_vertex>
  #include <defaultnormal_vertex>
  #include <begin_vertex>
  #include <skinning_vertex>
  #include <project_vertex>
  vN = normalize(transformedNormal);
  vView = mvPosition.xyz;
  vWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;
}`;

// Radiograph look: brightness follows how much "material" the ray crosses (grazing angles are brightest),
// plus fine scanlines and film grain. uScan is the developing line of the power-up sequence.
const FRAG = /* glsl */`
uniform vec3 uColor; uniform float uTime; uniform float uScan; uniform float uGain; uniform float uPower; uniform float uBase;
uniform vec3 uFocus; uniform float uFocusR; uniform vec3 uFocusColor; uniform float uFocusAmt;
varying vec3 vN; varying vec3 vView; varying vec3 vWorld;
float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
void main() {
  float f = 1.0 - abs(dot(normalize(vN), normalize(-vView)));
  float rim = pow(f, uPower);
  float lines = 0.9 + 0.1 * sin(gl_FragCoord.y * 2.1);
  float grain = (hash(gl_FragCoord.xy + floor(uTime * 24.0)) - 0.5) * 0.10;
  float reveal = 1.0 - smoothstep(uScan - 0.03, uScan, vWorld.y);
  float edge = exp(-abs(vWorld.y - uScan) * 34.0);
  float v = (uBase + rim) * lines * uGain;
  vec3 col = uColor * max(v + grain * (0.3 + rim), 0.0) * reveal + uColor * edge * 0.9;
  float fz = (1.0 - smoothstep(uFocusR * 0.35, uFocusR, distance(vWorld, uFocus))) * uFocusAmt;
  col += uFocusColor * fz * (0.16 + rim * 0.9) * reveal;
  gl_FragColor = vec4(col, 1.0);
}`;

const MIX_FRAG = /* glsl */`
uniform sampler2D baseTexture; uniform sampler2D bloomTexture; varying vec2 vUv;
void main() { gl_FragColor = texture2D(baseTexture, vUv) + texture2D(bloomTexture, vUv); }`;
const MIX_VERT = /* glsl */`varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;

function filmMaterial(shared, gain, power, base) {
  return new THREE.ShaderMaterial({
    vertexShader: VERT, fragmentShader: FRAG,
    uniforms: { ...shared, uColor: { value: new THREE.Color(COL.film) }, uGain: { value: gain }, uPower: { value: power }, uBase: { value: base } },
    blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, depthTest: false, side: THREE.DoubleSide,
  });
}

export function webglAvailable() {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2')); } catch { return false; }
}

/**
 * @returns {Promise<null | object>} null when WebGL cannot start (caller falls back to the 2D figure).
 */
export async function createBody(container, { zones, onHover, onSelect, onFrame }) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
  } catch { return null; }
  const gsap = window.gsap;
  const PR = Math.min(window.devicePixelRatio || 1, 1.5);
  renderer.setPixelRatio(PR);
  renderer.setClearColor(COL.bg, 1);
  const canvas = renderer.domElement;
  canvas.setAttribute('aria-hidden', 'true');
  container.appendChild(canvas);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(26, 1, 0.1, 30);
  const pivot = new THREE.Group();
  scene.add(pivot);

  const shared = {
    uTime: { value: 0 }, uScan: { value: -0.2 },
    uFocus: { value: new THREE.Vector3(0, 1, 0) }, uFocusR: { value: 0.2 },
    uFocusColor: { value: new THREE.Color(COL.film) }, uFocusAmt: { value: 0 },
  };
  const skinMat = filmMaterial(shared, 0.62, 2.4, 0.05);
  const boneMat = filmMaterial(shared, 0.5, 1.5, 0.16);

  // ---------- model ----------
  const gltf = await new GLTFLoader().loadAsync('assets/models/human.glb');
  const root = gltf.scene;
  pivot.add(root);
  let skinned = null;
  root.traverse((o) => { if (o.isSkinnedMesh) skinned = o; });
  const g = skinned.geometry;
  g.deleteAttribute('normal'); g.deleteAttribute('uv');
  skinned.geometry = mergeVertices(g, 1e-6);
  skinned.geometry.computeVertexNormals();
  skinned.material = skinMat;
  skinned.frustumCulled = false;
  skinned.renderOrder = 1;

  const mixer = new THREE.AnimationMixer(root);
  const idle = gltf.animations.find((a) => /Idle/i.test(a.name));
  if (idle) { const act = mixer.clipAction(idle); act.timeScale = 0.3; act.play(); mixer.update(0); }

  const bone = (name) => root.getObjectByName(name);
  const wp = (o) => o.getWorldPosition(new THREE.Vector3());
  const settle = () => { root.updateMatrixWorld(true); skinned.skeleton.update(); };

  // Normalise: height → 1.8, feet on y = 0, face +z.
  settle();
  let box = new THREE.Box3().setFromObject(skinned, true);
  root.scale.multiplyScalar(HEIGHT / (box.max.y - box.min.y));
  settle();
  const fwd = wp(bone('LeftArm')).sub(wp(bone('RightArm'))).cross(new THREE.Vector3(0, 1, 0));
  root.rotation.y = -Math.atan2(fwd.x, fwd.z);
  settle();
  box = new THREE.Box3().setFromObject(skinned, true);
  const hips = wp(bone('Hips'));
  root.position.set(root.position.x - hips.x, root.position.y - box.min.y, root.position.z - hips.z);
  settle();

  // ---------- stylised skeleton inside the shell (drawn from the rig, follows the idle motion) ----------
  const P = (n) => wp(bone(n));
  const lerp = (a, b, t) => a.clone().lerp(b, t);
  const up = new THREE.Vector3(0, 1, 0);
  const addTo = (mesh, parentBone) => { mesh.material = boneMat; mesh.renderOrder = 2; scene.add(mesh); mesh.updateMatrixWorld(true); bone(parentBone).attach(mesh); return mesh; };
  const tube = (a, b, r0, r1, parent) => {
    const len = a.distanceTo(b);
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r1, r0, len, 10, 1, true));
    m.position.copy(lerp(a, b, 0.5));
    m.quaternion.setFromUnitVectors(up, b.clone().sub(a).normalize());
    return addTo(m, parent);
  };
  const ball = (p, r, parent, sx = 1, sy = 1, sz = 1) => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 12));
    m.position.copy(p); m.scale.set(sx, sy, sz);
    return addTo(m, parent);
  };
  const spineNames = ['Hips', 'Spine', 'Spine1', 'Spine2', 'Neck', 'Head'];
  // vertebrae: short stacked segments rather than one rod
  for (let i = 0; i < spineNames.length - 1; i++) {
    const a = P(spineNames[i]); const b = P(spineNames[i + 1]);
    const n = Math.max(2, Math.round(a.distanceTo(b) / 0.045));
    for (let k = 0; k < n; k++) {
      const p0 = lerp(a, b, k / n); const p1 = lerp(a, b, (k + 0.72) / n);
      tube(p0.setZ(p0.z - 0.035), p1.setZ(p1.z - 0.035), 0.019, 0.019, spineNames[i]);
    }
  }
  const headBase = P('Head'); const headTop = P('HeadTop_End');
  const headLen = headTop.distanceTo(headBase);
  ball(lerp(headBase, headTop, 0.58), headLen * 0.46, 'Head', 0.86, 1.04, 1.0);
  for (const S of ['Left', 'Right']) {
    tube(P(S + 'Arm'), P(S + 'ForeArm'), 0.017, 0.014, S + 'Arm');
    tube(P(S + 'ForeArm'), P(S + 'Hand'), 0.013, 0.011, S + 'ForeArm');
    tube(P('Neck').setY(P(S + 'Arm').y + 0.01), P(S + 'Arm'), 0.009, 0.009, 'Spine2');
    tube(P(S + 'UpLeg'), P(S + 'Leg'), 0.024, 0.018, S + 'UpLeg');
    tube(P(S + 'Leg'), P(S + 'Foot'), 0.018, 0.013, S + 'Leg');
    tube(P(S + 'Foot'), P(S + 'ToeBase'), 0.012, 0.01, S + 'Foot');
    ball(P(S + 'Leg'), 0.027, S + 'Leg');
    ball(P(S + 'ForeArm'), 0.019, S + 'ForeArm');
    ball(P(S + 'Arm'), 0.022, S + 'Arm');
  }
  // pelvis and ribs: flattened rings around the spine
  const ring = (centre, rx, rz, tubeR, parent, tilt = 0) => {
    const m = new THREE.Mesh(new THREE.TorusGeometry(1, tubeR / rx, 6, 40));
    m.position.copy(centre); m.rotation.x = Math.PI / 2 + tilt; m.scale.set(rx, rz, rx);
    return addTo(m, parent);
  };
  const hipW = P('LeftUpLeg').distanceTo(P('RightUpLeg'));
  ring(lerp(P('Hips'), P('Spine'), 0.2), hipW * 0.78, hipW * 0.5, 0.016, 'Hips', -0.2);
  const chestA = lerp(P('Spine1'), P('Spine2'), 0.1); const chestB = lerp(P('Spine2'), P('Neck'), 0.78);
  const shoulderW = P('LeftArm').distanceTo(P('RightArm'));
  for (let i = 0; i < 6; i++) {
    const t = i / 5; const w = shoulderW * (0.36 + 0.1 * Math.sin(Math.PI * (0.25 + t * 0.75)));
    ring(lerp(chestA, chestB, t), w, w * 0.66, 0.0075, t < 0.4 ? 'Spine1' : 'Spine2', 0.16);
  }

  // ---------- zones: anchor (visible, blooms) + hit volumes (layer 2, raycast only) ----------
  const fz = (v, dz, dx = 0, dy = 0) => v.clone().add(new THREE.Vector3(dx, dy, dz));
  const defs = {
    mind: { at: fz(lerp(headBase, headTop, 0.97), 0.02), bone: 'Head', r: headLen * 0.5, focusR: headLen * 0.75, dist: 1.9, hits: [[fz(lerp(headBase, headTop, 0.8), 0), 'Head', headLen * 0.42]] },
    eyes: { at: fz(lerp(headBase, headTop, 0.36), headLen * 0.42), bone: 'Head', focusR: headLen * 0.55, dist: 1.9, hits: [[fz(lerp(headBase, headTop, 0.4), headLen * 0.3), 'Head', headLen * 0.34]] },
    heart: { at: fz(lerp(P('Spine2'), P('Neck'), 0.4), 0.1, 0.085), bone: 'Spine2', focusR: 0.2, dist: 2.5, hits: [[fz(lerp(P('Spine2'), P('Neck'), 0.4), 0.05, 0.03), 'Spine2', 0.14]] },
    metabolism: { at: fz(lerp(P('Spine'), P('Spine1'), 0.4), 0.1), bone: 'Spine', focusR: 0.2, dist: 2.5, hits: [[fz(lerp(P('Hips'), P('Spine1'), 0.6), 0.04), 'Spine', 0.14]] },
    immune: { at: lerp(P('RightArm'), P('RightForeArm'), 0.5), bone: 'RightArm', focusR: 0.2, dist: 2.3,
      hits: [[lerp(P('RightArm'), P('RightForeArm'), 0.5), 'RightArm', 0.085], ...['Left', 'Right'].flatMap((S) => [[lerp(P(S + 'ForeArm'), P(S + 'Hand'), 0.35), S + 'ForeArm', 0.075], [lerp(P(S + 'ForeArm'), P(S + 'Hand'), 1.05), S + 'ForeArm', 0.075]])] },
    bones: { at: fz(lerp(P('LeftUpLeg'), P('LeftLeg'), 0.62), 0.05), bone: 'LeftUpLeg', focusR: 0.3, dist: 2.8,
      hits: ['Left', 'Right'].flatMap((S) => [[lerp(P(S + 'UpLeg'), P(S + 'Leg'), 0.45), S + 'UpLeg', 0.1], [P(S + 'Leg'), S + 'Leg', 0.09], [lerp(P(S + 'Leg'), P(S + 'Foot'), 0.5), S + 'Leg', 0.08]]) },
    whole: { at: new THREE.Vector3(0.44, 0.012, 0.44), bone: null, focusR: 9, dist: HOME.dist, hits: [] },
  };
  const hitMat = new THREE.MeshBasicMaterial();
  const hits = [];
  const anchors = {};
  const circleGeo = new THREE.CircleGeometry(0.0125, 24);
  const ringGeo = new THREE.RingGeometry(0.0285, 0.0325, 48);
  const pulseGeo = new THREE.RingGeometry(0.033, 0.0355, 48);
  const glow = (geo, opacity) => {
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: COL.normal, transparent: true, opacity, depthTest: false, depthWrite: false }));
    m.layers.enable(1); m.renderOrder = 10;
    return m;
  };
  for (const id of zones) {
    const d = defs[id];
    const probe = new THREE.Object3D();
    probe.position.copy(d.at); scene.add(probe); probe.updateMatrixWorld(true);
    if (d.bone) bone(d.bone).attach(probe); else pivot.attach(probe);
    const grp = new THREE.Group();
    const core = glow(circleGeo, 1); const rng = glow(ringGeo, 0.9); const pulse = glow(pulseGeo, 0);
    grp.add(core, rng, pulse); grp.scale.setScalar(0.0001);
    scene.add(grp);
    anchors[id] = { id, probe, grp, core, rng, pulse, tier: 'normal', acked: true, k: 0, pos: new THREE.Vector3(), def: d, screen: { id, x: 0, y: 0 } };
    for (const [p, b, r] of d.hits) {
      const h = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8), hitMat);
      h.position.copy(p); h.layers.set(2); h.userData.zone = id;
      scene.add(h); h.updateMatrixWorld(true); bone(b).attach(h);
      hits.push(h);
    }
  }
  // Whole body = a dosimeter ring on the floor around the crew member.
  const floor = new THREE.Group(); pivot.add(floor);
  const doseRing = new THREE.Mesh(new THREE.RingGeometry(0.615, 0.623, 128), new THREE.MeshBasicMaterial({ color: COL.normal, transparent: true, opacity: 0.0, side: THREE.DoubleSide, depthTest: false }));
  doseRing.rotation.x = -Math.PI / 2; doseRing.position.y = 0.012; doseRing.layers.enable(1);
  const tickPts = [];
  for (let i = 0; i < 72; i++) {
    const a = (i / 72) * Math.PI * 2; const r0 = 0.64; const r1 = i % 6 === 0 ? 0.685 : 0.66;
    tickPts.push(Math.cos(a) * r0, 0.012, Math.sin(a) * r0, Math.cos(a) * r1, 0.012, Math.sin(a) * r1);
  }
  const tickGeo = new THREE.BufferGeometry(); tickGeo.setAttribute('position', new THREE.Float32BufferAttribute(tickPts, 3));
  const ticks = new THREE.LineSegments(tickGeo, new THREE.LineBasicMaterial({ color: COL.film, transparent: true, opacity: 0 }));
  const wholeHit = new THREE.Mesh(new THREE.TorusGeometry(0.64, 0.07, 6, 40), hitMat);
  wholeHit.rotation.x = Math.PI / 2; wholeHit.position.y = 0.02; wholeHit.layers.set(2); wholeHit.userData.zone = 'whole';
  floor.add(doseRing, ticks, wholeHit); hits.push(wholeHit);

  // developing line of the power-up scan
  const scanBar = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.004), new THREE.MeshBasicMaterial({ color: COL.film, transparent: true, opacity: 0, depthTest: false }));
  scanBar.layers.enable(1); scene.add(scanBar);

  // ---------- post: selective bloom (only layer 1 blooms) ----------
  const size = new THREE.Vector2(2, 2);
  const bloomComposer = new EffectComposer(renderer);
  bloomComposer.renderToScreen = false;
  bloomComposer.addPass(new RenderPass(scene, camera, null, new THREE.Color(0x000000), 1));
  const bloomPass = new UnrealBloomPass(size.clone(), 1.15, 0.55, 0.0);
  bloomComposer.addPass(bloomPass);
  const finalTarget = new THREE.WebGLRenderTarget(2, 2, { type: THREE.HalfFloatType, samples: 4 });
  const finalComposer = new EffectComposer(renderer, finalTarget);
  finalComposer.addPass(new RenderPass(scene, camera));
  const mixPass = new ShaderPass(new THREE.ShaderMaterial({
    uniforms: { baseTexture: { value: null }, bloomTexture: { value: bloomComposer.renderTarget2.texture } },
    vertexShader: MIX_VERT, fragmentShader: MIX_FRAG,
  }), 'baseTexture');
  mixPass.needsSwap = true;
  finalComposer.addPass(mixPass);
  finalComposer.addPass(new OutputPass());

  // ---------- view state ----------
  const view = { x: HOME.x, y: HOME.y, z: HOME.z, dist: HOME.dist, shift: 0, yawAmt: 1, lift: 0 };
  const user = { yaw: 0, pitch: 0 };
  const hl = { id: null, amt: 0, target: 0 };
  let selected = null; let w = 2; let h = 2; let fit = 1;
  const tmp = new THREE.Vector3();

  function resize() {
    w = Math.max(2, container.clientWidth); h = Math.max(2, container.clientHeight);
    renderer.setSize(w, h, false);
    canvas.style.width = '100%'; canvas.style.height = '100%';
    bloomComposer.setPixelRatio(PR); finalComposer.setPixelRatio(PR);
    bloomComposer.setSize(w, h); finalComposer.setSize(w, h);
    camera.aspect = w / h;
    // keep the whole figure in frame on narrow (portrait) stages
    fit = Math.max(1, 0.62 / camera.aspect);
    camera.updateProjectionMatrix();
  }
  const ro = new ResizeObserver(resize); ro.observe(container); resize();

  // ---------- input ----------
  const ray = new THREE.Raycaster(); ray.layers.set(2);
  const ptr = new THREE.Vector2(); let ptrDirty = false; let hovered = null; let drag = null; let back = null;
  const pick = (e) => {
    const r = canvas.getBoundingClientRect();
    ptr.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ptr, camera);
    const hit = ray.intersectObjects(hits, false)[0];
    return hit ? hit.object.userData.zone : null;
  };
  let lastEvt = null;
  canvas.addEventListener('pointerdown', (e) => {
    drag = { x: e.clientX, y: e.clientY, yaw: user.yaw, pitch: user.pitch, moved: false, id: e.pointerId };
    if (back) { back.kill(); back = null; }
  });
  canvas.addEventListener('pointermove', (e) => {
    if (drag) {
      const dx = e.clientX - drag.x; const dy = e.clientY - drag.y;
      if (!drag.moved && Math.abs(dx) + Math.abs(dy) > 6) { drag.moved = true; canvas.setPointerCapture(drag.id); canvas.classList.add('dragging'); }
      if (drag.moved) { user.yaw = drag.yaw + dx * 0.009; user.pitch = Math.max(-0.3, Math.min(0.3, drag.pitch + dy * 0.004)); }
    } else if (e.pointerType === 'mouse') { lastEvt = e; ptrDirty = true; }
  });
  const release = (e) => {
    if (!drag) return;
    const wasDrag = drag.moved; drag = null; canvas.classList.remove('dragging');
    if (!wasDrag && e.type === 'pointerup') { const z = pick(e); if (z) onSelect(z); }
    else back = gsap.to(user, { yaw: 0, pitch: 0, duration: 1.4, delay: 2.2, ease: 'power2.inOut' });
  };
  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', release);
  canvas.addEventListener('pointerleave', () => { if (hovered) { hovered = null; canvas.style.cursor = ''; onHover(null); } });

  // ---------- frame ----------
  const timer = new THREE.Timer(); timer.connect(document);
  let t = 0; let running = false; let visible = true;
  const tierColor = (tier) => COL[tier] || COL.normal;

  function frame() {
    timer.update();
    const dt = Math.min(timer.getDelta(), 0.05); t += dt;
    shared.uTime.value = t;
    mixer.update(dt);
    pivot.rotation.y = Math.sin(t * 0.42) * 0.42 * view.yawAmt + user.yaw;
    pivot.rotation.x = user.pitch;

    camera.position.set(view.x, view.y + 0.06 + view.lift, view.z + view.dist * fit);
    camera.lookAt(view.x, view.y + view.lift * 0.4, view.z);
    if (Math.abs(view.shift) > 0.5) camera.setViewOffset(w, h, view.shift, 0, w, h); else if (camera.view) camera.clearViewOffset();
    scene.updateMatrixWorld();

    if (ptrDirty && lastEvt) {
      ptrDirty = false;
      const z = pick(lastEvt);
      if (z !== hovered) { hovered = z; canvas.style.cursor = z ? 'pointer' : ''; onHover(z); }
    }

    hl.amt += (hl.target - hl.amt) * Math.min(1, dt * 12);
    const near = Math.max(0.42, Math.min(1, view.dist / HOME.dist)); // close-ups: smaller markers, softer zone tint
    shared.uFocusAmt.value = hl.amt * (0.35 + 0.65 * near);

    for (const id of zones) {
      const a = anchors[id];
      a.probe.getWorldPosition(a.pos);
      if (id === 'whole') { // stays at the front right of the ring for the viewer, whatever the body's turn
        floor.getWorldPosition(a.pos); const cx = camera.position.x - a.pos.x; const cz = camera.position.z - a.pos.z; const l = Math.hypot(cx, cz) || 1;
        a.pos.x += 0.44 * (cx / l + cz / l); a.pos.z += 0.44 * (cz / l - cx / l); a.pos.y += 0.012;
      }
      a.grp.position.copy(a.pos);
      a.grp.quaternion.copy(camera.quaternion);
      const active = id === hl.id || id === selected;
      a.k += ((active ? 1 : 0) - a.k) * Math.min(1, dt * 12);
      a.rng.scale.setScalar((1 + a.k * 0.55) * near); a.core.scale.setScalar(near);
      if (a.tier === 'attention') { // slow breathing, never a blink
        const b = 0.5 + 0.5 * Math.sin(t * 1.9);
        a.rng.material.opacity = 0.55 + 0.45 * b; a.core.material.opacity = 0.75 + 0.25 * b;
      } else if (a.tier === 'critical' && !a.acked) { // the only thing on screen that pulses
        const p = (t * 0.95) % 1;
        a.pulse.scale.setScalar((1 + p * 2.6) * near); a.pulse.material.opacity = (1 - p) * 0.9;
        a.core.material.opacity = 1; a.rng.material.opacity = 1;
      } else { a.pulse.material.opacity = 0; a.core.material.opacity = 1; a.rng.material.opacity = a.tier === 'normal' ? 0.7 : 1; }
      tmp.copy(a.pos).project(camera);
      a.screen.x = (tmp.x * 0.5 + 0.5) * w; a.screen.y = (-tmp.y * 0.5 + 0.5) * h;
    }
    if (hl.id) shared.uFocus.value.copy(anchors[hl.id].pos);
    scanBar.position.set(0, shared.uScan.value, 0.3);

    camera.layers.set(1); bloomComposer.render();
    camera.layers.set(0); finalComposer.render();
    onFrame && onFrame(zones.map((id) => anchors[id].screen));
  }
  const start = () => { if (!running && visible && !document.hidden) { running = true; timer.update(); renderer.setAnimationLoop(frame); } };
  const stop = () => { running = false; renderer.setAnimationLoop(null); };
  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
  const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; visible ? start() : stop(); });
  io.observe(container);
  start();

  // ---------- API ----------
  const api = {
    supported: true,
    setStatuses(tiers, unacked) {
      for (const id of zones) {
        const a = anchors[id]; a.tier = tiers[id] || 'normal'; a.acked = !(unacked && unacked[id]);
        const c = tierColor(a.tier);
        a.core.material.color.setHex(c); a.rng.material.color.setHex(c); a.pulse.material.color.setHex(c);
      }
      doseRing.material.color.setHex(tierColor(tiers.whole));
    },
    setHighlight(id) {
      if (id) {
        hl.id = id; hl.target = 1;
        shared.uFocusR.value = anchors[id].def.focusR;
        shared.uFocusColor.value.setHex(tierColor(anchors[id].tier));
      } else if (selected) { api.setHighlight(selected); } else hl.target = 0;
    },
    /** Camera dolly to a zone (or home when id is null). shift = px to move the figure left of centre. */
    focus(id, shift = 0) {
      selected = id;
      const d = id ? anchors[id].def : null;
      const to = id && id !== 'whole'
        ? { x: anchors[id].pos.x * 0.6, y: anchors[id].pos.y, z: 0, dist: d.dist, yawAmt: 0.25, lift: 0 }
        : { x: HOME.x, y: HOME.y, z: HOME.z, dist: HOME.dist, yawAmt: id ? 0.5 : 1, lift: 0 };
      gsap.to(view, { ...to, shift, duration: 0.7, ease: 'power3.inOut', overwrite: true });
      if (back) back.kill();
      back = gsap.to(user, { yaw: 0, pitch: 0, duration: 0.7, ease: 'power3.inOut' });
      api.setHighlight(id);
    },
    /** Power-up: scan plane rises feet → head, then the anchors ignite in the given order. */
    boot(order, instant) {
      const tl = gsap.timeline();
      const all = order.map((id) => anchors[id].grp.scale);
      if (instant) {
        shared.uScan.value = 3; all.forEach((s) => s.setScalar(1)); doseRing.material.opacity = 0.75; ticks.material.opacity = 0.28;
        return tl;
      }
      tl.fromTo(shared.uScan, { value: -0.05 }, { value: HEIGHT + 0.12, duration: 1.4, ease: 'power2.inOut' }, 0)
        .fromTo(scanBar.material, { opacity: 0.9 }, { opacity: 0, duration: 0.3, ease: 'power1.in' }, 1.15)
        .set(shared.uScan, { value: 3 }, 1.5)
        .to(ticks.material, { opacity: 0.28, duration: 0.5 }, 0.1)
        .to(doseRing.material, { opacity: 0.75, duration: 0.5 }, 0.9);
      all.forEach((s, i) => tl.fromTo(s, { x: 0.0001, y: 0.0001, z: 0.0001 }, { x: 1, y: 1, z: 1, duration: 0.42, ease: 'back.out(2.4)' }, 0.9 + i * 0.04));
      return tl;
    },
    dispose() { stop(); ro.disconnect(); io.disconnect(); renderer.dispose(); canvas.remove(); },
  };
  return api;
}
