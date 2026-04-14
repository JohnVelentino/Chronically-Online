import { useState } from "react";
import { RC } from "../data/cards.js";
import useDevConfig from "../dev/useDevConfig.js";

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

// ── Class accent colors (watermark text, board glow) ──────────────────────────
// keyed by normalized lowercase class name → { accent, border }
// accent: the bare text color / text-shadow glow color
// border: used for board-mode card outline glow (kept for BoardMinion)
export const CLASS_PALETTE = {
  "usa!":    { accent: "#f87171", border: "#c03040", text: "#f87171" },
  "usa":     { accent: "#f87171", border: "#c03040", text: "#f87171" },
  "elon":    { accent: "#3b9eff", border: "#3a80d0", text: "#3b9eff" },
  "neutral": { accent: "#94a3b8", border: "#445566", text: "#94a3b8" },
  "gen z":   { accent: "#a78bfa", border: "#9040c8", text: "#a78bfa" },
  "tech":    { accent: "#34d399", border: "#00aacc", text: "#34d399" },
  "space":   { accent: "#a78bfa", border: "#c88800", text: "#a78bfa" },
  "battle":  { accent: "#f87171", border: "#c03040", text: "#f87171" },
  "meme":    { accent: "#fb923c", border: "#b85a00", text: "#fb923c" },
  "crypto":  { accent: "#facc15", border: "#a08000", text: "#facc15" },
};
const CLASS_PALETTE_DEFAULT = { accent: "#94a3b8", border: "#334455", text: "#94a3b8" };

// ── Mechanic tag colors ───────────────────────────────────────────────────────
// Each entry: bg (80% opacity fill), border (solid 1px), text, glowColor (for box-shadow)
const MECHANIC_COLORS = {
  taunt:           { bg: "rgba(46,109,164,0.80)",  border: "#2e6da4", text: "#cde4f8", glow: "#2e6da4" },
  deathrattle:     { bg: "rgba(74,27,110,0.80)",   border: "#7b3bbf", text: "#e0c8ff", glow: "#7b3bbf" },
  charge:          { bg: "rgba(184,134,11,0.80)",  border: "#b8860b", text: "#fff4b0", glow: "#b8860b" },
  battlecry:       { bg: "rgba(26,107,60,0.80)",   border: "#1a6b3c", text: "#b6f5d0", glow: "#1a6b3c" },
  combo:           { bg: "rgba(139,26,26,0.80)",   border: "#8b1a1a", text: "#ffb8b8", glow: "#8b1a1a" },
  "divine shield": { bg: "rgba(154,125,10,0.80)",  border: "#9a7d0a", text: "#fff3a0", glow: "#c8a800" },
  poisonous:       { bg: "rgba(30,110,30,0.80)",   border: "#1d7a1d", text: "#b8ffb8", glow: "#1d7a1d" },
  stealth:         { bg: "rgba(50,60,90,0.80)",    border: "#4a5878", text: "#b8c8e8", glow: "#4a5878" },
  rush:            { bg: "rgba(160,55,10,0.80)",   border: "#c04010", text: "#ffc898", glow: "#c04010" },
  lifesteal:       { bg: "rgba(150,20,80,0.80)",   border: "#b01860", text: "#ffb0d8", glow: "#b01860" },
  freeze:          { bg: "rgba(10,120,180,0.80)",  border: "#0a90cc", text: "#b0e8ff", glow: "#0a90cc" },
  windfury:        { bg: "rgba(80,150,10,0.80)",   border: "#60b010", text: "#d8f8a0", glow: "#60b010" },
  elusive:         { bg: "rgba(80,40,140,0.80)",   border: "#7040c0", text: "#d8b8ff", glow: "#7040c0" },
};
const MECHANIC_DEFAULT = { bg: "rgba(35,42,60,0.80)", border: "#4a5060", text: "#a8b4c8", glow: "#4a5060" };

