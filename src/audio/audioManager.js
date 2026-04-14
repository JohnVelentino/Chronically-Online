/**
 * audioManager — HTMLAudioElement-based sound manager.
 *
 * Priority tiers (highest → lowest):
 *   voiceover > sfx > ambience > music
 *
 * Pool: 8 HTMLAudioElement slots shared across sfx/ambience/music.
 * Voiceover uses a dedicated element (never evicted).
 *
 * API:
 *   audioManager.play(soundKey)         — play a registered sound
 *   audioManager.duck(durationMs)       — duck ambience + music by 20% for durationMs
 *   audioManager.register(key, config)  — register a sound at runtime
 */

const TIER = { voiceover: 0, sfx: 1, ambience: 2, music: 3 };
const POOL_SIZE = 8;
const DUCK_AMOUNT = 0.2; // multiply volume by this when ducked

// ── Sound registry ────────────────────────────────────────────────────────────
// Pre-populate with known keys; callers can add more via register().
const registry = new Map();

/**
 * @param {string} key
 * @param {{ src: string, tier: keyof TIER, volume?: number, loop?: boolean }} config
 */
function register(key, config) {
  registry.set(key, {
    src: config.src,
    tier: config.tier ?? "sfx",
    volume: config.volume ?? 1,
    loop: config.loop ?? false,
  });
}

// ── HTMLAudioElement pool (shared by sfx / ambience / music) ──────────────────
const pool = Array.from({ length: POOL_SIZE }, () => {
  const el = new Audio();
  el._tier = null;
  el._key = null;
  return el;
});

// Dedicated voiceover element — never competes for pool slots.
const voiceoverEl = new Audio();
voiceoverEl._tier = "voiceover";
voiceoverEl._key = null;

// ── Duck state ────────────────────────────────────────────────────────────────
let duckTimer = null;
let isDucked = false;

function applyDuck() {
  pool.forEach((el) => {
    if (el._tier === "ambience" || el._tier === "music") {
      const def = el._key ? registry.get(el._key) : null;
      const base = def?.volume ?? 1;
      el.volume = Math.max(0, base * DUCK_AMOUNT);
    }
  });
}

function removeDuck() {
  pool.forEach((el) => {
    if (el._tier === "ambience" || el._tier === "music") {
      const def = el._key ? registry.get(el._key) : null;
      el.volume = def?.volume ?? 1;
    }
  });
}

function applyVoiceoverDuck() {
  pool.forEach((el) => {
    if (!el.paused) {
      const def = el._key ? registry.get(el._key) : null;
      const base = def?.volume ?? 1;
      el.volume = Math.max(0, base * DUCK_AMOUNT);
    }
  });
}

function removeVoiceoverDuck() {
  pool.forEach((el) => {
    if (!el.paused) {
      const def = el._key ? registry.get(el._key) : null;
      el.volume = def?.volume ?? 1;
    }
  });
}

// ── Pool slot selection ───────────────────────────────────────────────────────
/**
 * Returns the best available pool slot for a given tier.
 * Preference order:
 *   1. Empty (never used / finished playing)
 *   2. Lowest-priority playing slot (highest tier number)
 */
function acquireSlot(tier) {
  const tierNum = TIER[tier] ?? TIER.sfx;

  // 1. Prefer a silent slot.
  const silent = pool.find((el) => el.paused || el.ended);
  if (silent) return silent;

  // 2. Evict the lowest-priority active slot that is strictly lower priority
  //    than the incoming sound.
  let candidate = null;
  let candidateTier = -1;
  pool.forEach((el) => {
    const t = TIER[el._tier] ?? -1;
    if (t > tierNum && t > candidateTier) {
      candidate = el;
      candidateTier = t;
    }
  });
  if (candidate) {
    candidate.pause();
    return candidate;
  }

  // 3. All slots occupied by equal or higher priority — reuse oldest by
  //    cycling: find the slot whose src matches the same tier and has
  //    played the longest (currentTime is greatest relative to duration).
  let stalest = null;
  let stalestRatio = -1;
  pool.forEach((el) => {
    if ((TIER[el._tier] ?? -1) >= tierNum) {
      const ratio = el.duration > 0 ? el.currentTime / el.duration : 0;
      if (ratio > stalestRatio) {
        stalest = el;
        stalestRatio = ratio;
      }
    }
  });
  if (stalest) {
    stalest.pause();
    return stalest;
  }

  // Fallback: first slot.
  pool[0].pause();
  return pool[0];
}

// ── Core play logic ───────────────────────────────────────────────────────────
function playVoiceover(def, key) {
  // Interrupt any current voiceover.
  voiceoverEl.pause();
  voiceoverEl.currentTime = 0;
  voiceoverEl._key = key;
  voiceoverEl.src = def.src;
  voiceoverEl.volume = def.volume;
  voiceoverEl.loop = false;

  applyVoiceoverDuck();
  voiceoverEl.play().catch(() => {});

  voiceoverEl.onended = () => {
    removeVoiceoverDuck();
    voiceoverEl._key = null;
    voiceoverEl.onended = null;
  };
}

function playPooled(def, key) {
  const slot = acquireSlot(def.tier);
  slot._tier = def.tier;
  slot._key = key;
  slot.src = def.src;
  slot.loop = def.loop;

  // Apply ducked volume if currently ducked.
  if (isDucked && (def.tier === "ambience" || def.tier === "music")) {
    slot.volume = Math.max(0, def.volume * DUCK_AMOUNT);
  } else {
    slot.volume = def.volume;
  }

  slot.play().catch(() => {});
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Play a registered sound by key.
 * No-ops gracefully if the key is unknown or src is missing.
 */
function play(soundKey) {
  const def = registry.get(soundKey);
  if (!def || !def.src) return;

  if (def.tier === "voiceover") {
    playVoiceover(def, soundKey);
  } else {
    playPooled(def, soundKey);
  }
}

/**
 * Duck ambience and music by 20% for durationMs.
 * Calling again while ducked resets the timer (extends the duck window).
 * Used by HIGH-priority animation events.
 */
function duck(durationMs) {
  if (!isDucked) {
    isDucked = true;
    applyDuck();
  }

  clearTimeout(duckTimer);
  duckTimer = setTimeout(() => {
    isDucked = false;
    removeDuck();
    duckTimer = null;
  }, durationMs);
}

/**
 * Stop a specific key if it is currently playing.
 */
function stop(soundKey) {
  pool.forEach((el) => {
    if (el._key === soundKey) {
      el.pause();
      el.currentTime = 0;
      el._key = null;
      el._tier = null;
    }
  });
  if (voiceoverEl._key === soundKey) {
    voiceoverEl.pause();
    voiceoverEl.currentTime = 0;
    voiceoverEl._key = null;
  }
}

/**
 * Stop all sounds immediately.
 */
function stopAll() {
  pool.forEach((el) => { el.pause(); el.currentTime = 0; el._key = null; el._tier = null; });
  voiceoverEl.pause();
  voiceoverEl.currentTime = 0;
  voiceoverEl._key = null;
  clearTimeout(duckTimer);
  duckTimer = null;
  isDucked = false;
}

const audioManager = { play, duck, stop, stopAll, register };
export default audioManager;
