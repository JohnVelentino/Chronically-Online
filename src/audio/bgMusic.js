/**
 * bgMusic — background music player with autoplay-unlock + crossfade.
 *
 * Drop files into:
 *   public/assets/music/menu.mp3     — plays on hero select + menu
 *   public/assets/music/battle.mp3   — plays during gameplay
 *
 * Optional extras (any one of these is enough — first match wins):
 *   menu.ogg, menu.wav  /  battle.ogg, battle.wav
 *
 * Missing files: silently no-op (no console errors).
 */

const BASE = import.meta.env.BASE_URL || "/";
const CANDIDATE_EXTS = ["mp3", "ogg", "wav"];

function buildCandidates(name) {
  return CANDIDATE_EXTS.map((ext) => `${BASE}assets/music/${name}.${ext}`.replace(/\/+/g, "/"));
}

const TRACKS = {
  menu:   { candidates: buildCandidates("menu"),   volume: 0.35 },
  battle: { candidates: buildCandidates("battle"), volume: 0.3 },
};

let currentKey = null;
let currentEl = null;
let unlocked = false;
let pendingKey = null;

function makeAudio(src, volume) {
  const el = new Audio();
  el.src = src;
  el.loop = true;
  el.volume = 0;
  el.preload = "auto";
  el.crossOrigin = "anonymous";
  el._targetVolume = volume;
  return el;
}

function fadeTo(el, targetVol, durationMs = 700) {
  if (!el) return;
  const startVol = el.volume;
  const start = performance.now();
  function step(now) {
    const t = Math.min(1, (now - start) / durationMs);
    el.volume = startVol + (targetVol - startVol) * t;
    if (t < 1) requestAnimationFrame(step);
    else if (targetVol === 0) { try { el.pause(); } catch {} }
  }
  requestAnimationFrame(step);
}

async function probeFirstPlayable(candidates) {
  for (const src of candidates) {
    try {
      const head = await fetch(src, { method: "HEAD" });
      if (head.ok) return src;
    } catch {}
  }
  return null;
}

async function startTrack(key) {
  const def = TRACKS[key];
  if (!def) return;
  const src = await probeFirstPlayable(def.candidates);
  if (!src) return; // no file present — silently skip

  const next = makeAudio(src, def.volume);
  try {
    await next.play();
  } catch {
    // autoplay blocked — wait for unlock event
    pendingKey = key;
    return;
  }

  if (currentEl) fadeTo(currentEl, 0, 600);
  currentEl = next;
  currentKey = key;
  fadeTo(next, def.volume, 900);
}

function unlockOnGesture() {
  if (unlocked) return;
  unlocked = true;
  if (pendingKey) {
    const k = pendingKey;
    pendingKey = null;
    startTrack(k);
  } else if (currentKey) {
    // resume current track if it was blocked
    currentEl?.play?.().catch(() => {});
  }
}

if (typeof window !== "undefined") {
  const handler = () => { unlockOnGesture(); window.removeEventListener("pointerdown", handler); window.removeEventListener("keydown", handler); };
  window.addEventListener("pointerdown", handler, { once: false });
  window.addEventListener("keydown", handler, { once: false });
}

export const bgMusic = {
  play(key) {
    if (currentKey === key) return;
    startTrack(key);
  },
  stop() {
    if (currentEl) fadeTo(currentEl, 0, 500);
    currentKey = null;
    currentEl = null;
  },
  setVolume(v) {
    if (currentEl) currentEl._targetVolume = v;
    Object.values(TRACKS).forEach((t) => { t.volume = v; });
    if (currentEl) fadeTo(currentEl, v, 300);
  },
};

export default bgMusic;