// ── Rarity frame themes ────────────────────────────────────────────────────────
const RF = {
  common:    { frame: "#909090", inner: "#c4c4c4", glow: "rgba(180,180,180,0.35)", manaA: "#a8d0e8", manaB: "#2060a0", manaC: "#040c20", manaBorder: "#60a0d8" },
  rare:      { frame: "#3a80d0", inner: "#7ab4ff", glow: "rgba(80,155,255,0.48)", manaA: "#a0d4ff", manaB: "#1050a8", manaC: "#040c28", manaBorder: "#5aaaff" },
  epic:      { frame: "#9040c8", inner: "#c880ff", glow: "rgba(160,70,255,0.52)", manaA: "#d090ff", manaB: "#500090", manaC: "#0c0020", manaBorder: "#b060ff" },
  legendary: { frame: "#c88800", inner: "#ffd050", glow: "rgba(240,175,0,0.62)", manaA: "#ffe080", manaB: "#885000", manaC: "#1a0c00", manaBorder: "#ffcc40" },
};

// ── SVG corner ornament ────────────────────────────────────────────────────────
function CornerOrnament({ rf, size }) {
  return (
    <svg width={size} height={size} viewBox="0 0 52 52" style={{ display: "block" }}>
      <defs>
        <filter id={`glow-${rf.frame.replace("#","")}`} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="1.5" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      <path d="M 4 48 L 4 4 L 48 4" fill="none" stroke={rf.frame} strokeWidth="2.2" strokeLinecap="round"/>
      <path d="M 9 44 L 9 9 L 44 9" fill="none" stroke={rf.inner} strokeWidth="1" strokeLinecap="round" opacity="0.45"/>
      <polygon points="4,4 9,-1 14,4 9,9" fill={rf.inner} opacity="0.95"/>
      <polygon points="4,4 8.5,0.5 13,4 8.5,7.5" fill={rf.frame}/>
      <line x1="1" y1="48" x2="7" y2="48" stroke={rf.frame} strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="48" y1="1" x2="48" y2="7" stroke={rf.frame} strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="1" y1="26" x2="7" y2="26" stroke={rf.frame} strokeWidth="1" strokeLinecap="round" opacity="0.65"/>
      <line x1="26" y1="1" x2="26" y2="7" stroke={rf.frame} strokeWidth="1" strokeLinecap="round" opacity="0.65"/>
      <circle cx="4" cy="28" r="1" fill={rf.frame} opacity="0.5"/>
      <circle cx="28" cy="4" r="1" fill={rf.frame} opacity="0.5"/>
    </svg>
  );
}

// ── Faceted gem (cost only) ────────────────────────────────────────────────────
function FacetedGem({ diam, colorA, colorB, colorC, borderColor, glowColor, children, style = {}, badgeStyle = "default" }) {
  const badgeStyles = {
    default: { radius: "50%", borderW: 2.5, extra: "" },
    solid: { radius: "50%", borderW: 3, extra: ", inset 0 0 0 2px rgba(255,255,255,0.12)" },
    glass: { radius: "42%", borderW: 2, extra: ", inset 0 8px 14px rgba(255,255,255,0.18)" },
    rune: { radius: "35%", borderW: 2, extra: ", inset 0 0 0 1px rgba(220,240,255,0.35)" },
    minimal: { radius: "50%", borderW: 1.5, extra: ", inset 0 0 5px rgba(0,0,0,0.35)" },
  };
  const bs = badgeStyles[badgeStyle] || badgeStyles.default;
  return (
    <div style={{
      position:      "absolute",
      width:         diam,
      height:        diam,
      borderRadius:  bs.radius,
      background:    `radial-gradient(circle at 38% 30%, ${colorA} 0%, ${colorB} 48%, ${colorC} 100%)`,
      border:        `${bs.borderW}px solid ${borderColor}`,
      boxShadow:     `0 0 10px ${glowColor}, 0 0 22px ${glowColor.replace("0.","0.3")}, inset 0 0 8px rgba(0,0,0,0.55)${bs.extra}`,
      display:       "flex",
      alignItems:    "center",
      justifyContent:"center",
      zIndex:        25,
      ...style,
    }}>
      <div style={{
        position:     "absolute",
        top: "10%", left: "18%",
        width:        "34%",
        height:       "28%",
        borderRadius: "50%",
        background:   "rgba(255,255,255,0.42)",
        filter:       "blur(2px)",
        pointerEvents:"none",
      }}/>
      {children}
    </div>
  );
}

