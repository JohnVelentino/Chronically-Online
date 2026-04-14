import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import HandCard from "./HandCard.jsx";
import TemplateCardFace from "./TemplateCardFace.jsx";
import { addCustomCard, buildDeckEntry, DECK_SIZE_TARGET, deleteLibraryCard, getCustomCards, getLib, HEROES, upsertLibraryCard } from "../data/cards.js";
import { mkUid } from "../engine/gameState.js";
import { getSFX } from "../audio/sfx.js";
import { DEFAULT_DEV_CONFIG, getDevConfig, resetDevConfig, setDevConfig, subscribe } from "../dev/devConfig.js";

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
// Cards in data use "USA!", "Elon", "neutral", or undefined (also neutral).
function cardClassKey(card) {
  const raw = card.class;
  if (!raw || raw.toLowerCase() === "neutral") return "neutral";
  if (raw.toLowerCase().startsWith("usa")) return "usa";
  if (raw.toLowerCase().startsWith("elon")) return "elon";
  return raw.toLowerCase();
}

const LIB_TABS = [
  { id: "all",     label: "ALL" },
  { id: "usa",     label: "USA!" },
  { id: "elon",    label: "ELON" },
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
  { id: "Elon",    label: "Elon",     color: "#1a8adc" },
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

// ג”€ג”€ DEV Settings defaults ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€
function getPath(obj, path) {
  return path.split(".").reduce((acc, key) => (acc == null ? undefined : acc[key]), obj);
}

function patchFromPath(path, value) {
  const keys = path.split(".");
  const root = {};
  let cur = root;
  keys.forEach((k, i) => {
    if (i === keys.length - 1) cur[k] = value;
    else {
      cur[k] = {};
      cur = cur[k];
    }
  });
  return root;
}

function DevSection({ title, subtitle, defaultOpen = true, children }) {
  return (
    <details open={defaultOpen} style={{ border: "1px solid #1a2b43", borderRadius: 10, background: "rgba(4,10,18,0.85)", overflow: "hidden" }}>
      <summary style={{ cursor: "pointer", listStyle: "none", padding: "10px 12px", borderBottom: "1px solid #0f1b2b", display: "flex", flexDirection: "column", gap: 2 }}>
        <span style={{ fontSize: 11, color: "#96c7ff", letterSpacing: 1, fontWeight: 900, textTransform: "uppercase" }}>{title}</span>
        {subtitle && <span style={{ fontSize: 11, color: "#5f7d9f" }}>{subtitle}</span>}
      </summary>
      <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 10 }}>{children}</div>
    </details>
  );
}

function DevFieldGrid({ cols = 3, children }) {
  return <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gap: 8 }}>{children}</div>;
}

function DevNumberInput({ label, value, min, max, step = 1, unit = "", onChange, onFocus }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span style={{ fontSize: 10, color: "#6f8cad", textTransform: "uppercase", letterSpacing: 0.7, fontWeight: 700 }}>{label}</span>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <input onFocus={onFocus} type="number" value={Number.isFinite(value) ? value : 0} min={min} max={max} step={step} onChange={e => onChange(Number(e.target.value))} style={{ ...inp, padding: "6px 8px", fontSize: 12 }} />
        {unit && <span style={{ fontSize: 11, color: "#7fa4cb", minWidth: 22 }}>{unit}</span>}
      </div>
    </label>
  );
}

function DevSlider({ label, value, min, max, step = 1, onChange, onFocus }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <span style={{ fontSize: 10, color: "#6f8cad", textTransform: "uppercase", letterSpacing: 0.7, fontWeight: 700 }}>{label}</span>
        <span style={{ fontSize: 11, color: "#91b7de", fontWeight: 800 }}>{String(value)}</span>
      </div>
      <input onFocus={onFocus} type="range" min={min} max={max} step={step} value={Number.isFinite(value) ? value : 0} onChange={e => onChange(Number(e.target.value))} style={{ width: "100%", accentColor: "#378ADD" }} />
    </div>
  );
}

function DevToggle({ label, checked, onChange, onFocus }) {
  return (
    <button onFocus={onFocus} onClick={() => onChange(!checked)} style={{ width: "100%", background: "#091425", border: "1px solid #1e3a5a", borderRadius: 8, padding: "8px 10px", display: "flex", justifyContent: "space-between", alignItems: "center", color: "#b6d3ef", fontSize: 12, cursor: "pointer" }}>
      <span>{label}</span>
      <span style={{ fontWeight: 800, color: checked ? "#5fd68a" : "#7b8ea6" }}>{checked ? "ON" : "OFF"}</span>
    </button>
  );
}

function DevSelect({ label, value, options, onChange, onFocus }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span style={{ fontSize: 10, color: "#6f8cad", textTransform: "uppercase", letterSpacing: 0.7, fontWeight: 700 }}>{label}</span>
      <select onFocus={onFocus} value={value} onChange={e => onChange(e.target.value)} style={{ ...inp, padding: "6px 8px", fontSize: 12 }}>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}

function DevColorInput({ label, value, onChange, onFocus }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span style={{ fontSize: 10, color: "#6f8cad", textTransform: "uppercase", letterSpacing: 0.7, fontWeight: 700 }}>{label}</span>
      <div style={{ display: "flex", gap: 6 }}>
        <input onFocus={onFocus} type="color" value={value || "#000000"} onChange={e => onChange(e.target.value)} style={{ width: 36, height: 30, border: "1px solid #1e3a5a", borderRadius: 6, background: "transparent", padding: 2 }} />
        <input onFocus={onFocus} type="text" value={value || ""} onChange={e => onChange(e.target.value)} style={{ ...inp, padding: "6px 8px", fontSize: 12 }} />
      </div>
    </label>
  );
}

function DevButtonRow({ children }) {
  return <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{children}</div>;
}

function DevResetButton({ label, onClick, danger = false }) {
  return (
    <button onClick={onClick} style={{ background: danger ? "rgba(226,75,74,0.12)" : "rgba(55,138,221,0.12)", color: danger ? "#ffb4b4" : "#a7d2ff", border: "1px solid " + (danger ? "rgba(226,75,74,0.35)" : "rgba(55,138,221,0.35)"), borderRadius: 8, padding: "7px 10px", fontSize: 11, fontWeight: 800, cursor: "pointer" }}>
      {label}
    </button>
  );
}

function activeLayoutItemFromPath(path) {
  if (!path?.startsWith("layout.")) return "";
  const parts = path.split(".");
  return parts.length >= 2 ? parts[1] : "";
}

