/**
 * DEV Config System
 * Single source of truth for all developer-customizable UI values.
 *
 * Usage:
 *   import { getDevConfig, setDevConfig, resetDevConfig, subscribe } from './dev/devConfig.js';
 *
 *   // Read a value
 *   const { layout } = getDevConfig();
 *
 *   // Write (partial merge — only the keys you pass are updated)
 *   setDevConfig({ layout: { playerHero: { size: 140 } } });
 *
 *   // React to changes from any component
 *   useEffect(() => subscribe(() => forceUpdate()), []);
 *
 * Console access (always available in browser):
 *   window.__DEV__.getDevConfig()
 *   window.__DEV__.setDevConfig({ visual: { ambientParticles: false } })
 *   window.__DEV__.resetDevConfig()
 */

const STORAGE_KEY = "chronically_devConfig";

// ── Defaults ──────────────────────────────────────────────────────────────────
// All coordinates are % of screen width/height unless noted.
// Size values are px.
export const DEFAULT_DEV_CONFIG = {
  layout: {
    playerHero:           { x: 50,  y: 85, size: 120, width: 120, height: 120, scale: 1 },
    enemyHero:            { x: 50,  y: 8,  size: 120, width: 120, height: 120, scale: 1 },
    playerBattlefield:    { x: 0,   width: 100, y: 58, height: 22 },
    enemyBattlefield:     { x: 0,   width: 100, y: 28, height: 22 },
    playerHand:           { x: 50,  width: 100, y: 92, fanAngle: 6, spread: 1, cardScale: 1 },
    enemyHand:            { x: 50,  width: 100, y: 4,  fanAngle: 4, spread: 1, cardScale: 1 },
    endTurnBtn:           { x: 92,  y: 50, scale: 1 },
    auraIndicator:        { x: 92,  y: 60, scale: 1 },
    deckHandIndicator:    { x: 92,  y: 68, scale: 1 },
  },
  cardTemplate: {
    attackIcon:       "sword",    // "sword"|"fist"|"lightning"|"fire"|"claw"
    healthIcon:       "heart",    // "heart"|"shield"|"diamond"|"orb"|"cross"
    manaIcon:         "gem",      // "gem"|"star"|"crystal"|"coin"|"rune"
    attackColor:      "#c8860a",
    healthColor:      "#c0192c",
    manaColor:        "#1a6bb5",
    cardBorderStyle:  "default",  // "default"|"gold"|"arcane"|"fire"|"frost"
    nameFontSize:     13,
    descFontSize:     11,
    attackIconVariant: "default",
    healthIconVariant: "default",
    manaIconVariant:   "default",
    attackBadgeStyle:  "default",
    healthBadgeStyle:  "default",
    manaBadgeStyle:    "default",
    titleFontWeight:   700,
    descLineHeight:    1.5,
    borderRadius:      0.058, // relative to min(width,height) in current renderer
    frameInset:        0,
    artInset:          0,
    textPanelOpacity:  0.99,
    costBadgeScale:    1,
  },
  heroes: {
    player: { portraitUrl: null, name: "Player"     },
    enemy:  { portraitUrl: null, name: "AI Nemesis" },
  },
  visual: {
    showBattlefieldDivider: false,
    showZoneLabels:         false,
    ambientParticles:       true,
    cardIdleBreathing:      true,
    boardGradient:          true,
    zoneOutlineOpacity:     0.18,
    selectedOverlayGlow:    0.85,
    previewGrid:            false,
    snapToGrid:             false,
    boardScale:             1,
    boardPadding:           0,
    handLiftOnHover:        1,
    cardShadowStrength:     1,
  },
  presets: {
    layoutPreset:       "default",
    cardTemplatePreset: "default",
    visualPreset:       "default",
  },
};

// ── Deep merge ────────────────────────────────────────────────────────────────
// Recursively merges `patch` into `base`. Only plain-object nodes are merged;
// primitive values (strings, numbers, booleans, null) are replaced outright.
function deepMerge(base, patch) {
  if (patch === null || typeof patch !== "object" || Array.isArray(patch)) return patch;
  const result = { ...base };
  for (const key of Object.keys(patch)) {
    const bv = base[key];
    const pv = patch[key];
    result[key] =
      pv !== null && typeof pv === "object" && !Array.isArray(pv) &&
      bv !== null && typeof bv === "object" && !Array.isArray(bv)
        ? deepMerge(bv, pv)
        : pv;
  }
  return result;
}

// ── State ─────────────────────────────────────────────────────────────────────
function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return JSON.parse(JSON.stringify(DEFAULT_DEV_CONFIG));
    // Deep-merge saved values over defaults so newly-added keys always have fallbacks.
    return deepMerge(DEFAULT_DEV_CONFIG, JSON.parse(raw));
  } catch {
    return JSON.parse(JSON.stringify(DEFAULT_DEV_CONFIG));
  }
}

// Initialise once at module load time.
let _config = loadFromStorage();
const _listeners = new Set();

// ── Public API ────────────────────────────────────────────────────────────────

/** Returns a deep copy of the current config. */
export function getDevConfig() {
  return JSON.parse(JSON.stringify(_config));
}

/**
 * Deep-merges `partial` into the current config, persists to localStorage,
 * and notifies all subscribers.
 *
 * @param {Partial<typeof DEFAULT_DEV_CONFIG>} partial
 */
export function setDevConfig(partial) {
  if (!partial || typeof partial !== "object") return;
  _config = deepMerge(_config, partial);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(_config));
  } catch {
    // localStorage may be unavailable (private browsing, quota exceeded, etc.)
  }
  _notify();
}

/** Resets every value to DEFAULT_DEV_CONFIG, clears localStorage entry. */
export function resetDevConfig() {
  _config = JSON.parse(JSON.stringify(DEFAULT_DEV_CONFIG));
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
  _notify();
}

/**
 * Subscribe to config changes.
 * @param {() => void} callback  Called after every setDevConfig / resetDevConfig.
 * @returns {() => void}         Unsubscribe function.
 */
export function subscribe(callback) {
  _listeners.add(callback);
  return () => _listeners.delete(callback);
}

function _notify() {
  _listeners.forEach(fn => {
    try { fn(); } catch {}
  });
}

// ── Console access ────────────────────────────────────────────────────────────
if (typeof window !== "undefined") {
  window.__DEV__ = { getDevConfig, setDevConfig, resetDevConfig };
}
