/**
 * bgMusic — background music player with autoplay-unlock + crossfade.
 *
 * Files:
 *   public/assets/music/menu.mp3      — menu / hero select (loops)
 *   public/assets/music/battle.mp3    — battle playlist track 1
 *   public/assets/music/battle2..8.mp3 — additional battle tracks
 *
 * Battle plays as a randomized playlist. Order reshuffles after the last track.
 * All srcs are eagerly preloaded so playback is gapless and the menu starts
 * with no perceptible delay (no HEAD probe, no buffering wait on first play).
 */

const BASE = import.meta.env.BASE_URL || "/";
const BATTLE_COUNT = 8;

function srcFor(name) {
  return `${BASE}assets/music/${name}.mp3`.replace(/\/+/g, "/");
}

const MENU_SRC = srcFor("menu");
const BATTLE_SRCS = (() => {
  const out = [srcFor("battle")];
  for (let i = 2; i <= BATTLE_COUNT; i++) out.push(srcFor(`battle${i}`));
  return out;
})();

const MENU_VOL = 0.35;
const BATTLE_VOL = 0.3;
const MENU_FADE_IN_MS = 200;   // near-instant for menu
const BATTLE_FADE_IN_MS = 600;
const SWAP_FADE_OUT_MS = 500;

let currentKey = null;
let currentEl = null;
let unlocked = false;
let pendingKey = null;
let userVolume = MENU_VOL;
let userMuted = false;
const listeners = new Set();

let battleOrder = null;  // shuffled array of battle srcs
let battleIdx = 0;

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

// ── Persistent <audio> cache: one element per src, reused across plays ──
const audioCache = new Map();
function getAudio(src, loop) {
  let el = audioCache.get(src);
  if (!el) {
    el = new Audio();
    el.src = src;
    el.preload = "auto";
    el.loop = !!loop;
    el.volume = 0;
    try { el.load(); } catch {}
    audioCache.set(src, el);
  } else {
    el.loop = !!loop;
  }
  return el;
}

// Eager preload at module init: menu + first two battle tracks so the first
// menu start is instant and battle->battle transitions don't gap.
if (typeof window !== "undefined") {
  getAudio(MENU_SRC, true);
  // Warm up battle pool with a few elements; rest load on demand.
  getAudio(BATTLE_SRCS[0], false);
  if (BATTLE_SRCS[1]) getAudio(BATTLE_SRCS[1], false);
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

function shuffle(arr) {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function reshuffleBattle() {
  let next = shuffle(BATTLE_SRCS);
  // Avoid replaying the same track back-to-back when wrapping.
  if (battleOrder && next.length > 1 && next[0] === battleOrder[battleOrder.length - 1]) {
    [next[0], next[1]] = [next[1], next[0]];
  }
  battleOrder = next;
  battleIdx = 0;
}

function preloadBattleAt(idx) {
  if (!battleOrder || !battleOrder.length) return;
  const wrapped = ((idx % battleOrder.length) + battleOrder.length) % battleOrder.length;
  // Touch the cache so the next track is buffered before its turn.
  getAudio(battleOrder[wrapped], false);
}

async function startMenu() {
  const el = getAudio(MENU_SRC, true);
  try { el.currentTime = 0; } catch {}
  try {
    await el.play();
  } catch {
    pendingKey = "menu";
    return;
  }
  if (currentEl && currentEl !== el) fadeTo(currentEl, 0, SWAP_FADE_OUT_MS);
  currentEl = el;
  currentKey = "menu";
  fadeTo(el, effectiveVolume(), MENU_FADE_IN_MS);
}

async function playBattleAt(idx) {
  if (!battleOrder) reshuffleBattle();
  const len = battleOrder.length;
  if (!len) return;
  // Reshuffle whenever we wrap past the end.
  if (idx >= len) reshuffleBattle();
  battleIdx = ((idx % len) + len) % len;
  const src = battleOrder[battleIdx];
  const el = getAudio(src, false);
  try { el.currentTime = 0; } catch {}
  el.onended = () => {
    if (currentEl !== el || currentKey !== "battle") return;
    playBattleAt(battleIdx + 1);
  };
  try {
    await el.play();
  } catch {
    pendingKey = "battle";
    return;
  }
  if (currentEl && currentEl !== el) fadeTo(currentEl, 0, SWAP_FADE_OUT_MS);
  currentEl = el;
  currentKey = "battle";
  fadeTo(el, effectiveVolume(), BATTLE_FADE_IN_MS);
  // Preload the NEXT track so the handoff at "ended" is gapless.
  preloadBattleAt(battleIdx + 1);
}

async function startTrack(key) {
  if (key === "menu") return startMenu();
  if (key === "battle") {
    if (!battleOrder) reshuffleBattle();
    return playBattleAt(battleIdx);
  }
}

function unlockOnGesture() {
  if (unlocked) return;
  unlocked = true;
  if (pendingKey) {
    const k = pendingKey;
    pendingKey = null;
    startTrack(k);
  } else if (currentEl) {
    currentEl.play?.().catch(() => {});
  }
}

if (typeof window !== "undefined") {
  const handler = () => {
    unlockOnGesture();
    window.removeEventListener("pointerdown", handler);
    window.removeEventListener("keydown", handler);
  };
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
    if (currentKey === "battle") playBattleAt(battleIdx + 1);
  },
};

export default bgMusic;