// ── Stat badge (ATK / HP) ──────────────────────────────────────────────────────
// The colored circle IS the badge. The number lives centered inside it — no icon.
// type: "atk"|"hp"  size: diameter px  board: battlefield mode  damaged: pulses red
function StatBadge({ value, type, size, board = false, damaged = false, style = {}, icon = null, colorOverride = null, badgeStyle = "default" }) {
  const isAtk = type === "atk";
  const bg     = colorOverride || (isAtk ? "#c8860a" : "#c0192c");

  // board=36→16px  hand=28→14px  tooltip=38→18px  (ratio ~0.47, clamped)
  const fontSize = board ? 16 : clamp(Math.round(size * 0.47), 14, 18);

  const shadow = board
    ? `0 3px 10px rgba(0,0,0,0.85), 0 0 8px ${isAtk ? "rgba(200,134,10,0.6)" : "rgba(192,25,44,0.6)"}`
    : `0 2px 6px rgba(0,0,0,0.70)`;

  const badgeStyles = {
    default: { radius: "50%", borderW: board ? 2 : 1.5, shadowBoost: 1 },
    solid: { radius: "50%", borderW: board ? 2.5 : 2, shadowBoost: 1.2 },
    glass: { radius: "42%", borderW: board ? 2 : 1.5, shadowBoost: 1.1 },
    rune: { radius: "34%", borderW: board ? 2 : 1.5, shadowBoost: 1.15 },
    minimal: { radius: "50%", borderW: 1, shadowBoost: 0.8 },
  };
  const bs = badgeStyles[badgeStyle] || badgeStyles.default;
  const isDamaged = board && damaged && !isAtk;
  return (
    <div style={{
      width:          size,
      height:         size,
      borderRadius:   bs.radius,
      background:     bg,
      border:         `${bs.borderW}px solid rgba(255,255,255,0.3)`,
      boxShadow:      `${shadow}, inset 0 0 ${Math.round(6 * bs.shadowBoost)}px rgba(0,0,0,0.35)`,
      display:        "flex",
      alignItems:     "center",
      justifyContent: "center",
      flexShrink:     0,
      position:       "relative",
      ...style,
    }}>
      {/* Damage pulse: opacity-only overlay — no background-color animation → GPU composited */}
      {isDamaged && (
        <div style={{
          position:     "absolute",
          inset:        0,
          borderRadius: "50%",
          background:   "rgba(255,32,64,0.55)",
          animation:    "damagedHpPulse 1.4s ease-in-out infinite",
          pointerEvents:"none",
          willChange:   "opacity",
        }} />
      )}
      <span style={{
        fontSize:   fontSize,
        fontWeight: 700,
        color:      "#ffffff",
        lineHeight: 1,
        textShadow: "0 1px 3px rgba(0,0,0,0.95), 0 0 6px rgba(0,0,0,0.7)",
        fontFamily: "'Cinzel','Trajan Pro',serif",
        userSelect: "none",
        position:   "relative", // above the overlay
        zIndex:     1,
      }}>
        {icon ? `${icon} ` : ""}{value}
      </span>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function TemplateCardFace({ card, width, height, onFrameError }) {
  const [artFailed, setArtFailed] = useState(false);
  const devConfig = useDevConfig();
  const cardTemplate = devConfig?.cardTemplate || {};

  const rarity     = card.rarity || "common";
  const rc         = RC[rarity] || RC.common;
  const rf         = RF[rarity]  || RF.common;
  const isSpell    = card.type === "spell";
  const boardMode  = (card.renderMode || "full") === "board";

  const artSrc     = card.art || card.image;
  const effectText = card.effectText || card.desc || card.effect || "";
  const keywords   = card.keywords || [];
  const liveAttack = card.currentAttack ?? card.atk    ?? card.attack ?? 0;
  const liveHealth = card.currentHealth ?? card.hp     ?? card.health ?? 0;
  const classTag   = String(card.classTag || card.faction || card.class || "").trim();
  const classKey   = classTag.toLowerCase();
  const classPalette = CLASS_PALETTE[classKey] || CLASS_PALETTE_DEFAULT;
  const artZoom    = Number.isFinite(Number(card.artZoom))    ? Math.max(1, Number(card.artZoom))    : 1;
  const artOffsetX = Number.isFinite(Number(card.artOffsetX)) ? Number(card.artOffsetX) : 0;
  const artOffsetY = Number.isFinite(Number(card.artOffsetY)) ? Number(card.artOffsetY) : 0;

  const radiusFactor = Number.isFinite(Number(cardTemplate.borderRadius)) ? Number(cardTemplate.borderRadius) : 0.058;
  const frameInset = Number.isFinite(Number(cardTemplate.frameInset)) ? Number(cardTemplate.frameInset) : 0;
  const artInset = Number.isFinite(Number(cardTemplate.artInset)) ? Number(cardTemplate.artInset) : 0;
  const costBadgeScale = Number.isFinite(Number(cardTemplate.costBadgeScale)) ? Number(cardTemplate.costBadgeScale) : 1;
  const br        = Math.round(Math.min(width, height) * radiusFactor);
  const gemDiam   = Math.round(Math.min(width, height) * 0.215 * costBadgeScale);
  const cornerSz  = Math.round(Math.min(width, height) * 0.235);

  const COST_ORB = { colorA: "#a8d8ff", colorB: "#1c5fb8", colorC: "#031432", border: "#6cb6ff", glow: "rgba(90,176,255,0.72)" };
  const attackColor = cardTemplate.attackColor || "#c8860a";
  const healthColor = cardTemplate.healthColor || "#c0192c";
  const manaColor = cardTemplate.manaColor || "#1a6bb5";
  const iconMap = {
    attack: { sword: "⚔", fist: "✊", lightning: "⚡", fire: "🔥", claw: "🦴" },
    health: { heart: "♥", shield: "🛡", diamond: "♦", orb: "◉", cross: "✚" },
    mana: { gem: "◆", star: "★", crystal: "✧", coin: "◍", rune: "ᚱ" },
  };
  const variantWrap = {
    default: (s) => s,
    outline: (s) => `◌${s}`,
    filled: (s) => `●${s}`,
    rune: (s) => `ᚠ${s}`,
    minimal: (s) => `${s}`,
  };
  const attackIcon = (variantWrap[cardTemplate.attackIconVariant || "default"] || variantWrap.default)(iconMap.attack[cardTemplate.attackIcon] || "");
  const healthIcon = (variantWrap[cardTemplate.healthIconVariant || "default"] || variantWrap.default)(iconMap.health[cardTemplate.healthIcon] || "");
  const manaIcon = (variantWrap[cardTemplate.manaIconVariant || "default"] || variantWrap.default)(iconMap.mana[cardTemplate.manaIcon] || "");
  const borderStyleMap = {
    default: { stroke: rf.frame, glow: rf.glow },
    gold: { stroke: "#d4af37", glow: "rgba(212,175,55,0.55)" },
    arcane: { stroke: "#7f5bff", glow: "rgba(127,91,255,0.55)" },
    fire: { stroke: "#ff6a3d", glow: "rgba(255,106,61,0.55)" },
    frost: { stroke: "#6bd5ff", glow: "rgba(107,213,255,0.55)" },
  };
  const borderFx = borderStyleMap[cardTemplate.cardBorderStyle || "default"] || borderStyleMap.default;

  const isTooltip = width >= 300;

  const nameLen  = (card.name || "").length;
  const nameFont = clamp(
    Math.round(width * (nameLen > 24 ? 0.050 : nameLen > 18 ? 0.060 : nameLen > 12 ? 0.074 : 0.090)),
    isTooltip ? 16 : 9,
    isTooltip ? 22 : 20
  );
  const configuredNameFont = Number(cardTemplate.nameFontSize);
  const configuredDescFont = Number(cardTemplate.descFontSize);
  const nameFontSize = Number.isFinite(configuredNameFont) ? configuredNameFont : nameFont;

  // ── Board mode (unchanged) ─────────────────────────────────────────────────
  if (boardMode) {
    return (
      <div style={{
        position:   "relative",
        width,
        height,
        borderRadius: br,
        overflow:   "visible",
        fontFamily: "'Cinzel', 'Trajan Pro', serif",
        userSelect: "none",
      }}>
        <div style={{ position: "absolute", inset: frameInset, borderRadius: br, overflow: "hidden" }}>
          <div style={{
            position:   "absolute",
            inset:      0,
            background: `radial-gradient(ellipse at 50% 35%, ${rf.glow.replace("0.","0.14")} 0%, #060c1a 75%)`,
          }}>
            {artSrc && !artFailed ? (
              <img
                src={artSrc}
                alt={card.name}
                onError={() => setArtFailed(true)}
                style={{
                  width: "100%", height: "100%",
                  objectFit: "cover", objectPosition: "center center",
                  transform: `translate(${artOffsetX + artInset}px, ${artOffsetY + artInset}px) scale(${artZoom})`,
                  transformOrigin: "center center",
                }}
              />
            ) : (
              <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: Math.round(width * 0.30) }}>
                {card.emoji || "🃏"}
              </div>
            )}
            <div style={{
              position: "absolute", bottom: 0, left: 0, right: 0, height: "38%",
              background: "linear-gradient(to bottom, transparent 0%, rgba(4,7,18,0.72) 60%, rgba(4,7,18,0.92) 100%)",
              pointerEvents: "none",
            }}/>
          </div>
          <div style={{
            position: "absolute", inset: 0, borderRadius: br,
            boxShadow: `inset 0 0 0 2px ${classPalette.border}, inset 0 0 16px ${classPalette.border}66`,
            pointerEvents: "none", zIndex: 20,
          }}/>
        </div>
        {card.type === "minion" && (
          <>
            <StatBadge value={liveAttack} type="atk" size={36} board={true} icon={attackIcon} colorOverride={attackColor} badgeStyle={cardTemplate.attackBadgeStyle || "default"}
              style={{ position: "absolute", bottom: -6, left: 2, zIndex: 25 }} />
            <StatBadge value={liveHealth} type="hp" size={36} board={true} icon={healthIcon} colorOverride={healthColor} badgeStyle={cardTemplate.healthBadgeStyle || "default"}
              damaged={liveHealth < (card.hp ?? card.health ?? liveHealth)}
              style={{ position: "absolute", bottom: -6, right: 2, zIndex: 25 }} />
          </>
        )}
      </div>
    );
  }

  // ── Full card mode ─────────────────────────────────────────────────────────
  const artH    = Math.round(height * 0.40);
  const infoH   = height - artH;
  const descFontSize = Number.isFinite(configuredDescFont) ? configuredDescFont : (isTooltip ? 13 : 11);
  const lineH        = Number.isFinite(Number(cardTemplate.descLineHeight)) ? Number(cardTemplate.descLineHeight) : (isTooltip ? 1.6 : 1.5);
  const descLineH = descFontSize * lineH;
  const descMinH  = Math.ceil(descLineH * 3);
  const descMaxH  = Math.ceil(descLineH * 6);

  return (
    <div style={{
      position:   "relative",
      width,
      height,
      borderRadius: br,
      overflow:   "visible",
      fontFamily: "'Cinzel', 'Trajan Pro', serif",
      userSelect: "none",
    }}>
      {/* ── Inner clip wrapper ── */}
      <div style={{ position: "absolute", inset: frameInset, borderRadius: br, overflow: "hidden", display: "flex", flexDirection: "column" }}>

        {/* ── Art section (~40% height) ──────────────────────────── */}
        <div style={{ position: "relative", height: artH, flexShrink: 0, overflow: "hidden" }}>
          <div style={{
            position:   "absolute",
            inset:      0,
            background: `radial-gradient(ellipse at 50% 35%, ${rf.glow.replace("0.","0.14")} 0%, #060c1a 75%)`,
          }}>
            {artSrc && !artFailed ? (
              <img
                src={artSrc}
                alt={card.name}
                onError={() => setArtFailed(true)}
                style={{
                  width:          "100%",
                  height:         "100%",
                  objectFit:      "cover",
                  objectPosition: "center top",
                  transform:      `translate(${artOffsetX + artInset}px, ${artOffsetY + artInset}px) scale(${artZoom})`,
                  transformOrigin:"center center",
                }}
              />
            ) : (
              <div style={{
                width: "100%", height: "100%",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: Math.round(width * 0.28),
              }}>
                {card.emoji || "🃏"}
              </div>
            )}
          </div>
          {/* bottom fade into info panel */}
          <div style={{
            position: "absolute", bottom: 0, left: 0, right: 0, height: "40%",
            background: "linear-gradient(to bottom, transparent 0%, rgba(4,7,18,0.80) 100%)",
            pointerEvents: "none",
          }}/>
          {/* top vignette */}
          <div style={{
            position: "absolute", top: 0, left: 0, right: 0, height: "28%",
            background: "linear-gradient(to bottom, rgba(0,0,0,0.45) 0%, transparent 100%)",
            pointerEvents: "none",
          }}/>
        </div>

        {/* ── Info panel ────────────────────────────────────────── */}
        <div style={{
          flex:          1,
          display:       "flex",
          flexDirection: "column",
          alignItems:    "center",
          background:    `linear-gradient(180deg, rgba(6,10,22,${cardTemplate.textPanelOpacity ?? 0.96}) 0%, rgba(3,5,14,${cardTemplate.textPanelOpacity ?? 0.99}) 100%)`,
          borderTop:     `1px solid ${rf.frame}55`,
          overflow:      "hidden",
          padding:       `6px ${Math.round(width * 0.08)}px 0`,
          boxSizing:     "border-box",
          gap:           3,
        }}>

          {/* Card Name */}
          <div style={{
            width:         "100%",
            textAlign:     "center",
            fontSize:      nameFontSize,
            fontWeight:    Number.isFinite(Number(cardTemplate.titleFontWeight)) ? Number(cardTemplate.titleFontWeight) : 700,
            color:         "#ffffff",
            textTransform: "uppercase",
            letterSpacing: 1,
            lineHeight:    1.1,
            textShadow:    `0 0 10px ${rf.glow}, 0 2px 7px rgba(0,0,0,0.98)`,
            whiteSpace:    "nowrap",
            overflow:      "hidden",
            textOverflow:  "ellipsis",
            flexShrink:    0,
          }}>
            {card.name || "???"}
          </div>

          {/* Divider line under name */}
          <div style={{
            width:      "80%",
            height:     1,
            background: `linear-gradient(90deg, transparent, ${rf.frame}88, ${rf.inner}, ${rf.frame}88, transparent)`,
            flexShrink: 0,
            margin:     "1px 0",
          }}/>

          {/* Class tag moved to bottom bar as absolute watermark */}

          {/* Mechanic tag pills */}
          {keywords.length > 0 && (
            <div style={{
              display:        "flex",
              flexWrap:       "wrap",
              justifyContent: "center",
              gap:            3,
              flexShrink:     0,
              width:          "100%",
            }}>
              {keywords.map((k) => {
                const mc = MECHANIC_COLORS[k.toLowerCase()] || MECHANIC_DEFAULT;
                return (
                  <div key={k} style={{
                    fontSize:      isTooltip ? 11 : clamp(Math.round(width * 0.036), 10, 11),
                    fontFamily:    "'Cinzel','Trajan Pro',serif",
                    fontWeight:    700,
                    padding:       isTooltip ? "3px 10px" : "2px 7px",
                    borderRadius:  20,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    background:    mc.bg,
                    border:        `1px solid ${mc.border}`,
                    color:         mc.text,
                    boxShadow:     `0 0 6px ${mc.glow}`,
                    whiteSpace:    "nowrap",
                    lineHeight:    1.3,
                  }}>
                    {k}
                  </div>
                );
              })}
            </div>
          )}

          {/* Description text — scrollable */}
          {effectText ? (
            <div className="card-desc-scroll" style={{
              width:       "100%",
              minHeight:   descMinH,
              maxHeight:   descMaxH,
              overflowY:   "auto",
              overflowX:   "hidden",
              fontSize:    descFontSize,
              fontFamily:  "'Crimson Text', 'Georgia', serif",
              fontStyle:   "normal",
              fontWeight:  isTooltip ? 400 : undefined,
              color:       isTooltip ? "#e8edf5" : "#dde4f0",
              textAlign:   "center",
              lineHeight:  lineH,
              textShadow:  "0 1px 4px rgba(0,0,0,0.96), 0 0 8px rgba(0,0,0,0.6)",
              wordBreak:   "break-word",
              overflowWrap:"anywhere",
              flexShrink:  0,
              scrollbarWidth: "thin",
              scrollbarColor: `${rf.frame}66 transparent`,
            }}>
              {effectText}
            </div>
          ) : null}

          {/* Spacer pushes bottom bar to bottom */}
          <div style={{ flex: 1, minHeight: 2 }}/>

          {/* Bottom bar: ATK left · class watermark center · HP right */}
          {card.type === "minion" && (
            <div style={{
              position:       "relative",
              width:          "100%",
              display:        "flex",
              justifyContent: "space-between",
              alignItems:     "center",
              borderTop:      `1px solid ${rf.frame}44`,
              padding:        `4px ${Math.round(width * 0.04)}px 6px`,
              boxSizing:      "border-box",
              flexShrink:     0,
            }}>
              <StatBadge value={liveAttack} type="atk" size={clamp(Math.round(width * 0.114), 28, 38)} icon={attackIcon} colorOverride={attackColor} badgeStyle={cardTemplate.attackBadgeStyle || "default"} />
              {classTag && (
                <span style={{
                  position:      "absolute",
                  left:          "50%",
                  transform:     "translateX(-50%)",
                  fontSize:      clamp(Math.round(width * 0.031), 9, 11),
                  fontWeight:    600,
                  color:         classPalette.accent,
                  textTransform: "uppercase",
                  letterSpacing: "0.18em",
                  textShadow:    `0 0 8px ${classPalette.accent}`,
                  whiteSpace:    "nowrap",
                  pointerEvents: "none",
                  fontFamily:    "'Cinzel','Trajan Pro',serif",
                  lineHeight:    1,
                }}>
                  {classTag}
                </span>
              )}
              <StatBadge value={liveHealth} type="hp"  size={clamp(Math.round(width * 0.114), 28, 38)} icon={healthIcon} colorOverride={healthColor} badgeStyle={cardTemplate.healthBadgeStyle || "default"} />
            </div>
          )}

          {/* Spell bottom padding */}
          {isSpell && <div style={{ height: 6, flexShrink: 0 }}/>}

        </div>
      </div>

      {/* ── Outer rarity border glow (inset) ──────────────────── */}
      <div style={{
        position:      "absolute",
        inset:         0,
        borderRadius:  br,
        boxShadow:     `inset 0 0 0 2px ${borderFx.stroke}, inset 0 0 0 4px rgba(0,0,0,0.75), inset 0 0 14px ${borderFx.glow}`,
        pointerEvents: "none",
        zIndex:        20,
        // must be outside the overflow:hidden clip wrapper
      }}/>

      {/* ── Corner ornaments ──────────────────────────────────── */}
      <>
        <div style={{ position: "absolute", top: 3, left: 3, zIndex: 22, pointerEvents: "none", filter: `drop-shadow(0 0 3px ${rf.glow})` }}>
          <CornerOrnament rf={rf} size={cornerSz}/>
        </div>
        <div style={{ position: "absolute", top: 3, right: 3, zIndex: 22, pointerEvents: "none", transform: "scaleX(-1)", filter: `drop-shadow(0 0 3px ${rf.glow})` }}>
          <CornerOrnament rf={rf} size={cornerSz}/>
        </div>
        <div style={{ position: "absolute", bottom: 3, left: 3, zIndex: 22, pointerEvents: "none", transform: "scaleY(-1)", filter: `drop-shadow(0 0 3px ${rf.glow})` }}>
          <CornerOrnament rf={rf} size={cornerSz}/>
        </div>
        <div style={{ position: "absolute", bottom: 3, right: 3, zIndex: 22, pointerEvents: "none", transform: "scale(-1,-1)", filter: `drop-shadow(0 0 3px ${rf.glow})` }}>
          <CornerOrnament rf={rf} size={cornerSz}/>
        </div>
      </>

      {/* ── Cost gem (top-left, outside clip so it can overlap) ── */}
      <FacetedGem
        diam={gemDiam}
        colorA={COST_ORB.colorA}
        colorB={COST_ORB.colorB}
        colorC={COST_ORB.colorC}
        borderColor={manaColor}
        glowColor={manaColor + "99"}
        badgeStyle={cardTemplate.manaBadgeStyle || "default"}
        style={{
          top:  Math.round(height * 0.030),
          left: Math.round(width  * 0.040),
        }}
      >
        <span style={{
          position:  "relative",
          fontSize:  clamp(Math.round(gemDiam * 0.44), 10, 22),
          fontWeight:900,
          color:     "#ffffff",
          lineHeight:1,
          textShadow:"0 1px 4px rgba(0,0,50,0.95), 0 0 8px rgba(120,190,255,0.55)",
        }}>
          {manaIcon ? `${manaIcon} ` : ""}{card.cost ?? 0}
        </span>
      </FacetedGem>

      {/* ── Legendary foil shimmer ──────────────────────────────── */}
      {rarity === "legendary" && (
        <div style={{
          position:      "absolute",
          inset:         0,
          borderRadius:  br,
          background:    "linear-gradient(108deg, transparent 20%, rgba(255,215,70,0.10) 50%, transparent 80%)",
          animation:     "legendaryShimmer 3.2s infinite",
          animationTimingFunction: "linear",
          pointerEvents: "none",
          zIndex:        19,
        }}/>
      )}

      {/* ── Epic edge pulse ─────────────────────────────────────── */}
      {rarity === "epic" && (
        <div style={{
          position:      "absolute",
          inset:         0,
          borderRadius:  br,
          boxShadow:     `inset 0 0 20px rgba(160,70,255,0.28)`,
          animation:     "epicPulse 2.6s ease-in-out infinite",
          pointerEvents: "none",
          zIndex:        19,
        }}/>
      )}
    </div>
  );
}
