import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { RC } from "../data/cards.js";
import { getSFX } from "../audio/sfx.js";
import CardTooltip from "./CardTooltip.jsx";
import TemplateCardFace from "./TemplateCardFace.jsx";
import { LOW } from "../animations/timings.js";

function LegacyHandCardBody({ card, rc, borderColor, artFailed, setArtFailed }) {
  const artSrc = card.art || card.image;
  const kwTags = (card.keywords || []).filter((k) => ["taunt", "charge", "elusive", "battlecry"].includes(k));

  return (
    <>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 4, background: `linear-gradient(90deg, transparent, ${rc.border}, transparent)`, borderRadius: "22px 22px 0 0", opacity: 0.95, zIndex: 2, pointerEvents: "none" }} />
      {card.rarity === "legendary" && (
        <motion.div
          animate={{ x: ["-130%", "230%"] }}
          transition={{ duration: 2.8, repeat: Infinity, repeatDelay: 1.6, ease: "linear" }}
          style={{ position: "absolute", top: 0, left: 0, width: "50%", height: "100%", background: "linear-gradient(108deg, transparent 20%, rgba(255,199,100,0.13) 50%, transparent 80%)", borderRadius: 26, pointerEvents: "none", zIndex: 5 }}
        />
      )}
      <div style={{ position: "absolute", inset: 0, borderRadius: 24, boxShadow: `inset 0 0 28px ${rc.glow}`, pointerEvents: "none", zIndex: 1 }} />
      <div style={{ position: "absolute", top: 13, left: 13, width: 46, height: 46, borderRadius: "50%", background: "radial-gradient(circle, rgba(255,255,255,0.3), rgba(7,34,82,0.95))", border: `2px solid ${borderColor}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 900, color: "#fff", boxShadow: "0 4px 14px rgba(0,0,0,0.65), inset 0 1px 0 rgba(255,255,255,0.25)", zIndex: 6 }}>{card.cost}</div>
      <div style={{ position: "absolute", top: 5, right: 8, fontSize: 9, color: rc.label, fontWeight: 900, textTransform: "uppercase", letterSpacing: 0.8, opacity: 0.9, zIndex: 6 }}>{card.rarity}</div>
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 64, filter: `drop-shadow(0 6px 16px ${rc.glow})`, marginTop: 16, position: "relative" }}>
        <div style={{ position: "absolute", inset: 2, background: "rgba(0,0,0,0.3)", borderRadius: 14, boxShadow: "inset 0 2px 12px rgba(0,0,0,0.55)", zIndex: 0, pointerEvents: "none" }} />
        {artSrc && !artFailed ? (
          <img src={artSrc} alt={card.name} onError={() => setArtFailed(true)} style={{ position: "absolute", inset: 8, width: "calc(100% - 16px)", height: "calc(100% - 16px)", borderRadius: 12, objectFit: "cover", filter: "saturate(1.1)", zIndex: 1 }} />
        ) : (
          <span style={{ position: "relative", zIndex: 1 }}>{card.emoji || "🃏"}</span>
        )}
      </div>
      <div style={{ background: "linear-gradient(135deg, rgba(0,0,0,0.75), rgba(0,0,0,0.55))", borderRadius: 10, padding: "5px 8px", marginBottom: 5, marginTop: 5, border: "1px solid rgba(255,255,255,0.14)", boxShadow: "0 2px 8px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.08)" }}>
        <div style={{ fontSize: 16, fontWeight: 900, color: "#fff", textAlign: "center", letterSpacing: 0.5 }}>{card.name}</div>
      </div>
      <div style={{ fontSize: 13, color: "#c8d1e3", textAlign: "center", lineHeight: 1.4, height: 38, overflow: "hidden", marginBottom: 5, letterSpacing: 0.2, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{card.effectText || card.desc || card.effect}</div>
      {kwTags.length > 0 && (
        <div style={{ display: "flex", justifyContent: "center", gap: 4, marginBottom: 5, flexWrap: "wrap" }}>
          {kwTags.map((k) => (
            <div key={k} style={{ fontSize: 9, fontWeight: 900, padding: "2px 5px", borderRadius: 3, textTransform: "uppercase", background: k === "taunt" ? "#2a1800" : k === "charge" ? "#001a10" : k === "elusive" ? "#1a0028" : "#001828", color: k === "taunt" ? "#EF9F27" : k === "charge" ? "#1D9E75" : k === "elusive" ? "#9b59dd" : "#378ADD", border: `1px solid ${k === "taunt" ? "#EF9F27" : k === "charge" ? "#1D9E75" : k === "elusive" ? "#9b59dd" : "#378ADD"}` }}>
              {k}
            </div>
          ))}
        </div>
      )}
      <div style={{ textAlign: "center", fontSize: 7.5, fontWeight: 900, letterSpacing: 1, textTransform: "uppercase", marginBottom: 3, color: rc.label, background: "rgba(0,0,0,0.35)", borderRadius: 4, padding: "1px 6px", border: `1px solid ${rc.border}55` }}>{card.class || "neutral"}</div>
      {card.type === "minion" ? (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 2 }}>
          {/* ATK badge */}
          <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#c8860a", border: "1.5px solid rgba(255,255,255,0.28)", boxShadow: "0 2px 6px rgba(0,0,0,0.70)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: "#fff", lineHeight: 1, textShadow: "0 1px 3px rgba(0,0,0,0.95)" }}>{card.atk}</span>
          </div>
          {/* HP badge */}
          <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#c0192c", border: "1.5px solid rgba(255,255,255,0.28)", boxShadow: "0 2px 6px rgba(0,0,0,0.70)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: "#fff", lineHeight: 1, textShadow: "0 1px 3px rgba(0,0,0,0.95)" }}>{card.hp}</span>
          </div>
        </div>
      ) : (
        <div style={{ textAlign: "center", fontSize: 12, color: rc.label, fontWeight: 900, letterSpacing: 1.4 }}>✦ SPELL ✦</div>
      )}
    </>
  );
}

export default function HandCard({ card, selected, disabled, onClick, cardRef, dragEnabled, onDragStart, onDragEnd, width: propWidth, height: propHeight }) {
  const [hov, setHov] = useState(false);
  const [pop, setPop] = useState(false);
  const [mouse, setMouse] = useState(null);
  const [artFailed, setArtFailed] = useState(false);
  const [frameFailed, setFrameFailed] = useState(false);
  const rc = RC[card.rarity || "common"];

  function handle() {
    if (disabled) {
      getSFX().error();
      return;
    }
    setPop(true);
    setTimeout(() => setPop(false), 350);
    getSFX().cardSelect();
    onClick && onClick();
  }

  const scale = pop ? 1.15 : selected ? 1.1 : 1;
  const ty = selected ? -28 : 0;
  const borderColor = selected ? "#FAC775" : rc.border;

  const bevel = "inset 0 1px 0 rgba(255,255,255,0.18), inset 0 -1px 0 rgba(0,0,0,0.55)";
  const innerGlow = `inset 0 0 ${hov ? "36px" : "22px"} ${rc.glow}`;
  const baseShadow = `0 8px 22px rgba(0,0,0,0.55), 0 0 18px ${rc.glow}`;
  const hoverShadow = `0 20px 48px rgba(0,0,0,0.75), 0 0 40px ${rc.border}, 0 0 60px ${rc.glow}, 0 0 0 2px ${rc.border}`;
  const selectShadow = `0 22px 52px rgba(0,0,0,0.78), 0 0 52px ${rc.border}, 0 0 80px rgba(250,199,117,0.55)`;
  const shadow = `${selected ? selectShadow : hov ? hoverShadow : baseShadow}, ${innerGlow}, ${bevel}`;

  const isLegendaryFloating = card.rarity === "legendary" && !hov && !selected;
  const motionTransition = isLegendaryFloating
    ? {
        y: { repeat: Infinity, repeatType: "loop", duration: 3.5, ease: "easeInOut" },
        scale: { type: "spring", stiffness: 260, damping: 22 },
        rotateY: { type: "spring", stiffness: 260, damping: 22 },
      }
    : { type: "spring", stiffness: 260, damping: 22 };

  const useTemplate = !frameFailed;
  const cardW = propWidth ?? 174;
  const cardH = propHeight ?? 246;

  return (
    <motion.div
      ref={cardRef}
      onClick={handle}
      onMouseEnter={(e) => { setHov(true); setMouse({ x: e.clientX, y: e.clientY }); if (typeof audioManager !== "undefined" && audioManager?.play) audioManager.play("hover"); }}
      onMouseLeave={() => {
        setHov(false);
        setMouse(null);
      }}
      drag={dragEnabled}
      dragTransition={{ bounceStiffness: 300, bounceDamping: 20 }}
      dragMomentum={false}
      onDragStart={() => onDragStart && onDragStart(card)}
      onDragEnd={(event, info) => onDragEnd && onDragEnd(info.point)}
      layoutId={`card-${card.uid}`}
      animate={{ scale, y: isLegendaryFloating ? [0, -4, 0] : ty, rotateY: isLegendaryFloating ? 0 : selected ? 2 : 0 }}
      transition={motionTransition}
      style={{
        width: cardW,
        minWidth: cardW,
        height: cardH,
        background: useTemplate ? "rgba(0,0,0,0.35)" : `radial-gradient(circle at 25% 20%, rgba(255,255,255,0.12), transparent 55%), ${rc.bg}`,
        border: useTemplate ? "2px solid rgba(255,255,255,0.08)" : `2px solid ${borderColor}`,
        borderRadius: 26,
        cursor: disabled ? "not-allowed" : "pointer",
        display: "flex",
        flexDirection: "column",
        padding: useTemplate ? 0 : "11px",
        boxSizing: "border-box",
        position: "relative",
        opacity: disabled ? 0.38 : 1,
        boxShadow: shadow,
        transition: `box-shadow ${LOW.duration}ms ${LOW.ease}`,
        transformStyle: "preserve-3d",
        overflow: "hidden",
        willChange: "transform",
      }}
    >
      {useTemplate ? (
        <TemplateCardFace card={card} width={cardW} height={cardH} onFrameError={() => setFrameFailed(true)} />
      ) : (
        <LegacyHandCardBody card={card} rc={rc} borderColor={borderColor} artFailed={artFailed} setArtFailed={setArtFailed} />
      )}

      <AnimatePresence>{hov && mouse && <CardTooltip card={card} mouseX={mouse.x} mouseY={mouse.y} />}</AnimatePresence>
    </motion.div>
  );
}