function DevBattlefieldPreview({ layout, visual, activePath, onSelect, onPatch, nudgeStep = 0.25 }) {
  const selectedItem = activeLayoutItemFromPath(activePath);
  const previewRef = useRef(null);
  const dragRef = useRef(null);
  const boardScale = Number.isFinite(visual?.boardScale) ? visual.boardScale : 1;
  const boardPadding = Number.isFinite(visual?.boardPadding) ? visual.boardPadding : 0;
  const showLabels = !!visual?.showZoneLabels;
  const showGrid = !!visual?.previewGrid;
  const snap = !!visual?.snapToGrid;
  const snapStep = 1;

  const meta = {
    playerHero: { mode: "center", sizeField: "size", scaleField: "scale" },
    enemyHero: { mode: "center", sizeField: "size", scaleField: "scale" },
    playerBattlefield: { mode: "rect", widthField: "width", heightField: "height" },
    enemyBattlefield: { mode: "rect", widthField: "width", heightField: "height" },
    playerHand: { mode: "centerRect", widthField: "width", extraResizeField: "spread" },
    enemyHand: { mode: "centerRect", widthField: "width", extraResizeField: "spread" },
    endTurnBtn: { mode: "centerRect", scaleField: "scale" },
    auraIndicator: { mode: "centerRect", scaleField: "scale" },
    deckHandIndicator: { mode: "centerRect", scaleField: "scale" },
  };

  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  function q(v) {
    const n = Number(v) || 0;
    return snap ? Math.round(n / snapStep) * snapStep : Number(n.toFixed(2));
  }

  function setValue(path, value) {
    onPatch(path, q(value));
  }

  function getBox(item) {
    const d = layout?.[item] || {};
    if (item === "playerHero" || item === "enemyHero") {
      const base = Math.max(6, ((d.size || 120) / 120) * 10) * (d.scale || 1);
      return { x: d.x || 50, y: d.y || 50, width: base, height: base, circle: true };
    }
    if (item === "playerBattlefield" || item === "enemyBattlefield") {
      // Return top-LEFT (x, y) — NOT the center.
      // The game renders these zones with position:absolute; top:Y%; height:H%; left:0; right:0.
      // Using center coordinates here (with translate(-50%,-50%) in itemStyle) caused the zone
      // to appear offset by height/2 in the preview AND to visually jump every time height changed.
      // rect:true tells itemStyle to use top-left positioning with no centering transform.
      const defaultY = item === "playerBattlefield" ? 58 : 28;
      return { x: d.x ?? 0, y: d.y ?? defaultY, width: d.width ?? 100, height: d.height ?? 22, rect: true };
    }
    if (item === "playerHand" || item === "enemyHand") {
      return { x: d.x || 50, y: d.y || 50, width: Math.max(8, d.width || 100), height: 8 };
    }
    if (item === "endTurnBtn") return { x: d.x || 92, y: d.y || 50, width: 10 * (d.scale || 1), height: 7 * (d.scale || 1) };
    if (item === "auraIndicator") return { x: d.x || 92, y: d.y || 60, width: 10 * (d.scale || 1), height: 5 * (d.scale || 1) };
    return { x: d.x || 92, y: d.y || 68, width: 12 * (d.scale || 1), height: 6 * (d.scale || 1) };
  }

  function startDrag(e, item, mode = "move") {
    e.preventDefault();
    e.stopPropagation();
    onSelect(`layout.${item}.x`);
    const r = previewRef.current?.getBoundingClientRect();
    if (!r) return;
    dragRef.current = { item, mode, rect: r, startX: e.clientX, startY: e.clientY, start: getBox(item) };
    window.addEventListener("pointermove", onDragMove);
    window.addEventListener("pointerup", stopDrag);
  }

  function onDragMove(e) {
    const s = dragRef.current;
    if (!s) return;
    const dx = ((e.clientX - s.startX) / s.rect.width) * 100;
    const dy = ((e.clientY - s.startY) / s.rect.height) * 100;
    if (s.mode === "move") {
      // Battlefield zones are full-width in the game (left:0; right:0) so .x is unused.
      // Writing to .x during drag would corrupt getBox's next computation because getBox
      // now reads d.x as the left edge, not the center.  Skip .x for battlefields.
      if (s.item !== "playerBattlefield" && s.item !== "enemyBattlefield") {
        setValue(`layout.${s.item}.x`, clamp(s.start.x + dx, 0, 100));
      }
      setValue(`layout.${s.item}.y`, clamp(s.start.y + dy, 0, 100));
      return;
    }
    if (s.mode === "resize") {
      const m = meta[s.item];
      if (m.sizeField) {
        const current = layout?.[s.item]?.[m.sizeField] || 120;
        setValue(`layout.${s.item}.${m.sizeField}`, clamp(current + dx * 3, 20, 400));
      } else if (m.widthField && m.heightField) {
        setValue(`layout.${s.item}.${m.widthField}`, clamp(s.start.width + dx, 1, 100));
        setValue(`layout.${s.item}.${m.heightField}`, clamp(s.start.height + dy, 1, 100));
      } else if (m.widthField) {
        setValue(`layout.${s.item}.${m.widthField}`, clamp(s.start.width + dx, 1, 100));
        if (m.extraResizeField) {
          const spread = layout?.[s.item]?.[m.extraResizeField] ?? 1;
          setValue(`layout.${s.item}.${m.extraResizeField}`, clamp(spread + dx * 0.02, 0.2, 2));
        }
      } else if (m.scaleField) {
        const sc = layout?.[s.item]?.[m.scaleField] ?? 1;
        setValue(`layout.${s.item}.${m.scaleField}`, clamp(sc + dx * 0.02, 0.3, 3));
      }
    }
  }

  function stopDrag() {
    dragRef.current = null;
    window.removeEventListener("pointermove", onDragMove);
    window.removeEventListener("pointerup", stopDrag);
  }

  useEffect(() => {
    return () => stopDrag();
  }, []);

  function onPreviewKeyDown(e) {
    if (!selectedItem) return;
    if (!["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) return;
    e.preventDefault();
    const curX = layout?.[selectedItem]?.x ?? 50;
    const curY = layout?.[selectedItem]?.y ?? 50;
    if (e.key === "ArrowLeft") setValue(`layout.${selectedItem}.x`, curX - nudgeStep);
    if (e.key === "ArrowRight") setValue(`layout.${selectedItem}.x`, curX + nudgeStep);
    if (e.key === "ArrowUp") setValue(`layout.${selectedItem}.y`, curY - nudgeStep);
    if (e.key === "ArrowDown") setValue(`layout.${selectedItem}.y`, curY + nudgeStep);
  }

  // isRect: box.x/y is the TOP-LEFT corner — no centering transform applied.
  //         Used for battlefield zones to exactly match the game's position:absolute; top:Y%; height:H% layout.
  // !isRect: box.x/y is the CENTER of the element — transform:translate(-50%,-50%) applied.
  //          Used for heroes, hands, controls which are centered on their anchor point.
  function itemStyle(box, selected, isCircle, isRect) {
    return {
      position: "absolute",
      left: `${box.x}%`,
      top: `${box.y}%`,
      width: `${box.width}%`,
      height: `${box.height}%`,
      transform: isRect ? "none" : "translate(-50%, -50%)",
      borderRadius: isCircle ? 999 : 8,
      border: selected ? "1px solid #fac775" : "1px solid rgba(135,184,235,0.85)",
      boxShadow: selected ? "0 0 0 2px rgba(250,199,117,0.55), 0 0 18px rgba(250,199,117,0.35)" : "none",
      background: selected ? "rgba(250,199,117,0.2)" : "rgba(55,138,221,0.18)",
      boxSizing: "border-box",
      cursor: "grab",
    };
  }

  function renderItem(item, tint = null) {
    const b = getBox(item);
    const selected = selectedItem === item;
    return (
      <div
        key={item}
        onPointerDown={(e) => startDrag(e, item, "move")}
        onClick={() => onSelect(`layout.${item}.x`)}
        style={{ ...itemStyle(b, selected, !!b.circle, !!b.rect), ...(tint ? { background: tint } : {}) }}
      >
        {(item === selectedItem) && (
          <div
            onPointerDown={(e) => startDrag(e, item, "resize")}
            style={{ position: "absolute", right: -5, bottom: -5, width: 10, height: 10, borderRadius: 3, background: "#fac775", border: "1px solid #3b2a0b", cursor: "nwse-resize" }}
          />
        )}
      </div>
    );
  }

  return (
    <div style={{ border: "1px solid #1a2e49", borderRadius: 10, background: "linear-gradient(180deg,#071121,#050b16)", padding: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 11 }}>
        <span style={{ color: "#91b7de", fontWeight: 800 }}>Mini Battlefield Preview</span>
        <span style={{ color: "#6f8cad" }}>Selected: {selectedItem || "none"}</span>
      </div>
      <div ref={previewRef} tabIndex={0} onKeyDown={onPreviewKeyDown} style={{ position: "relative", width: "100%", aspectRatio: "16 / 9", borderRadius: 8, overflow: "hidden", border: "1px solid #12243b", background: "radial-gradient(circle at 50% 45%, rgba(30,66,110,0.35), rgba(4,10,20,0.95))", outline: "none" }}>
        <div style={{ position: "absolute", inset: boardPadding, transform: `scale(${boardScale})`, transformOrigin: "center center" }}>
          {showGrid && <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(120,160,220,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(120,160,220,0.12) 1px, transparent 1px)", backgroundSize: "10% 10%", pointerEvents: "none" }} />}
          {renderItem("enemyBattlefield")}
          {renderItem("playerBattlefield")}
          {renderItem("enemyHand")}
          {renderItem("playerHand")}
          {renderItem("enemyHero")}
          {renderItem("playerHero")}
          {renderItem("endTurnBtn", "rgba(29,158,117,0.25)")}
          {renderItem("auraIndicator", "rgba(55,138,221,0.28)")}
          {renderItem("deckHandIndicator", "rgba(102,140,190,0.25)")}
          {showLabels && (
            <>
              <div style={{ position: "absolute", left: 6, top: "2%", fontSize: 9, color: "#8eb5de" }}>Enemy Hand</div>
              <div style={{ position: "absolute", left: 6, top: `${(layout.enemyBattlefield?.y || 28) - 3}%`, fontSize: 9, color: "#8eb5de" }}>Enemy Battlefield</div>
              <div style={{ position: "absolute", left: 6, top: `${(layout.playerBattlefield?.y || 58) - 3}%`, fontSize: 9, color: "#8eb5de" }}>Player Battlefield</div>
              <div style={{ position: "absolute", left: 6, top: `${(layout.playerHand?.y || 92) - 3}%`, fontSize: 9, color: "#8eb5de" }}>Player Hand</div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function DevTabSection({ onDevSettingsChange }) {
  const [cfg, setCfg] = useState(() => getDevConfig());
  const [activePath, setActivePath] = useState("layout.playerHero.x");
  const [nudgeMode, setNudgeMode] = useState("small");
  const [saveStatus, setSaveStatus] = useState("ready");
  const [wiredHints] = useState([
    "Some new layout keys (for example width/spread/cardScale/scale) may not be fully rendered in all gameplay components yet.",
    "Preset selectors are schema-ready and saved, but preset-application logic is not implemented yet.",
  ]);

  useEffect(() => {
    const unsub = subscribe(() => {
      setCfg(getDevConfig());
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("ready"), 800);
    });
    return unsub;
  }, []);

  useEffect(() => {
    const playerPortrait = (() => { try { return localStorage.getItem("devHeroPortrait_player") || null; } catch { return null; } })();
    const enemyPortrait = (() => { try { return localStorage.getItem("devHeroPortrait_enemy") || null; } catch { return null; } })();
    onDevSettingsChange?.({ playerPortrait, enemyPortrait });
  }, [onDevSettingsChange, cfg]);

  function updatePath(path, value) {
    setActivePath(path);
    setSaveStatus("saving");
    // Soft overlap constraint: keep a ≥5% gap between enemy BF bottom and player BF top.
    let constrainedValue = value;
    const currentCfg = getDevConfig();
    const pBF = currentCfg.layout?.playerBattlefield || {};
    const eBF = currentCfg.layout?.enemyBattlefield || {};
    if (path === "layout.playerBattlefield.y") {
      const minY = (eBF.y ?? 28) + (eBF.height ?? 22) + 5;
      constrainedValue = Math.max(value, minY);
    } else if (path === "layout.enemyBattlefield.y") {
      const maxY = (pBF.y ?? 58) - (eBF.height ?? 22) - 5;
      constrainedValue = Math.min(value, maxY);
    } else if (path === "layout.enemyBattlefield.height") {
      const maxH = (pBF.y ?? 58) - (eBF.y ?? 28) - 5;
      constrainedValue = Math.min(value, maxH);
    } else if (path === "layout.playerBattlefield.height") {
      const maxH = 100 - (pBF.y ?? 58) - 2;
      constrainedValue = Math.min(value, maxH);
    }
    setDevConfig(patchFromPath(path, constrainedValue));
  }

  function resetScope(scopeKey) {
    if (!DEFAULT_DEV_CONFIG[scopeKey]) return;
    setDevConfig({ [scopeKey]: DEFAULT_DEV_CONFIG[scopeKey] });
  }

  const l = cfg.layout || {};
  const v = cfg.visual || {};
  const ct = cfg.cardTemplate || {};
  const p = cfg.presets || {};
  const selectedLayoutItem = activeLayoutItemFromPath(activePath) || "playerHero";
  const nudgeStep = nudgeMode === "small" ? 0.25 : 1;
  const currentValue = getPath(cfg, activePath);
  const [templateCompare, setTemplateCompare] = useState(true);
  const lsStatus = (() => {
    try {
      const raw = localStorage.getItem("chronically_devConfig");
      return raw ? `saved (${raw.length} bytes)` : "not saved";
    } catch {
      return "unavailable";
    }
  })();

  const layoutItemLabels = {
    playerHero: "Player Hero",
    enemyHero: "Enemy Hero",
    playerBattlefield: "Player Battlefield",
    enemyBattlefield: "Enemy Battlefield",
    playerHand: "Player Hand",
    enemyHand: "Enemy Hand",
    endTurnBtn: "End Turn Button",
    auraIndicator: "Aura Indicator",
    deckHandIndicator: "Deck/Hand Indicator",
  };

  const sampleMinionCard = {
    id: "dev_preview_minion",
    uid: "dev_preview_minion_uid",
    name: "Arena Vanguard",
    cost: 4,
    atk: 5,
    hp: 4,
    rarity: "epic",
    type: "minion",
    class: "neutral",
    emoji: "⚔",
    effectText: "Battlecry: Gain +1/+1 if you played a spell this turn.",
    keywords: ["battlecry", "rush"],
    desc: "Battlecry: Gain +1/+1 if you played a spell this turn.",
  };
  const sampleSpellCard = {
    id: "dev_preview_spell",
    uid: "dev_preview_spell_uid",
    name: "Arc Surge",
    cost: 3,
    rarity: "rare",
    type: "spell",
    class: "elon",
    emoji: "⚡",
    effectText: "Deal 3 damage. Draw 1 card if your hand is low.",
    keywords: ["combo"],
    desc: "Deal 3 damage. Draw 1 card if your hand is low.",
  };

  const selectedGroup = selectedLayoutItem.includes("Hero")
    ? "heroes"
    : selectedLayoutItem.includes("Battlefield")
      ? "battlefields"
      : selectedLayoutItem.includes("Hand") && !selectedLayoutItem.includes("Indicator")
        ? "hands"
        : "controls";

  function setLayoutValue(item, field, value) {
    updatePath(`layout.${item}.${field}`, value);
  }

  function nudge(item, axis, delta) {
    const current = Number(l?.[item]?.[axis] ?? 0);
    setLayoutValue(item, axis, Number((current + delta).toFixed(3)));
  }

  function resetSelectedItem() {
    const base = DEFAULT_DEV_CONFIG?.layout?.[selectedLayoutItem];
    if (!base) return;
    setDevConfig({ layout: { [selectedLayoutItem]: base } });
  }

  function resetSelectedGroup() {
    const byGroup = {
      heroes: ["playerHero", "enemyHero"],
      battlefields: ["playerBattlefield", "enemyBattlefield"],
      hands: ["playerHand", "enemyHand"],
      controls: ["endTurnBtn", "auraIndicator", "deckHandIndicator"],
    };
    const keys = byGroup[selectedGroup] || [];
    const patch = {};
    keys.forEach((k) => { patch[k] = DEFAULT_DEV_CONFIG.layout[k]; });
    setDevConfig({ layout: patch });
  }

  return (
    <div style={{ maxWidth: 980, margin: "0 auto", display: "flex", flexDirection: "column", gap: 10 }}>
      <DevBattlefieldPreview
        layout={l}
        visual={v}
        activePath={activePath}
        onSelect={(path) => setActivePath(path)}
        onPatch={(path, value) => updatePath(path, value)}
        nudgeStep={nudgeStep}
      />

      <DevSection title="Selected Item" subtitle="Focused editing workflow for fast positioning">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
          <DevSelect
            label="Selected Layout Item"
            value={selectedLayoutItem}
            options={Object.keys(layoutItemLabels).map((k) => ({ value: k, label: layoutItemLabels[k] }))}
            onChange={(val) => setActivePath(`layout.${val}.x`)}
            onFocus={() => setActivePath(`layout.${selectedLayoutItem}.x`)}
          />
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <button onClick={() => setNudgeMode("small")} style={{ background: nudgeMode === "small" ? "#19426d" : "#0a1628", color: nudgeMode === "small" ? "#d7ebff" : "#7f9dbf", border: "1px solid #1e3a5a", borderRadius: 6, padding: "6px 8px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>Small Step</button>
            <button onClick={() => setNudgeMode("large")} style={{ background: nudgeMode === "large" ? "#19426d" : "#0a1628", color: nudgeMode === "large" ? "#d7ebff" : "#7f9dbf", border: "1px solid #1e3a5a", borderRadius: 6, padding: "6px 8px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>Large Step</button>
          </div>
        </div>

        <DevFieldGrid cols={4}>
          <DevNumberInput label="X" value={l?.[selectedLayoutItem]?.x} min={0} max={100} unit="%" onFocus={() => setActivePath(`layout.${selectedLayoutItem}.x`)} onChange={(val) => setLayoutValue(selectedLayoutItem, "x", val)} />
          <DevNumberInput label="Y" value={l?.[selectedLayoutItem]?.y} min={0} max={100} unit="%" onFocus={() => setActivePath(`layout.${selectedLayoutItem}.y`)} onChange={(val) => setLayoutValue(selectedLayoutItem, "y", val)} />
          {selectedLayoutItem.includes("Hero") && <DevNumberInput label="Size" value={l?.[selectedLayoutItem]?.size} min={20} max={400} unit="px" onFocus={() => setActivePath(`layout.${selectedLayoutItem}.size`)} onChange={(val) => setLayoutValue(selectedLayoutItem, "size", val)} />}
          {selectedLayoutItem.includes("Battlefield") && <DevNumberInput label="Width" value={l?.[selectedLayoutItem]?.width} min={1} max={100} unit="%" onFocus={() => setActivePath(`layout.${selectedLayoutItem}.width`)} onChange={(val) => setLayoutValue(selectedLayoutItem, "width", val)} />}
          {selectedLayoutItem.includes("Battlefield") && <DevNumberInput label="Height" value={l?.[selectedLayoutItem]?.height} min={1} max={100} unit="%" onFocus={() => setActivePath(`layout.${selectedLayoutItem}.height`)} onChange={(val) => setLayoutValue(selectedLayoutItem, "height", val)} />}
          {selectedLayoutItem.includes("Hand") && !selectedLayoutItem.includes("Indicator") && <DevNumberInput label="Width" value={l?.[selectedLayoutItem]?.width} min={1} max={100} unit="%" onFocus={() => setActivePath(`layout.${selectedLayoutItem}.width`)} onChange={(val) => setLayoutValue(selectedLayoutItem, "width", val)} />}
          {selectedLayoutItem.includes("Hand") && !selectedLayoutItem.includes("Indicator") && <DevSlider label="Spread" value={l?.[selectedLayoutItem]?.spread ?? 1} min={0.2} max={2} step={0.05} onFocus={() => setActivePath(`layout.${selectedLayoutItem}.spread`)} onChange={(val) => setLayoutValue(selectedLayoutItem, "spread", val)} />}
          {selectedLayoutItem.includes("Hand") && !selectedLayoutItem.includes("Indicator") && <DevSlider label="Card Scale" value={l?.[selectedLayoutItem]?.cardScale ?? 1} min={0.5} max={2} step={0.05} onFocus={() => setActivePath(`layout.${selectedLayoutItem}.cardScale`)} onChange={(val) => setLayoutValue(selectedLayoutItem, "cardScale", val)} />}
          {(selectedLayoutItem === "endTurnBtn" || selectedLayoutItem === "auraIndicator" || selectedLayoutItem === "deckHandIndicator") && <DevSlider label="Scale" value={l?.[selectedLayoutItem]?.scale ?? 1} min={0.3} max={3} step={0.05} onFocus={() => setActivePath(`layout.${selectedLayoutItem}.scale`)} onChange={(val) => setLayoutValue(selectedLayoutItem, "scale", val)} />}
        </DevFieldGrid>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 34px)", gap: 4 }}>
            <div />
            <button onClick={() => nudge(selectedLayoutItem, "y", -nudgeStep)} style={{ background: "#0a1628", color: "#a8c8ea", border: "1px solid #1e3a5a", borderRadius: 6, height: 30, cursor: "pointer" }}>↑</button>
            <div />
            <button onClick={() => nudge(selectedLayoutItem, "x", -nudgeStep)} style={{ background: "#0a1628", color: "#a8c8ea", border: "1px solid #1e3a5a", borderRadius: 6, height: 30, cursor: "pointer" }}>←</button>
            <button onClick={() => {}} style={{ background: "#10243d", color: "#8fb4dc", border: "1px solid #1e3a5a", borderRadius: 6, height: 30, cursor: "default" }}>{nudgeStep}</button>
            <button onClick={() => nudge(selectedLayoutItem, "x", nudgeStep)} style={{ background: "#0a1628", color: "#a8c8ea", border: "1px solid #1e3a5a", borderRadius: 6, height: 30, cursor: "pointer" }}>→</button>
            <div />
            <button onClick={() => nudge(selectedLayoutItem, "y", nudgeStep)} style={{ background: "#0a1628", color: "#a8c8ea", border: "1px solid #1e3a5a", borderRadius: 6, height: 30, cursor: "pointer" }}>↓</button>
            <div />
          </div>
          <DevButtonRow>
            <DevResetButton label="Reset Selected Item" onClick={resetSelectedItem} />
            <DevResetButton label={`Reset ${selectedGroup}`} onClick={resetSelectedGroup} />
          </DevButtonRow>
        </div>
      </DevSection>

      <DevSection title="Layout (All Fields)" subtitle="Full field list for reference and exact edits" defaultOpen={false}>
        <DevFieldGrid cols={3}>
          <DevNumberInput label="Player Hero X" value={l.playerHero?.x} min={0} max={100} unit="%" onFocus={() => setActivePath("layout.playerHero.x")} onChange={(val) => updatePath("layout.playerHero.x", val)} />
          <DevNumberInput label="Player Hero Y" value={l.playerHero?.y} min={0} max={100} unit="%" onFocus={() => setActivePath("layout.playerHero.y")} onChange={(val) => updatePath("layout.playerHero.y", val)} />
          <DevNumberInput label="Player Hero Size" value={l.playerHero?.size} min={40} max={320} unit="px" onFocus={() => setActivePath("layout.playerHero.size")} onChange={(val) => updatePath("layout.playerHero.size", val)} />
          <DevNumberInput label="Enemy Hero X" value={l.enemyHero?.x} min={0} max={100} unit="%" onFocus={() => setActivePath("layout.enemyHero.x")} onChange={(val) => updatePath("layout.enemyHero.x", val)} />
          <DevNumberInput label="Enemy Hero Y" value={l.enemyHero?.y} min={0} max={100} unit="%" onFocus={() => setActivePath("layout.enemyHero.y")} onChange={(val) => updatePath("layout.enemyHero.y", val)} />
          <DevNumberInput label="Enemy Hero Size" value={l.enemyHero?.size} min={40} max={320} unit="px" onFocus={() => setActivePath("layout.enemyHero.size")} onChange={(val) => updatePath("layout.enemyHero.size", val)} />
        </DevFieldGrid>

        {(() => {
          const pY = l.playerBattlefield?.y ?? 58;
          const eY = l.enemyBattlefield?.y ?? 28;
          const eH = l.enemyBattlefield?.height ?? 22;
          const zonesOverlapping = pY < eY + eH + 5;
          return zonesOverlapping ? (
            <div style={{ color: "#f59e0b", background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.4)", borderRadius: 6, padding: "6px 10px", marginBottom: 8, fontSize: 12, fontWeight: 600 }}>
              ⚠ Zones overlapping — player BF top ({pY}%) is within 5% of enemy BF bottom ({eY + eH}%)
            </div>
          ) : null;
        })()}
        <DevFieldGrid cols={4}>
          <DevNumberInput label="Player BF X" value={l.playerBattlefield?.x} min={0} max={100} unit="%" onFocus={() => setActivePath("layout.playerBattlefield.x")} onChange={(val) => updatePath("layout.playerBattlefield.x", val)} />
          <DevNumberInput label="Player BF Y" value={l.playerBattlefield?.y} min={0} max={100} unit="%" onFocus={() => setActivePath("layout.playerBattlefield.y")} onChange={(val) => updatePath("layout.playerBattlefield.y", val)} />
          <DevNumberInput label="Player BF Width" value={l.playerBattlefield?.width} min={1} max={100} unit="%" onFocus={() => setActivePath("layout.playerBattlefield.width")} onChange={(val) => updatePath("layout.playerBattlefield.width", val)} />
          <DevNumberInput label="Player BF Height" value={l.playerBattlefield?.height} min={1} max={100} unit="%" onFocus={() => setActivePath("layout.playerBattlefield.height")} onChange={(val) => updatePath("layout.playerBattlefield.height", val)} />
          <DevNumberInput label="Enemy BF X" value={l.enemyBattlefield?.x} min={0} max={100} unit="%" onFocus={() => setActivePath("layout.enemyBattlefield.x")} onChange={(val) => updatePath("layout.enemyBattlefield.x", val)} />
          <DevNumberInput label="Enemy BF Y" value={l.enemyBattlefield?.y} min={0} max={100} unit="%" onFocus={() => setActivePath("layout.enemyBattlefield.y")} onChange={(val) => updatePath("layout.enemyBattlefield.y", val)} />
          <DevNumberInput label="Enemy BF Width" value={l.enemyBattlefield?.width} min={1} max={100} unit="%" onFocus={() => setActivePath("layout.enemyBattlefield.width")} onChange={(val) => updatePath("layout.enemyBattlefield.width", val)} />
          <DevNumberInput label="Enemy BF Height" value={l.enemyBattlefield?.height} min={1} max={100} unit="%" onFocus={() => setActivePath("layout.enemyBattlefield.height")} onChange={(val) => updatePath("layout.enemyBattlefield.height", val)} />
        </DevFieldGrid>

        <DevFieldGrid cols={3}>
          <DevNumberInput label="Player Hand X" value={l.playerHand?.x} min={0} max={100} unit="%" onFocus={() => setActivePath("layout.playerHand.x")} onChange={(val) => updatePath("layout.playerHand.x", val)} />
          <DevNumberInput label="Player Hand Y" value={l.playerHand?.y} min={0} max={100} unit="%" onFocus={() => setActivePath("layout.playerHand.y")} onChange={(val) => updatePath("layout.playerHand.y", val)} />
          <DevNumberInput label="Player Hand Width" value={l.playerHand?.width} min={1} max={100} unit="%" onFocus={() => setActivePath("layout.playerHand.width")} onChange={(val) => updatePath("layout.playerHand.width", val)} />
          <DevSlider label="Player Hand Fan Angle" value={l.playerHand?.fanAngle ?? 0} min={0} max={20} step={0.5} onFocus={() => setActivePath("layout.playerHand.fanAngle")} onChange={(val) => updatePath("layout.playerHand.fanAngle", val)} />
          <DevSlider label="Player Hand Spread" value={l.playerHand?.spread ?? 1} min={0.2} max={2} step={0.05} onFocus={() => setActivePath("layout.playerHand.spread")} onChange={(val) => updatePath("layout.playerHand.spread", val)} />
          <DevSlider label="Player Hand Card Scale" value={l.playerHand?.cardScale ?? 1} min={0.5} max={2} step={0.05} onFocus={() => setActivePath("layout.playerHand.cardScale")} onChange={(val) => updatePath("layout.playerHand.cardScale", val)} />
          <DevNumberInput label="Enemy Hand X" value={l.enemyHand?.x} min={0} max={100} unit="%" onFocus={() => setActivePath("layout.enemyHand.x")} onChange={(val) => updatePath("layout.enemyHand.x", val)} />
          <DevNumberInput label="Enemy Hand Y" value={l.enemyHand?.y} min={0} max={100} unit="%" onFocus={() => setActivePath("layout.enemyHand.y")} onChange={(val) => updatePath("layout.enemyHand.y", val)} />
          <DevNumberInput label="Enemy Hand Width" value={l.enemyHand?.width} min={1} max={100} unit="%" onFocus={() => setActivePath("layout.enemyHand.width")} onChange={(val) => updatePath("layout.enemyHand.width", val)} />
          <DevSlider label="Enemy Hand Fan Angle" value={l.enemyHand?.fanAngle ?? 0} min={0} max={20} step={0.5} onFocus={() => setActivePath("layout.enemyHand.fanAngle")} onChange={(val) => updatePath("layout.enemyHand.fanAngle", val)} />
          <DevSlider label="Enemy Hand Spread" value={l.enemyHand?.spread ?? 1} min={0.2} max={2} step={0.05} onFocus={() => setActivePath("layout.enemyHand.spread")} onChange={(val) => updatePath("layout.enemyHand.spread", val)} />
          <DevSlider label="Enemy Hand Card Scale" value={l.enemyHand?.cardScale ?? 1} min={0.5} max={2} step={0.05} onFocus={() => setActivePath("layout.enemyHand.cardScale")} onChange={(val) => updatePath("layout.enemyHand.cardScale", val)} />
        </DevFieldGrid>

        <DevFieldGrid cols={3}>
          <DevNumberInput label="End Turn X" value={l.endTurnBtn?.x} min={0} max={100} unit="%" onFocus={() => setActivePath("layout.endTurnBtn.x")} onChange={(val) => updatePath("layout.endTurnBtn.x", val)} />
          <DevNumberInput label="End Turn Y" value={l.endTurnBtn?.y} min={0} max={100} unit="%" onFocus={() => setActivePath("layout.endTurnBtn.y")} onChange={(val) => updatePath("layout.endTurnBtn.y", val)} />
          <DevSlider label="End Turn Scale" value={l.endTurnBtn?.scale ?? 1} min={0.5} max={2} step={0.05} onFocus={() => setActivePath("layout.endTurnBtn.scale")} onChange={(val) => updatePath("layout.endTurnBtn.scale", val)} />
          <DevNumberInput label="Aura X" value={l.auraIndicator?.x} min={0} max={100} unit="%" onFocus={() => setActivePath("layout.auraIndicator.x")} onChange={(val) => updatePath("layout.auraIndicator.x", val)} />
          <DevNumberInput label="Aura Y" value={l.auraIndicator?.y} min={0} max={100} unit="%" onFocus={() => setActivePath("layout.auraIndicator.y")} onChange={(val) => updatePath("layout.auraIndicator.y", val)} />
          <DevSlider label="Aura Scale" value={l.auraIndicator?.scale ?? 1} min={0.5} max={2} step={0.05} onFocus={() => setActivePath("layout.auraIndicator.scale")} onChange={(val) => updatePath("layout.auraIndicator.scale", val)} />
          <DevNumberInput label="Deck/Hand X" value={l.deckHandIndicator?.x} min={0} max={100} unit="%" onFocus={() => setActivePath("layout.deckHandIndicator.x")} onChange={(val) => updatePath("layout.deckHandIndicator.x", val)} />
          <DevNumberInput label="Deck/Hand Y" value={l.deckHandIndicator?.y} min={0} max={100} unit="%" onFocus={() => setActivePath("layout.deckHandIndicator.y")} onChange={(val) => updatePath("layout.deckHandIndicator.y", val)} />
          <DevSlider label="Deck/Hand Scale" value={l.deckHandIndicator?.scale ?? 1} min={0.5} max={2} step={0.05} onFocus={() => setActivePath("layout.deckHandIndicator.scale")} onChange={(val) => updatePath("layout.deckHandIndicator.scale", val)} />
        </DevFieldGrid>
      </DevSection>

      <DevSection title="Card Template" subtitle="Icons, colors, typography, and panel styling" defaultOpen={false}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 11, color: "#8fb4dc" }}>Live Card Preview (real renderer)</span>
          <button onClick={() => setTemplateCompare(v => !v)} style={{ background: "#0a1628", color: "#9dc4ea", border: "1px solid #1e3a5a", borderRadius: 6, padding: "6px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
            {templateCompare ? "Hide Compare" : "Show Compare"}
          </button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: templateCompare ? "1fr 1fr" : "1fr", gap: 10 }}>
          <div style={{ border: "1px solid #173150", borderRadius: 10, background: "#07101d", padding: 10, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
            <div style={{ fontSize: 10, color: "#7fa4cb", fontWeight: 800, letterSpacing: 0.6 }}>Current Template · Minion</div>
            <TemplateCardFace card={sampleMinionCard} width={190} height={268} />
          </div>
          {templateCompare && (
            <div style={{ border: "1px solid #173150", borderRadius: 10, background: "#07101d", padding: 10, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
              <div style={{ fontSize: 10, color: "#7fa4cb", fontWeight: 800, letterSpacing: 0.6 }}>Alternate Preview · Spell</div>
              <TemplateCardFace card={sampleSpellCard} width={190} height={268} />
            </div>
          )}
        </div>

        <DevFieldGrid cols={3}>
          <DevSelect label="Attack Icon" value={ct.attackIcon || "sword"} options={[{ value: "sword", label: "Sword" }, { value: "fist", label: "Fist" }, { value: "lightning", label: "Lightning" }, { value: "fire", label: "Fire" }, { value: "claw", label: "Claw" }]} onFocus={() => setActivePath("cardTemplate.attackIcon")} onChange={(val) => updatePath("cardTemplate.attackIcon", val)} />
          <DevSelect label="Health Icon" value={ct.healthIcon || "heart"} options={[{ value: "heart", label: "Heart" }, { value: "shield", label: "Shield" }, { value: "diamond", label: "Diamond" }, { value: "orb", label: "Orb" }, { value: "cross", label: "Cross" }]} onFocus={() => setActivePath("cardTemplate.healthIcon")} onChange={(val) => updatePath("cardTemplate.healthIcon", val)} />
          <DevSelect label="Mana Icon" value={ct.manaIcon || "gem"} options={[{ value: "gem", label: "Gem" }, { value: "star", label: "Star" }, { value: "crystal", label: "Crystal" }, { value: "coin", label: "Coin" }, { value: "rune", label: "Rune" }]} onFocus={() => setActivePath("cardTemplate.manaIcon")} onChange={(val) => updatePath("cardTemplate.manaIcon", val)} />
          <DevSelect label="Attack Icon Variant" value={ct.attackIconVariant || "default"} options={[{ value: "default", label: "Default" }, { value: "outline", label: "Outline" }, { value: "filled", label: "Filled" }, { value: "rune", label: "Rune" }, { value: "minimal", label: "Minimal" }]} onFocus={() => setActivePath("cardTemplate.attackIconVariant")} onChange={(val) => updatePath("cardTemplate.attackIconVariant", val)} />
          <DevSelect label="Health Icon Variant" value={ct.healthIconVariant || "default"} options={[{ value: "default", label: "Default" }, { value: "outline", label: "Outline" }, { value: "filled", label: "Filled" }, { value: "rune", label: "Rune" }, { value: "minimal", label: "Minimal" }]} onFocus={() => setActivePath("cardTemplate.healthIconVariant")} onChange={(val) => updatePath("cardTemplate.healthIconVariant", val)} />
          <DevSelect label="Mana Icon Variant" value={ct.manaIconVariant || "default"} options={[{ value: "default", label: "Default" }, { value: "outline", label: "Outline" }, { value: "filled", label: "Filled" }, { value: "rune", label: "Rune" }, { value: "minimal", label: "Minimal" }]} onFocus={() => setActivePath("cardTemplate.manaIconVariant")} onChange={(val) => updatePath("cardTemplate.manaIconVariant", val)} />
          <DevColorInput label="Attack Color" value={ct.attackColor} onFocus={() => setActivePath("cardTemplate.attackColor")} onChange={(val) => updatePath("cardTemplate.attackColor", val)} />
          <DevColorInput label="Health Color" value={ct.healthColor} onFocus={() => setActivePath("cardTemplate.healthColor")} onChange={(val) => updatePath("cardTemplate.healthColor", val)} />
          <DevColorInput label="Mana Color" value={ct.manaColor} onFocus={() => setActivePath("cardTemplate.manaColor")} onChange={(val) => updatePath("cardTemplate.manaColor", val)} />
          <DevSelect label="Attack Badge Style" value={ct.attackBadgeStyle || "default"} options={[{ value: "default", label: "Default" }, { value: "solid", label: "Solid" }, { value: "glass", label: "Glass" }, { value: "rune", label: "Rune" }, { value: "minimal", label: "Minimal" }]} onFocus={() => setActivePath("cardTemplate.attackBadgeStyle")} onChange={(val) => updatePath("cardTemplate.attackBadgeStyle", val)} />
          <DevSelect label="Health Badge Style" value={ct.healthBadgeStyle || "default"} options={[{ value: "default", label: "Default" }, { value: "solid", label: "Solid" }, { value: "glass", label: "Glass" }, { value: "rune", label: "Rune" }, { value: "minimal", label: "Minimal" }]} onFocus={() => setActivePath("cardTemplate.healthBadgeStyle")} onChange={(val) => updatePath("cardTemplate.healthBadgeStyle", val)} />
          <DevSelect label="Mana Badge Style" value={ct.manaBadgeStyle || "default"} options={[{ value: "default", label: "Default" }, { value: "solid", label: "Solid" }, { value: "glass", label: "Glass" }, { value: "rune", label: "Rune" }, { value: "minimal", label: "Minimal" }]} onFocus={() => setActivePath("cardTemplate.manaBadgeStyle")} onChange={(val) => updatePath("cardTemplate.manaBadgeStyle", val)} />
          <DevSelect label="Border Style" value={ct.cardBorderStyle || "default"} options={[{ value: "default", label: "Default" }, { value: "gold", label: "Gold" }, { value: "arcane", label: "Arcane" }, { value: "fire", label: "Fire" }, { value: "frost", label: "Frost" }]} onFocus={() => setActivePath("cardTemplate.cardBorderStyle")} onChange={(val) => updatePath("cardTemplate.cardBorderStyle", val)} />
          <DevNumberInput label="Name Font Size" value={ct.nameFontSize} min={8} max={40} unit="px" onFocus={() => setActivePath("cardTemplate.nameFontSize")} onChange={(val) => updatePath("cardTemplate.nameFontSize", val)} />
          <DevNumberInput label="Desc Font Size" value={ct.descFontSize} min={8} max={32} unit="px" onFocus={() => setActivePath("cardTemplate.descFontSize")} onChange={(val) => updatePath("cardTemplate.descFontSize", val)} />
          <DevSlider label="Title Font Weight" value={ct.titleFontWeight ?? 700} min={300} max={900} step={100} onFocus={() => setActivePath("cardTemplate.titleFontWeight")} onChange={(val) => updatePath("cardTemplate.titleFontWeight", val)} />
          <DevSlider label="Description Line Height" value={ct.descLineHeight ?? 1.5} min={1} max={2.2} step={0.05} onFocus={() => setActivePath("cardTemplate.descLineHeight")} onChange={(val) => updatePath("cardTemplate.descLineHeight", val)} />
          <DevSlider label="Border Radius" value={ct.borderRadius ?? 0.058} min={0} max={0.2} step={0.002} onFocus={() => setActivePath("cardTemplate.borderRadius")} onChange={(val) => updatePath("cardTemplate.borderRadius", val)} />
          <DevSlider label="Text Panel Opacity" value={ct.textPanelOpacity ?? 0.99} min={0} max={1} step={0.01} onFocus={() => setActivePath("cardTemplate.textPanelOpacity")} onChange={(val) => updatePath("cardTemplate.textPanelOpacity", val)} />
          <DevSlider label="Frame Inset" value={ct.frameInset ?? 0} min={0} max={20} step={1} onFocus={() => setActivePath("cardTemplate.frameInset")} onChange={(val) => updatePath("cardTemplate.frameInset", val)} />
          <DevSlider label="Art Inset" value={ct.artInset ?? 0} min={-20} max={20} step={1} onFocus={() => setActivePath("cardTemplate.artInset")} onChange={(val) => updatePath("cardTemplate.artInset", val)} />
          <DevSlider label="Cost Badge Scale" value={ct.costBadgeScale ?? 1} min={0.5} max={1.8} step={0.05} onFocus={() => setActivePath("cardTemplate.costBadgeScale")} onChange={(val) => updatePath("cardTemplate.costBadgeScale", val)} />
        </DevFieldGrid>
      </DevSection>

      <DevSection title="Visual" subtitle="Rendering and board utility toggles" defaultOpen={false}>
        <DevFieldGrid cols={2}>
          <DevToggle label="Battlefield Divider" checked={!!v.showBattlefieldDivider} onFocus={() => setActivePath("visual.showBattlefieldDivider")} onChange={(val) => updatePath("visual.showBattlefieldDivider", val)} />
          <DevToggle label="Zone Labels" checked={!!v.showZoneLabels} onFocus={() => setActivePath("visual.showZoneLabels")} onChange={(val) => updatePath("visual.showZoneLabels", val)} />
          <DevToggle label="Ambient Particles" checked={!!v.ambientParticles} onFocus={() => setActivePath("visual.ambientParticles")} onChange={(val) => updatePath("visual.ambientParticles", val)} />
          <DevToggle label="Card Idle Breathing" checked={!!v.cardIdleBreathing} onFocus={() => setActivePath("visual.cardIdleBreathing")} onChange={(val) => updatePath("visual.cardIdleBreathing", val)} />
          <DevToggle label="Board Gradient" checked={!!v.boardGradient} onFocus={() => setActivePath("visual.boardGradient")} onChange={(val) => updatePath("visual.boardGradient", val)} />
          <DevToggle label="Preview Grid" checked={!!v.previewGrid} onFocus={() => setActivePath("visual.previewGrid")} onChange={(val) => updatePath("visual.previewGrid", val)} />
          <DevToggle label="Snap To Grid" checked={!!v.snapToGrid} onFocus={() => setActivePath("visual.snapToGrid")} onChange={(val) => updatePath("visual.snapToGrid", val)} />
        </DevFieldGrid>
      </DevSection>

      <DevSection title="Presets" subtitle="Default restores and preset selectors" defaultOpen={false}>
        <DevFieldGrid cols={3}>
          <DevSelect label="Layout Preset" value={p.layoutPreset || "default"} options={[{ value: "default", label: "Default" }, { value: "compact", label: "Compact" }, { value: "wide", label: "Wide" }]} onFocus={() => setActivePath("presets.layoutPreset")} onChange={(val) => updatePath("presets.layoutPreset", val)} />
          <DevSelect label="Card Preset" value={p.cardTemplatePreset || "default"} options={[{ value: "default", label: "Default" }, { value: "minimal", label: "Minimal" }, { value: "ornate", label: "Ornate" }]} onFocus={() => setActivePath("presets.cardTemplatePreset")} onChange={(val) => updatePath("presets.cardTemplatePreset", val)} />
          <DevSelect label="Visual Preset" value={p.visualPreset || "default"} options={[{ value: "default", label: "Default" }, { value: "clean", label: "Clean" }, { value: "cinematic", label: "Cinematic" }]} onFocus={() => setActivePath("presets.visualPreset")} onChange={(val) => updatePath("presets.visualPreset", val)} />
        </DevFieldGrid>
        <DevButtonRow>
          <DevResetButton label="Reset Layout To Default" onClick={() => resetScope("layout")} />
          <DevResetButton label="Reset Card Template To Default" onClick={() => resetScope("cardTemplate")} />
          <DevResetButton label="Reset All Config" danger onClick={() => resetDevConfig()} />
        </DevButtonRow>
      </DevSection>

      <DevSection title="Diagnostics" subtitle="Render-safe config inspection" defaultOpen={false}>
        <div style={{ border: "1px solid #1a2e49", borderRadius: 8, background: "#060f1d", padding: 10, fontSize: 12, color: "#a9c7e6", display: "grid", gap: 6 }}>
          <div><span style={{ color: "#6f8cad" }}>Path:</span> <code>{activePath}</code></div>
          <div><span style={{ color: "#6f8cad" }}>Value:</span> <code>{typeof currentValue === "object" ? JSON.stringify(currentValue) : String(currentValue)}</code></div>
          <div><span style={{ color: "#6f8cad" }}>Storage:</span> {lsStatus}</div>
          <div><span style={{ color: "#6f8cad" }}>Status:</span> {saveStatus}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {wiredHints.map((hint, idx) => (
            <div key={idx} style={{ fontSize: 11, color: "#7f9dbf" }}>• {hint}</div>
          ))}
        </div>
      </DevSection>
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

export default function CardCreator({ onClose, savedDecks = [], onSavedDecksChange, activeDeck, onSelectDeck, onDevSettingsChange }) {
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

  useEffect(() => {
    try {
      const loaded = {};
      HEROES.forEach(hero => {
        const saved = localStorage.getItem(portraitStorageKey(hero.id));
        if (saved) loaded[hero.id] = saved;
      });
      setHeroPortraits(loaded);
    } catch {
      // keep defaults if storage is unavailable
    }
  }, []);

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
        <button onClick={() => setTab("dev")} style={{ background: tab === "dev" ? "linear-gradient(135deg,#1a1200,#3a2800)" : "transparent", border: "none", borderBottom: tab === "dev" ? "2px solid #EF9F27" : "2px solid transparent", color: tab === "dev" ? "#EF9F27" : "#445", padding: "10px 20px", fontSize: 12, fontWeight: 900, cursor: "pointer", letterSpacing: 0.5 }}>DEV ג™</button>
      </div>

      <div style={{ flex: 1, padding: 24, overflowY: "auto" }}>
        {tab === "dev" && <DevTabSection onDevSettingsChange={onDevSettingsChange} />}

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
                      lt.id === "elon"    ? "#1a8adc" :
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




