// 3D Mochi. Renders Mochi (and plaza visitors) with Three.js on a transparent WebGL layer laid exactly
// over the 2D room canvas; a second 2D canvas above it carries the hand, toys on a string, emotes, names
// and the night tint. The world, brain, senses and learning are untouched: this only reads state each
// frame. If WebGL is missing, init() returns null and the 2D drawing carries on as before.
import * as THREE from "./vendor/three-0.170.0.module.min.js";
import { BODY, ROOM } from "./world.js?v=9";
import { COAT } from "./render.js?v=11";

const LOOK = 1.22, TAU = Math.PI * 2;
const lerp = (a, b, k) => a + (b - a) * k;
const DEFAULT_STOPS = COAT.stops.map(s => s[1]).join();

function gradientTexture(colors) {
  const c = document.createElement("canvas"); c.width = 4; c.height = 256;
  const g = c.getContext("2d"), grad = g.createLinearGradient(0, 256, 0, 0);
  colors.forEach((col, i) => grad.addColorStop(i / (colors.length - 1), col));
  g.fillStyle = grad; g.fillRect(0, 0, 4, 256);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function hueShift(hex, deg) { const c = new THREE.Color(hex); const hsl = {}; c.getHSL(hsl); c.setHSL((hsl.h + deg / 360) % 1, hsl.s, hsl.l); return "#" + c.getHexString(); }

// One Mochi model. palette: {stops:[back,mid,brow], ear, earBack, earFront, eye, mouth, blush}
function buildModel(palette) {
  const r = BODY.radius;
  const coat = new THREE.MeshPhysicalMaterial({ map: gradientTexture(palette.stops), roughness: 0.45, clearcoat: 0.6, clearcoatRoughness: 0.35, sheen: 0.6, sheenColor: new THREE.Color(palette.ear) });
  const dark = new THREE.MeshStandardMaterial({ color: palette.eye, roughness: 0.25 });
  const white = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const blushM = new THREE.MeshBasicMaterial({ color: palette.blush, transparent: true, opacity: 0.4 });
  const earIn = new THREE.MeshStandardMaterial({ color: palette.ear, roughness: 0.6 });
  const mouthM = new THREE.MeshStandardMaterial({ color: palette.mouth, roughness: 0.6 });
  const tailM = new THREE.MeshPhysicalMaterial({ color: palette.stops[0], roughness: 0.5, clearcoat: 0.4 });

  const root = new THREE.Group();
  const tilt = new THREE.Group(); tilt.rotation.x = -0.2; root.add(tilt);
  const squash = new THREE.Group(); tilt.add(squash);
  const bodyPivot = new THREE.Group(); bodyPivot.position.y = r * 0.85; squash.add(bodyPivot);
  const bodyGeo = new THREE.SphereGeometry(r, 48, 32);
  { const p = bodyGeo.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i); p.setY(i, y * (y < 0 ? 0.78 : 0.95)); const s = 1 + 0.08 * Math.max(0, -y / r); p.setX(i, p.getX(i) * s); p.setZ(i, p.getZ(i) * s); } bodyGeo.computeVertexNormals(); }
  bodyPivot.add(new THREE.Mesh(bodyGeo, coat));
  const face = new THREE.Group(); face.position.set(0, 2, r * 0.93); bodyPivot.add(face);
  const eyes = [], cheeks = [];
  for (const side of [-1, 1]) {
    const eye = new THREE.Group(); eye.position.set(side * 8.5, 0, 0);
    const ball = new THREE.Mesh(new THREE.SphereGeometry(4.2, 20, 14), dark); ball.scale.set(0.85, 1.15, 0.6); eye.add(ball);
    const glint = new THREE.Mesh(new THREE.SphereGeometry(1.1, 10, 8), white); glint.position.set(1.2, 1.8, 2.4); eye.add(glint);
    const lid = new THREE.Mesh(new THREE.TorusGeometry(3.8, 1.0, 6, 16, Math.PI), dark); lid.visible = false; eye.add(lid);
    face.add(eye); eyes.push({ eye, ball, glint, lid });
    const cheek = new THREE.Mesh(new THREE.CircleGeometry(4.5, 20), blushM); cheek.position.set(side * 15, -6, -1.5); cheek.scale.y = 0.6; cheek.rotation.y = side * 0.35; face.add(cheek); cheeks.push(cheek);
  }
  const mouth = new THREE.Mesh(new THREE.SphereGeometry(2.6, 16, 10), mouthM); mouth.position.set(0, -7, 1.5); face.add(mouth);
  const ears = [];
  for (const side of [-1, 1]) {
    const pivot = new THREE.Group(); pivot.position.set(side * r * 0.5, r * 0.72, 0); bodyPivot.add(pivot);
    const outer = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), new THREE.MeshPhysicalMaterial({ color: side < 0 ? palette.earBack : palette.earFront, roughness: 0.5, clearcoat: 0.4 }));
    outer.scale.set(7.5, 13, 4); outer.position.y = 9; pivot.add(outer);
    const inner = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 10), earIn); inner.scale.set(3.6, 8, 1.5); inner.position.set(0, 9, 3); pivot.add(inner);
    ears.push({ pivot, side });
  }
  const feet = [];
  for (const side of [-1, 1]) { const f = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 10), coat); f.scale.set(7, 4.5, 8); f.position.set(side * 11, 3, 6); squash.add(f); feet.push(f); }
  const paw = new THREE.Mesh(new THREE.SphereGeometry(6, 16, 10), coat); paw.position.set(r * 0.85, r * 0.7, 8); squash.add(paw);
  const tailPivot = new THREE.Group(); tailPivot.position.set(0, r * 0.6, -r * 0.85); squash.add(tailPivot);
  const tail = new THREE.Mesh(new THREE.CapsuleGeometry(3.2, 16, 6, 12), tailM); tail.position.y = 9; tailPivot.add(tail); tailPivot.rotation.x = -0.7;
  return { root, squash, bodyPivot, face, eyes, cheeks, mouth, ears, feet, paw, tailPivot, facing: 1, opacity: 1,
    dispose() { root.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) { if (o.material.map) o.material.map.dispose(); o.material.dispose(); } }); } };
}

