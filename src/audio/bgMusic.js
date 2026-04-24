/**
 * bgMusic — background music player with autoplay-unlock + crossfade.
 *
 * Drop files into:
 *   public/assets/music/menu.mp3     — plays on hero select + menu
 *   public/assets/music/battle.mp3   — battle playlist track 1
 *   public/assets/music/battle2.mp3  — battle playlist track 2
 *   ...
 *   public/assets/music/battle8.mp3  — battle playlist track 8
 *
 * Battle plays as sequential playlist: battle → battle2 → ... → battle8 → battle.
 * Missing tracks skipped silently.
 *
 * Optional extras (any one of these is enough — first match wins):
 *   menu.ogg, menu.wav  /  battle.ogg, battle.wav  /  battle2.ogg, ...
 */

const BASE = import.meta.env.BASE_URL || "/";
const CANDIDATE_EXTS = ["mp3", "ogg", "wav"];
const BATTLE_COUNT = 8;

function buildCandidates(name) {
  return CANDIDATE_EXTS.map((ext) => `${BASE}assets/music/${name}.${ext}`.replace(/\/+/g, "/"));
}

function battlePlaylistNames() {
  const names = ["battle"];
  for (let i = 2; i <= BATTLE_COUNT; i++) names.push(`battle${i}`);
  return names;
}

const TRACKS = {
  menu:        { candidates: buildCandidates("menu"),         volume: 0.35, loop: true, fadeInMs: 1800 },
  battle:      {
    playlist: battlePlaylistNames().map((n) => ({ candidates: buildCandidates(n) })),
    volume: 0.3,
    loop: false,
    fadeInMs: 900,
  },
};

let currentKey = null;
let currentEl = null;
let currentPlaylistIdx = 0;
let resolvedBattlePlaylist = null; // cached array of playable srcs
let unlocked = false;
let pendingKey = null;
let userVolume = 0.35; // persisted desired volume
let userMuted = false;
const listeners = new Set();

try {
  const v = localStorage.getItem("bgMusic:volume");
  if (v !== null) userVolume = Math.max(0, Math.min(1, parseFloat(v)));
  userMuted = localStorage.getItem("bgMusic:muted") === "1";
} catch {}

function persist() {
  try {
    localStorage.setItem("bgMusic:volume", String(userVolume));
    localStorage.setItem("bgMusic:muted", userMuted ? "1" : "0");
  } catch {}
}
function effectiveVolume() { return userMuted ? 0 : userVolume; }
function notify() { listeners.forEach(fn => { try { fn({ volume: userVolume, muted: userMuted }); } catch {} }); }

function makeAudio(src, volume, loop) {
  const el = new Audio();
  el.src = src;
  el.loop = !!loop;
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

async function resolveBattlePlaylist() {
  if (resolvedBattlePlaylist) return resolvedBattlePlaylist;
  const def = TRACKS.battle;
  const resolved = [];
  for (const entry of def.playlist) {
    const src = await probeFirstPlayable(entry.candidates);
    if (src) resolved.push(src);
  }
  resolvedBattlePlaylist = resolved;
  return resolved;
}

async function startTrack(key) {
  const def = TRACKS[key];
  if (!def) return;

  // battle = playlist mode
  if (key === "battle") {
    const list = await resolveBattlePlaylist();
    if (!list.length) return;
    currentPlaylistIdx = 0;
    return playBattleIndex(0);
  }

  const src = await probeFirstPlayable(def.candidates);
  if (!src) return;

  const next = makeAudio(src, def.volume, def.loop !== false);
  try {
    await next.play();
  } catch {
    pendingKey = key;
    return;
  }

  if (currentEl) fadeTo(currentEl, 0, 600);
  currentEl = next;
  currentKey = key;
  fadeTo(next, effectiveVolume(), def.fadeInMs || 900);
}

async function playBattleIndex(idx) {
  const list = resolvedBattlePlaylist;
  if (!list || !list.length) return;
  const wrappedIdx = ((idx % list.length) + list.length) % list.length;
  currentPlaylistIdx = wrappedIdx;
  const def = TRACKS.battle;
  const src = list[wrappedIdx];

  const next = makeAudio(src, def.volume, false);
  next.addEventListener("ended", () => {
    // only advance if still the active battle element
    if (currentEl !== next || currentKey !== "battle") return;
    playBattleIndex(currentPlaylistIdx + 1);
  });

  try {
    await next.play();
  } catch {
    pendingKey = "battle";
    return;
  }

  if (currentEl) fadeTo(currentEl, 0, 600);
  currentEl = next;
  currentKey = "battle";
  fadeTo(next, effectiveVolume(), def.fadeInMs || 900);
}

function unlockOnGesture() {
  if (unlocked) return;
  unlocked = true;
  if (pendingKey) {
    const k = pendingKey;
    pendingKey = null;
    startTrack(k);
  } else if (currentKey) {
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
  fadeOut(durationMs = 600) {
    if (currentEl) fadeTo(currentEl, 0, durationMs);
    currentKey = null;
    currentEl = null;
  },
  setVolume(v) {
    userVolume = Math.max(0, Math.min(1, v));
    if (currentEl) currentEl._targetVolume = effectiveVolume();
    if (currentEl) fadeTo(currentEl, effectiveVolume(), 200);
    persist(); notify();
  },
  getVolume() { return userVolume; },
  isMuted() { return userMuted; },
  setMuted(m) {
    userMuted = !!m;
    if (currentEl) fadeTo(currentEl, effectiveVolume(), 200);
    persist(); notify();
  },
  toggleMute() { this.setMuted(!userMuted); },
  subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
  nextBattleTrack() {
    if (currentKey === "battle") playBattleIndex(currentPlaylistIdx + 1);
  },
};

export default bgMusic;
