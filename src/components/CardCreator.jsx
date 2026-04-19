import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import HandCard from "./HandCard.jsx";
import TemplateCardFace from "./TemplateCardFace.jsx";
import {
  addCustomCard,
  buildDeckEntry,
  DECK_SIZE_TARGET,
  deleteLibraryCard,
  getCustomCards,
  getLib,
  HEROES,
  upsertLibraryCard,
  getHeroDeckIds,
  setHeroDeckIds,
  resetHeroDeckIds,
  getHeroPortraitOverride,
  setHeroPortraitOverride,
  resetHeroPortraitOverride,
} from "../data/cards.js";
import { mkUid } from "../engine/gameState.js";
import { getSFX } from "../audio/sfx.js";

// Full card preview rendered via portal ג€” appears right or left of the hovered row
const PREVIEW_W = 174;
const PREVIEW_H = 246;
const PREVIEW_GAP = 12;

function LibraryCardPreview({ card, anchorRect }) {
  if (!card || !anchorRect) return null;

  const spaceRight = window.innerWidth - anchorRect.right - PREVIEW_GAP;
  const useRight = spaceRight >= PREVIEW_W + 8;
  const left = useRight
    ? anchorRect.right + PREVIEW_GAP
    : anchorRect.left - PREVIEW_W - PREVIEW_GAP;

  // Vertically center on anchor row, clamp to viewport
  const rawTop = anchorRect.top + anchorRect.height / 2 - PREVIEW_H / 2;
  const top = Math.max(8, Math.min(rawTop, window.innerHeight - PREVIEW_H - 8));

  return createPortal(
    <AnimatePresence>
      <motion.div
        key={card.id}
        initial={{ opacity: 0, scale: 0.88, x: useRight ? -10 : 10 }}
        animate={{ opacity: 1, scale: 1, x: 0 }}
        exit={{ opacity: 0, scale: 0.88 }}
        transition={{ duration: 0.13, ease: "easeOut" }}
        style={{ position: "fixed", left, top, zIndex: 99999, pointerEvents: "none" }}
      >
        <HandCard card={{ ...card, uid: card.uid || card.id + "_prev" }} disabled={false} onClick={() => {}} />
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}

// Normalise class to lowercase key for tab comparison.
// Cards in data use "USA!", "Tech", "neutral", or undefined (also neutral).
function cardClassKey(card) {
  const raw = card.class;
  if (!raw || raw.toLowerCase() === "neutral") return "neutral";
  if (raw.toLowerCase().startsWith("usa")) return "usa";
  if (raw.toLowerCase().startsWith("tech")) return "tech";
  return raw.toLowerCase();
}

const LIB_TABS = [
  { id: "all",     label: "ALL" },
  { id: "usa",     label: "USA!" },
  { id: "tech",    label: "TECH" },
  { id: "neutral", label: "NEUTRAL" },
];

const INITIAL_FORM = {
  name: "",
  cost: 2,
  atk: 2,
  hp: 2,
  type: "minion",
  rarity: "common",
  frameVariant: "default",
  class: "neutral",
  art: "",
  image: "",
  imageName: "",
  artZoom: 1,
  artOffsetX: 0,
  artOffsetY: 0,
  emoji: "נ”¥",
  keywords: "",
  effectText: "",
  effectType: "",
  targetingMode: "none",
  effectParams: "{\"amount\":1}",
  triggers: "{}",
  primaryMechanic: "none",
  primaryAmount: 1,
  primaryAttackDelta: 1,
  primaryHealthDelta: 1,
  primaryScope: "target",
  battlecryMechanic: "none",
  battlecryAmount: 1,
  battlecryAttackDelta: 1,
  battlecryHealthDelta: 1,
  battlecryScope: "target",
  deathrattleMechanic: "none",
  deathrattleAmount: 1,
  deathrattleAttackDelta: 1,
  deathrattleHealthDelta: 1,
  deathrattleScope: "target",
  startTurnMechanic: "none",
  startTurnAmount: 1,
  startTurnAttackDelta: 1,
  startTurnHealthDelta: 1,
  startTurnScope: "self",
  endTurnMechanic: "none",
  endTurnAmount: 1,
  endTurnAttackDelta: 1,
  endTurnHealthDelta: 1,
  endTurnScope: "self",
};

const RARITY_OPTIONS = [
  { id: "common",    label: "Common",    color: "#5a6070" },
  { id: "rare",      label: "Rare",      color: "#378ADD" },
  { id: "epic",      label: "Epic",      color: "#9b59dd" },
  { id: "legendary", label: "Legendary", color: "#EF9F27" },
];

const CLASS_OPTIONS = [
  { id: "neutral", label: "Neutral",  color: "#5a6070" },
  { id: "USA!",    label: "USA!",     color: "#cc2222" },
  { id: "Tech",    label: "Tech",     color: "#00e6c8" },
];

const FORGE_KEYWORDS = [
  { id: "taunt",     label: "Taunt" },
  { id: "charge",    label: "Charge" },
  { id: "rush",      label: "Rush" },
  { id: "battlecry", label: "Battlecry" },
  { id: "elusive",   label: "Elusive" },
  { id: "deathrattle", label: "Deathrattle" },
];

const MECHANIC_OPTIONS = [
  { id: "none", label: "None" },
  { id: "damage", label: "Damage" },
  { id: "draw", label: "Draw Cards" },
  { id: "buff", label: "Buff (+X/+Y)" },
];

const SCOPE_OPTIONS = [
  { id: "target", label: "Selected Target" },
  { id: "enemyHero", label: "Enemy Hero" },
  { id: "selfHero", label: "Your Hero" },
  { id: "enemyMinions", label: "All Enemy Minions" },
  { id: "allEnemies", label: "All Enemies" },
  { id: "friendlyMinions", label: "All Friendly Minions" },
  { id: "allMinions", label: "All Minions" },
  { id: "self", label: "This Minion" },
];

const inp = { background: "#060c18", border: "1px solid #1e3a5a", borderRadius: 6, color: "#ccd", padding: "7px 10px", fontSize: 13, width: "100%", boxSizing: "border-box", outline: "none" };
const lbl = { fontSize: 10, color: "#556", marginBottom: 5, display: "block", textTransform: "uppercase", letterSpacing: 0.8, fontWeight: 700 };
const sectionHdr = { fontSize: 9, color: "#378ADD", fontWeight: 900, letterSpacing: 2, textTransform: "uppercase", marginBottom: 8, paddingBottom: 4, borderBottom: "1px solid #0d1e30" };

// ── Hero Dev Tab ─────────────────────────────────────────────────────────────
// Edit hero portraits and prebuilt decks. Saves to localStorage; read by
// getHeroDeckIds / getHeroPortraitOverride at game start.

function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function HeroDevTabSection() {
  const lib = useMemo(() => getLib(), []);
  const cardById = useMemo(() => {
    const m = new Map();
    lib.forEach(c => m.set(c.id, c));
    return m;
  }, [lib]);

  const [selectedHeroId, setSelectedHeroId] = useState(HEROES[0]?.id || null);
  const [portraits, setPortraits] = useState(() => {
    const out = {};
    HEROES.forEach(h => { out[h.id] = getHeroPortraitOverride(h.id) || h.portrait || null; });
    return out;
  });
  const [decks, setDecks] = useState(() => {
    const out = {};
    HEROES.forEach(h => { out[h.id] = getHeroDeckIds(h.id); });
    return out;
  });
  const [cardSearch, setCardSearch] = useState("");
  const [classFilter, setClassFilter] = useState("all");

  const hero = HEROES.find(h => h.id === selectedHeroId) || HEROES[0];
  const heroDeck = useMemo(() => decks[hero.id] || [], [decks, hero.id]);
  const fileInputRef = useRef(null);

  async function handlePortraitFile(file) {
    if (!file) return;
    try {
      const url = await readFileAsDataURL(file);
      setHeroPortraitOverride(hero.id, url);
      setPortraits(p => ({ ...p, [hero.id]: url }));
    } catch (err) {
      console.error("portrait upload failed", err);
    }
  }

  function onPortraitReset() {
    resetHeroPortraitOverride(hero.id);
    setPortraits(p => ({ ...p, [hero.id]: hero.portrait || null }));
  }

  function addCardToDeck(cardId) {
    if (heroDeck.length >= DECK_SIZE_TARGET) return;
    const next = [...heroDeck, cardId];
    setHeroDeckIds(hero.id, next);
    setDecks(d => ({ ...d, [hero.id]: next }));
    getSFX().cardSelect();
  }

  function removeCardFromDeck(idx) {
    const next = heroDeck.filter((_, i) => i !== idx);
    setHeroDeckIds(hero.id, next);
    setDecks(d => ({ ...d, [hero.id]: next }));
  }

  function resetDeck() {
    resetHeroDeckIds(hero.id);
    const fallback = HEROES.find(h => h.id === hero.id)?.deckIds || [];
    setDecks(d => ({ ...d, [hero.id]: [...fallback] }));
  }

  // Deck stats
  const deckStats = useMemo(() => {
    const curve = [0, 0, 0, 0, 0, 0, 0, 0]; // 0..7+
    let minions = 0, spells = 0;
    heroDeck.forEach(id => {
      const c = cardById.get(id);
      if (!c) return;
      const bucket = Math.min(7, Math.max(0, c.cost || 0));
      curve[bucket]++;
      if (c.type === "spell") spells++; else minions++;
    });
    return { curve, minions, spells, total: heroDeck.length };
  }, [heroDeck, cardById]);

  // Card picker filter
  const pickerCards = useMemo(() => {
    const q = cardSearch.trim().toLowerCase();
    return lib.filter(c => {
      if (classFilter !== "all") {
        const ck = (c.class || "neutral").toLowerCase();
        if (classFilter === "neutral" && ck !== "neutral") return false;
        if (classFilter === "usa" && !ck.startsWith("usa")) return false;
        if (classFilter === "tech" && !ck.startsWith("tech")) return false;
      }
      if (!q) return true;
      return (c.name || "").toLowerCase().includes(q) || (c.id || "").toLowerCase().includes(q);
    }).sort((a, b) => (a.cost || 0) - (b.cost || 0) || a.name.localeCompare(b.name));
  }, [lib, cardSearch, classFilter]);

  const portraitSrc = portraits[hero.id] || null;
  const hasPortraitOverride = !!getHeroPortraitOverride(hero.id);
  const defaultDeckIds = HEROES.find(h => h.id === hero.id)?.deckIds || [];
  const hasDeckOverride = JSON.stringify(defaultDeckIds) !== JSON.stringify(heroDeck);

  return (
    <div style={{ maxWidth: 1180, margin: "0 auto", display: "grid", gridTemplateColumns: "220px 1fr 320px", gap: 16 }}>
      {/* ── Hero list ── */}
      <div style={{ border: "1px solid #1e3a5a", background: "#060c18", borderRadius: 10, padding: 10, display: "flex", flexDirection: "column", gap: 6, height: "fit-content" }}>
        <div style={sectionHdr}>Heroes</div>
        {HEROES.map(h => {
          const active = h.id === hero.id;
          const portrait = portraits[h.id];
          return (
            <button
              key={h.id}
              onClick={() => setSelectedHeroId(h.id)}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                textAlign: "left", padding: 8,
                background: active ? "#0c1a31" : "#07101d",
                border: active ? "1px solid #378ADD" : "1px solid #102034",
                borderRadius: 8,
                cursor: "pointer",
              }}
            >
              <div style={{ width: 42, height: 42, borderRadius: 8, overflow: "hidden", border: "1px solid #1e3a5a", background: "#040810", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>
                {portrait ? (
                  <img src={portrait} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={(e) => { e.currentTarget.style.display = "none"; }} />
                ) : (h.emoji || "?")}
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 900, color: active ? "#cfe4ff" : "#aab5c6", letterSpacing: 0.4 }}>{h.name}</div>
                <div style={{ fontSize: 10, color: "#667790", letterSpacing: 0.4 }}>{h.class || "Neutral"} · {(decks[h.id] || []).length}/{DECK_SIZE_TARGET}</div>
              </div>
            </button>
          );
        })}
      </div>

      {/* ── Hero editor panel ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {/* Portrait editor */}
        <div style={{ border: "1px solid #1e3a5a", background: "#060c18", borderRadius: 10, padding: 14 }}>
          <div style={sectionHdr}>Portrait — {hero.name}</div>
          <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
            <div style={{ width: 140, height: 180, borderRadius: 12, overflow: "hidden", border: "2px solid #1e3a5a", background: "#040810", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 64, flexShrink: 0 }}>
              {portraitSrc ? (
                <img src={portraitSrc} alt={hero.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (hero.emoji || "?")}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={e => { const f = e.target.files?.[0]; if (f) handlePortraitFile(f); e.target.value = ""; }}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                style={{ background: "linear-gradient(135deg,#0d2f5c,#1a4a8a)", border: "1px solid #2f5f92", color: "#dcecff", padding: "10px 16px", borderRadius: 8, fontSize: 13, fontWeight: 800, cursor: "pointer", letterSpacing: 0.5 }}
              >
                Upload image
              </button>
              <button
                onClick={onPortraitReset}
                disabled={!hasPortraitOverride}
                style={{ background: "transparent", border: "1px solid #3a1e1e", color: hasPortraitOverride ? "#e2a4a4" : "#445", padding: "8px 14px", borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: hasPortraitOverride ? "pointer" : "not-allowed", letterSpacing: 0.4 }}
              >
                Reset to default
              </button>
              <div style={{ fontSize: 10, color: "#556", lineHeight: 1.4 }}>
                Stored per-hero in localStorage. Applies to HeroSelect, in-match portrait, and AI when the same hero is picked as opponent.
              </div>
            </div>
          </div>
        </div>

        {/* Prebuilt deck editor */}
        <div style={{ border: "1px solid #1e3a5a", background: "#060c18", borderRadius: 10, padding: 14 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={sectionHdr}>Prebuilt Deck — {hero.name} · {heroDeck.length}/{DECK_SIZE_TARGET}</div>
            <button
              onClick={resetDeck}
              disabled={!hasDeckOverride}
              style={{ background: "transparent", border: "1px solid #3a1e1e", color: hasDeckOverride ? "#e2a4a4" : "#334", padding: "5px 11px", borderRadius: 6, fontSize: 10, fontWeight: 700, cursor: hasDeckOverride ? "pointer" : "not-allowed", letterSpacing: 0.5 }}
            >
              Reset deck
            </button>
          </div>

          {/* Mana curve */}
          <div style={{ display: "flex", gap: 3, alignItems: "flex-end", height: 48, marginBottom: 10, padding: "4px 0", background: "#040810", borderRadius: 6, border: "1px solid #0d1e30" }}>
            {deckStats.curve.map((n, i) => {
              const max = Math.max(1, ...deckStats.curve);
              const h = Math.max(3, Math.round((n / max) * 40));
              return (
                <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                  <div style={{ fontSize: 9, color: "#85B7EB", fontWeight: 800 }}>{n || ""}</div>
                  <div style={{ width: "70%", height: h, background: "linear-gradient(0deg,#1a4a8a,#378ADD)", borderRadius: 2 }} />
                  <div style={{ fontSize: 9, color: "#556" }}>{i === 7 ? "7+" : i}</div>
                </div>
              );
            })}
          </div>
          <div style={{ fontSize: 10, color: "#667", marginBottom: 8 }}>
            Minions: <span style={{ color: "#e2c48a" }}>{deckStats.minions}</span> · Spells: <span style={{ color: "#85B7EB" }}>{deckStats.spells}</span>
          </div>

          {/* Deck list */}
          <div style={{ maxHeight: 320, overflowY: "auto", display: "flex", flexDirection: "column", gap: 3, border: "1px solid #0d1e30", borderRadius: 6, padding: 6, background: "#040810" }}>
            {heroDeck.length === 0 && <div style={{ fontSize: 12, color: "#445", padding: 8, textAlign: "center" }}>Deck is empty.</div>}
            {heroDeck.map((cid, idx) => {
              const c = cardById.get(cid);
              const rar = c?.rarity || "common";
              const rarColor = rar === "legendary" ? "#EF9F27" : rar === "epic" ? "#9b59dd" : rar === "rare" ? "#378ADD" : "#5a6070";
              return (
                <div key={`${cid}_${idx}`} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 7px", background: "#07101d", borderRadius: 4, border: "1px solid #0d1e30" }}>
                  <div style={{ width: 22, height: 22, borderRadius: "50%", background: "#0a1830", border: "1px solid #378ADD", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 900, color: "#85B7EB", flexShrink: 0 }}>{c?.cost ?? "?"}</div>
                  <div style={{ fontSize: 15, flexShrink: 0 }}>{c?.emoji || "🃏"}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: c ? "#d0dae8" : "#663", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c?.name || `[missing: ${cid}]`}</div>
                    <div style={{ fontSize: 9, color: rarColor, letterSpacing: 0.5, textTransform: "uppercase", fontWeight: 800 }}>{rar}{c?.type === "spell" ? " · spell" : ""}{c?.class && c.class !== "neutral" ? ` · ${c.class}` : ""}</div>
                  </div>
                  <button
                    onClick={() => removeCardFromDeck(idx)}
                    style={{ background: "transparent", border: "1px solid #3a1e1e", color: "#c56b6b", borderRadius: 4, padding: "2px 8px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}
                  >
                    ✕
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Card picker ── */}
      <div style={{ border: "1px solid #1e3a5a", background: "#060c18", borderRadius: 10, padding: 10, display: "flex", flexDirection: "column", gap: 8, height: "fit-content" }}>
        <div style={sectionHdr}>Add Cards</div>
        <input
          style={inp}
          placeholder="Search cards..."
          value={cardSearch}
          onChange={e => setCardSearch(e.target.value)}
        />
        <div style={{ display: "flex", gap: 4 }}>
          {[
            { id: "all", label: "All" },
            { id: "usa", label: "USA!" },
            { id: "tech", label: "Tech" },
            { id: "neutral", label: "Neutral" },
          ].map(opt => (
            <button
              key={opt.id}
              onClick={() => setClassFilter(opt.id)}
              style={{
                flex: 1,
                background: classFilter === opt.id ? "#0c1a31" : "transparent",
                border: classFilter === opt.id ? "1px solid #378ADD" : "1px solid #102034",
                color: classFilter === opt.id ? "#85B7EB" : "#556",
                padding: "5px 0", fontSize: 10, fontWeight: 800, cursor: "pointer", borderRadius: 5, letterSpacing: 0.5,
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <div style={{ maxHeight: 520, overflowY: "auto", display: "flex", flexDirection: "column", gap: 3, border: "1px solid #0d1e30", borderRadius: 6, padding: 5, background: "#040810" }}>
          {pickerCards.length === 0 && <div style={{ fontSize: 11, color: "#445", padding: 8, textAlign: "center" }}>No matches.</div>}
          {pickerCards.map(c => {
            const disabled = heroDeck.length >= DECK_SIZE_TARGET;
            const rar = c.rarity || "common";
            const rarColor = rar === "legendary" ? "#EF9F27" : rar === "epic" ? "#9b59dd" : rar === "rare" ? "#378ADD" : "#5a6070";
            return (
              <button
                key={c.id}
                onClick={() => addCardToDeck(c.id)}
                disabled={disabled}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  background: "#07101d",
                  border: "1px solid #0d1e30",
                  color: "#ccd",
                  borderRadius: 4, padding: "4px 6px", fontSize: 11, fontWeight: 600,
                  cursor: disabled ? "not-allowed" : "pointer",
                  opacity: disabled ? 0.4 : 1,
                  textAlign: "left",
                }}
              >
                <div style={{ width: 18, height: 18, borderRadius: "50%", background: "#0a1830", border: "1px solid #378ADD", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 900, color: "#85B7EB", flexShrink: 0 }}>{c.cost ?? "?"}</div>
                <div style={{ fontSize: 13, flexShrink: 0 }}>{c.emoji || "🃏"}</div>
                <div style={{ flex: 1, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.name}</div>
                <div style={{ fontSize: 9, color: rarColor, fontWeight: 900, textTransform: "uppercase", letterSpacing: 0.4 }}>{rar[0]}</div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function parseJsonSafe(raw, label) {
  try {
    return { ok: true, value: raw?.trim() ? JSON.parse(raw) : {} };
  } catch {
    return { ok: false, error: `${label} must be valid JSON.` };
  }
}

function firstTriggerAction(card, hook) {
  const cfg = card?.triggers?.[hook] || card?.effectConfig?.[hook];
  if (!cfg) return null;
  return Array.isArray(cfg) ? cfg[0] : cfg;
}

function deriveMechanicFromAction(action, fallbackScope = "target") {
  if (!action) return { mechanic: "none", amount: 1, attackDelta: 1, healthDelta: 1, scope: fallbackScope };
  if (action.type === "draw_cards") return { mechanic: "draw", amount: action.amount ?? 1, attackDelta: 1, healthDelta: 1, scope: "selfHero" };
  if (action.type === "buff_minion") {
    const scope = action.targetIdFrom === "self" ? "self" : "target";
    return {
      mechanic: "buff",
      amount: 1,
      attackDelta: action.attackDelta ?? 1,
      healthDelta: action.healthDelta ?? 1,
      scope,
    };
  }
  if (action.type === "deal_damage_all") {
    const map = {
      enemy_minions: "enemyMinions",
      all_enemies: "allEnemies",
      friendly_minions: "friendlyMinions",
      all_minions: "allMinions",
    };
    return { mechanic: "damage", amount: action.amount ?? 1, attackDelta: 1, healthDelta: 1, scope: map[action.targetGroup] || "enemyMinions" };
  }
  if (action.type === "damage_hero") {
    const scope = action.target === "self" ? "selfHero" : "enemyHero";
    return { mechanic: "damage", amount: action.amount ?? 1, attackDelta: 1, healthDelta: 1, scope };
  }
  if (action.type === "deal_damage") return { mechanic: "damage", amount: action.amount ?? 1, attackDelta: 1, healthDelta: 1, scope: "target" };
  return { mechanic: "none", amount: 1, attackDelta: 1, healthDelta: 1, scope: fallbackScope };
}

export default function CardCreator({ onClose, savedDecks = [], onSavedDecksChange, activeDeck, onSelectDeck }) {
  const [tab, setTab] = useState("forge");
  const [forgeMode, setForgeMode] = useState(null); // null | "create" | "edit"
  const [libTab, setLibTab] = useState("all");
  const [f, setF] = useState(INITIAL_FORM);
  const [customs, setCustoms] = useState(getCustomCards());
  const [editingId, setEditingId] = useState(null);
  const [editSearch, setEditSearch] = useState("");
  const [forgeError, setForgeError] = useState("");
  const [deckName, setDeckName] = useState("");
  const [deckCards, setDeckCards] = useState([]);
  const [editingDeckId, setEditingDeckId] = useState(null);
  const [deckSearch, setDeckSearch] = useState("");
  const [hovLibCard, setHovLibCard] = useState(null); // { card, rect }
  const fileRef = useRef(null);

  const setField = (k, v) => setF(x => ({ ...x, [k]: v }));
  const keywordsList = useMemo(() => (f.keywords || "").split(",").map(s => s.trim()).filter(Boolean), [f.keywords]);

  function toggleKeyword(kw) {
    const has = keywordsList.includes(kw);
    setField("keywords", has
      ? keywordsList.filter(k => k !== kw).join(", ")
      : [...keywordsList, kw].join(", ")
    );
  }

  function renderMechanicControls(prefix, label) {
    const mechanicKey = `${prefix}Mechanic`;
    const amountKey = `${prefix}Amount`;
    const attackKey = `${prefix}AttackDelta`;
    const healthKey = `${prefix}HealthDelta`;
    const scopeKey = `${prefix}Scope`;
    const mechanic = f[mechanicKey];
    return (
      <div style={{ border: "1px solid #102034", borderRadius: 8, padding: 8, background: "#050d19" }}>
        <div style={{ ...lbl, marginBottom: 6 }}>{label}</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <select style={inp} value={mechanic} onChange={e => setField(mechanicKey, e.target.value)}>
            {MECHANIC_OPTIONS.map(opt => <option key={opt.id} value={opt.id}>{opt.label}</option>)}
          </select>
          <select style={inp} value={f[scopeKey]} onChange={e => setField(scopeKey, e.target.value)}>
            {SCOPE_OPTIONS.map(opt => <option key={opt.id} value={opt.id}>{opt.label}</option>)}
          </select>
        </div>
        {(mechanic === "damage" || mechanic === "draw") && (
          <div style={{ marginTop: 8 }}>
            <input type="number" min={1} max={20} style={inp} value={f[amountKey]} onChange={e => setField(amountKey, e.target.value)} placeholder="Amount" />
          </div>
        )}
        {mechanic === "buff" && (
          <div style={{ marginTop: 8, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <input type="number" min={-20} max={20} style={inp} value={f[attackKey]} onChange={e => setField(attackKey, e.target.value)} placeholder="Attack ־”" />
            <input type="number" min={-20} max={20} style={inp} value={f[healthKey]} onChange={e => setField(healthKey, e.target.value)} placeholder="Health ־”" />
          </div>
        )}
      </div>
    );
  }

  const allCards = getLib();
  const filteredLib = allCards.filter(c => {
    const matchesSearch = !deckSearch || c.name.toLowerCase().includes(deckSearch.toLowerCase());
    const matchesTab = libTab === "all" || cardClassKey(c) === libTab;
    return matchesSearch && matchesTab;
  });
  const editCards = allCards.filter(c =>
    !editSearch || c.name.toLowerCase().includes(editSearch.toLowerCase())
  );

  function resetForm() {
    setF(INITIAL_FORM);
    setEditingId(null);
    setForgeError("");
  }

  function handleImageUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setF(x => ({ ...x, image: ev.target.result, art: ev.target.result, imageName: file.name }));
    reader.readAsDataURL(file);
  }

  function saveCard() {
    if (!f.name.trim()) return;
    if (forgeMode === "edit" && !editingId) {
      setForgeError("Select a card to edit first.");
      return;
    }
    const amount = (v, fallback = 1) => {
      const n = Number(v);
      return Number.isFinite(n) ? n : fallback;
    };
    const primaryParams = {};
    let effectType = "";
    if (f.primaryMechanic === "damage") {
      if (f.primaryScope === "target") effectType = "damage_target";
      else if (f.primaryScope === "enemyMinions") effectType = "damage_all_enemy_minions";
      else if (f.primaryScope === "allEnemies") effectType = "damage_all_enemies";
      else if (f.primaryScope === "enemyHero" || f.primaryScope === "selfHero") effectType = "damage_target";
      primaryParams.amount = amount(f.primaryAmount);
    } else if (f.primaryMechanic === "draw") {
      effectType = "draw_cards";
      primaryParams.amount = amount(f.primaryAmount);
    } else if (f.primaryMechanic === "buff") {
      effectType = "buff_friendly_minion";
      primaryParams.attackDelta = amount(f.primaryAttackDelta, 0);
      primaryParams.healthDelta = amount(f.primaryHealthDelta, 0);
      primaryParams.duration = "permanent";
    }

    const buildTriggerAction = (mechanic, scope, rawAmount, rawAtk, rawHp) => {
      if (mechanic === "draw") return { type: "draw_cards", amount: amount(rawAmount) };
      if (mechanic === "buff") {
        return {
          type: "buff_minion",
          attackDelta: amount(rawAtk, 0),
          healthDelta: amount(rawHp, 0),
          targetIdFrom: scope === "self" ? "self" : "input_target",
          duration: "permanent",
        };
      }
      if (mechanic === "damage") {
        if (scope === "enemyMinions") return { type: "deal_damage_all", targetGroup: "enemy_minions", amount: amount(rawAmount) };
        if (scope === "allEnemies") return { type: "deal_damage_all", targetGroup: "all_enemies", amount: amount(rawAmount) };
        if (scope === "friendlyMinions") return { type: "deal_damage_all", targetGroup: "friendly_minions", amount: amount(rawAmount) };
        if (scope === "allMinions") return { type: "deal_damage_all", targetGroup: "all_minions", amount: amount(rawAmount) };
        if (scope === "enemyHero") return { type: "damage_hero", target: "enemy", amount: amount(rawAmount) };
        if (scope === "selfHero") return { type: "damage_hero", target: "self", amount: amount(rawAmount) };
        return { type: "deal_damage", targetIdFrom: "input_target", amount: amount(rawAmount) };
      }
      return null;
    };

    const triggers = {};
    const battlecryAction = buildTriggerAction(f.battlecryMechanic, f.battlecryScope, f.battlecryAmount, f.battlecryAttackDelta, f.battlecryHealthDelta);
    const deathrattleAction = buildTriggerAction(f.deathrattleMechanic, f.deathrattleScope, f.deathrattleAmount, f.deathrattleAttackDelta, f.deathrattleHealthDelta);
    const startTurnAction = buildTriggerAction(f.startTurnMechanic, f.startTurnScope, f.startTurnAmount, f.startTurnAttackDelta, f.startTurnHealthDelta);
    const endTurnAction = buildTriggerAction(f.endTurnMechanic, f.endTurnScope, f.endTurnAmount, f.endTurnAttackDelta, f.endTurnHealthDelta);
    if (battlecryAction) triggers.battlecry = battlecryAction;
    if (deathrattleAction) triggers.on_death = deathrattleAction;
    if (startTurnAction) triggers.start_of_turn = startTurnAction;
    if (endTurnAction) triggers.end_of_turn = endTurnAction;

    let nextKeywords = [...keywordsList];
    const syncKeyword = (kw, enabled) => {
      const has = nextKeywords.includes(kw);
      if (enabled && !has) nextKeywords.push(kw);
      if (!enabled && has) nextKeywords = nextKeywords.filter(k => k !== kw);
    };
    syncKeyword("battlecry", !!battlecryAction);
    syncKeyword("deathrattle", !!deathrattleAction);

    setForgeError("");
    const existing = editingId ? customs.find(c => c.id === editingId) : null;
    const card = {
      ...f,
      id: editingId || "c" + Date.now(),
      cost: +f.cost,
      atk: +f.atk,
      hp: +f.hp,
      attack: +f.atk,
      health: +f.hp,
      art: f.art || f.image || "",
      keywords: nextKeywords,
      effectText: f.effectText || "",
      text: f.effectText || "",
      desc: f.effectText || "",
      effectType,
      effectParams: primaryParams,
      targetingMode: f.targetingMode || "none",
      targetType: f.targetingMode || "none",
      triggers,
      effectConfig: triggers,
      uid: existing?.uid || mkUid(),
    };
    if (forgeMode === "edit" && editingId) {
      upsertLibraryCard(card);
    } else {
      addCustomCard(card);
    }
    setCustoms(getCustomCards());
    getSFX().cardPlay();
    if (forgeMode === "create") resetForm();
  }

  function editCard(card) {
    const primaryAction = card.effectType
      ? { type: card.effectType, ...(card.effectParams || {}) }
      : null;
    const primaryDerived = (() => {
      if (!primaryAction) return { mechanic: "none", amount: 1, attackDelta: 1, healthDelta: 1, scope: "target" };
      if (primaryAction.type === "draw_cards") return { mechanic: "draw", amount: primaryAction.amount ?? 1, attackDelta: 1, healthDelta: 1, scope: "selfHero" };
      if (primaryAction.type === "buff_friendly_minion") return { mechanic: "buff", amount: 1, attackDelta: primaryAction.attackDelta ?? 1, healthDelta: primaryAction.healthDelta ?? 1, scope: "target" };
      if (primaryAction.type === "damage_all_enemy_minions") return { mechanic: "damage", amount: primaryAction.amount ?? 1, attackDelta: 1, healthDelta: 1, scope: "enemyMinions" };
      if (primaryAction.type === "damage_all_enemies") return { mechanic: "damage", amount: primaryAction.amount ?? 1, attackDelta: 1, healthDelta: 1, scope: "allEnemies" };
      if (primaryAction.type === "damage_target") return { mechanic: "damage", amount: primaryAction.amount ?? 1, attackDelta: 1, healthDelta: 1, scope: "target" };
      return { mechanic: "none", amount: 1, attackDelta: 1, healthDelta: 1, scope: "target" };
    })();
    const battlecryDerived = deriveMechanicFromAction(firstTriggerAction(card, "battlecry"), "target");
    const deathrattleDerived = deriveMechanicFromAction(firstTriggerAction(card, "on_death"), "target");
    const startTurnDerived = deriveMechanicFromAction(firstTriggerAction(card, "start_of_turn"), "self");
    const endTurnDerived = deriveMechanicFromAction(firstTriggerAction(card, "end_of_turn"), "self");

    setForgeMode("edit");
    setEditingId(card.id);
    setF({
      ...INITIAL_FORM,
      name: card.name || "",
      cost: card.cost ?? 0,
      atk: card.atk ?? card.attack ?? 0,
      hp: card.hp ?? card.health ?? 1,
      type: card.type || "minion",
      rarity: card.rarity || "common",
      frameVariant: card.frameVariant || "",
      class: card.class || "neutral",
      art: card.art || card.image || "",
      image: card.image || card.art || "",
      imageName: "",
      artZoom: card.artZoom ?? 1,
      artOffsetX: card.artOffsetX ?? 0,
      artOffsetY: card.artOffsetY ?? 0,
      emoji: card.emoji || "נ”¥",
      keywords: (card.keywords || []).join(", "),
      effectText: card.effectText || card.desc || "",
      effectType: card.effectType || "",
      targetingMode: card.targetingMode || card.targetType || "none",
      effectParams: JSON.stringify(card.effectParams || {}, null, 0),
      triggers: JSON.stringify(card.triggers || card.effectConfig || {}, null, 0),
      primaryMechanic: primaryDerived.mechanic,
      primaryAmount: primaryDerived.amount,
      primaryAttackDelta: primaryDerived.attackDelta,
      primaryHealthDelta: primaryDerived.healthDelta,
      primaryScope: primaryDerived.scope,
      battlecryMechanic: battlecryDerived.mechanic,
      battlecryAmount: battlecryDerived.amount,
      battlecryAttackDelta: battlecryDerived.attackDelta,
      battlecryHealthDelta: battlecryDerived.healthDelta,
      battlecryScope: battlecryDerived.scope,
      deathrattleMechanic: deathrattleDerived.mechanic,
      deathrattleAmount: deathrattleDerived.amount,
      deathrattleAttackDelta: deathrattleDerived.attackDelta,
      deathrattleHealthDelta: deathrattleDerived.healthDelta,
      deathrattleScope: deathrattleDerived.scope,
      startTurnMechanic: startTurnDerived.mechanic,
      startTurnAmount: startTurnDerived.amount,
      startTurnAttackDelta: startTurnDerived.attackDelta,
      startTurnHealthDelta: startTurnDerived.healthDelta,
      startTurnScope: startTurnDerived.scope,
      endTurnMechanic: endTurnDerived.mechanic,
      endTurnAmount: endTurnDerived.amount,
      endTurnAttackDelta: endTurnDerived.attackDelta,
      endTurnHealthDelta: endTurnDerived.healthDelta,
      endTurnScope: endTurnDerived.scope,
    });
    setForgeError("");
    setTab("forge");
  }

  function deleteCard(id) {
    const confirmed = window.confirm("Delete this card permanently?");
    if (!confirmed) return;
    deleteLibraryCard(id);
    setCustoms(getCustomCards());
    if (editingId === id) resetForm();
  }

  function duplicateCard(card) {
    const clone = { ...card, id: "c" + Date.now(), uid: mkUid(), name: `${card.name} Copy` };
    addCustomCard(clone);
    setCustoms(getCustomCards());
    getSFX().cardPlay();
  }

  function countInDeck(id) {
    return deckCards.filter(c => c === id).length;
  }

  function addToDeck(id) {
    if (deckCards.length >= DECK_SIZE_TARGET || countInDeck(id) >= 2) return;
    setDeckCards(prev => [...prev, id]);
  }

  function removeFromDeck(index) {
    setDeckCards(prev => prev.filter((_, i) => i !== index));
  }

  function loadDeckForEdit(deck) {
    if (!deck) return;
    setDeckName(deck.name || "");
    setDeckCards([...(deck.cardIds || [])]);
    setEditingDeckId(deck.id || null);
    onSelectDeck?.(deck);
  }

  function saveDeck() {
    if (!deckCards.length) return;
    const base = buildDeckEntry(deckName || "My Deck", [...deckCards]);
    const deckToSave = editingDeckId ? { ...base, id: editingDeckId } : base;
    const next = editingDeckId
      ? savedDecks.map(d => (d.id === editingDeckId ? deckToSave : d))
      : [...savedDecks, deckToSave];
    onSavedDecksChange?.(next);
    onSelectDeck?.(deckToSave);
    setEditingDeckId(deckToSave.id);
    getSFX().cardPlay();
  }

  const preview = {
    ...f,
    uid: "preview",
    cost: +f.cost,
    atk: +f.atk,
    hp: +f.hp,
    art: f.art || f.image,
    desc: f.effectText,
    effectText: f.effectText,
    keywords: keywordsList,
  };
  const forgePreviewW = 196;
  const forgePreviewH = 286;

  useEffect(() => {
    if (!activeDeck) return;
    setDeckName(activeDeck.name || "");
    setDeckCards([...(activeDeck.cardIds || [])]);
    setEditingDeckId(activeDeck.id || null);
  }, [activeDeck]);

  return (
    <div style={{ position: "absolute", inset: 0, background: "rgba(2,5,12,0.98)", zIndex: 1000, overflowY: "auto", boxSizing: "border-box", display: "flex", flexDirection: "column" }}>
      <div style={{ background: "#060c18", borderBottom: "1px solid #0d1e30", padding: "14px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
        <div style={{ fontSize: 20, fontWeight: 900, color: "#FAC775", letterSpacing: 1 }}>CARD FORGER</div>
        <button onClick={onClose} style={{ background: "transparent", border: "1px solid #1e3050", color: "#445", borderRadius: 8, padding: "8px 18px", cursor: "pointer", fontSize: 12, fontWeight: 700 }}>Close</button>
      </div>
      <div style={{ background: "#04080f", borderBottom: "1px solid #0d1e30", display: "flex", flexShrink: 0 }}>
        <button onClick={() => setTab("forge")} style={{ background: tab === "forge" ? "linear-gradient(135deg,#0d1e38,#1a3a64)" : "transparent", border: "none", borderBottom: tab === "forge" ? "2px solid #378ADD" : "2px solid transparent", color: tab === "forge" ? "#85B7EB" : "#445", padding: "10px 20px", fontSize: 12, fontWeight: 900, cursor: "pointer" }}>Forge</button>
        <button onClick={() => setTab("deck")} style={{ background: tab === "deck" ? "linear-gradient(135deg,#0d1e38,#1a3a64)" : "transparent", border: "none", borderBottom: tab === "deck" ? "2px solid #378ADD" : "2px solid transparent", color: tab === "deck" ? "#85B7EB" : "#445", padding: "10px 20px", fontSize: 12, fontWeight: 900, cursor: "pointer" }}>Deck Builder</button>
        <button onClick={() => setTab("heroes")} style={{ background: tab === "heroes" ? "linear-gradient(135deg,#1a1200,#3a2800)" : "transparent", border: "none", borderBottom: tab === "heroes" ? "2px solid #EF9F27" : "2px solid transparent", color: tab === "heroes" ? "#EF9F27" : "#445", padding: "10px 20px", fontSize: 12, fontWeight: 900, cursor: "pointer", letterSpacing: 0.5 }}>Heroes ★</button>
      </div>

      <div style={{ flex: 1, padding: 24, overflowY: "auto" }}>
        {tab === "heroes" && <HeroDevTabSection />}

        {tab === "forge" && forgeMode === null && (
          <div style={{ maxWidth: 760, margin: "40px auto 0", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <button
              onClick={() => { setForgeMode("create"); resetForm(); }}
              style={{ background: "linear-gradient(135deg,#0d2f5c,#1a4a8a)", border: "1px solid #2f5f92", borderRadius: 12, color: "#dcecff", padding: "18px 14px", cursor: "pointer", fontSize: 14, fontWeight: 900, letterSpacing: 0.6 }}
            >
              Create New
            </button>
            <button
              onClick={() => { setForgeMode("edit"); resetForm(); }}
              style={{ background: "linear-gradient(135deg,#274028,#3e6e44)", border: "1px solid #4f8758", borderRadius: 12, color: "#e2f4e4", padding: "18px 14px", cursor: "pointer", fontSize: 14, fontWeight: 900, letterSpacing: 0.6 }}
            >
              Edit Existing
            </button>
          </div>
        )}

        {tab === "forge" && forgeMode !== null && (
          <div style={{ maxWidth: forgeMode === "edit" ? 1120 : 960, margin: "0 auto", display: "grid", gridTemplateColumns: forgeMode === "edit" ? "280px 1fr 200px" : "1fr 200px", gap: forgeMode === "edit" ? 24 : 32, alignItems: "start" }}>
            {forgeMode === "edit" && (
              <div style={{ border: "1px solid #1e3a5a", background: "#060c18", borderRadius: 10, padding: 12, maxHeight: 620, display: "flex", flexDirection: "column", minWidth: 0 }}>
                <div style={sectionHdr}>Edit Existing</div>
                <input style={{ ...inp, marginBottom: 10 }} placeholder="Search by name..." value={editSearch} onChange={e => setEditSearch(e.target.value)} />
                <div style={{ overflowY: "auto", display: "flex", flexDirection: "column", gap: 6, paddingRight: 2 }}>
                  {editCards.map(card => (
                    <button
                      key={card.id}
                      onClick={() => editCard(card)}
                      style={{ textAlign: "left", border: editingId === card.id ? "1px solid #378ADD" : "1px solid #102034", borderRadius: 8, background: editingId === card.id ? "#0c1a31" : "#07101d", color: "#ccd", padding: "7px 9px", cursor: "pointer" }}
                    >
                      <div style={{ fontSize: 12, fontWeight: 800, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{card.name}</div>
                      <div style={{ fontSize: 9, color: "#5f7899" }}>{card.type === "minion" ? `${card.atk}/${card.hp} ֲ· ` : ""}{card.rarity}</div>
                    </button>
                  ))}
                  {editCards.length === 0 && (
                    <div style={{ fontSize: 11, color: "#5f7899", textAlign: "center", padding: "10px 4px" }}>No cards found.</div>
                  )}
                </div>
              </div>
            )}

            {/* ג”€ג”€ LEFT COLUMN: inputs ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ */}
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

              {/* Card Name */}
              <div>
                <label style={lbl}>Card Name</label>
                <input style={inp} value={f.name} onChange={e => setField("name", e.target.value)} placeholder="Enter card name..." autoFocus />
              </div>

              {/* Type toggle */}
              <div>
                <label style={lbl}>Type</label>
                <div style={{ display: "flex", gap: 0, borderRadius: 8, overflow: "hidden", border: "1px solid #1e3a5a" }}>
                  {["minion", "spell"].map(t => (
                    <button key={t} onClick={() => setField("type", t)} style={{ flex: 1, padding: "9px 0", border: "none", background: f.type === t ? "linear-gradient(135deg,#0d3060,#1a4a8a)" : "#060c18", color: f.type === t ? "#85B7EB" : "#445", fontSize: 12, fontWeight: 900, letterSpacing: 1, textTransform: "uppercase", cursor: "pointer", borderRight: t === "minion" ? "1px solid #1e3a5a" : "none" }}>
                      {t === "minion" ? "ג”ן¸ Minion" : "ג¨ Spell"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Rarity */}
              <div>
                <label style={lbl}>Rarity</label>
                <div style={{ display: "flex", gap: 6 }}>
                  {RARITY_OPTIONS.map(r => {
                    const active = f.rarity === r.id;
                    return (
                      <button key={r.id} onClick={() => { setField("rarity", r.id); setField("frameVariant", "default"); }} style={{ flex: 1, padding: "8px 4px 6px", border: "2px solid " + (active ? r.color : "#1e3a5a"), borderRadius: 8, background: active ? r.color + "18" : "#060c18", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                        <div style={{ width: 28, height: 38, borderRadius: 4, background: `linear-gradient(135deg, ${r.color}55, ${r.color}18)`, border: `2px solid ${r.color}`, opacity: active ? 1 : 0.4 }} />
                        <span style={{ fontSize: 9, fontWeight: 900, color: active ? r.color : "#445", letterSpacing: 0.5 }}>{r.label.toUpperCase()}</span>
                      </button>
                    );
                  })}
                </div>
                {/* Legendary frame toggle */}
                {f.rarity === "legendary" && (
                  <div style={{ marginTop: 8 }}>
                    <label style={lbl}>Frame Style</label>
                    <div style={{ display: "flex", gap: 0, borderRadius: 8, overflow: "hidden", border: "1px solid #1e3a5a" }}>
                      {["default", "luxury"].map((v, i) => (
                        <button key={v} onClick={() => setField("frameVariant", v)} style={{ flex: 1, padding: "8px 0", border: "none", borderRight: i === 0 ? "1px solid #1e3a5a" : "none", background: f.frameVariant === v ? "#EF9F2722" : "#060c18", color: f.frameVariant === v ? "#EF9F27" : "#445", fontSize: 11, fontWeight: 900, letterSpacing: 1, textTransform: "uppercase", cursor: "pointer" }}>
                          {v === "default" ? "Default" : "Luxury"}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Class */}
              <div>
                <label style={lbl}>Class</label>
                <div style={{ display: "flex", gap: 6 }}>
                  {CLASS_OPTIONS.map(cl => {
                    const active = f.class === cl.id;
                    return (
                      <button key={cl.id} onClick={() => setField("class", cl.id)} style={{ flex: 1, padding: "8px 4px", border: "1px solid " + (active ? cl.color : "#1e3a5a"), borderRadius: 8, background: active ? cl.color + "22" : "#060c18", color: active ? cl.color : "#445", fontSize: 11, fontWeight: 900, letterSpacing: 0.5, cursor: "pointer" }}>
                        {cl.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Cost + Stats */}
              <div style={{ display: "grid", gridTemplateColumns: f.type === "minion" ? "1fr 1fr 1fr" : "1fr", gap: 10 }}>
                <div>
                  <label style={lbl}>Cost (Aura)</label>
                  <input type="number" min={0} max={12} style={inp} value={f.cost} onChange={e => setField("cost", e.target.value)} />
                </div>
                {f.type === "minion" && <>
                  <div>
                    <label style={lbl}>Attack</label>
                    <input type="number" min={0} max={20} style={inp} value={f.atk} onChange={e => setField("atk", e.target.value)} />
                  </div>
                  <div>
                    <label style={lbl}>Health</label>
                    <input type="number" min={1} max={20} style={inp} value={f.hp} onChange={e => setField("hp", e.target.value)} />
                  </div>
                </>}
              </div>

              {/* Effect text */}
              <div>
                <label style={lbl}>Effect Text <span style={{ color: "#334", fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>({(f.effectText || "").length}/120)</span></label>
                <textarea
                  maxLength={120}
                  rows={3}
                  style={{ ...inp, resize: "none", lineHeight: 1.5 }}
                  value={f.effectText}
                  onChange={e => setField("effectText", e.target.value)}
                  placeholder="Describe what this card does..."
                />
              </div>

              {/* Keywords */}
              <div>
                <label style={lbl}>Keywords</label>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {FORGE_KEYWORDS.map(kw => {
                    const active = keywordsList.includes(kw.id);
                    return (
                      <button key={kw.id} onClick={() => toggleKeyword(kw.id)} style={{ padding: "5px 12px", borderRadius: 999, border: "1px solid " + (active ? "#378ADD" : "#1e3a5a"), background: active ? "#378ADD22" : "#060c18", color: active ? "#85B7EB" : "#445", fontSize: 11, fontWeight: 700, cursor: "pointer", transition: "all 0.1s" }}>
                        {kw.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <div style={sectionHdr}>Mechanics Builder</div>
                <div style={{ display: "grid", gap: 10 }}>
                  {renderMechanicControls("primary", "On Play (Spell/Primary Effect)")}
                  {renderMechanicControls("battlecry", "Battlecry")}
                  {renderMechanicControls("deathrattle", "Deathrattle")}
                  {renderMechanicControls("startTurn", "Start of Turn")}
                  {renderMechanicControls("endTurn", "End of Turn")}
                </div>
                <div style={{ marginTop: 10 }}>
                  <label style={lbl}>Target Rule</label>
                  <select style={inp} value={f.targetingMode} onChange={e => setField("targetingMode", e.target.value)}>
                    <option value="none">No Target</option>
                    <option value="minion">Minion Target</option>
                    <option value="any">Any Target</option>
                  </select>
                </div>
              </div>

              {/* Art */}
              <div>
                <label style={lbl}>Card Art</label>
                <input ref={fileRef} type="file" accept="image/*" onChange={handleImageUpload} style={{ display: "none" }} />
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => fileRef.current?.click()} style={{ flex: 1, background: "#060c18", border: "1px dashed #1e3a5a", borderRadius: 8, color: "#5f7899", padding: "10px", fontSize: 12, cursor: "pointer", textAlign: "left" }}>
                    {f.imageName ? `ג“ ${f.imageName}` : "Upload image..."}
                  </button>
                  {(f.art || f.image) && (
                    <button onClick={() => setF(p => ({ ...p, image: "", imageName: "", art: p.art === p.image ? "" : p.art }))} style={{ background: "transparent", border: "1px solid #2a3a4a", color: "#556", borderRadius: 8, padding: "0 12px", cursor: "pointer", fontSize: 12 }}>
                      Clear
                    </button>
                  )}
                </div>
                {/* Emoji fallback */}
                <div style={{ marginTop: 8 }}>
                  <label style={{ ...lbl, marginBottom: 0 }}>Emoji (fallback if no art)</label>
                  <input style={{ ...inp, marginTop: 4, fontSize: 20 }} value={f.emoji} onChange={e => setField("emoji", e.target.value)} />
                </div>
              </div>

              {forgeError && <div style={{ fontSize: 12, color: "#E24B4A" }}>{forgeError}</div>}

            </div>

            {/* ג”€ג”€ RIGHT COLUMN: live preview + save ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ */}
            <div style={{ position: "sticky", top: 24, display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
              <div style={{ fontSize: 9, color: "#334", fontWeight: 900, letterSpacing: 2, textTransform: "uppercase" }}>Live Preview</div>

              {/* Card preview with hover tooltip support (same large preview behavior as gameplay) */}
              <div style={{ width: forgePreviewW, height: forgePreviewH, borderRadius: 14, boxShadow: "0 8px 32px rgba(0,0,0,0.7)" }}>
                <HandCard
                  card={preview}
                  selected={false}
                  disabled={false}
                  onClick={() => {}}
                  width={forgePreviewW}
                  height={forgePreviewH}
                />
              </div>

              <button
                onClick={saveCard}
                style={{ width: "100%", background: editingId ? "linear-gradient(135deg,#7a4a10,#cc7a28)" : "linear-gradient(135deg,#0d3a78,#378ADD)", color: "#fff", border: "none", borderRadius: 10, padding: "12px 0", fontSize: 13, fontWeight: 900, cursor: "pointer", letterSpacing: 0.5 }}
              >
                {forgeMode === "edit" ? "Update Card" : "Save Card"}
              </button>

              {forgeMode === "create" && editingId && (
                <button onClick={resetForm} style={{ width: "100%", background: "transparent", border: "1px solid #1e3a5a", color: "#445", borderRadius: 10, padding: "9px 0", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                  Cancel Edit
                </button>
              )}

              {forgeMode === "edit" && editingId && (
                <>
                  <button onClick={() => deleteCard(editingId)} style={{ width: "100%", background: "rgba(226,75,74,0.14)", border: "1px solid #E24B4A", color: "#ffb9b9", borderRadius: 10, padding: "9px 0", fontSize: 12, fontWeight: 800, cursor: "pointer" }}>
                    Delete Card
                  </button>
                  <button onClick={resetForm} style={{ width: "100%", background: "transparent", border: "1px solid #1e3a5a", color: "#445", borderRadius: 10, padding: "9px 0", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                    Clear Selection
                  </button>
                </>
              )}

              <button onClick={() => { setForgeMode(null); resetForm(); }} style={{ width: "100%", background: "transparent", border: "1px solid #1e3a5a", color: "#667e9a", borderRadius: 10, padding: "8px 0", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                Back To Mode Select
              </button>
            </div>

            {/* ג”€ג”€ Custom card vault (full width below both columns) */}
            {forgeMode === "create" && customs.length > 0 && (
              <div style={{ gridColumn: "1 / -1", marginTop: 8 }}>
                <div style={sectionHdr}>Your Cards ({customs.length})</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                  {customs.map(c => (
                    <div key={c.id} style={{ position: "relative" }}>
                      <div style={{ width: 122, height: 163, borderRadius: 10, overflow: "hidden", cursor: "pointer", boxShadow: "0 4px 14px rgba(0,0,0,0.5)" }} onClick={() => editCard(c)}>
                        <TemplateCardFace card={c} width={122} height={163} onFrameError={() => {}} />
                      </div>
                      <button onClick={() => duplicateCard(c)} style={{ position: "absolute", top: -6, right: 18, width: 20, height: 20, borderRadius: "50%", border: "none", background: "#378ADD", color: "#fff", cursor: "pointer", fontWeight: 900, fontSize: 13 }}>+</button>
                      <button onClick={() => deleteCard(c.id)} style={{ position: "absolute", top: -6, right: -6, width: 20, height: 20, borderRadius: "50%", border: "none", background: "#E24B4A", color: "#fff", cursor: "pointer", fontWeight: 900, fontSize: 13 }}>ֳ—</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {tab === "deck" && (
          <div style={{ maxWidth: 900, margin: "0 auto" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 260px", gap: 20 }}>
              <div>
                <div style={sectionHdr}>Card Library ({filteredLib.length}{libTab !== "all" ? ` / ${allCards.length}` : ""})</div>

                {/* Hero quick-select ג€” clicking a hero auto-switches to their class tab */}
                <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
                  {HEROES.map(hero => {
                    const heroKey = hero.class.toLowerCase().startsWith("usa") ? "usa" : hero.class.toLowerCase();
                    const active = libTab === heroKey;
                    return (
                      <button
                        key={hero.id}
                        onClick={() => setLibTab(active ? "all" : heroKey)}
                        style={{
                          background: active ? hero.themeColor + "33" : "transparent",
                          border: "1px solid " + (active ? hero.themeColor : "#1e3a5a"),
                          color: active ? hero.themeColor : "#445",
                          borderRadius: 6, padding: "5px 12px",
                          fontSize: 11, fontWeight: 900, cursor: "pointer",
                          display: "flex", alignItems: "center", gap: 6,
                          transition: "all 0.15s",
                        }}
                      >
                        <span>{hero.emoji}</span>
                        <span>{hero.name}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Class filter tab bar */}
                <div style={{ display: "flex", marginBottom: 10, borderRadius: 8, overflow: "hidden", border: "1px solid #0d1e30" }}>
                  {LIB_TABS.map((lt, i) => {
                    const active = libTab === lt.id;
                    // Per-tab accent colours
                    const accent =
                      lt.id === "usa"     ? "#cc2222" :
                      lt.id === "tech"    ? "#00e6c8" :
                      lt.id === "neutral" ? "#5a6070" :
                                            "#378ADD";
                    return (
                      <button
                        key={lt.id}
                        onClick={() => setLibTab(lt.id)}
                        style={{
                          flex: 1,
                          background: active ? accent + "22" : "transparent",
                          border: "none",
                          borderRight: i < LIB_TABS.length - 1 ? "1px solid #0d1e30" : "none",
                          borderBottom: active ? "2px solid " + accent : "2px solid transparent",
                          color: active ? accent : "#334",
                          padding: "8px 4px",
                          fontSize: 10, fontWeight: 900, letterSpacing: 1,
                          cursor: "pointer",
                          transition: "all 0.15s",
                        }}
                      >
                        {lt.label}
                      </button>
                    );
                  })}
                </div>

                <input style={{ ...inp, marginBottom: 10 }} placeholder="Search cards..." value={deckSearch} onChange={e => setDeckSearch(e.target.value)} />
                <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 460, overflowY: "auto", paddingRight: 4 }}>
                  {filteredLib.map(card => {
                    const count = countInDeck(card.id);
                    const canAdd = deckCards.length < DECK_SIZE_TARGET && count < 2;
                    const isHov = hovLibCard?.card?.id === card.id;
                    return (
                      <div
                        key={card.id}
                        onMouseEnter={e => setHovLibCard({ card, rect: e.currentTarget.getBoundingClientRect() })}
                        onMouseLeave={() => setHovLibCard(null)}
                        style={{ display: "flex", alignItems: "center", gap: 10, background: isHov ? "#0a1428" : "#060c18", border: "1px solid " + (isHov ? "#1e3a5a" : "#0d1e30"), borderRadius: 8, padding: "7px 10px", transition: "background 0.1s, border-color 0.1s" }}
                      >
                        <div style={{ fontSize: 18, width: 28, textAlign: "center" }}>{card.emoji || "נƒ"}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12, fontWeight: 800, color: "#ccd", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{card.name}</div>
                          <div style={{ fontSize: 9, color: "#334" }}>{card.type === "minion" ? `${card.atk}/${card.hp} ֲ· ` : "spell ֲ· "}{card.rarity}</div>
                        </div>
                        <button onClick={() => addToDeck(card.id)} disabled={!canAdd} style={{ background: canAdd ? "linear-gradient(135deg,#0d3060,#378ADD)" : "#0d1520", border: "none", color: canAdd ? "#fff" : "#223", borderRadius: 5, width: 26, height: 26, cursor: canAdd ? "pointer" : "not-allowed", fontSize: 16, fontWeight: 900 }}>+</button>
                      </div>
                    );
                  })}
                  {filteredLib.length === 0 && (
                    <div style={{ fontSize: 11, color: "#5f7899", textAlign: "center", padding: "14px 4px" }}>No cards match current filters.</div>
                  )}
                </div>
                <LibraryCardPreview card={hovLibCard?.card} anchorRect={hovLibCard?.rect} />
              </div>

              <div>
                <div style={sectionHdr}>Current Deck ({deckCards.length}/{DECK_SIZE_TARGET})</div>
                <input style={{ ...inp, marginBottom: 10 }} placeholder="Deck name..." value={deckName} onChange={e => setDeckName(e.target.value)} />
                <button
                  onClick={saveDeck}
                  style={{ width: "100%", background: deckCards.length ? "linear-gradient(135deg,#0d3060,#378ADD)" : "#060c18", border: "none", color: deckCards.length ? "#fff" : "#223", borderRadius: 8, padding: "10px", fontSize: 12, fontWeight: 900, cursor: deckCards.length ? "pointer" : "not-allowed" }}
                >
                  {editingDeckId ? "Update Deck" : "Save Deck"}
                </button>
                {editingDeckId && (
                  <button
                    onClick={() => { setEditingDeckId(null); setDeckName(""); setDeckCards([]); onSelectDeck?.(null); }}
                    style={{ width: "100%", marginTop: 8, background: "transparent", border: "1px solid #1e3a5a", color: "#6b86a8", borderRadius: 8, padding: "8px", fontSize: 11, fontWeight: 800, cursor: "pointer" }}
                  >
                    New Deck
                  </button>
                )}
                <div style={{ marginTop: 10, maxHeight: 180, overflowY: "auto", border: "1px solid #0d1e30", borderRadius: 8, background: "#060c18", padding: 6 }}>
                  {deckCards.map((id, idx) => {
                    const c = allCards.find(x => x.id === id);
                    return (
                      <div key={`${id}-${idx}`} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 5px", borderBottom: idx < deckCards.length - 1 ? "1px solid #0d1e30" : "none" }}>
                        <span style={{ fontSize: 13, width: 18, textAlign: "center" }}>{c?.emoji || "נƒ"}</span>
                        <span style={{ flex: 1, fontSize: 10, color: "#cdd9ea", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c?.name || id}</span>
                        <button onClick={() => removeFromDeck(idx)} style={{ background: "transparent", border: "1px solid #284668", color: "#85B7EB", borderRadius: 5, fontSize: 10, padding: "1px 6px", cursor: "pointer" }}>-</button>
                      </div>
                    );
                  })}
                  {deckCards.length === 0 && <div style={{ fontSize: 10, color: "#5f7899", textAlign: "center", padding: "8px 4px" }}>No cards in deck.</div>}
                </div>
                <div style={{ marginTop: 12 }}>
                  <div style={{ ...sectionHdr, marginBottom: 6 }}>Saved Decks ({savedDecks.length})</div>
                  <div style={{ maxHeight: 190, overflowY: "auto", border: "1px solid #0d1e30", borderRadius: 8, background: "#060c18", padding: 6, display: "flex", flexDirection: "column", gap: 5 }}>
                    {savedDecks.map(deck => {
                      const active = (editingDeckId && deck.id === editingDeckId) || (!editingDeckId && activeDeck?.id === deck.id);
                      return (
                        <button
                          key={deck.id}
                          onClick={() => loadDeckForEdit(deck)}
                          style={{ textAlign: "left", border: active ? "1px solid #378ADD" : "1px solid #1a2c44", background: active ? "#0c1a31" : "#07101d", color: "#ccd", borderRadius: 7, padding: "6px 8px", cursor: "pointer" }}
                        >
                          <div style={{ fontSize: 11, fontWeight: 800, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{deck.name}</div>
                          <div style={{ fontSize: 9, color: "#6b86a8" }}>{deck.cardIds?.length || 0} cards</div>
                        </button>
                      );
                    })}
                    {savedDecks.length === 0 && <div style={{ fontSize: 10, color: "#5f7899", textAlign: "center", padding: "8px 4px" }}>No saved decks yet.</div>}
                  </div>
                </div>
                {activeDeck && (
                  <div style={{ marginTop: 8, fontSize: 10, color: "#6b86a8" }}>
                    Active: {activeDeck.name}
                    <button onClick={() => onSelectDeck?.(null)} style={{ marginLeft: 8, background: "transparent", border: "none", color: "#8aa8cc", cursor: "pointer" }}>clear</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}