function pose3d(M, m, view, t, dt) {
  const r = BODY.radius, pose = m.pose, n = m.needs || {};
  const speed = Math.hypot(m.vx || 0, m.vy || 0) / BODY.speed;
  let lift = 0, sx = 1, sy = 1, spin = 0, bob = 0, dip = 0, lean = 0;
  const breath = Math.sin(t * (m.asleep ? 1.4 : 2.6)) * (m.asleep ? 0.035 : 0.025);
  if (pose === "walk") { bob = Math.abs(Math.sin(t * 13)) * 3 * Math.min(1, speed * 1.4); lean = 0.12 * Math.min(1, speed); }
  if (pose === "sit") { sy = 0.9; sx = 1.05; }
  if (pose === "lie") { sy = 0.66; sx = 1.18; }
  if (pose === "eat" || pose === "drink" || pose === "sniff") dip = Math.abs(Math.sin(t * (pose === "sniff" ? 9 : 12)));
  if (pose === "jump") { const k = Math.min(1, (m.actionT || 0) / 0.45); lift = 34 * Math.sin(k * Math.PI); sy = k < 0.15 || k > 0.9 ? 0.85 : 1.12; sx = 2 - sy; }
  if (pose === "spin") spin = ((m.actionT || 0) / 0.6) * TAU;
  if (pose === "pounce") { sx = 1.14; sy = 0.86; lean = 0.25; }
  if (pose === "held") { sx = 0.9; sy = 1.16; lift = 8; }
  const droop = Math.max(0, (n.hunger || 0) - 0.6) * 0.25;
  sy += breath - droop * 0.4; sx -= breath * 0.6 - droop * 0.3;

  const want = Math.cos(m.heading || 0) < 0 ? -1 : 1;
  M.facing = lerp(M.facing, want, Math.min(1, dt * 10));
  M.root.position.set(m.x, -(m.y + r * 0.72 * LOOK - lift - bob), 0);
  M.root.scale.setScalar(LOOK);
  M.root.rotation.y = M.facing * 0.28 + spin;
  M.squash.scale.set(sx, sy, sx);
  M.bodyPivot.rotation.x = 0.35 * dip + lean;
  M.bodyPivot.rotation.z = Math.sin(t * 1.1) * 0.03;

  const look = view.look || [0, 0];
  M.face.position.x = look[0] * M.facing * 2; M.face.position.y = 2 - look[1] * 2 - dip * 2;
  const touch = m.touch || {}, taste = m.taste || {};
  const closed = m.asleep || view.blink || (pose === "lie" && Math.sin(t * 0.9) > 0.2) || Math.sin(t * 0.7 + M.root.id) > 0.995;
  const happy = (touch.stroke || 0) > 0.4 && !m.asleep;
  const wide = 1 + (view.alert || 0) * 0.35;
  for (const e of M.eyes) {
    const shut = closed || happy;
    e.ball.visible = e.glint.visible = !shut; e.lid.visible = shut;
    e.lid.rotation.z = happy ? 0 : Math.PI; e.eye.scale.setScalar(wide);
  }
  for (const c of M.cheeks) c.material.opacity = (0.3 + 0.5 * Math.min(1, (touch.stroke || 0) + (taste.good || 0))) * M.opacity;
  if (pose === "call") M.mouth.scale.set(1.2, 1.5, 0.6);
  else if (pose === "eat" || pose === "drink") M.mouth.scale.set(1.1, 0.6 + 0.6 * Math.abs(Math.sin(t * 24)), 0.5);
  else if ((taste.bad || 0) > 0.3) M.mouth.scale.set(1.3, 0.25, 0.4);
  else M.mouth.scale.set(1, 0.4, 0.4);

  // ears: perk when alert; asleep they fold back and lie flat along the head instead of splaying out
  const lying = m.asleep || pose === "lie";
  for (const e of M.ears) {
    const perk = pose === "sit" || view.alert > 0.4 ? -0.15 : 0;
    const zTarget = lying ? -e.side * 0.18 : -e.side * (0.35 + perk + Math.sin(t * 2 + e.side) * 0.04);
    const xTarget = lying ? -1.15 : 0;
    e.pivot.rotation.z = lerp(e.pivot.rotation.z, zTarget, Math.min(1, dt * 8));
    e.pivot.rotation.x = lerp(e.pivot.rotation.x, xTarget, Math.min(1, dt * 8));
  }
  const stride = pose === "walk" ? Math.sin(t * 13) * 5 : 0;
  M.feet[0].position.z = 6 + stride; M.feet[1].position.z = 6 - stride;
  M.feet.forEach(f => { f.visible = pose !== "lie"; });
  M.paw.visible = pose === "paw"; if (M.paw.visible) M.paw.position.y = r * 0.9 + Math.sin(t * 16) * 5;
  M.tailPivot.rotation.z = Math.sin(t * ((n.boredom || 0) > 0.6 ? 9 : 3.2)) * (pose === "lie" ? 0.15 : 0.5);
}

function setOpacity(M, a) {
  if (M.opacity === a) return; M.opacity = a;
  M.root.traverse(o => { if (o.material && !M.cheeks.includes(o)) { o.material.transparent = a < 1; o.material.opacity = a; } });
}

export function init(stage, roomCanvas) {
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "low-power" }); }
  catch (e) { console.info("3D Mochi off (no WebGL):", e.message); return null; }
  const el = renderer.domElement; el.id = "room3d";
  Object.assign(el.style, { position: "absolute", left: "0", top: "0", width: "100%", height: "100%", pointerEvents: "none", zIndex: 1 });
  roomCanvas.after(el);
  // the top layer: a 2D canvas in room pixels for everything that belongs above Mochi
  const top = document.createElement("canvas"); top.id = "roomTop"; top.width = roomCanvas.width; top.height = roomCanvas.height;
  Object.assign(top.style, { position: "absolute", left: "0", top: "0", width: "100%", height: "100%", pointerEvents: "none", zIndex: 1 });
  el.after(top);
  const topCtx = top.getContext("2d");
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;

  const scene = new THREE.Scene();
  const cam = new THREE.OrthographicCamera(0, ROOM.w, 0, -ROOM.h, -500, 500); cam.position.z = 200;
  const hemi = new THREE.HemisphereLight(0xcfe8ff, 0x2a1450, 1.4); scene.add(hemi);
  const key = new THREE.DirectionalLight(0xffffff, 2.2); key.position.set(-0.6, 0.9, 1.2); scene.add(key);
  const rim = new THREE.DirectionalLight(0x14f195, 1.4); rim.position.set(0.9, -0.2, -0.8); scene.add(rim);

  const paletteOf = (c) => ({ stops: c.stops.map(s => s[1]), ear: c.ear, earBack: c.earBack, earFront: c.earFront, eye: c.eye, mouth: c.mouth, blush: `rgb(${c.blush})` });
  let mainKey = "", main = null;
  const visitors = new Map();     // id -> {key, model, seen}

  let w = 0, h = 0, lastT = 0;
  function resize() {
    const rect = roomCanvas.getBoundingClientRect();
    if (rect.width !== w || rect.height !== h) { w = rect.width; h = rect.height; renderer.setSize(w, h, false); }
  }

  // visitorList: [{id, m, coat:{back,mid,brow,ear,earBack,earFront,eye,mouth,blush}}] from the plaza
  function frame(world, view, visitorList = []) {
    resize();
    const t = view.time, dt = Math.min(0.1, Math.max(0, t - lastT)); lastT = t;
    // main Mochi; rebuilt if the owner changes the coat in the builder
    const k = JSON.stringify([COAT.stops, COAT.ear, COAT.earBack, COAT.earFront, COAT.eye, COAT.mouth, COAT.blush]);
    if (k !== mainKey) { if (main) { scene.remove(main.root); main.dispose(); } main = buildModel(paletteOf(COAT)); scene.add(main.root); mainKey = k; }
    pose3d(main, world.m, view, t, dt);

    // visitors: same model, each in its own colours; a visitor in the default coat gets a hue of its own
    const seen = new Set();
    for (const v of visitorList) {
      seen.add(v.id);
      let pal = { stops: [v.coat.back, v.coat.mid, v.coat.brow], ear: v.coat.ear, earBack: v.coat.earBack, earFront: v.coat.earFront, eye: v.coat.eye, mouth: v.coat.mouth, blush: v.coat.blush };
      if (pal.stops.join() === DEFAULT_STOPS) {
        let hsh = 0; for (const ch of String(v.id)) hsh = (hsh * 31 + ch.charCodeAt(0)) >>> 0;
        const deg = 60 + (hsh % 240);
        pal = { ...pal, stops: pal.stops.map(c => hueShift(c, deg)), earBack: hueShift(pal.earBack, deg), earFront: hueShift(pal.earFront, deg) };
      }
      const vk = JSON.stringify(pal);
      let entry = visitors.get(v.id);
      if (!entry || entry.key !== vk) { if (entry) { scene.remove(entry.model.root); entry.model.dispose(); } entry = { key: vk, model: buildModel(pal) }; scene.add(entry.model.root); visitors.set(v.id, entry); setOpacity(entry.model, 0.92); }
      pose3d(entry.model, v.m, { time: t, look: v.look, alert: 0, blink: false }, t, dt);
    }
    for (const [id, entry] of visitors) if (!seen.has(id)) { scene.remove(entry.model.root); entry.model.dispose(); visitors.delete(id); }

    const light = world.light ? world.light() : 1;
    hemi.intensity = 0.5 + 0.9 * light; key.intensity = 0.8 + 1.4 * light;
    renderer.render(scene, cam);
  }
  return { frame, renderer, topCtx, canvas: el, top };
}
